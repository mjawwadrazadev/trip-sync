import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, Customer, Commission } from "@/models";
import { logChanges } from "@/lib/audit";

// POST /api/invoices/[id]/void - Void a posted invoice
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const body = await req.json();

    if (!body.reason) return errorResponse("Reason is required");

    const invoice = await Invoice.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!invoice) return errorResponse("Invoice not found", 404);
    if (invoice.status !== "Posted") return errorResponse("Only Posted invoices can be voided");

    const oldDoc = invoice.toObject();
    invoice.status = "Voided";
    invoice.updated_by = user.user_id;
    await invoice.save();

    // Reverse customer balance
    await Customer.findByIdAndUpdate(invoice.customer_id, {
      $inc: { current_balance: -invoice.total_amount },
    });

    // Void related commissions
    await Commission.updateMany(
      { tenant_id: user.tenant_id, invoice_line_item_id: { $in: await getLineItemIds(id) } },
      { status: "Voided" }
    );

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Invoice", entity_id: invoice._id, changed_by: user.user_id },
      oldDoc,
      { ...invoice.toObject(), void_reason: body.reason }
    );

    return successResponse({ invoice });
  }, ["Owner", "Accountant"]);
}

async function getLineItemIds(invoiceId: string) {
  const { default: InvoiceLineItem } = await import("@/models/InvoiceLineItem");
  const items = await InvoiceLineItem.find({ invoice_id: invoiceId }).select("_id").lean();
  return items.map((i) => i._id);
}
