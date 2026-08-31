import mongoose, { Schema, Document, Types } from "mongoose";

export type ServiceType = "Ticket" | "Hotel" | "Package" | "Umrah" | "Visa" | "Other";

export interface IInvoiceLineItem extends Document {
  invoice_id: Types.ObjectId;
  tenant_id: Types.ObjectId;
  service_type: ServiceType;
  description: string;
  amount: number;
  tax_code_id: Types.ObjectId | null;
  commission_id: Types.ObjectId | null;
  booking_reference: string | null;
  commission_override_rate: number | null;
  created_at: Date;
  updated_at: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    invoice_id: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    service_type: { type: String, enum: ["Ticket", "Hotel", "Package", "Umrah", "Visa", "Other"], required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    tax_code_id: { type: Schema.Types.ObjectId, ref: "TaxCode", default: null },
    commission_id: { type: Schema.Types.ObjectId, ref: "Commission", default: null },
    booking_reference: { type: String, default: null },
    commission_override_rate: { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.InvoiceLineItem || mongoose.model<IInvoiceLineItem>("InvoiceLineItem", InvoiceLineItemSchema);
