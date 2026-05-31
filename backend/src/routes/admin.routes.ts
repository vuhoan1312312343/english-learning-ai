import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { Unit, IUnit } from '../models/Unit.model';
import { Lesson, ILesson } from '../models/Lesson.model';
import { Question } from '../models/Question.model';
import { UserProgress } from '../models/UserProgress.model';
import { UserLearningStats } from '../models/UserLearningStats.model';
import { Post } from '../models/Post.model';
import { Conversation } from '../models/Conversation.model';
import { Message } from '../models/Message.model';
import { LevelConfig } from '../models/LevelConfig.model';

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'default-secret-key';
const ADMIN_JWT_EXPIRE = process.env.ADMIN_JWT_EXPIRE || '7d';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const TILE_TYPES = ['star', 'dumbbell', 'book', 'trophy', 'fast-forward', 'treasure'] as const;
const LESSON_TYPES = ['star', 'book', 'dumbbell', 'trophy', 'treasure', 'fast-forward'] as const;
const QUESTION_TYPES = [
  'FLASHCARD',
  'READING_MCQ',
  'TRUE_FALSE',
  'MATCHING_HEADING',
  'SUMMARY_COMPLETION',
  'SELECT_1_OF_3',
  'WRITE_IN_ENGLISH',
  'INTERVIEW',
  'DESCRIBE_PICTURE',
  'DISCUSSION',
  'PRESENTATION',
  'ESSAY',
  'REPORT',
  'NARRATIVE',
  'GRAMMAR_INTRO',
] as const;
const QUESTION_DIFFICULTY = ['easy', 'medium', 'hard'] as const;
const ADMIN_SECTION_KEYS = [
  'vocabulary',
  'reading',
  'speaking',
  'writing',
  'grammar-focus',
  'practice',
  'unit-review',
] as const;

type LevelCode = (typeof LEVELS)[number];
type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];

const READING_TAGS = ['reading-mcq', 'true-false', 'matching-heading', 'summary-completion'] as const;
const SPEAKING_TAGS = ['interview', 'describe-picture', 'discussion', 'presentation'] as const;
const WRITING_TAGS = ['essay', 'report', 'narrative'] as const;
const PRACTICE_TAGS = ['sentence-ordering', 'word-ordering', 'sentence-formation'] as const;
const VOCABULARY_TAGS = ['flashcard'] as const;
const GRAMMAR_FOCUS_TAGS = ['grammar-intro'] as const;

const LESSON_SECTION_LABELS: Record<AdminSectionKey, string> = {
  'vocabulary': 'Vocabulary',
  'reading': 'Reading',
  'speaking': 'Speaking',
  'writing': 'Writing',
  'grammar-focus': 'Grammar Focus',
  'practice': 'Practice',
  'unit-review': 'Unit review',
};

const expectedLessonTypeBySection: Record<AdminSectionKey, (typeof LESSON_TYPES)[number]> = {
  'vocabulary': 'book',
  'reading': 'book',
  'speaking': 'book',
  'writing': 'book',
  'grammar-focus': 'book',
  'practice': 'dumbbell',
  'unit-review': 'trophy',
};

const categoryBySection = (unitNumber: number, section: AdminSectionKey): string => {
  switch (section) {
    case 'grammar-focus':
      return `unit${unitNumber}-grammar`;
    case 'unit-review':
      return `unit${unitNumber}-review`;
    default:
      return `unit${unitNumber}-${section}`;
  }
};

const parseSectionFromLessonTitle = (title: string): AdminSectionKey | null => {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes('conversation')) {
    return null;
  }

  if (/unit\s*\d+\s*review/.test(normalized) || normalized.endsWith(' - unit review')) {
    return 'unit-review';
  }

  if (normalized.endsWith(' - vocabulary')) return 'vocabulary';
  if (normalized.endsWith(' - reading')) return 'reading';
  if (normalized.endsWith(' - speaking')) return 'speaking';
  if (normalized.endsWith(' - writing')) return 'writing';
  if (normalized.endsWith(' - grammar focus')) return 'grammar-focus';
  if (normalized.endsWith(' - practice')) return 'practice';

  return null;
};

const validateLessonStructure = (
  title: string,
  type: string,
): { section: AdminSectionKey } | { error: string } => {
  if (title.toLowerCase().includes('conversation')) {
    return { error: 'Conversation section is not supported.' };
  }

  const section = parseSectionFromLessonTitle(title);
  if (!section) {
    return {
      error: 'Lesson title must end with one of: Vocabulary, Reading, Speaking, Writing, Grammar Focus, Practice, or Unit review.',
    };
  }

  const expectedType = expectedLessonTypeBySection[section];
  if (type !== expectedType) {
    return {
      error: `Invalid lesson type for ${LESSON_SECTION_LABELS[section]}. Expected type: ${expectedType}`,
    };
  }

  return { section };
};

