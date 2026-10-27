import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaint extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'WIFI' | 'FURNITURE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'WIFI', 'FURNITURE', 'OTHER'],
      default: 'OTHER',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
      default: 'OPEN',
    },
    resolutionNotes: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

ComplaintSchema.index({ tenantId: 1, status: 1 });

export const Complaint =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);
