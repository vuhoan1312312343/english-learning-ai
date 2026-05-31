import mongoose, { Document, Schema } from 'mongoose';

export type PostType = 'text' | 'image' | 'mixed' | 'question';
export type PostVisibility = 'public' | 'followers' | 'private';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  type: PostType;
  visibility: PostVisibility;
  images: string[];
  likes: mongoose.Types.ObjectId[];
  comments: {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'mixed', 'question'],
      default: 'text',
      required: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
      required: true,
      index: true,
    },
    // Store image URLs for simplicity.
    images: {
      type: [String],
      default: [],
    },
    likes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    comments: {
      type: [
        {
          userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 1000,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ createdAt: -1, isPinned: -1 });

export const Post =
  mongoose.models.Post || mongoose.model<IPost>('Post', postSchema);
