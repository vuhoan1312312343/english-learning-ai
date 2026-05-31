import mongoose, { Document, Schema } from 'mongoose';

export interface ILesson extends Document {
  unitNumber: number;
  lessonNumber: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  title: string;
  description: string;
  type: 'star' | 'book' | 'dumbbell' | 'trophy' | 'treasure' | 'fast-forward';
  questions: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lessonSchema = new Schema<ILesson>(
  {
    unitNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    lessonNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    level: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      required: true,
      default: 'A1',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['star', 'book', 'dumbbell', 'trophy', 'treasure', 'fast-forward'],
      default: 'star',
    },
    questions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

lessonSchema.index({ unitNumber: 1, lessonNumber: 1 });
lessonSchema.index({ level: 1, unitNumber: 1, lessonNumber: 1 });

export const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', lessonSchema);
