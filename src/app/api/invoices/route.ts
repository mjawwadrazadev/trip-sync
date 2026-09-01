import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Invoice, InvoiceLineItem, Tenant } from "@/models";
import { logChanges } from "@/lib/audit";

// GET /api/invoices - List invoices
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const customer_id = searchParams.get("customer_id");
    const service_type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (status) filter.status = status;
    if (customer_id) filter.customer_id = customer_id;

    if (service_type) {
      const matchingLineItems = await InvoiceLineItem.find({ tenant_id: user.tenant_id, service_type })
        .select("invoice_id")
        .lean();
      const invoiceIds = matchingLineItems.map((li) => li.invoice_id);
      filter._id = { $in: invoiceIds };
    }

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
    const {
      customer_id, currency, line_items, bsp_flag, bsp_billing_period,
      payment_mode, remarks, visit_type, spo_id, supplier_id,
      print_name, cost_center, adj_date, our_xo, client_xo,
    } = body;

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

    // Calculate total amount from line items
    const total_amount = line_items.reduce((sum: number, item: { amount?: number; customer_net?: number }) => {
      const amt = item.customer_net !== undefined && item.customer_net > 0 ? item.customer_net : (parseFloat(String(item.amount)) || 0);
      return sum + amt;
    }, 0);

    const invoice = await Invoice.create({
      tenant_id: user.tenant_id,
      customer_id,
      invoice_number,
      status: "Draft",
      currency: currency || tenant.base_currency,
      total_amount,
      bsp_flag: bsp_flag || false,
      bsp_billing_period: bsp_billing_period || null,
      payment_mode: payment_mode || "CR",
      remarks: remarks || "NORMAL",
      visit_type: visit_type || "Visitor",
      spo_id: spo_id || null,
      supplier_id: supplier_id || null,
      print_name: print_name || "",
      cost_center: cost_center || "",
      adj_date: adj_date ? new Date(adj_date) : null,
      our_xo: our_xo || "",
      client_xo: client_xo || "",
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    // Create line items
    const lineItemDocs = await InvoiceLineItem.insertMany(
      line_items.map((item: Record<string, unknown>) => ({
        invoice_id: invoice._id,
        tenant_id: user.tenant_id,
        service_type: item.service_type || "Other",
        description: item.description || (item.pax_name ? `Ticket: ${item.ticket_number || ''} ${item.pax_name}` : "Service"),
        amount: typeof item.customer_net === "number" && item.customer_net > 0 ? item.customer_net : (parseFloat(String(item.amount || 0)) || 0),
        tax_code_id: item.tax_code_id && item.tax_code_id !== "none" ? item.tax_code_id : null,
        booking_reference: item.booking_reference || null,
        commission_override_rate: item.commission_override_rate !== undefined && item.commission_override_rate !== "" && item.commission_override_rate !== null ? parseFloat(String(item.commission_override_rate)) : null,
        
        // Passenger & Airline Details
        pax_name: item.pax_name || "",
        pax_type: item.pax_type || "A",
        passport_no: item.passport_no || "",
        passport_issue_date: item.passport_issue_date || "",
        ticket_number: item.ticket_number || "",
        conjunction_ticket_no: item.conjunction_ticket_no || "",
        gds_pnr: item.gds_pnr || "",
        gds_name: item.gds_name || "",
        airline_name: item.airline_name || "",
        airline_code: item.airline_code || "",
        sector: item.sector || "",
        trip_type: item.trip_type || "International",
        doc_type: item.doc_type || "BSPD",
        tour_code: item.tour_code || "",
        issue_date: item.issue_date || "",

        // Flight Segments
        flight_segments: Array.isArray(item.flight_segments) ? item.flight_segments : [],

        // Airfare & IATA Taxes
        base_fare: parseFloat(String(item.base_fare || 0)) || 0,
        tax_dof: parseFloat(String(item.tax_dof || 0)) || 0,
        tax_yq: parseFloat(String(item.tax_yq || 0)) || 0,
        tax_yr: parseFloat(String(item.tax_yr || 0)) || 0,
        tax_rg: parseFloat(String(item.tax_rg || 0)) || 0,
        tax_pk: parseFloat(String(item.tax_pk || 0)) || 0,
        tax_apt: parseFloat(String(item.tax_apt || 0)) || 0,
        tax_kbr: parseFloat(String(item.tax_kbr || 0)) || 0,
        tax_kbp: parseFloat(String(item.tax_kbp || 0)) || 0,
        tax_pb: parseFloat(String(item.tax_pb || 0)) || 0,
        tax_xz: parseFloat(String(item.tax_xz || 0)) || 0,
        tax_yd: parseFloat(String(item.tax_yd || 0)) || 0,
        tax_yi: parseFloat(String(item.tax_yi || 0)) || 0,
        tax_rn: parseFloat(String(item.tax_rn || 0)) || 0,
        tax_city: parseFloat(String(item.tax_city || 0)) || 0,
        tax_airline_city: parseFloat(String(item.tax_airline_city || 0)) || 0,
        other_taxes: parseFloat(String(item.other_taxes || 0)) || 0,

        // Commercials & Deductions
        wht_percent: parseFloat(String(item.wht_percent || 0)) || 0,
        wht_amount: parseFloat(String(item.wht_amount || 0)) || 0,
        commission_percent: parseFloat(String(item.commission_percent || 0)) || 0,
        commission_amount: parseFloat(String(item.commission_amount || 0)) || 0,
        discount_percent: parseFloat(String(item.discount_percent || 0)) || 0,
        discount_amount: parseFloat(String(item.discount_amount || 0)) || 0,
        psf_amount: parseFloat(String(item.psf_amount || 0)) || 0,
        gst_percent: parseFloat(String(item.gst_percent || 0)) || 0,
        gst_amount: parseFloat(String(item.gst_amount || 0)) || 0,
        cancellation_charges_self: parseFloat(String(item.cancellation_charges_self || 0)) || 0,
        cancellation_charges_supplier: parseFloat(String(item.cancellation_charges_supplier || 0)) || 0,

        // Accounting Summary
        supplier_id: item.supplier_id || supplier_id || null,
        customer_gross: parseFloat(String(item.customer_gross || 0)) || 0,
        customer_net: parseFloat(String(item.customer_net || item.amount || 0)) || 0,
        supplier_gross: parseFloat(String(item.supplier_gross || 0)) || 0,
        supplier_net: parseFloat(String(item.supplier_net || 0)) || 0,
        agency_margin: parseFloat(String(item.agency_margin || 0)) || 0,
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