const normalizeTags = (tags: string[] | undefined): string[] => {
  return Array.from(new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
};

const allowedTagsBySection: Record<Exclude<AdminSectionKey, 'unit-review'>, readonly string[]> = {
  'vocabulary': VOCABULARY_TAGS,
  'reading': READING_TAGS,
  'speaking': SPEAKING_TAGS,
  'writing': WRITING_TAGS,
  'grammar-focus': GRAMMAR_FOCUS_TAGS,
  'practice': PRACTICE_TAGS,
};

const validateAndNormalizeTagsForSection = (
  section: Exclude<AdminSectionKey, 'unit-review'>,
  tags: string[] | undefined,
): { ok: true; tags: string[] } | { ok: false; message: string } => {
  const normalizedTags = normalizeTags(tags);
  const allowedTags = allowedTagsBySection[section];

  const invalidTags = normalizedTags.filter(
    (tag) => !allowedTags.includes(tag as (typeof allowedTags)[number]),
  );
  if (invalidTags.length > 0) {
    return {
      ok: false,
      message: `${LESSON_SECTION_LABELS[section]} only accepts tags: ${allowedTags.join(', ')}`,
    };
  }

  return { ok: true, tags: normalizedTags };
};

const allowedQuestionTypesBySection: Record<Exclude<AdminSectionKey, 'unit-review'>, readonly string[]> = {
  'vocabulary': ['FLASHCARD'],
  'reading': ['READING_MCQ', 'TRUE_FALSE', 'MATCHING_HEADING', 'SUMMARY_COMPLETION'],
  'speaking': ['INTERVIEW', 'DESCRIBE_PICTURE', 'DISCUSSION', 'PRESENTATION'],
  'writing': ['ESSAY', 'REPORT', 'NARRATIVE'],
  'grammar-focus': ['GRAMMAR_INTRO'],
  'practice': ['SELECT_1_OF_3', 'WRITE_IN_ENGLISH'],
};

const validateQuestionSectionRules = (
  section: AdminSectionKey,
  questionType: string,
): { ok: true } | { ok: false; message: string } => {
  if (section === 'unit-review') {
    return {
      ok: false,
      message: 'Unit review does not accept direct questions. It auto-aggregates from other sections.',
    };
  }

  const allowedTypes = allowedQuestionTypesBySection[section];
  if (!allowedTypes.includes(questionType)) {
    return {
      ok: false,
      message: `${LESSON_SECTION_LABELS[section]} only accepts question types: ${allowedTypes.join(', ')}`,
    };
  }

  return { ok: true };
};

const DEFAULT_LEVEL_META: Record<(typeof LEVELS)[number], { name: string; description: string }> = {
  A1: { name: 'A1 - Beginner', description: 'Can understand and use familiar everyday expressions.' },
  A2: { name: 'A2 - Elementary', description: 'Can communicate in simple and routine tasks.' },
  B1: { name: 'B1 - Intermediate', description: 'Can deal with most situations while traveling.' },
  B2: { name: 'B2 - Upper Intermediate', description: 'Can interact with fluency and spontaneity.' },
  C1: { name: 'C1 - Advanced', description: 'Can use language flexibly for social and professional purposes.' },
  C2: { name: 'C2 - Proficient', description: 'Can understand virtually everything heard or read.' },
};

const syncUnitReviewLessons = async (unitNumber: number): Promise<void> => {
  const sourceCategories = [
    categoryBySection(unitNumber, 'vocabulary'),
    categoryBySection(unitNumber, 'reading'),
    categoryBySection(unitNumber, 'speaking'),
    categoryBySection(unitNumber, 'writing'),
    categoryBySection(unitNumber, 'grammar-focus'),
    categoryBySection(unitNumber, 'practice'),
  ];

  const sourceQuestions = await Question.find({
    isActive: true,
    category: { $in: sourceCategories },
  }).select('_id');

  const questionIds = sourceQuestions.map((item) => item._id);

  const reviewLessons = await Lesson.find({ unitNumber }).select('_id title type');
  const reviewLessonIds = reviewLessons
    .filter((lesson) => lesson.type === 'trophy' || parseSectionFromLessonTitle(lesson.title) === 'unit-review')
    .map((lesson) => lesson._id);

  if (!reviewLessonIds.length) return;

  await Lesson.updateMany(
    { _id: { $in: reviewLessonIds } },
    { $set: { questions: questionIds } },
  );
};

const syncLessonsLevelForUnits = async (
  unitNumbers: number[],
  level: LevelCode,
): Promise<void> => {
  const uniqueUnitNumbers = Array.from(
    new Set(unitNumbers.map((num) => Number(num)).filter((num) => Number.isFinite(num) && num > 0)),
  );

  if (!uniqueUnitNumbers.length) return;

  await Lesson.updateMany(
    { unitNumber: { $in: uniqueUnitNumbers } },
    { $set: { level } },
  );
};

const signAdminToken = (username: string): string => {
  return jwt.sign(
    { admin: true, username },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_JWT_EXPIRE } as jwt.SignOptions,
  );
};

