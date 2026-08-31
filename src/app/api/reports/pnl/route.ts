import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, InvoiceLineItem, Expense, ExchangeRate, Tenant } from "@/models";

// GET /api/reports/pnl - Profit & Loss report with full detail
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) return errorResponse("from and to date params are required");

    const tenant = await Tenant.findById(user.tenant_id);
    if (!tenant) return errorResponse("Tenant not found", 404);

    const dateFilter = { $gte: new Date(from), $lte: new Date(to + "T23:59:59Z") };

    const [invoices, expenses] = await Promise.all([
      Invoice.find({ tenant_id: user.tenant_id, status: "Posted", created_at: dateFilter })
        .populate("customer_id", "name")
        .lean(),
      Expense.find({ tenant_id: user.tenant_id, status: "Posted", created_at: dateFilter })
        .populate("expense_type_id", "name")
        .lean(),
    ]);

    // Fetch all line items for the invoices
    const invoiceIds = invoices.map((inv) => inv._id);
    const allLineItems = await InvoiceLineItem.find({ invoice_id: { $in: invoiceIds } }).lean();

    // Map line items by invoice
    const lineItemsByInvoice: Record<string, typeof allLineItems> = {};
    for (const li of allLineItems) {
      const invId = String(li.invoice_id);
      if (!lineItemsByInvoice[invId]) lineItemsByInvoice[invId] = [];
      lineItemsByInvoice[invId].push(li);
    }

    // Convert to base currency
    const convertToBase = async (amount: number, currency: string) => {
      if (currency === tenant.base_currency) return amount;
      const rate = await ExchangeRate.findOne({
        from_currency: currency,
        to_currency: tenant.base_currency,
      }).sort({ fetched_at: -1 });
      return rate ? amount * rate.rate : amount;
    };

    // Build revenue breakdown by service type
    const revenueByType: Record<string, number> = {
      Ticket: 0, Hotel: 0, Package: 0, Umrah: 0, Visa: 0, Other: 0,
    };

    let totalRevenue = 0;
    const invoiceDetails = [];
    for (const inv of invoices) {
      const baseAmt = await convertToBase(inv.total_amount, inv.currency);
      totalRevenue += baseAmt;

      const items = lineItemsByInvoice[String(inv._id)] || [];
      const serviceTypes = [...new Set(items.map((li) => li.service_type))];

      for (const li of items) {
        const liBase = await convertToBase(li.amount, inv.currency);
        const type = li.service_type as string;
        if (revenueByType[type] !== undefined) {
          revenueByType[type] += liBase;
        } else {
          revenueByType["Other"] = (revenueByType["Other"] || 0) + liBase;
        }
      }

      const customer = inv.customer_id as { name?: string } | null;
      invoiceDetails.push({
        id: String(inv._id),
        invoice_number: inv.invoice_number,
        customer: customer?.name || "—",
        date: inv.created_at,
        currency: inv.currency,
        amount: inv.total_amount,
        amount_base: Math.round(baseAmt * 100) / 100,
        service_types: serviceTypes,
      });
    }

    let totalExpenses = 0;
    const expenseDetails = [];
    for (const exp of expenses) {
      totalExpenses += exp.amount;
      const et = exp.expense_type_id as { name?: string } | null;
      expenseDetails.push({
        id: String(exp._id),
        description: exp.description,
        category: et?.name || "General",
        date: exp.created_at,
        amount: exp.amount,
        currency: tenant.base_currency,
      });
    }

    return successResponse({
      period: { from, to },
      base_currency: tenant.base_currency,
      revenue: Math.round(totalRevenue * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net_profit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      invoice_count: invoices.length,
      expense_count: expenses.length,
      invoices: invoiceDetails,
      expenses_detail: expenseDetails,
      revenue_by_type: Object.fromEntries(
        Object.entries(revenueByType).map(([k, v]) => [k, Math.round(v * 100) / 100])
      ),
    });
  });
}