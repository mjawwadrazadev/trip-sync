import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupplier extends Document {
  tenant_id: Types.ObjectId;
  name: string;
  code: string;
  currency: string;
  contact_email: string;
  contact_phone: string;
  current_balance: number;
  created_by: Types.ObjectId;
  updated_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, default: "" },
    currency: { type: String, default: "PKR" },
    contact_email: { type: String, default: "" },
    contact_phone: { type: String, default: "" },
    current_balance: { type: Number, default: 0 },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

SupplierSchema.index({ tenant_id: 1, name: 1 });

export default mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema);