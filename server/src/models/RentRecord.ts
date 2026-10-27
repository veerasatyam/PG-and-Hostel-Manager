import mongoose, { Schema, Document } from 'mongoose';

export interface IRentRecord extends Document {
  tenantId: mongoose.Types.ObjectId;
  occupancyId?: mongoose.Types.ObjectId;
  month: number;
  year: number;
  dueDate: Date;
  baseAmount: number;
  amount: number;
  paidAmount: number;
  balance: number;
  isProRated: boolean;
  proRatedDays?: number;
  totalDaysInMonth?: number;
  proRatedCalculationNotes?: string;
  status: 'DUE' | 'PAID' | 'OVERDUE';
  createdAt: Date;
  updatedAt: Date;
}

const RentRecordSchema = new Schema<IRentRecord>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    occupancyId: { type: Schema.Types.ObjectId, ref: 'BedOccupancy' },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    baseAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    isProRated: { type: Boolean, default: false },
    proRatedDays: { type: Number },
    totalDaysInMonth: { type: Number },
    proRatedCalculationNotes: { type: String },
    status: { type: String, enum: ['DUE', 'PAID', 'OVERDUE'], default: 'DUE' },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness per tenant per month/year
RentRecordSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });
RentRecordSchema.index({ status: 1 });

export const RentRecord =
  mongoose.models.RentRecord || mongoose.model<IRentRecord>('RentRecord', RentRecordSchema);
