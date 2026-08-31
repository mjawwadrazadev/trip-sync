import { NextRequest } from "next/server";
import { withAuth, successResponse } from "@/lib/api-helpers";
import { ApprovalRequest, Expense, Invoice } from "@/models";

// GET /api/approval-requests - List approval requests
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // optional filter

    const query: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (status) {
      query.status = status;
    }

    const requests = await ApprovalRequest.find(query)
      .populate("requested_by", "name email")
      .populate("resolved_by", "name email")
      .sort({ created_at: -1 })
      .lean();

    // Fetch related entity info for each request to show details
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        let details: Record<string, unknown> | null = null;
        if (request.type === "ExpenseApproval") {
          const expense = await Expense.findById(request.related_entity_id)
            .populate("expense_type_id", "name")
            .lean();
          if (expense) {
            details = {
              amount: expense.amount,
              description: expense.description,
              type_name: (expense.expense_type_id as { name?: string } | null)?.name || "Unknown Type",
            };
          }
        } else if (request.type === "CreditLimitOverride") {
          const invoice = await Invoice.findById(request.related_entity_id)
            .populate("customer_id", "name credit_limit current_balance")
            .lean();
          if (invoice) {
            details = {
              invoice_number: invoice.invoice_number,
              amount: invoice.total_amount,
              currency: invoice.currency,
              customer_name: (invoice.customer_id as { name?: string } | null)?.name || "Unknown Customer",
              credit_limit: (invoice.customer_id as { credit_limit?: number } | null)?.credit_limit,
              current_balance: (invoice.customer_id as { current_balance?: number } | null)?.current_balance,
            };
          }
        }
        return { ...request, details };
      })
    );

    return successResponse({ approval_requests: requestsWithDetails });
  });
}
