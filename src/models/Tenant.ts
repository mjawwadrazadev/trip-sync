import mongoose, { Schema, Document } from "mongoose";

export type TenantStatus = "Active" | "Suspended" | "Expired";

export interface ITenant extends Document {
  name: string;
  base_currency: string;
  invoice_prefix: string;
  status: TenantStatus;
  access_expires_at: Date | null;
  max_users: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    base_currency: { type: String, required: true, default: "PKR" },
    invoice_prefix: { type: String, required: true, default: "INV" },
    status: { type: String, enum: ["Active", "Suspended", "Expired"], default: "Active" },
    access_expires_at: { type: Date, default: null },
    max_users: { type: Number, default: 10 },
    contact_person: { type: String, default: "" },
    contact_email: { type: String, default: "" },
    contact_phone: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
