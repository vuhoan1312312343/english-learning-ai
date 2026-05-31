import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { Post, PostType, PostVisibility } from '../models/Post.model';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User.model';

const router = Router();

const ALLOWED_TYPES: PostType[] = ['text', 'image', 'mixed', 'question'];
const ALLOWED_VISIBILITY: PostVisibility[] = ['public', 'followers', 'private'];

const serializePost = (post: any, currentUserId: string | null) => {
  const data = typeof post.toObject === 'function' ? post.toObject() : post;
  const likes = Array.isArray(data.likes) ? data.likes : [];

  const comments = (Array.isArray(data.comments) ? data.comments : []).map((comment: any) => {
    const commentUser = comment?.userId;
    return {
      _id: comment?._id,
      userId:
        commentUser && typeof commentUser === 'object'
          ? {
              _id: commentUser._id,
              name: commentUser.name,
              email: commentUser.email,
              avatar: commentUser.avatar,
              level: commentUser.level,
            }
          : commentUser,
      content: comment?.content,
      createdAt: comment?.createdAt,
    };
  });

  return {
    ...data,
    likesCount: typeof data.likesCount === 'number' ? data.likesCount : likes.length,
    commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : comments.length,
    isLikedByMe: currentUserId
      ? likes.some((id: mongoose.Types.ObjectId | string) => id.toString() === currentUserId)
      : false,
    comments,
    likes: undefined,
  };
};

// Get feed posts. Public for guests, plus own posts for authenticated users.
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let currentUserId: string | null = null;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.id) {
        const user = await User.findById(decoded.id).select('_id');
        if (user) currentUserId = user._id.toString();
      }
    }

    const visibilityFilter = currentUserId
      ? {
          $or: [
            { visibility: 'public' },
            { userId: currentUserId },
          ],
        }
      : { visibility: 'public' };

    const posts = await Post.find({
      isActive: true,
      ...visibilityFilter,
    })
      .populate('userId', 'name avatar email level')
      .populate('comments.userId', 'name avatar email level')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      posts: posts.map((post) => serializePost(post, currentUserId)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: (error as Error).message,
    });
  }
});

// Create a post.
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, type, visibility, images, location, isPinned } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required',
      });
    }

    const normalizedType: PostType = ALLOWED_TYPES.includes(type)
      ? type
      : images?.length
        ? 'image'
        : 'text';

    const normalizedVisibility: PostVisibility = ALLOWED_VISIBILITY.includes(visibility)
      ? visibility
      : 'public';

    const normalizedImages = Array.isArray(images)
      ? images
          .filter((item) => typeof item === 'string')
          .map((url) => url.trim())
          .filter(Boolean)
      : [];

    const post = await Post.create({
      userId: req.user._id,
      content: content.trim(),
      type: normalizedType,
      visibility: normalizedVisibility,
      images: normalizedImages,
      location: typeof location === 'string' ? location.trim() : undefined,
      isPinned: Boolean(isPinned),
    });

    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'name avatar email level')
      .populate('comments.userId', 'name avatar email level');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: populatedPost ? serializePost(populatedPost, req.user._id.toString()) : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: (error as Error).message,
    });
  }
});

// Update a post (owner only).
router.put('/:postId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { content, visibility, location, images, isPinned } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post id' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (typeof content === 'string') {
      if (!content.trim()) {
        return res.status(400).json({ success: false, message: 'Post content is required' });
      }
      post.content = content.trim();
    }

    if (typeof visibility === 'string' && ALLOWED_VISIBILITY.includes(visibility as PostVisibility)) {
      post.visibility = visibility as PostVisibility;
    }

    if (typeof location === 'string') {
      post.location = location.trim() || undefined;
    }

    if (Array.isArray(images)) {
      post.images = images
        .filter((item) => typeof item === 'string')
        .map((url) => url.trim())
        .filter(Boolean);
    }

    if (typeof isPinned === 'boolean') {
      post.isPinned = isPinned;
    }

    post.type = post.images.length > 0 ? 'mixed' : 'text';
    await post.save();

    const updatedPost = await Post.findById(postId)
      .populate('userId', 'name avatar email level')
      .populate('comments.userId', 'name avatar email level');

    res.json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost ? serializePost(updatedPost, req.user._id.toString()) : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: (error as Error).message,
    });
  }
});

// Delete a post (owner only, soft delete).
router.delete('/:postId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post id' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    post.isActive = false;
    await post.save();

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: (error as Error).message,
    });
  }
});

// Toggle like on a post.
router.post('/:postId/like', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post id' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const alreadyLiked = (post.likes ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = (post.likes ?? []).filter((id: mongoose.Types.ObjectId) => id.toString() !== userId);
    } else {
      post.likes = [...(post.likes ?? []), req.user._id];
    }

    post.likesCount = post.likes.length;
    await post.save();

    res.json({
      success: true,
      liked: !alreadyLiked,
      likesCount: post.likesCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to like post',
      error: (error as Error).message,
    });
  }
});

// Get comments of a post.
router.get('/:postId/comments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post id' });
    }

    const post = await Post.findById(postId)
      .select('comments commentsCount isActive')
      .populate('comments.userId', 'name avatar email level');

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comments = (post.comments ?? []).map((comment: any) => ({
      _id: comment?._id,
      content: comment?.content,
      createdAt: comment?.createdAt,
      userId:
        comment?.userId && typeof comment.userId === 'object'
          ? {
              _id: comment.userId._id,
              name: comment.userId.name,
              email: comment.userId.email,
              avatar: comment.userId.avatar,
              level: comment.userId.level,
            }
          : comment?.userId,
    }));

    res.json({
      success: true,
      comments,
      commentsCount: post.commentsCount ?? comments.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: (error as Error).message,
    });
  }
});

// Add a comment to a post.
router.post('/:postId/comments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post id' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.comments.push({
      userId: req.user._id,
      content: content.trim(),
      createdAt: new Date(),
    } as any);
    post.commentsCount = post.comments.length;
    await post.save();

    const updatedPost = await Post.findById(postId)
      .select('comments commentsCount')
      .populate('comments.userId', 'name avatar email level');

    const latestComment = updatedPost?.comments?.[updatedPost.comments.length - 1] as any;

    res.status(201).json({
      success: true,
      comment: latestComment
        ? {
            _id: latestComment._id,
            content: latestComment.content,
            createdAt: latestComment.createdAt,
            userId:
              latestComment.userId && typeof latestComment.userId === 'object'
                ? {
                    _id: latestComment.userId._id,
                    name: latestComment.userId.name,
                    email: latestComment.userId.email,
                    avatar: latestComment.userId.avatar,
                    level: latestComment.userId.level,
                  }
                : latestComment.userId,
          }
        : null,
      commentsCount: updatedPost?.commentsCount ?? post.commentsCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: (error as Error).message,
    });
  }
});

export default router;
