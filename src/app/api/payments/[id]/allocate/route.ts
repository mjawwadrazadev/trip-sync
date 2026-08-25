import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Payment, PaymentAllocation, Invoice, Customer } from "@/models";

// POST /api/payments/[id]/allocate - Manually allocate payment across invoices
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const body = await req.json();
    const { allocations } = body; // [{invoice_id, amount}]

    if (!allocations?.length) return errorResponse("Allocations array is required");

    const payment = await Payment.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!payment) return errorResponse("Payment not found", 404);
    if (payment.status !== "Posted") return errorResponse("Payment must be Posted to allocate");

    // Check existing allocations
    const existingAllocations = await PaymentAllocation.find({ payment_id: id });
    const alreadyAllocated = existingAllocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    const newAllocationTotal = allocations.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0);

    if (alreadyAllocated + newAllocationTotal > payment.amount) {
      return errorResponse(`Total allocations (${alreadyAllocated + newAllocationTotal}) exceed payment amount (${payment.amount})`);
    }

    // Verify all invoices exist and belong to same tenant
    for (const alloc of allocations) {
      const invoice = await Invoice.findOne({ _id: alloc.invoice_id, tenant_id: user.tenant_id, status: "Posted" });
      if (!invoice) return errorResponse(`Invoice ${alloc.invoice_id} not found or not Posted`);
    }

    const created = await PaymentAllocation.insertMany(
      allocations.map((a: { invoice_id: string; amount: number }) => ({
        tenant_id: user.tenant_id,
        payment_id: id,
        invoice_id: a.invoice_id,
        allocated_amount: a.amount,
        created_by: user.user_id,
      }))
    );

    // Update customer balance (reduce by allocated amount)
    await Customer.findByIdAndUpdate(payment.customer_id, {
      $inc: { current_balance: -newAllocationTotal },
    });

    return successResponse({ allocations: created }, 201);
  }, ["Owner", "Accountant"]);
}
