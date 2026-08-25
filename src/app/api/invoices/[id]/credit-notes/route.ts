import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, CreditNote, Customer } from "@/models";
import { logChanges } from "@/lib/audit";

// POST /api/invoices/[id]/credit-notes - Issue a credit note
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const body = await req.json();
    const { amount, reason } = body;

    if (!amount || !reason) return errorResponse("Amount and reason are required");

    const invoice = await Invoice.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!invoice) return errorResponse("Invoice not found", 404);
    if (invoice.status !== "Posted") return errorResponse("Credit notes can only be issued against Posted invoices");
    if (amount > invoice.total_amount) return errorResponse("Credit note amount cannot exceed invoice total");

    const creditNote = await CreditNote.create({
      tenant_id: user.tenant_id,
      invoice_id: id,
      amount,
      reason,
      status: "Posted",
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    // Reduce customer balance
    await Customer.findByIdAndUpdate(invoice.customer_id, {
      $inc: { current_balance: -amount },
    });

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "CreditNote", entity_id: creditNote._id, changed_by: user.user_id },
      null,
      creditNote.toObject()
    );

    return successResponse({ credit_note: creditNote }, 201);
  }, ["Owner", "Accountant"]);
}
