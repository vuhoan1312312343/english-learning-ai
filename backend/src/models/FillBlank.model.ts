import mongoose, { Schema, Document } from "mongoose";

export interface IFillBlank extends Document {
  question: string;
  options: string[];
  correctAnswer: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FillBlankSchema = new Schema<IFillBlank>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length >= 2,
        message: "Cần ít nhất 2 lựa chọn",
      },
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      default: "A1",
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const FillBlank = mongoose.model<IFillBlank>(
  "FillBlank",
  FillBlankSchema
);