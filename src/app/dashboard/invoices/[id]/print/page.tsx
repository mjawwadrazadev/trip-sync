import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Invoice, InvoiceLineItem, Tenant } from "@/models";
import PrintButtons from "./PrintButtons";

interface PrintParams {
  params: Promise<{ id: string }>;
}

export default async function PrintInvoicePage({ params }: PrintParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return notFound();

  await connectDB();

  const tenantId = (session.user as { tenant_id?: string }).tenant_id;
  if (!tenantId) return notFound();

  const invoice = await Invoice.findOne({ _id: id, tenant_id: tenantId })
    .populate("customer_id", "name email phone address")
    .populate("spo_id", "name email")
    .populate("supplier_id", "name code")
    .lean();

  if (!invoice) return notFound();

  const lineItems = await InvoiceLineItem.find({ invoice_id: id })
    .populate("tax_code_id", "code rate")
    .lean();

  const tenant = await Tenant.findById(tenantId).lean();

  const customer = invoice.customer_id as {
    name?: string; email?: string; phone?: string; address?: string;
  } | null;

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

  const totalTax = lineItems.reduce((sum, li) => {
    const tc = li.tax_code_id as { rate?: number } | null;
    if (!tc?.rate) return sum;
    return sum + (li.amount * tc.rate) / 100;
  }, 0);

  const grandTotal = invoice.total_amount + totalTax;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; }
    .no-print { position: fixed; top: 16px; right: 16px; z-index: 50; display: flex; gap: 8px; }
    .page { max-width: 860px; margin: 0 auto; padding: 36px; min-height: 100vh; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0f172a; margin-bottom: 20px; }
    .agency-name { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
    .agency-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
    .agency-contact { font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.5; }
    .inv-title { font-size: 32px; font-weight: 800; letter-spacing: -1px; color: #0f172a; }
    .inv-num { font-size: 16px; font-family: monospace; font-weight: 700; color: #334155; margin-top: 2px; }
    .inv-meta { font-size: 11px; color: #475569; margin-top: 8px; line-height: 1.6; }
    .inv-meta strong { color: #0f172a; }
    .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
    .posted { background: #dcfce7; color: #15803d; }
    .draft { background: #f1f5f9; color: #475569; }
    .voided { background: #fee2e2; color: #b91c1c; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .sec-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px; }
    .cust-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .cust-detail { font-size: 11px; color: #475569; line-height: 1.5; margin-top: 2px; }
    
    .ticket-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #fff; }
    .ticket-header { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
    .pax-title { font-size: 15px; font-weight: 800; color: #0f172a; }
    .ticket-no { font-family: monospace; font-size: 13px; font-weight: 700; color: #1e40af; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
    th { text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; background: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
    th.r { text-align: right; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    td.r { text-align: right; font-family: monospace; font-weight: 600; }
    td.mono { font-family: monospace; }
    td.bold { font-weight: 700; color: #0f172a; }

    .tax-strip { display: flex; flex-wrap: wrap; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 11px; margin-bottom: 16px; }
    .tax-item { color: #475569; }
    .tax-item strong { color: #0f172a; font-family: monospace; }

    .totals-area { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-box { width: 280px; }
    .trow { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
    .trow.grand { border-top: 2px solid #0f172a; margin-top: 6px; padding-top: 8px; font-weight: 800; font-size: 15px; color: #0f172a; }
    .tlabel { color: #475569; }
    
    .footer { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px; }
    .footer-text { font-size: 11px; color: #64748b; white-space: pre-line; line-height: 1.5; margin-top: 4px; }
    .generated { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; }
    
    @media print { .no-print { display: none !important; } @page { margin: 12mm; } }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <PrintButtons />
      <div className="page">
        {/* Header */}
        <div className="hdr">
          <div>
            {tenant?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logo_url} alt="logo" style={{ height: 50, objectFit: "contain", marginBottom: 6 }} />
            )}
            <div className="agency-name">{tenant?.name || "Agency"}</div>
            {tenant?.tagline && <div className="agency-sub">{tenant.tagline}</div>}
            <div className="agency-contact">
              {tenant?.address && <div>{tenant.address} {tenant?.city ? `, ${tenant.city}` : ""}</div>}
              {tenant?.contact_phone && <div>📞 {tenant.contact_phone}</div>}
              {tenant?.contact_email && <div>✉ {tenant.contact_email}</div>}
              {tenant?.website && <div>🌐 {tenant.website}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="inv-title">SALE INVOICE</div>
            <div className="inv-num">{String(invoice.invoice_number)}</div>
            <div className="inv-meta">
              <div><strong>Date:</strong> {formatDate(String(invoice.created_at))}</div>
              <div><strong>Pay Mode:</strong> {invoice.payment_mode || "CR"}</div>
              <div><strong>Remarks:</strong> {invoice.remarks || "NORMAL"}</div>
              <div>
                <strong>Status:</strong>{" "}
                <span className={`badge ${invoice.status === "Posted" ? "posted" : invoice.status === "Voided" ? "voided" : "draft"}`}>
                  {String(invoice.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Billing Summary Cards */}
        <div className="grid-2">
          <div className="info-card">
            <div className="sec-label">Customer / Bill To</div>
            <div className="cust-name">{invoice.print_name || customer?.name || "—"}</div>
            <div className="cust-detail">
              {customer?.email && <div>{customer.email}</div>}
              {customer?.phone && <div>{customer.phone}</div>}
              {customer?.address && <div>{customer.address}</div>}
            </div>
          </div>
          <div className="info-card">
            <div className="sec-label">Booking Details</div>
            <div className="cust-detail">
              {invoice.spo_id && typeof invoice.spo_id === "object" && "name" in invoice.spo_id && (
                <div><strong>Agent / SPO:</strong> {String((invoice.spo_id as { name?: string }).name)}</div>
              )}
              {invoice.supplier_id && typeof invoice.supplier_id === "object" && "name" in invoice.supplier_id && (
                <div><strong>Supplier / Vendor:</strong> {String((invoice.supplier_id as { name?: string }).name)}</div>
              )}
              {invoice.cost_center && <div><strong>Cost Center:</strong> {invoice.cost_center}</div>}
              <div><strong>Currency:</strong> {String(invoice.currency)}</div>
            </div>
          </div>
        </div>

        {/* Line Items & Ticketing Cards */}
        {lineItems.map((li, i) => {
          const isTicket = li.service_type === "Ticket";
          return (
            <div key={i} className="ticket-card">
              {isTicket ? (
                <div>
                  <div className="ticket-header">
                    <div>
                      <div className="pax-title">👤 {li.pax_name || "PASSENGER"} ({li.pax_type || "A"})</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {li.passport_no ? `Passport: ${li.passport_no}` : ""}
                        {li.airline_name ? ` • Airline: ${li.airline_name}` : ""}
                        {li.sector ? ` • Sector: ${li.sector}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="ticket-no">🎟 {li.ticket_number || "TICKET"}</div>
                      <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, marginTop: 2 }}>
                        {li.gds_pnr ? `PNR: ${li.gds_pnr}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Flight Segments Table */}
                  {Array.isArray(li.flight_segments) && li.flight_segments.length > 0 && (
                    <div>
                      <div className="sec-label">Flight Itinerary &amp; Segments</div>
                      <table>
                        <thead>
                          <tr>
                            <th>Sector / City</th>
                            <th>Flight #</th>
                            <th>Class</th>
                            <th>Dep Date</th>
                            <th>Dep Time</th>
                            <th>Arr Time</th>
                            <th>Fare Basis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {li.flight_segments.map((seg: { city?: string; flight_no?: string; booking_class?: string; dep_date?: string; dep_time?: string; arr_time?: string; fare_basis?: string }, sIdx: number) => (
                            <tr key={sIdx}>
                              <td className="bold mono">{seg.city || "—"}</td>
                              <td>{seg.flight_no || "—"}</td>
                              <td className="mono">{seg.booking_class || "Y"}</td>
                              <td>{seg.dep_date ? formatDate(seg.dep_date) : "—"}</td>
                              <td className="mono">{seg.dep_time || "—"}</td>
                              <td className="mono">{seg.arr_time || "—"}</td>
                              <td className="mono">{seg.fare_basis || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Airfare & Taxes Breakdown Strip */}
                  <div className="tax-strip">
                    <span className="tax-item">Base Fare: <strong>{invoice.currency} {(li.base_fare || li.amount).toLocaleString()}</strong></span>
                    {li.tax_dof > 0 && <span className="tax-item">DOF: <strong>{li.tax_dof.toLocaleString()}</strong></span>}
                    {li.tax_yq > 0 && <span className="tax-item">YQ/YR: <strong>{li.tax_yq.toLocaleString()}</strong></span>}
                    {li.tax_rg > 0 && <span className="tax-item">RG: <strong>{li.tax_rg.toLocaleString()}</strong></span>}
                    {li.tax_pk > 0 && <span className="tax-item">PK: <strong>{li.tax_pk.toLocaleString()}</strong></span>}
                    {li.tax_apt > 0 && <span className="tax-item">APT: <strong>{li.tax_apt.toLocaleString()}</strong></span>}
                    {li.tax_airline_city > 0 && <span className="tax-item">City Tax/XT: <strong>{li.tax_airline_city.toLocaleString()}</strong></span>}
                    {li.psf_amount > 0 && <span className="tax-item">Service Fee: <strong>{li.psf_amount.toLocaleString()}</strong></span>}
                    {li.discount_amount > 0 && <span className="tax-item" style={{ color: "#15803d" }}>Discount: <strong>-{li.discount_amount.toLocaleString()}</strong></span>}
                    <span className="tax-item" style={{ marginLeft: "auto", fontWeight: 700 }}>Total Billed: <strong>{invoice.currency} {li.amount.toLocaleString()}</strong></span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{li.service_type}</div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>{li.description}</div>
                  </div>
                  <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>
                    {invoice.currency} {li.amount.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Totals */}
        <div className="totals-area">
          <div className="totals-box">
            <div className="trow">
              <span className="tlabel">Subtotal</span>
              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{String(invoice.currency)} {invoice.total_amount.toLocaleString()}</span>
            </div>
            {totalTax > 0 && (
              <div className="trow">
                <span className="tlabel">Tax</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{String(invoice.currency)} {totalTax.toLocaleString()}</span>
              </div>
            )}
            <div className="trow grand">
              <span>Grand Total</span>
              <span>{String(invoice.currency)} {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        {tenant?.invoice_notes && (
          <div className="footer">
            <div className="sec-label">Payment Instructions &amp; Conditions</div>
            <div className="footer-text">{tenant.invoice_notes}</div>
          </div>
        )}

        <div className="generated">Generated by TripSync &middot; {new Date().toLocaleDateString()}</div>
      </div>
    </>
  );
}