const verifyAdminToken = (token: string): { admin?: boolean; username?: string } | null => {
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET) as { admin?: boolean; username?: string };
  } catch {
    return null;
  }
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: () => void) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No admin token provided' });
  }

  const decoded = verifyAdminToken(token);
  if (!decoded?.admin) {
    return res.status(401).json({ success: false, message: 'Invalid admin token' });
  }

  (req as AuthenticatedRequest & { admin?: { username?: string } }).admin = {
    username: decoded.username,
  };
  next();
};

const isSectionKey = (value: string): value is AdminSectionKey =>
  ADMIN_SECTION_KEYS.includes(value as AdminSectionKey);

const getTopicFromUnitDescription = (description: string): string => {
  const parts = description.split(':');
  if (parts.length < 2) {
    return description;
  }
  return parts.slice(1).join(':').trim();
};

const buildTilesFromSections = (
  sections: AdminSectionKey[],
  topic: string,
  unitNumber: number,
) => {
  return sections.map((section, order) => {
    switch (section) {
      case 'vocabulary':
        return { type: 'book' as const, description: `${topic} - Vocabulary`, order };
      case 'reading':
        return { type: 'book' as const, description: `${topic} - Reading`, order };
      case 'speaking':
        return { type: 'book' as const, description: `${topic} - Speaking`, order };
      case 'writing':
        return { type: 'book' as const, description: `${topic} - Writing`, order };
      case 'grammar-focus':
        return { type: 'book' as const, description: `${topic} - Grammar Focus`, order };
      case 'practice':
        return { type: 'dumbbell' as const, description: `${topic} - Practice`, order };
      case 'unit-review':
        return { type: 'trophy' as const, description: `Unit ${unitNumber} review`, order };
    }
  });
};

const buildLessonTitleFromSection = (
  section: AdminSectionKey,
  topic: string,
  unitNumber: number,
): string => {
  if (section === 'unit-review') {
    return `Unit ${unitNumber} review`;
  }

  return `${topic} - ${LESSON_SECTION_LABELS[section]}`;
};

const buildLessonDescriptionFromSection = (
  section: AdminSectionKey,
): string => {
  switch (section) {
    case 'vocabulary':
      return 'Vocabulary lesson';
    case 'reading':
      return 'Reading lesson';
    case 'speaking':
      return 'Speaking lesson';
    case 'writing':
      return 'Writing lesson';
    case 'grammar-focus':
      return 'Grammar Focus lesson';
    case 'practice':
      return 'Practice lesson';
    case 'unit-review':
      return 'Unit review lesson';
  }
};

const syncLessonsFromSections = async (
  unit: IUnit,
  sections: AdminSectionKey[],
  topic: string,
): Promise<void> => {
  const existingLessons = await Lesson.find({ unitNumber: unit.unitNumber }).sort({ lessonNumber: 1 });

  const sectionToLesson = new Map<AdminSectionKey, ILesson>();
  for (const lesson of existingLessons) {
    const section = parseSectionFromLessonTitle(lesson.title);
    if (section && !sectionToLesson.has(section)) {
      sectionToLesson.set(section, lesson);
    }
  }

  const activeLessonIds: mongoose.Types.ObjectId[] = [];

  for (const [index, section] of sections.entries()) {
    const existing = sectionToLesson.get(section);
    const title = buildLessonTitleFromSection(section, topic, unit.unitNumber);
    const description = buildLessonDescriptionFromSection(section);
    const payload = {
      lessonNumber: index + 1,
      level: unit.level,
      title,
      description,
      type: expectedLessonTypeBySection[section],
      isActive: true,
    };

    if (existing) {
      existing.lessonNumber = payload.lessonNumber;
      existing.level = payload.level;
      existing.title = payload.title;
      existing.description = payload.description;
      existing.type = payload.type;
      existing.isActive = true;
      await existing.save();
      activeLessonIds.push(existing._id);
      continue;
    }

    const created = await Lesson.create({
      unitNumber: unit.unitNumber,
      questions: [],
      ...payload,
    });
    activeLessonIds.push(created._id);
  }

  await Lesson.updateMany(
    {
      unitNumber: unit.unitNumber,
      _id: { $nin: activeLessonIds },
    },
    {
      $set: { isActive: false },
    },
  );

  if (sections.includes('unit-review')) {
    await syncUnitReviewLessons(unit.unitNumber);
  }
};

