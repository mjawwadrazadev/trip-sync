import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, InvoiceLineItem } from "@/models";
import mongoose from "mongoose";

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const invoice = await Invoice.findOne({ _id: id, tenant_id: user.tenant_id })
      .populate("customer_id", "name email phone")
      .lean();
    if (!invoice) return errorResponse("Invoice not found", 404);
    const lineItems = await InvoiceLineItem.find({ invoice_id: id })
      .populate("tax_code_id", "code rate")
      .lean();
    return successResponse({ invoice, line_items: lineItems });
  });
}

// PATCH /api/invoices/[id] - update Draft invoices only
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const invoice = await Invoice.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!invoice) return errorResponse("Invoice not found", 404);
    if (invoice.status !== "Draft") return errorResponse("Only Draft invoices can be edited", 400);

    const body = await req.json();
    const { customer_id, currency, bsp_flag, bsp_billing_period, line_items } = body;

    if (customer_id) invoice.customer_id = new mongoose.Types.ObjectId(customer_id);
    if (currency) invoice.currency = currency;
    if (bsp_flag !== undefined) invoice.bsp_flag = bsp_flag;
    if (bsp_billing_period !== undefined) invoice.bsp_billing_period = bsp_billing_period;
    invoice.updated_by = new mongoose.Types.ObjectId(user.user_id);
    await invoice.save();

    if (Array.isArray(line_items)) {
      await InvoiceLineItem.deleteMany({ invoice_id: id });
      let total = 0;
      for (const li of line_items) {
        const amt = parseFloat(li.amount) || 0;
        total += amt;
        await InvoiceLineItem.create({
          invoice_id: id,
          tenant_id: user.tenant_id,
          service_type: li.service_type,
          description: li.description || "",
          amount: amt,
          commission_override_rate: li.commission_override_rate ? parseFloat(li.commission_override_rate) : null,
          tax_code_id: li.tax_code_id && li.tax_code_id !== "none" ? li.tax_code_id : null,
        });
      }
      invoice.total_amount = total;
      await invoice.save();
    }

    return successResponse({ invoice });
  });
}