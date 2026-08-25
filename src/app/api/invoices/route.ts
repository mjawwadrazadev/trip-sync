import { NextRequest, NextResponse } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, InvoiceLineItem, Tenant } from "@/models";
import { logChanges } from "@/lib/audit";

// GET /api/invoices - List invoices
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customer_id = searchParams.get("customer_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (status) filter.status = status;
    if (customer_id) filter.customer_id = customer_id;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("customer_id", "name")
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return successResponse({ invoices, total, page, pages: Math.ceil(total / limit) });
  });
}

// POST /api/invoices - Create draft invoice
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();
    const { customer_id, currency, line_items, bsp_flag, bsp_billing_period } = body;

    if (!customer_id || !line_items?.length) {
      return errorResponse("customer_id and line_items are required");
    }

    // Generate sequential invoice number
    const tenant = await Tenant.findById(user.tenant_id);
    if (!tenant) return errorResponse("Tenant not found", 404);

    const lastInvoice = await Invoice.findOne({ tenant_id: user.tenant_id })
      .sort({ created_at: -1 })
      .lean();

    let nextNum = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoice_number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const invoice_number = `${tenant.invoice_prefix}-${String(nextNum).padStart(6, "0")}`;

    // Calculate total
    const total_amount = line_items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);

    const invoice = await Invoice.create({
      tenant_id: user.tenant_id,
      customer_id,
      invoice_number,
      status: "Draft",
      currency: currency || tenant.base_currency,
      total_amount,
      bsp_flag: bsp_flag || false,
      bsp_billing_period: bsp_billing_period || null,
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    // Create line items
    const lineItemDocs = await InvoiceLineItem.insertMany(
      line_items.map((item: Record<string, unknown>) => ({
        invoice_id: invoice._id,
        tenant_id: user.tenant_id,
        service_type: item.service_type || "Other",
        description: item.description,
        amount: item.amount,
        tax_code_id: item.tax_code_id || null,
        booking_reference: item.booking_reference || null,
      }))
    );

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Invoice", entity_id: invoice._id, changed_by: user.user_id },
      null,
      invoice.toObject()
    );

    return successResponse({ invoice, line_items: lineItemDocs }, 201);
  });
}