router.post('/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }

  const token = signAdminToken(username);
  res.json({ success: true, token, admin: { username } });
});

router.get('/me', requireAdmin, (req, res) => {
  const admin = (req as AuthenticatedRequest & { admin?: { username?: string } }).admin;
  res.json({ success: true, admin: { username: admin?.username ?? ADMIN_USERNAME } });
});

router.get('/users', requireAdmin, async (_req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: (error as Error).message,
    });
  }
});

router.patch('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const payload = req.body as {
      name?: string;
      email?: string;
      avatar?: string;
      level?: string;
    };

    if (payload.level && !LEVELS.includes(payload.level as LevelCode)) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.email !== undefined) updates.email = payload.email.trim().toLowerCase();
    if (payload.avatar !== undefined) updates.avatar = payload.avatar;
    if (payload.level !== undefined) updates.level = payload.level;

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: (error as Error).message,
    });
  }
});

router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const followingCount = Array.isArray(user.following) ? user.following.length : 0;
    const followersCount = await User.countDocuments({ following: user._id });

    const progressSummary = await UserProgress.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalLessons: { $sum: 1 },
          completedLessons: {
            $sum: {
              $cond: [{ $eq: ['$completed', true] }, 1, 0],
            },
          },
          averageScore: { $avg: '$score' },
          totalTimeSpentSeconds: { $sum: '$timeSpent' },
          totalCorrectAnswers: { $sum: '$correctAnswers' },
        },
      },
    ]);

    const stats = progressSummary[0]
      ? {
          totalLessons: Number(progressSummary[0].totalLessons ?? 0),
          completedLessons: Number(progressSummary[0].completedLessons ?? 0),
          averageScore: Math.round(Number(progressSummary[0].averageScore ?? 0)),
          totalTimeSpentSeconds: Number(progressSummary[0].totalTimeSpentSeconds ?? 0),
          totalCorrectAnswers: Number(progressSummary[0].totalCorrectAnswers ?? 0),
        }
      : {
          totalLessons: 0,
          completedLessons: 0,
          averageScore: 0,
          totalTimeSpentSeconds: 0,
          totalCorrectAnswers: 0,
        };

    res.json({
      success: true,
      user,
      profile: {
        followingCount,
        followersCount,
        stats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user detail',
      error: (error as Error).message,
    });
  }
});

router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(userObjectId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const conversations = await Conversation.find({ participants: userObjectId }).select('_id').lean();
    const conversationIds = conversations.map((conversation) => conversation._id);

    const [
      progressResult,
      statsResult,
      deletedPostsResult,
      postCleanupResult,
      followingCleanupResult,
      messagesResult,
      conversationsResult,
      deletedUser,
    ] = await Promise.all([
      UserProgress.deleteMany({ userId: userObjectId }),
      UserLearningStats.deleteMany({ userId: userObjectId }),
      Post.deleteMany({ userId: userObjectId }),
      Post.updateMany(
        {},
        { $pull: { likes: userObjectId, comments: { userId: userObjectId } } },
      ),
      User.updateMany(
        { following: userObjectId },
        { $pull: { following: userObjectId } },
      ),
      Message.deleteMany({
        $or: [
          { senderId: userObjectId },
          { conversationId: { $in: conversationIds } },
        ],
      }),
      Conversation.deleteMany({ _id: { $in: conversationIds } }),
      User.findByIdAndDelete(userObjectId),
    ]);

    await Post.collection.updateMany({}, [
      { $set: { likes: { $ifNull: ['$likes', []] }, comments: { $ifNull: ['$comments', []] } } },
      { $set: { likesCount: { $size: '$likes' }, commentsCount: { $size: '$comments' } } },
    ]);

    res.json({
      success: true,
      deletedUser,
      cleanup: {
        progress: progressResult.deletedCount,
        learningStats: statsResult.deletedCount,
        posts: deletedPostsResult.deletedCount,
        postReferences: postCleanupResult.modifiedCount,
        followingReferences: followingCleanupResult.modifiedCount,
        messages: messagesResult.deletedCount,
        conversations: conversationsResult.deletedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: (error as Error).message,
    });
  }
});

router.get('/levels', requireAdmin, async (_req, res) => {
  try {
    const [savedLevelConfigs, units] = await Promise.all([
      LevelConfig.find({}).lean(),
      Unit.find({}).sort({ unitNumber: 1 }).lean(),
    ]);

    const configMap = new Map(savedLevelConfigs.map((config) => [config.code, config]));
    const levels = LEVELS.map((code) => {
      const saved = configMap.get(code);
      const defaultMeta = DEFAULT_LEVEL_META[code];
      const unitsByLevel = units.filter((unit) => unit.level === code);

      return {
        code,
        name: saved?.name ?? defaultMeta.name,
        description: saved?.description ?? defaultMeta.description,
        unitCount: unitsByLevel.length,
      };
    });

    res.json({ success: true, levels });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch levels',
      error: (error as Error).message,
    });
  }
});

