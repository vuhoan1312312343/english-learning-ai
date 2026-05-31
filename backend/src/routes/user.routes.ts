import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { Post } from '../models/Post.model';
import { UserLearningStats } from '../models/UserLearningStats.model';
import { verifyToken } from '../utils/jwt';

const router = Router();

const sumXp = (xpByDate: unknown): number => {
  if (!xpByDate) return 0;

  const values =
    xpByDate instanceof Map
      ? Array.from(xpByDate.values())
      : typeof xpByDate === 'object'
        ? Object.values(xpByDate as Record<string, unknown>)
        : [];

  return values.reduce((total, value) => {
    const xp = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return total + Math.max(0, Math.floor(xp));
  }, 0);
};

router.get('/leaderboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = token ? verifyToken(token) : null;
    const currentUserId = decoded?.id;

    const [users, stats] = await Promise.all([
      User.find({}).select('name avatar email level').lean(),
      UserLearningStats.find({}).select('userId xpByDate').lean(),
    ]);

    const xpByUserId = new Map<string, number>();
    stats.forEach((item: any) => {
      xpByUserId.set(item.userId.toString(), sumXp(item.xpByDate));
    });

    const leaderboardUsers = users
      .map((user: any) => ({
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar,
        level: user.level,
        xp: xpByUserId.get(user._id.toString()) ?? 0,
        isCurrentUser: currentUserId === user._id.toString(),
      }))
      .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
      .slice(0, 50);

    res.json({ success: true, users: leaderboardUsers });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: (error as Error).message,
    });
  }
});

// GET /api/users/suggestions — list users the current user doesn't follow yet
router.get('/suggestions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = token ? verifyToken(token) : null;

    let excludeIds: mongoose.Types.ObjectId[] = [];
    if (decoded?.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
      const currentUserId = new mongoose.Types.ObjectId(decoded.id);
      const currentUser = await User.findById(currentUserId).select('following');
      excludeIds = [currentUserId, ...(currentUser?.following ?? [])];
    }

    const users = await User.find({
      _id: { $nin: excludeIds },
    })
      .select('name avatar email level')
      .limit(20);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user suggestions',
      error: (error as Error).message,
    });
  }
});

// POST /api/users/:userId/follow — follow a user
router.post('/:userId/follow', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user._id as mongoose.Types.ObjectId;
    const targetId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    if (currentUserId.toString() === targetId) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetId } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Follow failed',
      error: (error as Error).message,
    });
  }
});

// DELETE /api/users/:userId/follow — unfollow a user
router.delete('/:userId/follow', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user._id as mongoose.Types.ObjectId;
    const targetId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    await User.findByIdAndUpdate(currentUserId, { $pull: { following: new mongoose.Types.ObjectId(targetId) } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unfollow failed',
      error: (error as Error).message,
    });
  }
});

// GET /api/users/:userId/following — list users this account follows
router.get('/:userId/following', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const targetUser = await User.findById(userId).select('following');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const followingIds = targetUser.following ?? [];
    if (followingIds.length === 0) {
      return res.json({ success: true, users: [] });
    }

    const users = await User.find({ _id: { $in: followingIds } })
      .select('name avatar email level')
      .limit(200);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following list',
      error: (error as Error).message,
    });
  }
});

// GET /api/users/:userId/followers — list users following this account
router.get('/:userId/followers', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const targetUserExists = await User.exists({ _id: userId });
    if (!targetUserExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const users = await User.find({ following: userId })
      .select('name avatar email level')
      .limit(200);

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers list',
      error: (error as Error).message,
    });
  }
});

// GET /api/users/:userId — get a user's public profile
router.get('/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const currentUserId = req.user._id as mongoose.Types.ObjectId;
    const [targetUser, followersCount, currentUser] = await Promise.all([
      User.findById(userId).select('name avatar email level following createdAt'),
      User.countDocuments({ following: userId }),
      User.findById(currentUserId).select('following'),
    ]);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isFollowedByMe = (currentUser?.following ?? []).some(
      (id: mongoose.Types.ObjectId) => id.toString() === userId,
    );

    res.json({
      success: true,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar,
        email: targetUser.email,
        level: (targetUser as any).level,
        followingCount: targetUser.following?.length ?? 0,
        followersCount,
        isFollowedByMe,
        createdAt: (targetUser as any).createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: (error as Error).message,
    });
  }
});

// GET /api/users/:userId/posts — get a user's public posts
router.get('/:userId/posts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const isOwnProfile = req.user._id.toString() === userId;
    const visibilityCondition = isOwnProfile
      ? {}
      : { visibility: 'public' };

    const posts = await Post.find({ userId, isActive: true, ...visibilityCondition })
      .populate('userId', 'name avatar email level')
      .populate('comments.userId', 'name avatar email level')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(50);

    const currentUserId = req.user._id.toString();
    const enrichedPosts = posts.map((post: any) => {
      const data = post.toObject();
      const likes = Array.isArray(data.likes) ? data.likes : [];
      const comments = (Array.isArray(data.comments) ? data.comments : []).map((comment: any) => ({
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

      return {
        ...data,
        isLikedByMe: likes.some((id: mongoose.Types.ObjectId | string) => id.toString() === currentUserId),
        likes: undefined,
        comments,
      };
    });

    res.json({ success: true, posts: enrichedPosts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts',
      error: (error as Error).message,
    });
  }
});

export default router;
