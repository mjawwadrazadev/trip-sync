import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICreditNote extends Document {
  tenant_id: Types.ObjectId;
  invoice_id: Types.ObjectId;
  amount: number;
  reason: string;
  status: "Posted" | "Voided";
  created_by: Types.ObjectId;
  updated_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const CreditNoteSchema = new Schema<ICreditNote>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    invoice_id: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["Posted", "Voided"], default: "Posted" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.CreditNote || mongoose.model<ICreditNote>("CreditNote", CreditNoteSchema);