router.get('/levels/:level', requireAdmin, async (req, res) => {
  try {
    const code = req.params.level.toUpperCase();
    if (!LEVELS.includes(code as (typeof LEVELS)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    const [savedConfig, units] = await Promise.all([
      LevelConfig.findOne({ code }).lean(),
      Unit.find({}).sort({ unitNumber: 1 }).lean(),
    ]);

    const levelCode = code as (typeof LEVELS)[number];
    const defaultMeta = DEFAULT_LEVEL_META[levelCode];
    const levelUnits = units.filter((unit) => unit.level === levelCode);

    res.json({
      success: true,
      level: {
        code: levelCode,
        name: savedConfig?.name ?? defaultMeta.name,
        description: savedConfig?.description ?? defaultMeta.description,
      },
      units,
      selectedUnitNumbers: levelUnits.map((unit) => unit.unitNumber),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch level detail',
      error: (error as Error).message,
    });
  }
});

router.patch('/levels/:level', requireAdmin, async (req, res) => {
  try {
    const code = req.params.level.toUpperCase();
    if (!LEVELS.includes(code as (typeof LEVELS)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    const payload = req.body as { name?: string; description?: string };
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.description !== undefined) updates.description = payload.description.trim();

    const updated = await LevelConfig.findOneAndUpdate(
      { code },
      {
        $set: {
          code,
          ...updates,
        },
      },
      { upsert: true, new: true },
    ).lean();

    res.json({ success: true, level: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update level',
      error: (error as Error).message,
    });
  }
});

router.patch('/levels/:level/units', requireAdmin, async (req, res) => {
  try {
    const code = req.params.level.toUpperCase();
    if (!LEVELS.includes(code as (typeof LEVELS)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    const payload = req.body as {
      unitNumbers?: number[];
      removeUnitNumbers?: number[];
      fallbackLevel?: string;
    };

    const selectedUnitNumbers = Array.from(
      new Set((payload.unitNumbers ?? []).map((num) => Number(num)).filter((num) => Number.isFinite(num) && num > 0)),
    );

    const selectedUnitNumberSet = new Set(selectedUnitNumbers);
    const currentLevelUnits = await Unit.find({ level: code }).select('unitNumber').lean();
    const currentLevelUnitNumbers = currentLevelUnits
      .map((unit) => Number(unit.unitNumber))
      .filter((num) => Number.isFinite(num) && num > 0);

    const requestedRemoveUnitNumbers = (payload.removeUnitNumbers ?? [])
      .map((num) => Number(num))
      .filter((num) => Number.isFinite(num) && num > 0);

    const removeUnitNumbers = Array.from(
      new Set([
        ...currentLevelUnitNumbers.filter((unitNumber) => !selectedUnitNumberSet.has(unitNumber)),
        ...requestedRemoveUnitNumbers,
      ]),
    ).filter((unitNumber) => !selectedUnitNumberSet.has(unitNumber));

    if (selectedUnitNumbers.length === 0 && removeUnitNumbers.length === 0) {
      return res.json({
        success: true,
        matchedUnits: 0,
        updatedUnits: 0,
        removedMatchedUnits: 0,
        removedUpdatedUnits: 0,
        level: code,
        unitNumbers: selectedUnitNumbers,
        removeUnitNumbers,
      });
    }

    const fallbackCandidate = (payload.fallbackLevel ?? '').toUpperCase();
    const fallbackLevel = (
      LEVELS.includes(fallbackCandidate as LevelCode) && fallbackCandidate !== code
        ? fallbackCandidate
        : LEVELS.find((level) => level !== code) ?? 'A1'
    ) as LevelCode;

    let removeResult = { matchedCount: 0, modifiedCount: 0 };
    if (removeUnitNumbers.length > 0) {
      removeResult = await Unit.updateMany(
        {
          unitNumber: { $in: removeUnitNumbers },
          level: code,
        },
        { $set: { level: fallbackLevel } },
      );
      await syncLessonsLevelForUnits(removeUnitNumbers, fallbackLevel);
    }

    let assignResult = { matchedCount: 0, modifiedCount: 0 };
    if (selectedUnitNumbers.length > 0) {
      assignResult = await Unit.updateMany(
        { unitNumber: { $in: selectedUnitNumbers } },
        { $set: { level: code } },
      );
      await syncLessonsLevelForUnits(selectedUnitNumbers, code as LevelCode);
    }

    res.json({
      success: true,
      matchedUnits: assignResult.matchedCount,
      updatedUnits: assignResult.modifiedCount,
      removedMatchedUnits: removeResult.matchedCount,
      removedUpdatedUnits: removeResult.modifiedCount,
      level: code,
      fallbackLevel,
      unitNumbers: selectedUnitNumbers,
      removeUnitNumbers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign units to level',
      error: (error as Error).message,
    });
  }
});

router.get('/units', requireAdmin, async (req, res) => {
  try {
    const requestedLevel = (req.query.level as string | undefined)?.toUpperCase();
    const query =
      requestedLevel && LEVELS.includes(requestedLevel as (typeof LEVELS)[number])
        ? { level: requestedLevel }
        : {};

    const units = await Unit.find(query).sort({ unitNumber: 1 });
    res.json({ success: true, units, availableSections: ADMIN_SECTION_KEYS });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
      error: (error as Error).message,
    });
  }
});

router.get('/units/:unitNumber', requireAdmin, async (req, res) => {
  try {
    const unitNumber = parseInt(req.params.unitNumber, 10);
    const unit = await Unit.findOne({ unitNumber });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const lessons = await Lesson.find({ unitNumber, isActive: true }).sort({ lessonNumber: 1 });
    res.json({ success: true, unit, lessons, availableSections: ADMIN_SECTION_KEYS });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unit details',
      error: (error as Error).message,
    });
  }
});

router.patch('/units/:unitNumber', requireAdmin, async (req, res) => {
  try {
    const unitNumber = parseInt(req.params.unitNumber, 10);
    const payload = req.body as {
      description?: string;
      level?: string;
      backgroundColor?: string;
      textColor?: string;
      borderColor?: string;
      isActive?: boolean;
      tiles?: Array<{ type: string; description?: string; order: number }>;
    };

    if (payload.level && !LEVELS.includes(payload.level as (typeof LEVELS)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    if (payload.tiles) {
      const hasInvalidTile = payload.tiles.some((tile) => !TILE_TYPES.includes(tile.type as (typeof TILE_TYPES)[number]));
      if (hasInvalidTile) {
        return res.status(400).json({ success: false, message: 'Invalid tile type in tiles array' });
      }
    }

    const updates: Record<string, unknown> = {};
    if (payload.description !== undefined) updates.description = payload.description.trim();
    if (payload.level !== undefined) updates.level = payload.level;
    if (payload.backgroundColor !== undefined) updates.backgroundColor = payload.backgroundColor.trim();
    if (payload.textColor !== undefined) updates.textColor = payload.textColor.trim();
    if (payload.borderColor !== undefined) updates.borderColor = payload.borderColor.trim();
    if (payload.isActive !== undefined) updates.isActive = payload.isActive;
    if (payload.tiles !== undefined) {
      updates.tiles = payload.tiles;
      updates.tilesCustomizedByAdmin = true;
    }

    const unit = await Unit.findOneAndUpdate({ unitNumber }, { $set: updates }, { new: true });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    if (payload.level !== undefined) {
      await syncLessonsLevelForUnits([unitNumber], unit.level as LevelCode);
    }

    res.json({ success: true, unit });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      error: (error as Error).message,
    });
  }
});

router.patch('/units/:unitNumber/sections', requireAdmin, async (req, res) => {
  try {
    const unitNumber = parseInt(req.params.unitNumber, 10);
    const { sections } = req.body as { sections?: string[] };

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ success: false, message: 'sections must be a non-empty array' });
    }

    const normalized = sections.map((section) => section.trim().toLowerCase());
    if (normalized.some((section) => !isSectionKey(section))) {
      return res.status(400).json({
        success: false,
        message: `Invalid section key. Allowed: ${ADMIN_SECTION_KEYS.join(', ')}`,
      });
    }

    const uniqueSections = Array.from(new Set(normalized)) as AdminSectionKey[];
    const unit = await Unit.findOne({ unitNumber });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    const topic = getTopicFromUnitDescription(unit.description);
    unit.tiles = buildTilesFromSections(uniqueSections, topic, unitNumber);
    unit.tilesCustomizedByAdmin = true;
    await unit.save();

    await syncLessonsFromSections(unit, uniqueSections, topic);

    res.json({ success: true, unit, availableSections: ADMIN_SECTION_KEYS });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update unit sections',
      error: (error as Error).message,
    });
  }
});

