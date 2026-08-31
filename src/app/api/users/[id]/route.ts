import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { User } from "@/models";
import { logChanges } from "@/lib/audit";

// PUT /api/users/[id] - Update user settings (e.g. commission rate)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const body = await req.json();
    const { default_commission_rate, role } = body;

    const targetUser = await User.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!targetUser) return errorResponse("User not found", 404);

    const oldDoc = targetUser.toObject();
    
    if (default_commission_rate !== undefined) {
      targetUser.default_commission_rate = default_commission_rate === "" || default_commission_rate === null 
        ? null 
        : parseFloat(default_commission_rate);
    }
    
    if (role && ["Owner", "Accountant", "Agent", "Viewer"].includes(role)) {
      targetUser.role = role;
    }

    await targetUser.save();

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "User", entity_id: targetUser._id, changed_by: user.user_id },
      oldDoc,
      targetUser.toObject()
    );

    return successResponse({ user: targetUser });
  }, ["Owner", "Accountant"]);
}
