import mongoose, { Schema, Document, Types } from "mongoose";

export type VoucherType = "RV" | "PV" | "JV" | "DN" | "CD";
export type VoucherStatus = "Draft" | "Posted" | "Voided";

export interface IVoucherEntry {
  branch: string;
  ref_code: string;
  ref_no: string;
  adj_date: string;
  description: string;
  account_code: string;
  debit: number;
  credit: number;
}

export interface IVoucher extends Document {
  tenant_id: Types.ObjectId;
  voucher_number: string;
  voucher_type: VoucherType;
  voucher_date: Date;
  name_on_voucher: string;
  manual_receipt_no: string;
  cost_center: string;
  cheque_no: string;
  cheque_status: string;
  debit_account: string;
  entries: IVoucherEntry[];
  total_debit: number;
  total_credit: number;
  amount_in_words: string;
  remarks: string;
  print_format: string;
  status: VoucherStatus;
  created_by: Types.ObjectId;
  updated_by?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherEntrySchema = new Schema<IVoucherEntry>(
  {
    branch: { type: String, default: "01" },
    ref_code: { type: String, default: "" },
    ref_no: { type: String, default: "" },
    adj_date: { type: String, default: "" },
    description: { type: String, default: "" },
    account_code: { type: String, default: "" },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    voucher_number: { type: String, required: true },
    voucher_type: {
      type: String,
      enum: ["RV", "PV", "JV", "DN", "CD"],
      required: true,
    },
    voucher_date: { type: Date, required: true },
    name_on_voucher: { type: String, default: "" },
    manual_receipt_no: { type: String, default: "" },
    cost_center: { type: String, default: "" },
    cheque_no: { type: String, default: "" },
    cheque_status: { type: String, default: "" },
    debit_account: { type: String, default: "" },
    entries: { type: [VoucherEntrySchema], default: [] },
    total_debit: { type: Number, default: 0 },
    total_credit: { type: Number, default: 0 },
    amount_in_words: { type: String, default: "" },
    remarks: { type: String, default: "" },
    print_format: { type: String, default: "In House" },
    status: { type: String, enum: ["Draft", "Posted", "Voided"], default: "Draft" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index: voucher_number unique per tenant
VoucherSchema.index({ tenant_id: 1, voucher_number: 1 }, { unique: true });
VoucherSchema.index({ tenant_id: 1, voucher_type: 1 });
VoucherSchema.index({ tenant_id: 1, status: 1 });

export default mongoose.models.Voucher || mongoose.model<IVoucher>("Voucher", VoucherSchema);
