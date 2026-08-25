import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICommission extends Document {
  tenant_id: Types.ObjectId;
  agent_id: Types.ObjectId;
  invoice_line_item_id: Types.ObjectId;
  rate_source: "AgentDefault" | "InvoiceOverride";
  rate_applied: number;
  amount: number;
  status: "Posted" | "ClawedBack" | "Voided";
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const CommissionSchema = new Schema<ICommission>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    agent_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invoice_line_item_id: { type: Schema.Types.ObjectId, ref: "InvoiceLineItem", required: true },
    rate_source: { type: String, enum: ["AgentDefault", "InvoiceOverride"], required: true },
    rate_applied: { type: Number, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["Posted", "ClawedBack", "Voided"], default: "Posted" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.Commission || mongoose.model<ICommission>("Commission", CommissionSchema);
