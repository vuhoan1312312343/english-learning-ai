import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/database';
import { Lesson } from '../models/Lesson.model';
import { Question } from '../models/Question.model';
import { Unit } from '../models/Unit.model';

type CEFLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

const getLevelByUnitNumber = (unitNumber: number): CEFLevel => {
  if (unitNumber >= 1 && unitNumber <= 15) return 'A1';
  if (unitNumber >= 16 && unitNumber <= 33) return 'A2';
  if (unitNumber >= 34 && unitNumber <= 53) return 'B1';
  if (unitNumber >= 54 && unitNumber <= 71) return 'B2';
  if (unitNumber >= 72 && unitNumber <= 87) return 'C1';
  return 'C2';
};

type LevelTheme = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
};

const LEVEL_THEME: Record<CEFLevel, LevelTheme> = {
  A1: { backgroundColor: 'bg-[#58cc02]', textColor: 'text-[#58cc02]', borderColor: 'border-[#46a302]' },
  A2: { backgroundColor: 'bg-[#1cb0f6]', textColor: 'text-[#1cb0f6]', borderColor: 'border-[#1899d6]' },
  B1: { backgroundColor: 'bg-[#ce82ff]', textColor: 'text-[#ce82ff]', borderColor: 'border-[#a568cc]' },
  B2: { backgroundColor: 'bg-[#ff9600]', textColor: 'text-[#ff9600]', borderColor: 'border-[#d87f00]' },
  C1: { backgroundColor: 'bg-[#00cd9c]', textColor: 'text-[#00cd9c]', borderColor: 'border-[#00a47d]' },
  C2: { backgroundColor: 'bg-[#ff4b4b]', textColor: 'text-[#ff4b4b]', borderColor: 'border-[#d73f3f]' },
};

const CURRICULUM_BY_LEVEL: Record<CEFLevel, string[]> = {
  A1: [
    'Alphabet and Pronunciation',
    'Greetings and Introductions',
    'Numbers and Time',
    'Personal Information',
    'Family and Relationships',
    'Daily Routine',
    'Food and Drink Basics',
    'Shopping Essentials',
    'Places in the City',
    'Directions and Navigation',
    'Jobs and Occupations',
    'Hobbies and Free Time',
    'Basic Grammar: Be and Have',
    'Present Simple Practice',
    'A1 Comprehensive Review',
  ],
  A2: [
    'Past Simple Foundations',
    'Future with Going To',
    'Comparatives and Superlatives',
    'Travel Situations',
    'Health and Common Symptoms',
    'Weather and Seasons',
    'Entertainment and Media',
    'Technology in Daily Life',
    'Invitations and Plans',
    'Describing People and Personality',
    'Giving Opinions Clearly',
    'Restaurant Conversations',
    'Problems and Solutions',
    'Email Writing Basics',
    'Reading Short Stories',
    'Listening Practice A2',
    'Conversation Practice A2',
    'A2 Comprehensive Review',
  ],
  B1: [
    'Present Perfect in Context',
    'Passive Voice Essentials',
    'Conditionals in Everyday English',
    'Talking About Experiences',
    'Culture and Traditions',
    'Work and Career Communication',
    'Education and Learning',
    'News and Current Events',
    'Social Media Communication',
    'Problem Solving Strategies',
    'Debate Fundamentals',
    'Essay Writing Basics',
    'Storytelling Skills',
    'Advanced Listening B1',
    'Pronunciation Accuracy',
    'B1 Review 1',
    'B1 Review 2',
    'Formal vs Informal Registers',
    'Collocations and Natural Phrases',
    'B1 Final Review',
  ],
  B2: [
    'Advanced Conditionals',
    'Reported Speech Mastery',
    'Business Communication',
    'Academic Reading Techniques',
    'Presentation Skills',
    'Critical Thinking in English',
    'Formal Writing Strategies',
    'Debate Skills for B2',
    'Negotiation Language',
    'Media Analysis',
    'Advanced Vocabulary Building',
    'Complex Listening Tasks',
    'Writing Coherent Arguments',
    'Cross-Cultural Communication',
    'Professional Email and Reports',
    'B2 Review 1',
    'B2 Review 2',
    'B2 Final Review',
  ],
  C1: [
    'Academic Vocabulary Expansion',
    'Advanced Grammar Precision',
    'Argumentative Essays',
    'Research Reading Skills',
    'Professional Communication C1',
    'Public Speaking with Impact',
    'Discussing Abstract Topics',
    'Culture and Society Analysis',
    'Literature Interpretation',
    'Advanced Listening C1',
    'Rhetorical Language and Style',
    'Seminar Discussion Skills',
    'Policy and Global Issues',
    'Data Commentary and Trends',
    'C1 Review 1',
    'C1 Final Review',
  ],
  C2: [
    'Nuanced Vocabulary in Context',
    'Advanced Idioms and Phrasal Verbs',
    'Complex Argumentation',
    'Academic Writing C2',
    'Critical Reading and Synthesis',
    'Philosophy and Social Topics',
    'Professional Debates',
    'Discourse and Pragmatics',
    'C2 Listening to Lectures',
    'High-Stakes Presentation Language',
    'C2 Review 1',
    'C2 Final Review',
  ],
};

