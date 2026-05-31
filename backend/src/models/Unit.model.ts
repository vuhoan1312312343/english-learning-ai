import mongoose, { Document, Schema } from 'mongoose';

export type UnitTileType =
  | 'star'
  | 'dumbbell'
  | 'book'
  | 'trophy'
  | 'fast-forward'
  | 'treasure';

export interface IUnitTile {
  type: UnitTileType;
  description?: string;
  order: number;
}

export interface IUnit extends Document {
  unitNumber: number;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  description: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  tiles: IUnitTile[];
  tilesCustomizedByAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const unitTileSchema = new Schema<IUnitTile>(
  {
    type: {
      type: String,
      enum: ['star', 'dumbbell', 'book', 'trophy', 'fast-forward', 'treasure'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const unitSchema = new Schema<IUnit>(
  {
    unitNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    level: {
      type: String,
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      required: true,
      default: 'A1',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    backgroundColor: {
      type: String,
      required: true,
      trim: true,
    },
    textColor: {
      type: String,
      required: true,
      trim: true,
    },
    borderColor: {
      type: String,
      required: true,
      trim: true,
    },
    tiles: {
      type: [unitTileSchema],
      default: [],
    },
    tilesCustomizedByAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Unit = mongoose.models.Unit || mongoose.model<IUnit>('Unit', unitSchema);
