import { withAuth, successResponse } from "@/lib/api-helpers";
import { User } from "@/models";

// GET /api/users - List users of the tenant
export async function GET() {
  return withAuth(async (user) => {
    const users = await User.find({ tenant_id: user.tenant_id })
      .select("-password")
      .sort({ name: 1 })
      .lean();

    return successResponse({ users });
  });
}
