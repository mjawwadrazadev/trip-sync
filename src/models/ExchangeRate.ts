import mongoose, { Schema, Document } from "mongoose";

export interface IExchangeRate extends Document {
  from_currency: string;
  to_currency: string;
  rate: number;
  fetched_at: Date;
  source: string;
  created_at: Date;
}

const ExchangeRateSchema = new Schema<IExchangeRate>(
  {
    from_currency: { type: String, required: true },
    to_currency: { type: String, required: true },
    rate: { type: Number, required: true },
    fetched_at: { type: Date, default: Date.now },
    source: { type: String, default: "manual" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

ExchangeRateSchema.index({ from_currency: 1, to_currency: 1, fetched_at: -1 });

export default mongoose.models.ExchangeRate || mongoose.model<IExchangeRate>("ExchangeRate", ExchangeRateSchema);
