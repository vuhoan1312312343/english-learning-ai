import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Conversation, IConversation } from '../models/Conversation.model';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';

const router = Router();

const buildConversationKey = (firstUserId: string, secondUserId: string) => {
  return [firstUserId, secondUserId].sort().join(':');
};

const getConversationKeyFromDoc = (conversation: IConversation) => {
  if (conversation.conversationKey) return conversation.conversationKey;
  const participantIds = Array.isArray(conversation.participants)
    ? conversation.participants.map((participant) => participant.toString())
    : [];
  return participantIds.length === 2
    ? buildConversationKey(participantIds[0] ?? '', participantIds[1] ?? '')
    : conversation._id.toString();
};

const serializeUser = (user: unknown) => {
  if (!user || typeof user !== 'object') return null;

  const maybeUser = user as {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    email?: string;
    avatar?: string;
  };

  if (!maybeUser._id || !maybeUser.name) return null;

  return {
    _id: maybeUser._id.toString(),
    name: maybeUser.name,
    email: maybeUser.email,
    avatar: maybeUser.avatar,
  };
};

const serializeConversation = (conversation: IConversation, currentUserId: string) => {
  const data = typeof conversation.toObject === 'function' ? conversation.toObject() : conversation;
  const participants: Array<ReturnType<typeof serializeUser>> = Array.isArray(data.participants)
    ? data.participants.map((participant: unknown) => serializeUser(participant)).filter(Boolean)
    : [];

  const otherParticipant = participants.find((participant) => participant?._id !== currentUserId) ?? null;
  const lastMessage = data.lastMessage
    ? {
        content: data.lastMessage.content,
        createdAt: data.lastMessage.createdAt,
        senderId: data.lastMessage.senderId?.toString?.() ?? data.lastMessage.senderId,
      }
    : null;

  return {
    _id: data._id.toString(),
    participants,
    otherParticipant,
    lastMessage,
    updatedAt: data.updatedAt,
    createdAt: data.createdAt,
  };
};

const serializeMessage = (message: unknown) => {
  const data = message && typeof message === 'object' && 'toObject' in message
    ? (message as { toObject: () => Record<string, unknown> }).toObject()
    : (message as Record<string, unknown>);

  const sender = serializeUser(data.senderId);

  return {
    _id: String(data._id),
    conversationId: String(data.conversationId),
    content: String(data.content ?? ''),
    clientMessageId: typeof data.clientMessageId === 'string' ? data.clientMessageId : undefined,
    senderId: sender,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

const getConversationForUser = async (conversationId: string, currentUserId: string) => {
  return Conversation.findOne({
    _id: conversationId,
    participants: currentUserId,
  }).populate('participants', 'name email avatar');
};

router.get('/conversations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user._id.toString();
    const conversations = await Conversation.find({ participants: currentUserId })
      .populate('participants', 'name email avatar')
      .sort({ updatedAt: -1 });

    const seenKeys = new Set<string>();
    const uniqueConversations = conversations.filter((conversation) => {
      const key = getConversationKeyFromDoc(conversation);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    await Promise.all(
      uniqueConversations
        .filter((conversation) => !conversation.conversationKey)
        .map((conversation) => {
          conversation.conversationKey = getConversationKeyFromDoc(conversation);
          return conversation.save();
        })
    );

    res.json({
      success: true,
      conversations: uniqueConversations.map((conversation) => serializeConversation(conversation, currentUserId)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: (error as Error).message,
    });
  }
});

router.post('/conversations/open', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    const currentUserId = req.user._id.toString();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    const targetUser = await User.findById(userId).select('_id name email avatar');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const conversationKey = buildConversationKey(currentUserId, targetUser._id.toString());

    let conversation = await Conversation.findOne({ conversationKey }).populate('participants', 'name email avatar');

    if (!conversation) {
      const duplicateCandidates = await Conversation.find({
        participants: { $all: [req.user._id, targetUser._id], $size: 2 },
      })
        .sort({ updatedAt: -1 })
        .populate('participants', 'name email avatar');

      if (duplicateCandidates.length > 0) {
        conversation = duplicateCandidates[0] ?? null;
        if (conversation) {
          conversation.conversationKey = conversationKey;
          await conversation.save();
        }
      }
    }

    if (!conversation) {
      conversation = await Conversation.findOneAndUpdate(
        { conversationKey },
        {
          $setOnInsert: {
            participants: [req.user._id, targetUser._id],
            conversationKey,
          },
        },
        {
          new: true,
          upsert: true,
        }
      ).populate('participants', 'name email avatar');
    }

    res.status(201).json({
      success: true,
      conversation: conversation ? serializeConversation(conversation, currentUserId) : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to open conversation',
      error: (error as Error).message,
    });
  }
});

router.get('/conversations/:conversationId/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation id' });
    }

    const conversation = await getConversationForUser(conversationId, currentUserId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({
      success: true,
      conversation: serializeConversation(conversation, currentUserId),
      messages: messages.map((message) => serializeMessage(message)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: (error as Error).message,
    });
  }
});

router.post('/conversations/:conversationId/messages', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { content, clientMessageId } = req.body as { content?: string; clientMessageId?: string };
    const currentUserId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation id' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const conversation = await getConversationForUser(conversationId, currentUserId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (typeof clientMessageId === 'string' && clientMessageId.trim()) {
      const existingMessage = await Message.findOne({
        conversationId: conversation._id,
        senderId: req.user._id,
        clientMessageId: clientMessageId.trim(),
      }).populate('senderId', 'name email avatar');

      if (existingMessage) {
        return res.status(200).json({
          success: true,
          message: serializeMessage(existingMessage),
          conversation: serializeConversation(conversation, currentUserId),
        });
      }
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: content.trim(),
      clientMessageId: typeof clientMessageId === 'string' ? clientMessageId.trim() : undefined,
    });

    conversation.lastMessage = {
      content: content.trim(),
      senderId: req.user._id,
      createdAt: message.createdAt,
    };
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate('senderId', 'name email avatar');
    const refreshedConversation = await getConversationForUser(conversationId, currentUserId);

    res.status(201).json({
      success: true,
      message: populatedMessage ? serializeMessage(populatedMessage) : null,
      conversation: refreshedConversation ? serializeConversation(refreshedConversation, currentUserId) : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: (error as Error).message,
    });
  }
});

export default router;