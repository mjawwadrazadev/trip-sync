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

    // Calculate dynamic self-healing balance
    const totalInvoiced = invoices
      .filter((inv) => inv.status === "Posted")
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    const totalCredits = creditNotes
      .filter((cn) => cn.invoice_id)
      .reduce((sum, cn) => sum + cn.amount, 0);
    const calculatedBalance = totalInvoiced - totalAllocated - totalCredits;

    if (customer.current_balance !== calculatedBalance) {
      customer.current_balance = calculatedBalance;
      await customer.save();
    }

    // Build ledger entries
    const entries = [
      ...invoices.map((inv) => ({
        id: inv._id.toString(),
        type: "invoice" as const,
        date: inv.created_at,
        reference: inv.invoice_number,
        debit: inv.status === "Posted" ? inv.total_amount : 0,
        credit: 0,
        status: inv.status,
      })),
      ...payments.map((pay) => ({
        id: pay._id.toString(),
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
          id: cn._id.toString(),
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
      current_balance: calculatedBalance,
      entries,
      allocations,
    });
  });
}
