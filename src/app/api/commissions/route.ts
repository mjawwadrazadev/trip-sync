import { NextRequest } from "next/server";
import { withAuth, successResponse } from "@/lib/api-helpers";
import { Commission } from "@/models";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const agent_id = searchParams.get("agent_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };

    // Agents can only see their own commissions
    if (user.role === "Agent") {
      filter.agent_id = user.user_id;
    } else if (agent_id) {
      filter.agent_id = agent_id;
    }

    const [commissions, total] = await Promise.all([
      Commission.find(filter)
        .populate("agent_id", "name email")
        .populate("invoice_line_item_id", "description amount service_type")
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Commission.countDocuments(filter),
    ]);

    return successResponse({ commissions, total, page, pages: Math.ceil(total / limit) });
  });
}