type UnitSection =
  | 'Vocabulary'
  | 'Reading'
  | 'Speaking'
  | 'Writing'
  | 'Grammar Focus'
  | 'Practice'
  | 'Unit review';

const FULL_SECTION_PLAN: UnitSection[] = [
  'Vocabulary',
  'Reading',
  'Speaking',
  'Writing',
  'Grammar Focus',
  'Practice',
  'Unit review',
];

const getUnitSectionPlan = (unitNumber: number, topic: string): UnitSection[] => {
  // Keep Unit 1 in speaking-only mode.
  if (unitNumber === 1) {
    return ['Speaking'];
  }

  // Review-focused units can intentionally contain only review.
  if (/review/i.test(topic)) {
    return ['Unit review'];
  }

  // Flexible patterns: some units have only 1 section, others have partial/full sections.
  switch (unitNumber % 5) {
    case 0:
      return ['Speaking'];
    case 1:
      return ['Vocabulary', 'Practice'];
    case 2:
      return ['Reading', 'Writing', 'Unit review'];
    case 3:
      return ['Vocabulary', 'Reading', 'Speaking', 'Practice', 'Unit review'];
    default:
      return FULL_SECTION_PLAN;
  }
};

const createTiles = (topic: string, unitNumber: number, sections: UnitSection[]) => {
  return sections.map((section, index) => {
    if (section === 'Practice') {
      return { type: 'dumbbell' as const, description: `${topic} - ${section}`, order: index };
    }

    if (section === 'Unit review') {
      return { type: 'trophy' as const, description: `Unit ${unitNumber} review`, order: index };
    }

    return { type: 'book' as const, description: `${topic} - ${section}`, order: index };
  });
};

const units = (() => {
  let unitNumber = 1;
  const generatedUnits: Array<{
    unitNumber: number;
    level: CEFLevel;
    description: string;
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    tiles: ReturnType<typeof createTiles>;
  }> = [];

  const levelOrder: CEFLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  levelOrder.forEach((level) => {
    const topics = CURRICULUM_BY_LEVEL[level];
    const theme = LEVEL_THEME[level];

    topics.forEach((topic) => {
      generatedUnits.push({
        unitNumber,
        level,
        description: `${level} Unit ${unitNumber}: ${topic}`,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        borderColor: theme.borderColor,
        tiles: createTiles(topic, unitNumber, getUnitSectionPlan(unitNumber, topic)),
      });
      unitNumber += 1;
    });
  });

  return generatedUnits;
})();

