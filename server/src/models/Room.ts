import mongoose, { Schema, Document } from 'mongoose';

export interface IBed {
  _id: mongoose.Types.ObjectId;
  name: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

export interface IRoom extends Document {
  number: string;
  floor: number;
  type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'FOUR_SHARING';
  hasAc: boolean;
  baseRent: number;
  beds: IBed[];
  createdAt: Date;
  updatedAt: Date;
}

const BedSubSchema = new Schema<IBed>(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'],
      default: 'AVAILABLE',
    },
  },
  { _id: true }
);

const RoomSchema = new Schema<IRoom>(
  {
    number: { type: String, required: true, unique: true, trim: true },
    floor: { type: Number, default: 1 },
    type: {
      type: String,
      enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARING'],
      default: 'DOUBLE',
    },
    hasAc: { type: Boolean, default: false },
    baseRent: { type: Number, required: true, min: 0 },
    beds: [BedSubSchema],
  },
  { timestamps: true }
);

export const Room = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
