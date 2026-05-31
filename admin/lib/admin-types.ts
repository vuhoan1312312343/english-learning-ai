export type UserItem = {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
};

export type UnitTile = {
  type: 'star' | 'dumbbell' | 'book' | 'trophy' | 'fast-forward' | 'treasure';
  description?: string;
  order: number;
};

export type UnitItem = {
  _id: string;
  unitNumber: number;
  description: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  tiles: UnitTile[];
};

export type LessonItem = {
  _id: string;
  lessonNumber: number;
  title: string;
  description: string;
  type: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
};

export type QuestionType =
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

export type QuestionItem = {
  _id: string;
  type: QuestionType;
  question: string;
  questionInVietnamese: string;
  answers?: Array<{
    icon?: string;
    name: string;
  }>;
  answerTiles?: string[];
  correctAnswer?: number | number[];
  explanation?: string;
  image?: string;
  questionImage?: string;
  mediaUrl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
};
