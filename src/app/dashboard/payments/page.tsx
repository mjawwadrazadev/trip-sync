"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wallet } from "lucide-react";

interface Payment {
  _id: string;
  customer_id: { _id: string; name: string } | string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [method, setMethod] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || [])); }, [load]);

  async function create() {
    const res = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer_id: customerId, amount: parseFloat(amount), currency, payment_method: method }) });
    if (res.ok) { setShowNew(false); setCustomerId(""); setAmount(""); setMethod(""); load(); } else { const d = await res.json(); alert(d.error); }
  }

  const statusStyles: Record<string, string> = {
    Posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Voided: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Payments</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Track and record customer payments</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Record Payment
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-lg font-semibold">Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Customer</Label>
                <Select value={customerId} onValueChange={(v) => v && setCustomerId(v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[13px]">Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 font-mono" placeholder="0" /></div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Currency</Label>
                  <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>{["PKR", "USD", "GBP", "SAR", "AED"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Payment Method</Label>
                <Select value={method} onValueChange={(v) => v && setMethod(v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>{["Cash", "Bank Transfer", "Cheque", "Online"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={create} disabled={!customerId || !amount || !method} className="w-full h-10 gap-2"><Wallet className="h-4 w-4" /> Record Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3"><CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">All Payments</CardTitle></CardHeader>
        <CardContent className="px-6 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 dark:border-[#1e1e21]">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Customer</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Currency</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Method</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-[13px] text-gray-400">No payments yet</TableCell></TableRow>
                  ) : payments.map((p) => (
                    <TableRow key={p._id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                      <TableCell className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{typeof p.customer_id === "object" ? p.customer_id.name : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-100">{p.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-[13px] text-gray-500">{p.currency}</TableCell>
                      <TableCell className="text-[13px] text-gray-600 dark:text-gray-300">{p.payment_method}</TableCell>
                      <TableCell><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[p.status] || ""}`}>{p.status}</span></TableCell>
                      <TableCell className="text-[13px] text-gray-500">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