type SeedQuestion = {
  type:
    | 'FLASHCARD'
    | 'READING_MCQ'
    | 'TRUE_FALSE'
    | 'MATCHING_HEADING'
    | 'SUMMARY_COMPLETION'
    | 'INTERVIEW'
    | 'DESCRIBE_PICTURE'
    | 'DISCUSSION'
    | 'PRESENTATION'
    | 'ESSAY'
    | 'REPORT'
    | 'NARRATIVE'
    | 'GRAMMAR_INTRO'
    | 'SELECT_1_OF_3'
    | 'WRITE_IN_ENGLISH';
  question: string;
  questionInVietnamese: string;
  answers?: { icon?: string; name: string }[];
  answerTiles?: string[];
  correctAnswer: number | number[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
};

const baseQuestions: SeedQuestion[] = [
  // Unit 1 vocabulary (flashcard style)
  {
    type: 'SELECT_1_OF_3',
    question: 'Flashcard: Which word matches this image?',
    questionInVietnamese: 'Flashcard: Từ nào khớp với hình ảnh này?',
    answers: [{ icon: '/lesson-icons/apple.svg', name: 'apple' }, { icon: '/lesson-icons/book.svg', name: 'book' }, { icon: '/lesson-icons/ear.svg', name: 'ear' }],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-vocabulary',
    tags: ['a1', 'vocabulary', 'flashcard'],
  },
  {
    type: 'SELECT_1_OF_3',
    question: 'Flashcard: Pick the correct word for this icon.',
    questionInVietnamese: 'Flashcard: Chọn từ đúng cho biểu tượng này.',
    answers: [{ icon: '/lesson-icons/mouth.svg', name: 'mouth' }, { icon: '/lesson-icons/microphone.svg', name: 'microphone' }, { icon: '/lesson-icons/book.svg', name: 'book' }],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-vocabulary',
    tags: ['a1', 'vocabulary', 'flashcard'],
  },

  // Unit 1 reading
  {
    type: 'SELECT_1_OF_3',
    question: 'Read: "Anna is from Hanoi." What is true?',
    questionInVietnamese: 'Đọc: "Anna đến từ Hà Nội." Câu nào đúng?',
    answers: [
      { icon: '✅', name: 'Anna is from Hanoi.' },
      { icon: '❌', name: 'Anna is from London.' },
      { icon: '❌', name: 'Anna is a teacher.' },
    ],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-reading',
    tags: ['a1', 'reading', 'true-false'],
  },
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Hoàn thành tóm tắt: "Tom ___ a boy"',
    questionInVietnamese: 'Hoàn thành tóm tắt: "Tom ___ a boy"',
    answerTiles: ['is', 'am', 'are', 'the'],
    correctAnswer: [0],
    difficulty: 'easy',
    category: 'unit1-reading',
    tags: ['a1', 'reading', 'summary-completion'],
  },

  // Unit 1 speaking
  {
    type: 'INTERVIEW',
    question: 'Giới thiệu bản thân: "Tôi tên là Mai"',
    questionInVietnamese: 'Giới thiệu bản thân: "Tôi tên là Mai"',
    answerTiles: ['My', 'name', 'is', 'Mai', 'am', 'I'],
    correctAnswer: [0, 1, 2, 3],
    difficulty: 'easy',
    category: 'unit1-speaking',
    tags: ['a1', 'speaking', 'interview'],
  },
  {
    type: 'DESCRIBE_PICTURE',
    question: 'Describe picture: choose the best sentence for a student photo.',
    questionInVietnamese: 'Mô tả tranh: chọn câu phù hợp nhất cho ảnh học sinh.',
    answers: [
      { icon: '/lesson-icons/boy.svg', name: 'He is a student.' },
      { icon: '/lesson-icons/mouth.svg', name: 'He is a table.' },
      { icon: '/lesson-icons/apple.svg', name: 'He is an apple.' },
    ],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-speaking',
    tags: ['a1', 'speaking', 'describe-picture'],
  },
  {
    type: 'DISCUSSION',
    question: 'Speaking discussion: choose the best discussion opener.',
    questionInVietnamese: 'Nói thảo luận: chọn câu mở đầu thảo luận phù hợp nhất.',
    answers: [
      { icon: '/lesson-icons/microphone.svg', name: 'In my opinion, this topic is important because...' },
      { icon: '/lesson-icons/book.svg', name: 'I am a pencil and a table.' },
      { icon: '/lesson-icons/apple.svg', name: 'Blue quickly under yes.' },
    ],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-speaking',
    tags: ['a1', 'speaking', 'discussion'],
  },
  {
    type: 'PRESENTATION',
    question: 'Presentation line: "Today I will talk about my family"',
    questionInVietnamese: 'Câu thuyết trình: "Hôm nay tôi sẽ nói về gia đình tôi"',
    answerTiles: ['Today', 'I', 'will', 'talk', 'about', 'my', 'family', 'am'],
    correctAnswer: [0, 1, 2, 3, 4, 5, 6],
    difficulty: 'easy',
    category: 'unit1-speaking',
    tags: ['a1', 'speaking', 'presentation'],
  },

  // Unit 1 writing
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Viết đoạn essay ngắn: "Tôi thích học tiếng Anh"',
    questionInVietnamese: 'Viết đoạn essay ngắn: "Tôi thích học tiếng Anh"',
    answerTiles: ['I', 'like', 'learning', 'English', '.', 'am', 'is'],
    correctAnswer: [0, 1, 2, 3, 4],
    difficulty: 'easy',
    category: 'unit1-writing',
    tags: ['a1', 'writing', 'essay'],
  },
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Viết báo cáo ngắn: "Lớp của tôi có 30 học sinh"',
    questionInVietnamese: 'Viết báo cáo ngắn: "Lớp của tôi có 30 học sinh"',
    answerTiles: ['My', 'class', 'has', '30', 'students', 'am', 'is'],
    correctAnswer: [0, 1, 2, 3, 4],
    difficulty: 'easy',
    category: 'unit1-writing',
    tags: ['a1', 'writing', 'report'],
  },
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Viết câu chuyện ngắn: "Hôm qua tôi đi công viên"',
    questionInVietnamese: 'Viết câu chuyện ngắn: "Hôm qua tôi đi công viên"',
    answerTiles: ['I', 'like', 'books', 'am', 'the'],
    correctAnswer: [0, 1, 2],
    difficulty: 'easy',
    category: 'unit1-writing',
    tags: ['a1', 'writing', 'narrative'],
  },

  // Unit 1 grammar
  {
    type: 'SELECT_1_OF_3',
    question: 'Choose the correct sentence.',
    questionInVietnamese: 'Chọn câu đúng ngữ pháp.',
    answers: [
      { icon: '✅', name: 'She is a teacher.' },
      { icon: '❌', name: 'She are a teacher.' },
      { icon: '❌', name: 'She am a teacher.' },
    ],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-grammar',
    tags: ['a1', 'grammar', 'be-verb'],
  },
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Sắp xếp từ thành câu đúng: "is / This / my / book"',
    questionInVietnamese: 'Sắp xếp từ thành câu đúng: "is / This / my / book"',
    answerTiles: ['This', 'is', 'my', 'book', 'are'],
    correctAnswer: [0, 1, 2, 3],
    difficulty: 'easy',
    category: 'unit1-grammar',
    tags: ['a1', 'grammar', 'word-order'],
  },

  // Unit 1 practice
  {
    type: 'SELECT_1_OF_3',
    question: 'Sentence Ordering: choose the correctly ordered sentence.',
    questionInVietnamese: 'Sắp xếp câu: chọn câu được sắp xếp đúng.',
    answers: [
      { icon: '/lesson-icons/microphone.svg', name: 'She is my friend.' },
      { icon: '/lesson-icons/book.svg', name: 'She my is friend.' },
      { icon: '/lesson-icons/ear.svg', name: 'Friend is she my.' },
    ],
    correctAnswer: 0,
    difficulty: 'easy',
    category: 'unit1-practice',
    tags: ['a1', 'practice', 'sentence-ordering'],
  },
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Sentence Formation: "Cô ấy là bác sĩ"',
    questionInVietnamese: 'Tạo câu: "Cô ấy là bác sĩ"',
    answerTiles: ['She', 'is', 'a', 'doctor', 'am'],
    correctAnswer: [0, 1, 2, 3],
    difficulty: 'easy',
    category: 'unit1-practice',
    tags: ['a1', 'practice', 'sentence-formation'],
  },

  // Unit 1 review
  {
    type: 'SELECT_1_OF_3',
    question: 'Unit review: choose the correct sentence.',
    questionInVietnamese: 'Ôn tập unit: chọn câu đúng.',
    answers: [
      { icon: '✅', name: 'I am in class 5A.' },
      { icon: '❌', name: 'I are in class 5A.' },
      { icon: '❌', name: 'I is in class 5A.' },
    ],
    correctAnswer: 0,
    difficulty: 'medium',
    category: 'unit1-review',
    tags: ['a1', 'review'],
  },
  {
    type: 'WRITE_IN_ENGLISH',
    question: 'Ôn tập: "Chúng tôi là bạn"',
    questionInVietnamese: 'Ôn tập: "Chúng tôi là bạn"',
    answerTiles: ['We', 'are', 'friends', 'is', 'am'],
    correctAnswer: [0, 1, 2],
    difficulty: 'medium',
    category: 'unit1-review',
    tags: ['a1', 'review'],
  },
];

