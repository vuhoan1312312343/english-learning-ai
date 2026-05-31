import path from 'path';
import fs from 'fs';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import passport from '../config/passport';
import { generateToken } from '../utils/jwt';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { UserLearningStats } from '../models/UserLearningStats.model';

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/image\/(jpeg|png|gif|webp)/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, png, gif, webp) are allowed'));
    }
  },
});

const router = Router();

const isValidAvatarValue = (value: string): boolean => {
  if (/^https?:\/\/.+/i.test(value)) return true;
  // Accept locally uploaded avatar paths returned by POST /api/auth/upload-avatar
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  return false;
};

const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const VALID_GOAL_XP = [1, 10, 20, 30, 50] as const;

const toPlainXpByDate = (value: unknown): Record<string, number> => {
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, xp]) => typeof xp === 'number' && Number.isFinite(xp))
        .map(([date, xp]) => [date, Math.max(0, Math.floor(xp as number))])
    );
  }
  return {};
};

// Register with email/password
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
    });

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        level: user.level,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: (error as Error).message,
    });
  }
});

// Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user has password (not OAuth-only user)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Please sign in with Google',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        level: user.level,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: (error as Error).message,
    });
  }
});

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const token = generateToken(user._id.toString());

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
    }
  }
);

// Get current user
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      level: user.level,
    },
  });
});

router.patch('/level', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { level } = req.body as { level?: string };

    if (!level || !VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])) {
      return res.status(400).json({
        success: false,
        message: 'Invalid level. Allowed values: A1, A2, B1, B2, C1, C2',
      });
    }

    req.user.level = level;
    await req.user.save();

    res.json({
      success: true,
      message: 'User level updated successfully',
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        level: req.user.level,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user level',
      error: (error as Error).message,
    });
  }
});

// Upload avatar image
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Delete old avatar file if it was a local upload
    if (req.user.avatar) {
      const oldFilename = req.user.avatar.split('/uploads/')[1];
      if (oldFilename) {
        const oldPath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    req.user.avatar = avatarUrl;
    await req.user.save();

    res.json({
      success: true,
      avatarUrl,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatar: avatarUrl,
        level: req.user.level,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'Upload failed',
    });
  }
});

// Update profile (name + avatar)
router.patch('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, avatar } = req.body as { name?: string; avatar?: string };

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      if (trimmed.length > 100) {
        return res.status(400).json({ success: false, message: 'Name is too long' });
      }
      req.user.name = trimmed;
    }

    if (avatar !== undefined) {
      const normalizedAvatar = avatar.trim();

      // Allow empty string to clear avatar, otherwise require a valid external URL or local uploaded path.
      if (normalizedAvatar !== '' && !isValidAvatarValue(normalizedAvatar)) {
        return res.status(400).json({
          success: false,
          message: 'Avatar must be a valid http/https URL or /uploads/... path',
        });
      }

      req.user.avatar = normalizedAvatar || undefined;
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        level: req.user.level,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: (error as Error).message,
    });
  }
});

// Change password
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // OAuth-only users have no password
    if (!req.user.password) {
      return res.status(400).json({ success: false, message: 'This account uses Google login and has no password' });
    }

    const isValid = await bcrypt.compare(currentPassword, req.user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: (error as Error).message,
    });
  }
});

router.get('/learning-stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await UserLearningStats.findOne({ userId: req.user._id });
    if (!existing) {
      return res.json({
        success: true,
        data: {
          goalXp: 10,
          xpByDate: {},
        },
      });
    }

    const xpByDate = toPlainXpByDate(existing.xpByDate);

    res.json({
      success: true,
      data: {
        goalXp: existing.goalXp,
        xpByDate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning stats',
      error: (error as Error).message,
    });
  }
});

router.patch('/learning-stats', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { goalXp, xpByDate } = req.body as {
      goalXp?: number;
      xpByDate?: Record<string, number>;
    };

    const updates: {
      goalXp?: 1 | 10 | 20 | 30 | 50;
      xpByDate?: Record<string, number>;
    } = {};

    if (goalXp !== undefined) {
      if (!VALID_GOAL_XP.includes(goalXp as (typeof VALID_GOAL_XP)[number])) {
        return res.status(400).json({
          success: false,
          message: 'Invalid goalXp. Allowed values: 1, 10, 20, 30, 50',
        });
      }
      updates.goalXp = goalXp as 1 | 10 | 20 | 30 | 50;
    }

    if (xpByDate !== undefined) {
      if (typeof xpByDate !== 'object' || xpByDate === null || Array.isArray(xpByDate)) {
        return res.status(400).json({
          success: false,
          message: 'xpByDate must be an object of {dateString: number}',
        });
      }

      const sanitized = Object.fromEntries(
        Object.entries(xpByDate)
          .filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'number' && Number.isFinite(value))
          .map(([key, value]) => [key, Math.max(0, Math.floor(value))])
      );
      updates.xpByDate = sanitized;
    }

    const stats = await UserLearningStats.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates, $setOnInsert: { userId: req.user._id } },
      { new: true, upsert: true }
    );

    const responseXpByDate = toPlainXpByDate(stats.xpByDate);

    res.json({
      success: true,
      data: {
        goalXp: stats.goalXp,
        xpByDate: responseXpByDate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update learning stats',
      error: (error as Error).message,
    });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
