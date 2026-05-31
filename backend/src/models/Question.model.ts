import mongoose, { Document, Schema } from 'mongoose';

interface IAnswer {
  icon?: string;
  name: string;
}

export interface IQuestion extends Document {
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
  questionImage?: string;
  answers?: IAnswer[];
  answerTiles?: string[];
  correctAnswer: number | number[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const answerSchema = new Schema({
  icon: String,
  name: {
    type: String,
    required: true,
  },
}, { _id: false });

const questionSchema = new Schema<IQuestion>(
  {
    type: {
      type: String,
      enum: [
        'FLASHCARD',
        'READING_MCQ',
        'TRUE_FALSE',
        'MATCHING_HEADING',
        'SUMMARY_COMPLETION',
        'INTERVIEW',
        'DESCRIBE_PICTURE',
        'DISCUSSION',
        'PRESENTATION',
        'ESSAY',
        'REPORT',
        'NARRATIVE',
        'GRAMMAR_INTRO',
        'SELECT_1_OF_3',
        'WRITE_IN_ENGLISH',
      ],
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    questionInVietnamese: {
      type: String,
      required: true,
    },
    questionImage: String,
    answers: [answerSchema],
    answerTiles: [String],
    correctAnswer: {
      type: Schema.Types.Mixed,
      required: true,
    },
    explanation: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    category: {
      type: String,
      required: true,
      default: 'vocabulary',
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });

export const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', questionSchema);
