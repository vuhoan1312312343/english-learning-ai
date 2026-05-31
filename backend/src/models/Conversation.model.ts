import mongoose, { Document, Schema } from 'mongoose';

export interface IConversationLastMessage {
  content: string;
  senderId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  conversationKey?: string;
  lastMessage?: IConversationLastMessage;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator: (value: mongoose.Types.ObjectId[]) => value.length === 2,
        message: 'Conversation must contain exactly 2 participants',
      },
      required: true,
    },
    conversationKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    lastMessage: {
      content: { type: String },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ conversationKey: 1 }, { unique: true, sparse: true });

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', conversationSchema);