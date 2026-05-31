import { Router, Request, Response } from 'express';
import { Lesson } from '../models/Lesson.model';
import { Question } from '../models/Question.model';
import { Unit } from '../models/Unit.model';
import { UserProgress } from '../models/UserProgress.model';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User.model';

const router = Router();


type CEFLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

const LEVEL_ORDER: CEFLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const parseRequestedLevel = (value?: string): CEFLevel | null => {
  if (!value) return null;
  const upper = value.toUpperCase() as CEFLevel;
  return LEVEL_ORDER.includes(upper) ? upper : null;
};

const resolveLevelFilter = (level: CEFLevel) => {
  const currentLevelIndex = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER.slice(0, currentLevelIndex + 1);
};

const canAccessLevel = (userLevel: CEFLevel, contentLevel: CEFLevel): boolean => {
  return LEVEL_ORDER.indexOf(contentLevel) <= LEVEL_ORDER.indexOf(userLevel);
};

const syncLessonLevelsWithUnit = async (unitNumber: number, level: CEFLevel): Promise<void> => {
  await Lesson.updateMany(
    { unitNumber },
    { $set: { level } },
  );
};

const getCurrentUserLevel = async (req: Request): Promise<CEFLevel> => {
  const requestedLevel = parseRequestedLevel(req.query.level as string | undefined);
  if (requestedLevel) {
    return requestedLevel;
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return 'A1';
  }

  const decoded = verifyToken(token);
  if (!decoded?.id) {
    return 'A1';
  }

  const user = await User.findById(decoded.id).select('level');
  if (!user?.level) {
    return 'A1';
  }

  return user.level as CEFLevel;
};

router.get('/units', async (req: Request, res: Response) => {
  try {
    const requestedLevel = parseRequestedLevel(req.query.level as string | undefined);
    const currentUserLevel = await getCurrentUserLevel(req);
    const levelsToInclude = requestedLevel
      ? [requestedLevel]
      : resolveLevelFilter(currentUserLevel);
    const units = await Unit.find({ isActive: true, level: { $in: levelsToInclude } }).sort({ unitNumber: 1 });

    res.json({
      success: true,
      currentUserLevel,
      units,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
      error: (error as Error).message,
    });
  }
});

router.get('/units/:unitNumber', async (req: Request, res: Response) => {
  try {
    const requestedLevel = parseRequestedLevel(req.query.level as string | undefined);
    const currentUserLevel = await getCurrentUserLevel(req);
    const levelsToInclude = requestedLevel
      ? [requestedLevel]
      : resolveLevelFilter(currentUserLevel);
    const unit = await Unit.findOne({
      unitNumber: parseInt(req.params.unitNumber, 10),
      isActive: true,
      level: { $in: levelsToInclude },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    await syncLessonLevelsWithUnit(unit.unitNumber, unit.level as CEFLevel);

    res.json({
      success: true,
      currentUserLevel,
      unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unit',
      error: (error as Error).message,
    });
  }
});

// Get all lessons for a unit
router.get('/units/:unitNumber/lessons', async (req: Request, res: Response) => {
  try {
    const { unitNumber } = req.params;
    const requestedLevel = parseRequestedLevel(req.query.level as string | undefined);
    const currentUserLevel = await getCurrentUserLevel(req);
    const levelsToInclude = requestedLevel
      ? [requestedLevel]
      : resolveLevelFilter(currentUserLevel);
    const unit = await Unit.findOne({
      unitNumber: parseInt(unitNumber, 10),
      isActive: true,
      level: { $in: levelsToInclude },
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    await syncLessonLevelsWithUnit(unit.unitNumber, unit.level as CEFLevel);

    const lessons = await Lesson.find({ 
      unitNumber: parseInt(unitNumber, 10),
      isActive: true,
      level: unit.level,
    }).sort({ lessonNumber: 1 });

    res.json({
      success: true,
      currentUserLevel,
      lessons,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lessons',
      error: (error as Error).message,
    });
  }
});

// Get lesson with questions
router.get('/lessons/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const currentUserLevel = await getCurrentUserLevel(req);
    const lesson = await Lesson.findById(lessonId).populate('questions');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (!canAccessLevel(currentUserLevel, lesson.level as CEFLevel)) {
      return res.status(403).json({
        success: false,
        message: 'This lesson is above your current level',
      });
    }

    res.json({
      success: true,
      currentUserLevel,
      lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lesson',
      error: (error as Error).message,
    });
  }
});

// Get questions for a lesson
router.get('/lessons/:lessonId/questions', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const currentUserLevel = await getCurrentUserLevel(req);
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (!canAccessLevel(currentUserLevel, lesson.level as CEFLevel)) {
      return res.status(403).json({
        success: false,
        message: 'This lesson is above your current level',
      });
    }

    const questions = await Question.find({
      _id: { $in: lesson.questions },
      isActive: true,
    });

    res.json({
      success: true,
      currentUserLevel,
      questions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: (error as Error).message,
    });
  }
});

// Save user progress (requires authentication)
router.post('/progress', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lessonId, completed, score, totalQuestions, correctAnswers, incorrectAnswers, timeSpent } = req.body;
    const userId = req.user._id;

    let progress = await UserProgress.findOne({ userId, lessonId });

    if (progress) {
      // Update existing progress
      progress.completed = completed || progress.completed;
      progress.score = Math.max(score || 0, progress.score);
      progress.totalQuestions = totalQuestions || progress.totalQuestions;
      progress.correctAnswers = correctAnswers || progress.correctAnswers;
      progress.incorrectAnswers = incorrectAnswers || progress.incorrectAnswers;
      progress.timeSpent += timeSpent || 0;
      if (completed && !progress.completedAt) {
        progress.completedAt = new Date();
      }
      await progress.save();
    } else {
      // Create new progress
      progress = await UserProgress.create({
        userId,
        lessonId,
        completed: completed || false,
        score: score || 0,
        totalQuestions: totalQuestions || 0,
        correctAnswers: correctAnswers || 0,
        incorrectAnswers: incorrectAnswers || 0,
        timeSpent: timeSpent || 0,
        completedAt: completed ? new Date() : undefined,
      });
    }

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save progress',
      error: (error as Error).message,
    });
  }
});

// Get user progress for all lessons (requires authentication)
router.get('/progress', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user._id;
    const progress = await UserProgress.find({ userId }).populate('lessonId');

    res.json({
      success: true,
      progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress',
      error: (error as Error).message,
    });
  }
});

export default router;
