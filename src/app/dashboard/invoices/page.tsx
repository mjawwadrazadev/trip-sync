"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Send, Ban, CreditCard, Trash2, History, Loader2 } from "lucide-react";

interface Invoice {
  _id: string;
  invoice_number: string;
  customer_id: { _id: string; name: string } | string;
  status: string;
  currency: string;
  total_amount: number;
  bsp_flag: boolean;
  created_at: string;
}

interface Customer { _id: string; name: string; }
interface LineItemInput { service_type: string; description: string; amount: string; commission_override_rate: string; tax_code_id: string; }
interface TaxCode { _id: string; code: string; rate: number; active: boolean; }

interface AuditLogEntry {
  _id: string;
  field_changed: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
  changed_by: { name: string } | null;
  changed_at: string;
}

export default function InvoicesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [voidDialog, setVoidDialog] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [creditDialog, setCreditDialog] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCurrency, setNewCurrency] = useState("PKR");
  const [newBsp, setNewBsp] = useState(false);
  const [newBspBillingPeriod, setNewBspBillingPeriod] = useState("");
  const defaultType = (typeFilter && typeFilter !== "Other") ? typeFilter : "Ticket";
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { service_type: defaultType, description: "", amount: "", commission_override_rate: "", tax_code_id: "" },
  ]);

  // Audit Logs state
  const [auditDialogInvoice, setAuditDialogInvoice] = useState<Invoice | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadAuditLogs = async (invoice: Invoice) => {
    setAuditDialogInvoice(invoice);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/audit-log?entity_type=Invoice&entity_id=${invoice._id}`);
      const data = await res.json();
      setAuditLogs(data.audit_logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const isManager = ["Owner", "Accountant"].includes((session?.user as { role?: string })?.role || "");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const url = typeFilter ? `/api/invoices?type=${typeFilter}` : "/api/invoices";
    const res = await fetch(url);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    loadInvoices();
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || []));
    fetch("/api/tax-codes").then((r) => r.json()).then((d) => setTaxCodes((d.tax_codes || []).filter((tc: TaxCode) => tc.active)));
  }, [loadInvoices]);

  async function createInvoice() {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: newCustomerId, currency: newCurrency, bsp_flag: newBsp,
        bsp_billing_period: newBsp ? newBspBillingPeriod : null,
        line_items: lineItems.map((li) => ({
          service_type: li.service_type,
          description: li.description,
          amount: parseFloat(li.amount) || 0,
          commission_override_rate: li.commission_override_rate !== "" ? parseFloat(li.commission_override_rate) : null,
          tax_code_id: li.tax_code_id !== "" ? li.tax_code_id : null,
        })),
      }),
    });
    if (res.ok) {
      setShowNew(false);
      setLineItems([{ service_type: defaultType, description: "", amount: "", commission_override_rate: "", tax_code_id: "" }]);
      setNewCustomerId("");
      setNewBspBillingPeriod("");
      loadInvoices();
    }
  }

  async function postInvoice(id: string) {
    const res = await fetch(`/api/invoices/${id}/post`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    loadInvoices();
  }

  async function voidInvoice() {
    if (!voidDialog) return;
    const res = await fetch(`/api/invoices/${voidDialog}/void`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: voidReason }) });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    setVoidDialog(null); setVoidReason(""); loadInvoices();
  }

  async function issueCreditNote() {
    if (!creditDialog) return;
    const res = await fetch(`/api/invoices/${creditDialog}/credit-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: parseFloat(creditAmount), reason: creditReason }) });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    setCreditDialog(null); setCreditAmount(""); setCreditReason(""); loadInvoices();
  }

  function updateLineItem(index: number, field: keyof LineItemInput, value: string) {
    const updated = [...lineItems]; updated[index][field] = value; setLineItems(updated);
  }

  const statusStyles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Voided: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Invoices{typeFilter ? ` — ${typeFilter}s` : ""}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Manage your invoices and billing</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> New Invoice
          </DialogTrigger>
          <DialogContent className="max-w-xl w-full">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Create Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Customer</Label>
                  <Select value={newCustomerId} onValueChange={(v) => v && setNewCustomerId(v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => (<SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Currency</Label>
                  <Select value={newCurrency} onValueChange={(v) => v && setNewCurrency(v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{["PKR", "USD", "GBP", "SAR", "AED"].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={newBsp} onChange={(e) => setNewBsp(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">BSP Transaction</span>
                </label>
                {newBsp && (
                  <div className="flex-1 w-full space-y-1.5">
                    <Label className="text-[13px]">BSP Billing Period</Label>
                    <Input placeholder="e.g. 2026-08 1st half" value={newBspBillingPeriod} onChange={(e) => setNewBspBillingPeriod(e.target.value)} className="h-9 text-[13px]" />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-[13px] mb-3 block">Line Items</Label>
                <div className="space-y-3">
                  {lineItems.map((li, i) => {
                    const isOther = li.service_type === "Other";
                    return (
                      <div key={i} className="rounded-xl border border-gray-200/60 dark:border-[#1e1e21] p-3 space-y-2.5 bg-gray-50/40 dark:bg-[#0e0e10]/30">
                        {/* Row 1: Service Type chip or locked badge */}
                        <div className="flex gap-2 items-center">
                          {typeFilter && typeFilter !== "Other" ? (
                            <span className="inline-flex items-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground px-3 h-9 text-[13px] font-semibold">
                              {typeFilter}
                            </span>
                          ) : (
                            <Select value={li.service_type} onValueChange={(v) => v && updateLineItem(i, "service_type", v)}>
                              <SelectTrigger className="h-9 text-[13px] w-[130px] flex-shrink-0"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Ticket", "Hotel", "Package", "Umrah", "Visa", "Other"].map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {/* Description — if Other, also show custom type name input */}
                          {isOther ? (
                            <Input placeholder="Type name (e.g. Car Rental)" value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} className="h-9 text-[13px] flex-1" />
                          ) : (
                            <Input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} className="h-9 text-[13px] flex-1" />
                          )}
                          {lineItems.length > 1 && (
                            <button onClick={() => setLineItems(lineItems.filter((_, idx) => idx !== i))} className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Row 2: Amount, Comm %, Tax */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Amount</span>
                            <Input placeholder="0" type="number" value={li.amount} onChange={(e) => updateLineItem(i, "amount", e.target.value)} className="h-9 text-[13px] font-mono w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Comm %</span>
                            <Input placeholder="Agent default" type="number" value={li.commission_override_rate} onChange={(e) => updateLineItem(i, "commission_override_rate", e.target.value)} className="h-9 text-[13px] font-mono w-full" />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Tax</span>
                            <Select value={li.tax_code_id || "none"} onValueChange={(v) => updateLineItem(i, "tax_code_id", v === "none" ? "" : (v || ""))}>
                              <SelectTrigger className="h-9 text-[13px] w-full">
                                <SelectValue placeholder="Choose Tax" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Tax</SelectItem>
                                {taxCodes.map((tc) => (
                                  <SelectItem key={tc._id} value={tc._id}>
                                    {tc.code} ({tc.rate}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-[12px]" onClick={() => setLineItems([...lineItems, { service_type: typeFilter && typeFilter !== "Other" ? typeFilter : "Other", description: "", amount: "", commission_override_rate: "", tax_code_id: "" }])}>
                  <Plus className="h-3 w-3" /> Add Line
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#1e1e21]">
                <span className="text-[13px] font-medium text-gray-500">Total</span>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-50 font-mono">
                  {newCurrency} {lineItems.reduce((s, li) => s + (parseFloat(li.amount) || 0), 0).toLocaleString()}
                </span>
              </div>

              <Button onClick={createInvoice} className="w-full h-10 gap-2" disabled={!newCustomerId || lineItems.every((li) => !li.amount)}>
                <FileTextIcon className="h-4 w-4" /> Create Draft Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3">
          <CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 dark:border-[#1e1e21]">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Invoice #</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Customer</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Currency</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">BSP</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-[13px] text-gray-400">No invoices yet. Create your first invoice to get started.</TableCell></TableRow>
                  ) : invoices.map((inv) => (
                    <TableRow key={inv._id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                      <TableCell className="font-mono text-[13px] font-medium text-gray-900 dark:text-gray-100">{inv.invoice_number}</TableCell>
                      <TableCell className="text-[13px] text-gray-600 dark:text-gray-300">{typeof inv.customer_id === "object" ? inv.customer_id.name : "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[inv.status] || ""}`}>
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-gray-500">{inv.currency}</TableCell>
                      <TableCell className="text-right font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-100">{inv.total_amount.toLocaleString()}</TableCell>
                      <TableCell>{inv.bsp_flag ? <Badge variant="outline" className="text-[10px] font-medium">BSP</Badge> : ""}</TableCell>
                      <TableCell className="text-[13px] text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {inv.status === "Draft" && (
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={() => postInvoice(inv._id)}>
                              <Send className="h-3 w-3" /> Post
                            </Button>
                          )}
                          {inv.status === "Posted" && (
                            <>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => setVoidDialog(inv._id)}>
                                <Ban className="h-3 w-3" /> Void
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px]" onClick={() => setCreditDialog(inv._id)}>
                                <CreditCard className="h-3 w-3" /> Credit Note
                              </Button>
                            </>
                          )}
                          {isManager && (
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[12px] cursor-pointer" onClick={() => loadAuditLogs(inv)}>
                              <History className="h-3 w-3" /> Logs
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={() => setVoidDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-semibold">Void Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Reason for voiding</Label>
              <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Why is this invoice being voided?" className="min-h-[80px]" />
            </div>
            <Button variant="destructive" onClick={voidInvoice} disabled={!voidReason} className="w-full gap-2">
              <Ban className="h-4 w-4" /> Confirm Void
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Note Dialog */}
      <Dialog open={!!creditDialog} onOpenChange={() => setCreditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-semibold">Issue Credit Note</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Amount</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Reason</Label>
              <Textarea value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="min-h-[80px]" />
            </div>
            <Button onClick={issueCreditNote} disabled={!creditAmount || !creditReason} className="w-full gap-2">
              <CreditCard className="h-4 w-4" /> Issue Credit Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={!!auditDialogInvoice} onOpenChange={(open) => !open && setAuditDialogInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Audit Trail — {auditDialogInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {loadingLogs ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : auditLogs.length === 0 ? (
              <p className="text-center py-8 text-[13px] text-gray-400">No change logs recorded for this invoice.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log._id} className="p-3 rounded-lg border border-gray-100 dark:border-[#1e1e21] bg-gray-50/30 dark:bg-[#0e0e10]/10 text-[12px] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Field: {log.field_changed}</span>
                      <span className="text-gray-400 text-[10px]">{new Date(log.changed_at).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-500 font-mono text-[11px] bg-white dark:bg-[#111113] p-1.5 rounded border border-gray-100 dark:border-[#1e1e21] mt-1">
                      <div><span className="text-red-500 font-semibold">Old:</span> {log.old_value !== null ? String(log.old_value) : "null"}</div>
                      <div><span className="text-emerald-500 font-semibold">New:</span> {log.new_value !== null ? String(log.new_value) : "null"}</div>
                    </div>
                    <div className="text-gray-400 text-[10px] pt-1">
                      Changed by: <span className="font-semibold text-gray-600 dark:text-gray-400">{log.changed_by?.name || "System"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-[#1e1e21]">
              <Button variant="outline" onClick={() => setAuditDialogInvoice(null)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>;
}