const makeSelectQuestion = (
  category: string,
  question: string,
  questionInVietnamese: string,
  answers: { icon?: string; name: string }[],
  correctAnswer: number,
  tags: string[],
): SeedQuestion => ({
  type: 'SELECT_1_OF_3',
  question,
  questionInVietnamese,
  answers,
  correctAnswer,
  difficulty: 'easy',
  category,
  tags,
});

const makeWriteQuestion = (
  category: string,
  question: string,
  questionInVietnamese: string,
  answerTiles: string[],
  correctAnswer: number[],
  tags: string[],
): SeedQuestion => ({
  type: 'WRITE_IN_ENGLISH',
  question,
  questionInVietnamese,
  answerTiles,
  correctAnswer,
  difficulty: 'easy',
  category,
  tags,
});

const getSkillIconByCategory = (category: string): string => {
  switch (category) {
    case 'unit1-reading':
      return '/lesson-icons/skill-reading.svg';
    case 'unit1-speaking':
      return '/lesson-icons/skill-speaking.svg';
    case 'unit1-writing':
      return '/lesson-icons/skill-writing.svg';
    default:
      return '/lesson-icons/book.svg';
  }
};

const createDrillQuestions = (
  category: string,
  label: string,
  tags: string[],
): SeedQuestion[] => {
  const skillIcon = getSkillIconByCategory(category);

  return [
    makeSelectQuestion(
      category,
      `${label} Drill 1: choose the best option.`,
      `${label} Bài luyện 1: chọn đáp án đúng nhất.`,
      [
        { icon: skillIcon, name: `${label} option A` },
        { icon: '/lesson-icons/book.svg', name: `${label} option B` },
        { icon: '/lesson-icons/apple.svg', name: `${label} option C` },
      ],
      0,
      tags,
    ),
    makeWriteQuestion(
      category,
      `${label} Drill 2: complete the sentence.`,
      `${label} Bài luyện 2: hoàn thành câu.`,
      ['I', 'am', 'ready', 'is', 'are'],
      [0, 1, 2],
      tags,
    ),
    makeSelectQuestion(
      category,
      `${label} Drill 3: pick the correct response.`,
      `${label} Bài luyện 3: chọn phản hồi phù hợp.`,
      [
        { icon: '✅', name: 'Correct response' },
        { icon: '❌', name: 'Incorrect response 1' },
        { icon: '❌', name: 'Incorrect response 2' },
      ],
      0,
      tags,
    ),
    makeWriteQuestion(
      category,
      `${label} Drill 4: reorder the words.`,
      `${label} Bài luyện 4: sắp xếp lại từ.`,
      ['This', 'is', 'my', 'task', 'are'],
      [0, 1, 2, 3],
      tags,
    ),
    makeSelectQuestion(
      category,
      `${label} Drill 5: choose the accurate phrase.`,
      `${label} Bài luyện 5: chọn cụm từ chính xác.`,
      [
        { icon: skillIcon, name: `${label} phrase` },
        { icon: '/lesson-icons/mouth.svg', name: 'Wrong phrase 1' },
        { icon: '/lesson-icons/ear.svg', name: 'Wrong phrase 2' },
      ],
      0,
      tags,
    ),
    makeWriteQuestion(
      category,
      `${label} Drill 6: fill in the blank.`,
      `${label} Bài luyện 6: điền vào chỗ trống.`,
      ['is', 'am', 'book', 'apple'],
      [0],
      tags,
    ),
  ];
};

