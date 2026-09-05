import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Voucher } from "@/models";

// POST /api/vouchers/[id]/post — change status to Posted
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;

    const voucher = await Voucher.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!voucher) return errorResponse("Not found", 404);
    if (voucher.status === "Posted") return errorResponse("Voucher is already posted");
    if (!voucher.entries || voucher.entries.length === 0) {
      return errorResponse("Cannot post a voucher with no entries");
    }

    voucher.status = "Posted";
    voucher.updated_by = user.user_id as unknown as typeof voucher.updated_by;
    await voucher.save();

    return successResponse({ voucher });
  });
}