router.post('/units/:unitNumber/sections/reset', requireAdmin, async (req, res) => {
  try {
    const unitNumber = parseInt(req.params.unitNumber, 10);
    const unit = await Unit.findOne({ unitNumber });
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }

    unit.tilesCustomizedByAdmin = false;
    await unit.save();

    res.json({
      success: true,
      message: 'Reset successful. Re-run seed to apply default tiles.',
      unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset section configuration',
      error: (error as Error).message,
    });
  }
});

router.get('/units/:unitNumber/lessons', requireAdmin, async (req, res) => {
  try {
    const unitNumber = parseInt(req.params.unitNumber, 10);
    const lessons = await Lesson.find({ unitNumber, isActive: true }).sort({ lessonNumber: 1 });
    res.json({ success: true, lessons });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lessons',
      error: (error as Error).message,
    });
  }
});

router.post('/units/:unitNumber/lessons', requireAdmin, async (req, res) => {
  try {
    const unitNumber = parseInt(req.params.unitNumber, 10);
    const payload = req.body as {
      lessonNumber?: number;
      level: string;
      title: string;
      description?: string;
      type: string;
      questions?: string[];
    };

    if (!LEVELS.includes(payload.level as (typeof LEVELS)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    if (!LESSON_TYPES.includes(payload.type as (typeof LESSON_TYPES)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid lesson type' });
    }

    const lessonStructure = validateLessonStructure(payload.title, payload.type);
    if ('error' in lessonStructure) {
      return res.status(400).json({ success: false, message: lessonStructure.error });
    }

    const maxLesson = await Lesson.findOne({ unitNumber }).sort({ lessonNumber: -1 }).select('lessonNumber');
    const lessonNumber = payload.lessonNumber ?? ((maxLesson?.lessonNumber ?? 0) + 1);

    const lesson = await Lesson.create({
      unitNumber,
      lessonNumber,
      level: payload.level,
      title: payload.title,
      description: payload.description ?? '',
      type: payload.type,
      questions: (payload.questions ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id)),
      isActive: true,
    });

    const section = parseSectionFromLessonTitle(payload.title);
    if (section === 'unit-review') {
      await syncUnitReviewLessons(unitNumber);
    }

    res.status(201).json({ success: true, lesson });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create lesson',
      error: (error as Error).message,
    });
  }
});

