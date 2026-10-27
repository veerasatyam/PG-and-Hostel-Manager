import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  rentRecordId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CARD';
  transactionRef?: string;
  receiptNumber: string;
  notes?: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    rentRecordId: { type: Schema.Types.ObjectId, ref: 'RentRecord', required: true },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CASH', 'BANK_TRANSFER', 'CARD'],
      default: 'UPI',
    },
    transactionRef: { type: String, trim: true },
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ rentRecordId: 1 });

export const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
