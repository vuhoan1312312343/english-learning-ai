import mongoose, { Document, Schema } from 'mongoose';

export interface ILevelConfig extends Document {
  code: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const levelConfigSchema = new Schema<ILevelConfig>(
  {
    code: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LevelConfig =
  mongoose.models.LevelConfig || mongoose.model<ILevelConfig>('LevelConfig', levelConfigSchema);
