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
      return errorResponse("Cannot post a voucher with no entries", 400);
    }

    // Strict Double-Entry Balance Check
    const totalDebit = (voucher.entries as Array<{ debit?: number; credit?: number }>).reduce((sum: number, e) => sum + (e.debit || 0), 0);
    const totalCredit = (voucher.entries as Array<{ debit?: number; credit?: number }>).reduce((sum: number, e) => sum + (e.credit || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);

    if (diff > 0.01) {
      return errorResponse(
        `Cannot post voucher: Debit (PKR ${totalDebit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}) and Credit (PKR ${totalCredit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}) must be equal. Difference: PKR ${diff.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`,
        400
      );
    }

    if (totalDebit <= 0) {
      return errorResponse("Cannot post voucher with zero amount", 400);
    }

    voucher.total_debit = totalDebit;
    voucher.total_credit = totalCredit;
    voucher.status = "Posted";
    voucher.updated_by = user.user_id as unknown as typeof voucher.updated_by;
    await voucher.save();

    return successResponse({ voucher });
  });
}