const drillQuestions: SeedQuestion[] = [
  ...createDrillQuestions('unit1-vocabulary', 'Vocabulary', ['a1', 'vocabulary', 'flashcard', 'drill']),
  ...createDrillQuestions('unit1-reading', 'Reading', ['a1', 'reading', 'drill']),
  ...createDrillQuestions('unit1-speaking', 'Speaking', ['a1', 'speaking', 'drill']),
  ...createDrillQuestions('unit1-writing', 'Writing', ['a1', 'writing', 'drill']),
  ...createDrillQuestions('unit1-grammar', 'Grammar Focus', ['a1', 'grammar', 'drill']),
  ...createDrillQuestions('unit1-practice', 'Practice', ['a1', 'practice', 'drill']),
];

const questions: SeedQuestion[] = [...baseQuestions, ...drillQuestions];

const normalizeSeedQuestionType = (question: SeedQuestion): SeedQuestion => {
  const lowerTags = question.tags.map((tag) => tag.toLowerCase());
  const category = question.category.toLowerCase();

  if (category.includes('-vocabulary')) {
    return { ...question, type: 'FLASHCARD' };
  }

  if (category.includes('-reading')) {
    if (lowerTags.includes('true-false')) return { ...question, type: 'TRUE_FALSE' };
    if (lowerTags.includes('matching-heading')) return { ...question, type: 'MATCHING_HEADING' };
    if (lowerTags.includes('summary-completion')) return { ...question, type: 'SUMMARY_COMPLETION' };
    return { ...question, type: 'READING_MCQ' };
  }

  if (category.includes('-speaking')) {
    if (lowerTags.includes('interview')) return { ...question, type: 'INTERVIEW' };
    if (lowerTags.includes('describe-picture')) return { ...question, type: 'DESCRIBE_PICTURE' };
    if (lowerTags.includes('discussion')) return { ...question, type: 'DISCUSSION' };
    if (lowerTags.includes('presentation')) return { ...question, type: 'PRESENTATION' };
    return { ...question, type: 'INTERVIEW' };
  }

  if (category.includes('-writing')) {
    if (lowerTags.includes('essay')) return { ...question, type: 'ESSAY' };
    if (lowerTags.includes('report')) return { ...question, type: 'REPORT' };
    if (lowerTags.includes('narrative')) return { ...question, type: 'NARRATIVE' };
    return { ...question, type: 'ESSAY' };
  }

  if (category.includes('-grammar')) {
    return { ...question, type: 'GRAMMAR_INTRO' };
  }

  // Practice and review keep generic training types.
  return question;
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');

    await connectDB();

    const existingUnits = await Unit.find(
      { unitNumber: { $in: units.map((unit) => unit.unitNumber) } },
      { unitNumber: 1, tiles: 1, tilesCustomizedByAdmin: 1 },
    ).lean();
    const existingUnitByNumber = new Map(
      existingUnits.map((unit) => [unit.unitNumber, unit]),
    );

    const createdUnits = await Promise.all(
      units.map((unit) => {
        const existing = existingUnitByNumber.get(unit.unitNumber);
        const shouldPreserveTiles = Boolean(existing?.tilesCustomizedByAdmin);
        const payload = {
          ...unit,
          tiles: shouldPreserveTiles ? (existing?.tiles ?? unit.tiles) : unit.tiles,
          tilesCustomizedByAdmin: shouldPreserveTiles,
          isActive: true,
        };

        return Unit.findOneAndUpdate(
          { unitNumber: unit.unitNumber },
          payload,
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }),
    );
    console.log(`✅ Upserted ${createdUnits.length} units`);

    const normalizedQuestions = questions.map(normalizeSeedQuestionType);

    const createdQuestions = await Promise.all(
      normalizedQuestions.map((question) =>
        Question.findOneAndUpdate(
          {
            type: question.type,
            questionInVietnamese: question.questionInVietnamese,
            category: question.category,
          },
          { ...question, isActive: true },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
      ),
    );
    console.log(`✅ Upserted ${createdQuestions.length} questions`);

    const unit1Topic = 'Alphabet and Pronunciation';
    const getQuestionIdsByCategory = (category: string) =>
      createdQuestions
        .filter((question) => question.category === category)
        .map((question) => question._id);

    const getReviewQuestionIds = () => {
      const reviewCategories = [
        'unit1-vocabulary',
        'unit1-reading',
        'unit1-speaking',
        'unit1-writing',
        'unit1-grammar',
        'unit1-practice',
      ];

      const ids = reviewCategories.flatMap((category) => getQuestionIdsByCategory(category));
      return Array.from(new Set(ids.map((id) => id.toString()))).map((id) => createdQuestions.find((q) => q._id.toString() === id)!._id);
    };

    const lessons = [
      {
        unitNumber: 1,
        lessonNumber: 1,
        level: getLevelByUnitNumber(1),
        title: `${unit1Topic} - Speaking`,
        description: 'Speaking-only unit: interview, describe picture, discussion, and presentation tasks',
        type: 'book',
        questions: getQuestionIdsByCategory('unit1-speaking'),
      },
    ];

    // Keep Unit 1 in speaking-only mode by removing previously seeded non-speaking lessons.
    await Lesson.deleteMany({ unitNumber: 1 });

    const createdLessons = await Promise.all(
      lessons.map((lesson) =>
        Lesson.findOneAndUpdate(
          { unitNumber: lesson.unitNumber, lessonNumber: lesson.lessonNumber },
          { ...lesson, isActive: true },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
      ),
    );
    console.log(`✅ Upserted ${createdLessons.length} lessons`);

    console.log('🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
