import mongoose, { Schema, Document } from 'mongoose';

export interface IBedOccupancy extends Document {
  bedId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  checkInDate: Date;
  checkOutDate?: Date;
  status: 'ACTIVE' | 'CHECKED_OUT';
  monthlyRent: number;
  securityDeposit: number;
  depositStatus: 'HELD' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FORFEITED';
  depositRefundAmount?: number;
  depositDeductions?: number;
  depositDeductionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BedOccupancySchema = new Schema<IBedOccupancy>(
  {
    bedId: { type: Schema.Types.ObjectId, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'CHECKED_OUT'], default: 'ACTIVE' },
    monthlyRent: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },
    depositStatus: {
      type: String,
      enum: ['HELD', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FORFEITED'],
      default: 'HELD',
    },
    depositRefundAmount: { type: Number },
    depositDeductions: { type: Number, default: 0 },
    depositDeductionNotes: { type: String },
  },
  { timestamps: true }
);

// Indexes for fast lookup of active stays and double-booking checks
BedOccupancySchema.index({ bedId: 1, status: 1 });
BedOccupancySchema.index({ tenantId: 1, status: 1 });

export const BedOccupancy =
  mongoose.models.BedOccupancy || mongoose.model<IBedOccupancy>('BedOccupancy', BedOccupancySchema);