router.patch('/lessons/:lessonId', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson id' });
    }

    const payload = req.body as {
      lessonNumber?: number;
      level?: string;
      title?: string;
      description?: string;
      type?: string;
      isActive?: boolean;
      questions?: string[];
    };

    if (payload.level && !LEVELS.includes(payload.level as (typeof LEVELS)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid level' });
    }

    if (payload.type && !LESSON_TYPES.includes(payload.type as (typeof LESSON_TYPES)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid lesson type' });
    }

    const currentLesson = await Lesson.findById(lessonId).select('title type');
    if (!currentLesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const nextTitle = payload.title ?? currentLesson.title;
    const nextType = payload.type ?? currentLesson.type;
    const lessonStructure = validateLessonStructure(nextTitle, nextType);
    if ('error' in lessonStructure) {
      return res.status(400).json({ success: false, message: lessonStructure.error });
    }

    const updates: Record<string, unknown> = {};
    if (payload.lessonNumber !== undefined) updates.lessonNumber = payload.lessonNumber;
    if (payload.level !== undefined) updates.level = payload.level;
    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.type !== undefined) updates.type = payload.type;
    if (payload.isActive !== undefined) updates.isActive = payload.isActive;
    if (payload.questions !== undefined) {
      updates.questions = payload.questions.filter((id) => mongoose.Types.ObjectId.isValid(id));
    }

    const lesson = await Lesson.findByIdAndUpdate(lessonId, { $set: updates }, { new: true });
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const section = parseSectionFromLessonTitle(lesson.title);
    if (section === 'unit-review') {
      await syncUnitReviewLessons(lesson.unitNumber);
    }

    res.json({ success: true, lesson });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update lesson',
      error: (error as Error).message,
    });
  }
});

router.delete('/lessons/:lessonId', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson id' });
    }

    const deleted = await Lesson.findByIdAndDelete(lessonId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete lesson',
      error: (error as Error).message,
    });
  }
});

router.get('/lessons/:lessonId/questions', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson id' });
    }

    const lesson = await Lesson.findById(lessonId).populate('questions');
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    res.json({ success: true, lesson, questions: lesson.questions });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lesson questions',
      error: (error as Error).message,
    });
  }
});

