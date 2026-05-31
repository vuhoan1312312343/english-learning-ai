import mongoose, { Document, Schema } from 'mongoose';

export interface IUserLearningStats extends Document {
  userId: mongoose.Types.ObjectId;
  goalXp: 1 | 10 | 20 | 30 | 50;
  xpByDate: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const userLearningStatsSchema = new Schema<IUserLearningStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    goalXp: {
      type: Number,
      enum: [1, 10, 20, 30, 50],
      default: 10,
      required: true,
    },
    xpByDate: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const UserLearningStats =
  mongoose.models.UserLearningStats ||
  mongoose.model<IUserLearningStats>('UserLearningStats', userLearningStatsSchema);
