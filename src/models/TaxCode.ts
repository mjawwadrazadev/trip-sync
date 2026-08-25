import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITaxCode extends Document {
  tenant_id: Types.ObjectId;
  code: string;
  category: "IATA_BSP" | "FBR";
  rate: number;
  active: boolean;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const TaxCodeSchema = new Schema<ITaxCode>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    code: { type: String, required: true },
    category: { type: String, enum: ["IATA_BSP", "FBR"], required: true },
    rate: { type: Number, required: true },
    active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.TaxCode || mongoose.model<ITaxCode>("TaxCode", TaxCodeSchema);
