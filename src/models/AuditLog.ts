import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  tenant_id: Types.ObjectId;
  entity_type: string;
  entity_id: Types.ObjectId;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by: Types.ObjectId;
  changed_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  tenant_id: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  entity_type: { type: String, required: true },
  entity_id: { type: Schema.Types.ObjectId, required: true },
  field_changed: { type: String, required: true },
  old_value: { type: String, default: "" },
  new_value: { type: String, default: "" },
  changed_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  changed_at: { type: Date, default: Date.now },
});

AuditLogSchema.index({ tenant_id: 1, entity_type: 1, entity_id: 1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
