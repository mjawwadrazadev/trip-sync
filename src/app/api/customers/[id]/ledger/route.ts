import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Customer, Invoice, Payment, CreditNote, PaymentAllocation } from "@/models";

// GET /api/customers/[id]/ledger - Get customer ledger
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const customer = await Customer.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!customer) return errorResponse("Customer not found", 404);

    const [invoices, payments, creditNotes] = await Promise.all([
      Invoice.find({ customer_id: id, tenant_id: user.tenant_id, status: { $ne: "Draft" } })
        .sort({ created_at: -1 })
        .lean(),
      Payment.find({ customer_id: id, tenant_id: user.tenant_id, status: "Posted" })
        .sort({ created_at: -1 })
        .lean(),
      CreditNote.find({ tenant_id: user.tenant_id, status: "Posted" })
        .populate({ path: "invoice_id", match: { customer_id: id }, select: "customer_id" })
        .sort({ created_at: -1 })
        .lean(),
    ]);

    // Get allocations for payments
    const paymentIds = payments.map((p) => p._id);
    const allocations = await PaymentAllocation.find({ payment_id: { $in: paymentIds } }).lean();

    // Build ledger entries
    const entries = [
      ...invoices.map((inv) => ({
        type: "invoice" as const,
        date: inv.created_at,
        reference: inv.invoice_number,
        debit: inv.status === "Posted" ? inv.total_amount : 0,
        credit: 0,
        status: inv.status,
      })),
      ...payments.map((pay) => ({
        type: "payment" as const,
        date: pay.created_at,
        reference: `PAY-${pay._id.toString().slice(-6)}`,
        debit: 0,
        credit: pay.amount,
        status: pay.status,
      })),
      ...creditNotes
        .filter((cn) => cn.invoice_id)
        .map((cn) => ({
          type: "credit_note" as const,
          date: cn.created_at,
          reference: `CN-${cn._id.toString().slice(-6)}`,
          debit: 0,
          credit: cn.amount,
          status: cn.status,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return successResponse({
      customer: { id: customer._id, name: customer.name, credit_limit: customer.credit_limit },
      current_balance: customer.current_balance,
      entries,
      allocations,
    });
  });
}
