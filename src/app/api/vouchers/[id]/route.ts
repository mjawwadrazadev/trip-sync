import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Voucher } from "@/models";

// GET /api/vouchers/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const voucher = await Voucher.findOne({ _id: id, tenant_id: user.tenant_id }).lean();
    if (!voucher) return errorResponse("Not found", 404);
    return successResponse({ voucher });
  });
}

// PATCH /api/vouchers/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const body = await req.json();

    const voucher = await Voucher.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!voucher) return errorResponse("Not found", 404);
    if (voucher.status === "Posted") return errorResponse("Cannot edit a posted voucher");

    const updated = await Voucher.findByIdAndUpdate(
      id,
      { ...body, updated_by: user.user_id },
      { new: true }
    ).lean();

    return successResponse({ voucher: updated });
  });
}

// DELETE /api/vouchers/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const voucher = await Voucher.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!voucher) return errorResponse("Not found", 404);
    if (voucher.status === "Posted") return errorResponse("Cannot delete a posted voucher");

    await Voucher.findByIdAndDelete(id);
    return successResponse({ success: true });
  });
}
