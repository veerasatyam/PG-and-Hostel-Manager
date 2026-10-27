import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  userId: mongoose.Types.ObjectId;
  emergencyContact?: string;
  idProofNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    emergencyContact: { type: String, trim: true },
    idProofNumber: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);
