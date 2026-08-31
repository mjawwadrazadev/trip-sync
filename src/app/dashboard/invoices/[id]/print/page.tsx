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
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #111; }
    .no-print { position: fixed; top: 16px; right: 16px; z-index: 50; display: flex; gap: 8px; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; min-height: 100vh; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #111827; margin-bottom: 24px; }
    .agency-name { font-size: 22px; font-weight: 700; }
    .agency-sub { font-size: 12px; color: #9ca3af; margin-top: 2px; }
    .agency-contact { font-size: 12px; color: #6b7280; margin-top: 8px; line-height: 1.6; }
    .inv-title { font-size: 36px; font-weight: 800; letter-spacing: -1px; }
    .inv-num { font-size: 18px; font-family: monospace; font-weight: 600; color: #4b5563; margin-top: 4px; }
    .inv-meta { font-size: 12px; color: #6b7280; margin-top: 12px; line-height: 1.8; }
    .inv-meta strong { color: #374151; }
    .bill-to { margin-bottom: 24px; }
    .sec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 6px; }
    .cust-name { font-size: 15px; font-weight: 700; }
    .cust-detail { font-size: 13px; color: #6b7280; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { text-align: left; padding: 8px 0 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; border-bottom: 2px solid #111827; }
    th.r { text-align: right; }
    td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    td.svc { font-weight: 600; color: #1f2937; }
    td.desc { color: #6b7280; }
    td.tax { text-align: right; color: #6b7280; font-size: 12px; }
    td.amt { text-align: right; font-family: monospace; font-weight: 600; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 240px; }
    .trow { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .trow.grand { border-top: 2px solid #111827; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 15px; }
    .tlabel { color: #6b7280; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 16px; }
    .footer-text { font-size: 12px; color: #6b7280; white-space: pre-line; line-height: 1.6; margin-top: 6px; }
    .generated { text-align: center; margin-top: 32px; font-size: 11px; color: #d1d5db; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
    .posted { background: #d1fae5; color: #065f46; }
    .draft { background: #f3f4f6; color: #374151; }
    .voided { background: #fee2e2; color: #991b1b; }
    @media print { .no-print { display: none !important; } @page { margin: 15mm; } }
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
              <img src={tenant.logo_url} alt="logo" style={{ height: 56, objectFit: "contain", marginBottom: 8 }} />
            )}
            <div className="agency-name">{tenant?.name || "Agency"}</div>
            {tenant?.tagline && <div className="agency-sub">{tenant.tagline}</div>}
            <div className="agency-contact">
              {tenant?.address && <div>{tenant.address}</div>}
              {tenant?.city && <div>{tenant.city}</div>}
              {tenant?.contact_phone && <div>📞 {tenant.contact_phone}</div>}
              {tenant?.contact_email && <div>✉ {tenant.contact_email}</div>}
              {tenant?.website && <div>🌐 {tenant.website}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="inv-title">INVOICE</div>
            <div className="inv-num">{String(invoice.invoice_number)}</div>
            <div className="inv-meta">
              <div><strong>Date:</strong> {formatDate(String(invoice.created_at))}</div>
              <div><strong>Currency:</strong> {String(invoice.currency)}</div>
              <div>
                <strong>Status:</strong>{" "}
                <span className={`badge ${invoice.status === "Posted" ? "posted" : invoice.status === "Voided" ? "voided" : "draft"}`}>
                  {String(invoice.status)}
                </span>
              </div>
              {invoice.bsp_flag && <div style={{ color: "#1d4ed8", fontWeight: 700 }}>BSP Transaction</div>}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="bill-to">
          <div className="sec-label">Bill To</div>
          <div className="cust-name">{customer?.name || "—"}</div>
          <div className="cust-detail">
            {customer?.email && <div>{customer.email}</div>}
            {customer?.phone && <div>{customer.phone}</div>}
            {customer?.address && <div>{customer.address}</div>}
          </div>
        </div>

        {/* Line Items */}
        <table>
          <thead>
            <tr>
              <th style={{ width: "18%" }}>Service</th>
              <th>Description</th>
              <th className="r" style={{ width: "22%" }}>Tax</th>
              <th className="r" style={{ width: "18%" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li, i) => {
              const tc = li.tax_code_id as { code?: string; rate?: number } | null;
              const taxAmt = tc?.rate ? (li.amount * tc.rate) / 100 : 0;
              return (
                <tr key={i}>
                  <td className="svc">{li.service_type}</td>
                  <td className="desc">{li.description || "—"}</td>
                  <td className="tax">{tc?.code ? `${tc.code} (${tc.rate}%) = ${taxAmt.toLocaleString()}` : "—"}</td>
                  <td className="amt">{String(invoice.currency)} {li.amount.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <div className="totals-box">
            <div className="trow">
              <span className="tlabel">Subtotal</span>
              <span>{String(invoice.currency)} {invoice.total_amount.toLocaleString()}</span>
            </div>
            {totalTax > 0 && (
              <div className="trow">
                <span className="tlabel">Tax</span>
                <span>{String(invoice.currency)} {totalTax.toLocaleString()}</span>
              </div>
            )}
            <div className="trow grand">
              <span>Total</span>
              <span>{String(invoice.currency)} {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Notes */}
        {tenant?.invoice_notes && (
          <div className="footer">
            <div className="sec-label">Notes &amp; Payment Instructions</div>
            <div className="footer-text">{tenant.invoice_notes}</div>
          </div>
        )}

        <div className="generated">Generated by TripSync &middot; {new Date().toLocaleDateString()}</div>
      </div>
    </>
  );
}