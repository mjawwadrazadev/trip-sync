import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { AuditLog } from "@/models";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const entity_type = searchParams.get("entity_type");
    const entity_id = searchParams.get("entity_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!entity_type || !entity_id) {
      return errorResponse("entity_type and entity_id are required");
    }

    const filter = { tenant_id: user.tenant_id, entity_type, entity_id };

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("changed_by", "name")
        .sort({ changed_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return successResponse({ audit_logs: logs, total, page, pages: Math.ceil(total / limit) });
  }, ["Owner", "Accountant"]);
}
