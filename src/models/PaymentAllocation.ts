import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentAllocation extends Document {
  tenant_id: Types.ObjectId;
  payment_id: Types.ObjectId;
  invoice_id: Types.ObjectId;
  allocated_amount: number;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const PaymentAllocationSchema = new Schema<IPaymentAllocation>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    payment_id: { type: Schema.Types.ObjectId, ref: "Payment", required: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    allocated_amount: { type: Number, required: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

PaymentAllocationSchema.index({ payment_id: 1 });
PaymentAllocationSchema.index({ invoice_id: 1 });

export default mongoose.models.PaymentAllocation || mongoose.model<IPaymentAllocation>("PaymentAllocation", PaymentAllocationSchema);
