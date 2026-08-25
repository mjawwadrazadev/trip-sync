import mongoose, { Schema, Document, Types } from "mongoose";

export type UserRole = "SuperAdmin" | "Owner" | "Accountant" | "Agent" | "Viewer";

export interface IUser extends Document {
  tenant_id: Types.ObjectId | null;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  default_commission_rate: number | null;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", default: null, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["SuperAdmin", "Owner", "Accountant", "Agent", "Viewer"], required: true },
    default_commission_rate: { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
