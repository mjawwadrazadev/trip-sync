import AuditLog from "@/models/AuditLog";
import { Types } from "mongoose";

interface AuditParams {
  tenant_id: string | Types.ObjectId;
  entity_type: string;
  entity_id: string | Types.ObjectId;
  changed_by: string | Types.ObjectId;
}

export async function logChanges(
  params: AuditParams,
  oldDoc: Record<string, unknown> | null,
  newDoc: Record<string, unknown>
) {
  const entries = [];
  const fieldsToSkip = ["_id", "__v", "created_at", "updated_at", "tenant_id"];

  for (const key of Object.keys(newDoc)) {
    if (fieldsToSkip.includes(key)) continue;

    const oldVal = oldDoc ? String(oldDoc[key] ?? "") : "";
    const newVal = String(newDoc[key] ?? "");

    if (oldVal !== newVal) {
      entries.push({
        tenant_id: params.tenant_id,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        field_changed: key,
        old_value: oldVal,
        new_value: newVal,
        changed_by: params.changed_by,
        changed_at: new Date(),
      });
    }
  }

  if (entries.length > 0) {
    await AuditLog.insertMany(entries);
  }
}
