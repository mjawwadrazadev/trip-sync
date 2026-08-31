import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPassenger {
  name: string;
  ticket_number?: string;
  passport_number?: string;
}

export interface IBooking extends Document {
  tenant_id: Types.ObjectId;
  booking_reference: string;
  customer_id: Types.ObjectId;
  supplier_id: Types.ObjectId;
  service_type: "Ticket" | "Hotel" | "Package" | "Umrah" | "Visa" | "Other";
  status: "Draft" | "Confirmed" | "Ticketed" | "Cancelled";
  gds_pnr: string;
  passenger_details: IPassenger[];
  itinerary_details: string;
  total_cost: number;
  total_price: number;
  margin: number;
  invoice_id: Types.ObjectId | null;
  created_by: Types.ObjectId;
  updated_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    booking_reference: { type: String, required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    service_type: {
      type: String,
      enum: ["Ticket", "Hotel", "Package", "Umrah", "Visa", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Confirmed", "Ticketed", "Cancelled"],
      default: "Draft",
    },
    gds_pnr: { type: String, default: "" },
    passenger_details: [
      {
        name: { type: String, required: true },
        ticket_number: { type: String, default: "" },
        passport_number: { type: String, default: "" },
      },
    ],
    itinerary_details: { type: String, default: "" },
    total_cost: { type: Number, required: true, default: 0 },
    total_price: { type: Number, required: true, default: 0 },
    margin: { type: Number, default: 0 },
    invoice_id: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
    updated_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

BookingSchema.index({ tenant_id: 1, booking_reference: 1 }, { unique: true });

export default mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);