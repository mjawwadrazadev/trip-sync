import { NextRequest } from "next/server";
import { withAuth, successResponse } from "@/lib/api-helpers";
import { Customer, Invoice, PaymentAllocation } from "@/models";

// GET /api/reports/dues-aging - Customer dues/aging report
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const asOfDate = new Date(searchParams.get("as_of_date") || new Date().toISOString());

    const customers = await Customer.find({
      tenant_id: user.tenant_id,
      current_balance: { $gt: 0 },
    }).lean();

    const agingReport = [];

    for (const customer of customers) {
      const invoices = await Invoice.find({
        tenant_id: user.tenant_id,
        customer_id: customer._id,
        status: "Posted",
      }).lean();

      const buckets = { current: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0 };

      for (const inv of invoices) {
        // Get total allocated against this invoice
        const allocations = await PaymentAllocation.find({ invoice_id: inv._id });
        const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
        const outstanding = inv.total_amount - totalAllocated;

        if (outstanding <= 0) continue;

        const daysDiff = Math.floor((asOfDate.getTime() - new Date(inv.created_at).getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 0) buckets.current += outstanding;
        else if (daysDiff <= 30) buckets.days_30 += outstanding;
        else if (daysDiff <= 60) buckets.days_60 += outstanding;
        else if (daysDiff <= 90) buckets.days_90 += outstanding;
        else buckets.over_90 += outstanding;
      }

      const total = buckets.current + buckets.days_30 + buckets.days_60 + buckets.days_90 + buckets.over_90;
      if (total > 0) {
        agingReport.push({
          customer: { id: customer._id, name: customer.name },
          ...buckets,
          total: Math.round(total * 100) / 100,
        });
      }
    }

    return successResponse({ as_of_date: asOfDate, aging: agingReport });
  });
}
