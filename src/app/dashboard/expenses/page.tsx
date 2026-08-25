"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, ShieldCheck } from "lucide-react";

interface Expense {
  _id: string;
  expense_type_id: { _id: string; name: string } | string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [types, setTypes] = useState<{ _id: string; name: string; requires_approval: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    const [expRes, typeRes] = await Promise.all([fetch("/api/expenses"), fetch("/api/expense-types")]);
    const [expData, typeData] = await Promise.all([expRes.json(), typeRes.json()]);
    setExpenses(expData.expenses || []); setTypes(typeData.expense_types || []); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expense_type_id: typeId, amount: parseFloat(amount), description }) });
    if (res.ok) { setShowNew(false); setTypeId(""); setAmount(""); setDescription(""); load(); }
  }

  const statusStyles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    PendingApproval: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    Approved: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Voided: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Expenses</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Track and manage business expenses</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Add Expense
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-lg font-semibold">Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Expense Type</Label>
                <Select value={typeId} onValueChange={(v) => v && setTypeId(v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        <span className="flex items-center gap-2">
                          {t.name}
                          {t.requires_approval && <ShieldCheck className="h-3 w-3 text-amber-500" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-[13px]">Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 font-mono" placeholder="0" /></div>
              <div className="space-y-1.5"><Label className="text-[13px]">Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-10" placeholder="What is this expense for?" /></div>
              <Button onClick={create} disabled={!typeId || !amount} className="w-full h-10 gap-2"><Receipt className="h-4 w-4" /> Submit Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3"><CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">All Expenses</CardTitle></CardHeader>
        <CardContent className="px-6 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 dark:border-[#1e1e21]">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Description</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-[13px] text-gray-400">No expenses yet</TableCell></TableRow>
                  ) : expenses.map((e) => (
                    <TableRow key={e._id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                      <TableCell className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{typeof e.expense_type_id === "object" ? e.expense_type_id.name : "-"}</TableCell>
                      <TableCell className="text-[13px] text-gray-500">{e.description || "-"}</TableCell>
                      <TableCell className="text-right font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-100">{e.amount.toLocaleString()}</TableCell>
                      <TableCell><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[e.status] || ""}`}>{e.status === "PendingApproval" ? "Pending" : e.status}</span></TableCell>
                      <TableCell className="text-[13px] text-gray-500">{new Date(e.created_at).toLocaleDateString()}</TableCell>
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
