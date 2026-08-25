import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, Expense, ExchangeRate, Tenant } from "@/models";

// GET /api/reports/pnl - Profit & Loss report
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) return errorResponse("from and to date params are required");

    const tenant = await Tenant.findById(user.tenant_id);
    if (!tenant) return errorResponse("Tenant not found", 404);

    const dateFilter = { $gte: new Date(from), $lte: new Date(to) };

    const [invoices, expenses] = await Promise.all([
      Invoice.find({
        tenant_id: user.tenant_id,
        status: "Posted",
        created_at: dateFilter,
      }).lean(),
      Expense.find({
        tenant_id: user.tenant_id,
        status: "Posted",
        created_at: dateFilter,
      }).lean(),
    ]);

    // Convert all amounts to base currency using LATEST rates
    const convertToBase = async (amount: number, currency: string) => {
      if (currency === tenant.base_currency) return amount;
      const rate = await ExchangeRate.findOne({
        from_currency: currency,
        to_currency: tenant.base_currency,
      }).sort({ fetched_at: -1 });
      return rate ? amount * rate.rate : amount;
    };

    let totalRevenue = 0;
    for (const inv of invoices) {
      totalRevenue += await convertToBase(inv.total_amount, inv.currency);
    }

    let totalExpenses = 0;
    for (const exp of expenses) {
      totalExpenses += exp.amount; // Expenses are in base currency
    }

    return successResponse({
      period: { from, to },
      base_currency: tenant.base_currency,
      revenue: Math.round(totalRevenue * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net_profit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      invoice_count: invoices.length,
      expense_count: expenses.length,
    });
  });
}