router.post('/lessons/:lessonId/questions', requireAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ success: false, message: 'Invalid lesson id' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const payload = req.body as {
      type: string;
      question: string;
      questionInVietnamese: string;
      questionImage?: string;
      answers?: Array<{ icon?: string; name: string }>;
      answerTiles?: string[];
      correctAnswer: number | number[];
      explanation?: string;
      difficulty?: string;
      category?: string;
      tags?: string[];
    };

    if (!QUESTION_TYPES.includes(payload.type as (typeof QUESTION_TYPES)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid question type' });
    }

    if (payload.difficulty && !QUESTION_DIFFICULTY.includes(payload.difficulty as (typeof QUESTION_DIFFICULTY)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid difficulty' });
    }

    const lessonSection = parseSectionFromLessonTitle(lesson.title);
    if (!lessonSection) {
      return res.status(400).json({
        success: false,
        message: 'Lesson title does not match allowed sections or is Conversation, which is not supported.',
      });
    }

    const ruleCheck = validateQuestionSectionRules(lessonSection, payload.type);
    if (!ruleCheck.ok) {
      return res.status(400).json({ success: false, message: ruleCheck.message });
    }

    const normalizedTagResult = validateAndNormalizeTagsForSection(
      lessonSection as Exclude<AdminSectionKey, 'unit-review'>,
      payload.tags,
    );
    if (!normalizedTagResult.ok) {
      return res.status(400).json({ success: false, message: normalizedTagResult.message });
    }

    const category = categoryBySection(lesson.unitNumber, lessonSection);

    const question = await Question.create({
      type: payload.type,
      question: payload.question,
      questionInVietnamese: payload.questionInVietnamese,
      questionImage: payload.questionImage,
      answers: payload.answers,
      answerTiles: payload.answerTiles,
      correctAnswer: payload.correctAnswer,
      explanation: payload.explanation,
      difficulty: payload.difficulty ?? 'easy',
      category,
      tags: normalizedTagResult.tags,
      isActive: true,
    });

    lesson.questions.push(question._id);
    await lesson.save();

    await syncUnitReviewLessons(lesson.unitNumber);

    res.status(201).json({ success: true, question, lesson });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: (error as Error).message,
    });
  }
});

router.patch('/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: 'Invalid question id' });
    }

    const payload = req.body as Partial<{
      type: string;
      question: string;
      questionInVietnamese: string;
      questionImage: string;
      answers: Array<{ icon?: string; name: string }>;
      answerTiles: string[];
      correctAnswer: number | number[];
      explanation: string;
      difficulty: string;
      category: string;
      tags: string[];
      isActive: boolean;
    }>;

    if (payload.type && !QUESTION_TYPES.includes(payload.type as (typeof QUESTION_TYPES)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid question type' });
    }

    if (payload.difficulty && !QUESTION_DIFFICULTY.includes(payload.difficulty as (typeof QUESTION_DIFFICULTY)[number])) {
      return res.status(400).json({ success: false, message: 'Invalid difficulty' });
    }

    const linkedLessons = await Lesson.find({ questions: new mongoose.Types.ObjectId(questionId) }).select('title unitNumber');
    const linkedSections = new Set<AdminSectionKey>();
    const linkedUnitNumbers = new Set<number>();
    for (const lesson of linkedLessons) {
      const section = parseSectionFromLessonTitle(lesson.title);
      if (section) linkedSections.add(section);
      linkedUnitNumbers.add(lesson.unitNumber);
    }

    const nextPayload = { ...payload };
    const requestedType = nextPayload.type;
    if (requestedType) {
      for (const section of linkedSections) {
        if (section === 'unit-review') continue;
        const ruleCheck = validateQuestionSectionRules(section, requestedType);
        if (!ruleCheck.ok) {
          return res.status(400).json({ success: false, message: ruleCheck.message });
        }
      }
    }

    if (nextPayload.tags) {
      let normalizedTags = normalizeTags(nextPayload.tags);
      for (const section of linkedSections) {
        if (section === 'unit-review') continue;
        const tagValidation = validateAndNormalizeTagsForSection(
          section as Exclude<AdminSectionKey, 'unit-review'>,
          normalizedTags,
        );
        if (!tagValidation.ok) {
          return res.status(400).json({ success: false, message: tagValidation.message });
        }
        normalizedTags = tagValidation.tags;
      }
      nextPayload.tags = normalizedTags;
    }

    const question = await Question.findByIdAndUpdate(questionId, { $set: nextPayload }, { new: true });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    for (const unitNumber of linkedUnitNumbers) {
      await syncUnitReviewLessons(unitNumber);
    }

    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: (error as Error).message,
    });
  }
});

router.delete('/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: 'Invalid question id' });
    }

    const linkedLessons = await Lesson.find({ questions: new mongoose.Types.ObjectId(questionId) }).select('title unitNumber');
    const linkedUnitNumbers = Array.from(new Set(linkedLessons.map((lesson) => lesson.unitNumber)));
    await Lesson.updateMany(
      { questions: new mongoose.Types.ObjectId(questionId) },
      { $pull: { questions: new mongoose.Types.ObjectId(questionId) } },
    );

    const deleted = await Question.findByIdAndDelete(questionId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    for (const unitNumber of linkedUnitNumbers) {
      await syncUnitReviewLessons(unitNumber);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: (error as Error).message,
    });
  }
});

export default router;
