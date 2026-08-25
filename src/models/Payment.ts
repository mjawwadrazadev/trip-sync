import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPayment extends Document {
  tenant_id: Types.ObjectId;
  customer_id: Types.ObjectId;
  amount: number;
  currency: string;
  payment_method: string;
  status: "Posted" | "Voided";
  created_by: Types.ObjectId;
  updated_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    customer_id: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "PKR" },
    payment_method: { type: String, required: true },
    status: { type: String, enum: ["Posted", "Voided"], default: "Posted" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
