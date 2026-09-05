"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { numberToWords } from "@/lib/numberToWords";
import {
  Plus,
  Trash2,
  Search,
  FileCheck,
  Printer,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type VoucherType = "RV" | "PV" | "JV" | "DN" | "CD";
type VoucherStatus = "Draft" | "Posted" | "Voided";

interface VoucherEntry {
  branch: string;
  ref_code: string;
  ref_no: string;
  adj_date: string;
  description: string;
  account_code: string;
  debit: number;
  credit: number;
}

interface Voucher {
  _id: string;
  voucher_number: string;
  voucher_type: VoucherType;
  voucher_date: string;
  name_on_voucher: string;
  manual_receipt_no: string;
  cost_center: string;
  cheque_no: string;
  cheque_status: string;
  debit_account: string;
  entries: VoucherEntry[];
  total_debit: number;
  total_credit: number;
  amount_in_words: string;
  remarks: string;
  print_format: string;
  status: VoucherStatus;
  createdAt: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VOUCHER_TYPES: { value: VoucherType; label: string; color: string }[] = [
  { value: "RV", label: "RV - Receipt Voucher", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "PV", label: "PV - Payment Voucher", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "JV", label: "JV - Journal Voucher", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "DN", label: "DN - Debit Note", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "CD", label: "CD - Cash Deposit", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
];

const STATUS_COLORS: Record<VoucherStatus, string> = {
  Draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Posted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Voided: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const PRINT_FORMATS = ["In House", "Standard", "Compact", "Detailed"];
const CHEQUE_STATUSES = ["", "Cleared", "Pending", "Bounced", "Cancelled"];

function blankEntry(): VoucherEntry {
  return {
    branch: "01",
    ref_code: "",
    ref_no: "",
    adj_date: "",
    description: "",
    account_code: "",
    debit: 0,
    credit: 0,
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function blankForm(type: VoucherType = "RV") {
  return {
    voucher_type: type,
    voucher_date: todayStr(),
    name_on_voucher: "",
    manual_receipt_no: "",
    cost_center: "",
    cheque_no: "",
    cheque_status: "",
    debit_account: "",
    entries: [blankEntry()],
    amount_in_words: "",
    remarks: "",
    print_format: "In House",
  };
}


// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Voucher | null>(null);
  const [createType, setCreateType] = useState<VoucherType>("RV");

  // Form state
  const [form, setForm] = useState(blankForm("RV"));
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  // Account suggestions
  const [accountSuggestions, setAccountSuggestions] = useState<string[]>([]);
  const [suggestionFor, setSuggestionFor] = useState<number | null>(null);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: filterType,
        status: filterStatus,
        search,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/vouchers?${params}`);
      const data = await res.json();
      setVouchers(data.vouchers || []);
      setTotal(data.total || 0);
    } catch {
      toast.add({ title: "Failed to load vouchers", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, search, page]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Fetch account code suggestions from customers + suppliers
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const [cr, sr] = await Promise.all([
          fetch("/api/customers?limit=200").then((r) => r.json()),
          fetch("/api/suppliers?limit=200").then((r) => r.json()),
        ]);
        const names: string[] = [
          ...(cr.customers || []).map((c: { name: string }) => c.name),
          ...(sr.suppliers || []).map((s: { name: string }) => s.name),
        ];
        setAccountSuggestions([...new Set(names)] as string[]);
      } catch {
        // ignore
      }
    }
    fetchSuggestions();
  }, []);

  // â”€â”€ Derived totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function calcTotals(entries: VoucherEntry[]) {
    const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
    const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
    return { totalDebit, totalCredit };
  }

  // â”€â”€ Entry helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function updateEntry(idx: number, field: keyof VoucherEntry, value: string | number) {
    setForm((prev) => {
      const entries = prev.entries.map((e, i) =>
        i === idx ? { ...e, [field]: value } : e
      );
      return { ...prev, entries };
    });
  }

  function addEntry() {
    setForm((prev) => ({ ...prev, entries: [...prev.entries, blankEntry()] }));
  }

  function removeEntry(idx: number) {
    setForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== idx),
    }));
  }

  function calculateNet() {
    const { totalDebit, totalCredit } = calcTotals(form.entries);
    const net = totalDebit - totalCredit;
    const words = numberToWords(Math.abs(net));
    setForm((prev) => ({ ...prev, amount_in_words: words }));
    toast.add({ title: `Net: ${net >= 0 ? "DR" : "CR"} ${Math.abs(net).toLocaleString()}`, type: "info" });
  }

  // ——— Open create dialog ———————————————————————————————————————————————————————————————————————————

  function openCreate(type: VoucherType) {
    setCreateType(type);
    setForm(blankForm(type));
    setShowCreate(true);
  }

  // â”€â”€ Open edit dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openEdit(v: Voucher) {
    setForm({
      voucher_type: v.voucher_type,
      voucher_date: v.voucher_date?.split("T")[0] || todayStr(),
      name_on_voucher: v.name_on_voucher || "",
      manual_receipt_no: v.manual_receipt_no || "",
      cost_center: v.cost_center || "",
      cheque_no: v.cheque_no || "",
      cheque_status: v.cheque_status || "",
      debit_account: v.debit_account || "",
      entries: v.entries?.length ? v.entries : [blankEntry()],
      amount_in_words: v.amount_in_words || "",
      remarks: v.remarks || "",
      print_format: v.print_format || "In House",
    });
    setShowEdit(v);
  }

  // â”€â”€ Save (create) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleCreate() {
    if (!form.name_on_voucher.trim()) {
      toast.add({ title: "Name on voucher is required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const { totalDebit, totalCredit } = calcTotals(form.entries);
      const amountInWords = numberToWords(totalDebit || totalCredit);
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total_debit: totalDebit,
          total_credit: totalCredit,
          amount_in_words: form.amount_in_words || amountInWords,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast.add({ title: `Voucher ${data.voucher.voucher_number} created`, type: "success" });
      setShowCreate(false);
      fetchVouchers();
    } catch (e) {
      toast.add({ title: String(e), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // â”€â”€ Save (edit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleUpdate() {
    if (!showEdit) return;
    setSaving(true);
    try {
      const { totalDebit, totalCredit } = calcTotals(form.entries);
      const amountInWords = numberToWords(totalDebit || totalCredit);
      const res = await fetch(`/api/vouchers/${showEdit._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          total_debit: totalDebit,
          total_credit: totalCredit,
          amount_in_words: form.amount_in_words || amountInWords,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.add({ title: "Voucher updated", type: "success" });
      setShowEdit(null);
      fetchVouchers();
    } catch (e) {
      toast.add({ title: String(e), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // â”€â”€ Post voucher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handlePost(id: string, voucherNo: string) {
    setPosting(true);
    try {
      const res = await fetch(`/api/vouchers/${id}/post`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.add({ title: `Voucher ${voucherNo} posted successfully`, type: "success" });
      setShowEdit(null);
      fetchVouchers();
    } catch (e) {
      toast.add({ title: String(e), type: "error" });
    } finally {
      setPosting(false);
    }
  }

  // â”€â”€ Delete voucher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleDelete(id: string, voucherNo: string) {
    if (!confirm(`Delete voucher ${voucherNo}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/vouchers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.add({ title: `Voucher ${voucherNo} deleted`, type: "success" });
      fetchVouchers();
    } catch (e) {
      toast.add({ title: String(e), type: "error" });
    }
  }

  // â”€â”€ Voucher form (shared for create + edit) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function renderVoucherForm(isEdit = false, editVoucher?: Voucher) {
    const { totalDebit, totalCredit } = calcTotals(form.entries);
    const isPosted = editVoucher?.status === "Posted";

    return (
      <div className="space-y-4">
        {/* Row 1: Type, Date, Name on Voucher, Manual Receipt No */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Voucher Type</Label>
            <Select
              value={form.voucher_type}
              onValueChange={(v) => setForm((p) => ({ ...p, voucher_type: v as VoucherType }))}
              disabled={isPosted}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOUCHER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Voucher Date</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={form.voucher_date}
              onChange={(e) => setForm((p) => ({ ...p, voucher_date: e.target.value }))}
              disabled={isPosted}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Name on Voucher</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Payee / Payer name"
              value={form.name_on_voucher}
              onChange={(e) => setForm((p) => ({ ...p, name_on_voucher: e.target.value }))}
              disabled={isPosted}
              list="account-suggestions"
            />
            <datalist id="account-suggestions">
              {accountSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Manual Receipt No</Label>
            <Input
              className="h-9 text-sm"
              placeholder="e.g. R-1234"
              value={form.manual_receipt_no}
              onChange={(e) => setForm((p) => ({ ...p, manual_receipt_no: e.target.value }))}
              disabled={isPosted}
            />
          </div>
        </div>

        {/* Row 2: Cost Center, Cheque No, Cheque Status, Debit Account */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Cost Center</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Cost center"
              value={form.cost_center}
              onChange={(e) => setForm((p) => ({ ...p, cost_center: e.target.value }))}
              disabled={isPosted}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Cheque No</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Cheque number"
              value={form.cheque_no}
              onChange={(e) => setForm((p) => ({ ...p, cheque_no: e.target.value }))}
              disabled={isPosted}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Cheque Status</Label>
            <Select
              value={form.cheque_status || "none"}
              onValueChange={(v) => setForm((p) => ({ ...p, cheque_status: (v ?? "") === "none" ? "" : (v ?? "") }))}

              disabled={isPosted}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">â€”</SelectItem>
                {CHEQUE_STATUSES.filter(Boolean).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Debit Account</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Debit account"
              value={form.debit_account}
              onChange={(e) => setForm((p) => ({ ...p, debit_account: e.target.value }))}
              disabled={isPosted}
              list="account-suggestions"
            />
          </div>
        </div>

        {/* Journal Entries Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Journal Entries
            </Label>
            {!isPosted && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={calculateNet}
                >
                  <RefreshCw className="h-3 w-3" />
                  Calculate Net
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addEntry}
                >
                  <Plus className="h-3 w-3" />
                  Add Row
                </Button>
              </div>
            )}
          </div>

          {/* Table header */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden overflow-x-auto">

            <div className="grid text-[11px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 dark:bg-[#111113] px-2 py-1.5"
              style={{ gridTemplateColumns: "48px 80px 90px 100px 1fr 160px 96px 96px 36px" }}>
              <span>Br</span>
              <span>Ref Code</span>
              <span>Ref No</span>
              <span>Adj Date</span>
              <span>Description</span>
              <span>Account Code</span>
              <span className="text-right">Debit</span>
              <span className="text-right">Credit</span>
              <span></span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {form.entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="grid items-center gap-1 px-2 py-1 hover:bg-gray-50/50 dark:hover:bg-[#111113]/50"
                  style={{ gridTemplateColumns: "48px 80px 90px 100px 1fr 160px 96px 96px 36px" }}
                >
                  <Input
                    className="h-7 text-xs px-1.5"
                    value={entry.branch}
                    onChange={(e) => updateEntry(idx, "branch", e.target.value)}
                    disabled={isPosted}
                    maxLength={4}
                  />
                  <Input
                    className="h-7 text-xs px-1.5"
                    value={entry.ref_code}
                    onChange={(e) => updateEntry(idx, "ref_code", e.target.value)}
                    disabled={isPosted}
                    placeholder="RC"
                  />
                  <Input
                    className="h-7 text-xs px-1.5"
                    value={entry.ref_no}
                    onChange={(e) => updateEntry(idx, "ref_no", e.target.value)}
                    disabled={isPosted}
                    placeholder="Ref #"
                  />
                  <Input
                    type="date"
                    className="h-7 text-xs px-1.5"
                    value={entry.adj_date}
                    onChange={(e) => updateEntry(idx, "adj_date", e.target.value)}
                    disabled={isPosted}
                  />
                  <Input
                    className="h-7 text-xs px-1.5"
                    value={entry.description}
                    onChange={(e) => updateEntry(idx, "description", e.target.value)}
                    disabled={isPosted}
                    placeholder="Description"
                  />
                  <div className="relative">
                    <Input
                      className="h-7 text-xs px-1.5"
                      value={entry.account_code}
                      onChange={(e) => updateEntry(idx, "account_code", e.target.value)}
                      disabled={isPosted}
                      placeholder="Account"
                      list={`acc-suggestions-${idx}`}
                      onFocus={() => setSuggestionFor(idx)}
                      onBlur={() => setSuggestionFor(null)}
                    />
                    <datalist id={`acc-suggestions-${idx}`}>
                      {accountSuggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    {suggestionFor === idx && (
                      <div className="absolute z-50 bg-white dark:bg-[#1a1a1d] border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-36 overflow-y-auto w-48 text-xs hidden" />
                    )}
                  </div>
                  <Input
                    type="number"
                    className="h-7 text-xs px-1.5 text-right"
                    value={entry.debit || ""}
                    onChange={(e) => updateEntry(idx, "debit", parseFloat(e.target.value) || 0)}
                    disabled={isPosted}
                    placeholder="0"
                  />
                  <Input
                    type="number"
                    className="h-7 text-xs px-1.5 text-right"
                    value={entry.credit || ""}
                    onChange={(e) => updateEntry(idx, "credit", parseFloat(e.target.value) || 0)}
                    disabled={isPosted}
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => removeEntry(idx)}
                    disabled={isPosted || form.entries.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals row */}
            <div
              className="grid items-center gap-1 px-2 py-2 bg-gray-50 dark:bg-[#111113] border-t border-gray-200 dark:border-gray-800 font-semibold text-sm"
              style={{ gridTemplateColumns: "48px 80px 90px 100px 1fr 160px 96px 96px 36px" }}
            >
              <span className="col-span-6 text-xs text-gray-500 text-right pr-2">Totals:</span>
              <span className="text-right text-green-700 dark:text-green-400">
                {totalDebit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-right text-blue-700 dark:text-blue-400">
                {totalCredit.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
              <span />
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div>
          <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount In Words</Label>
          <Input
            className="h-9 text-sm bg-amber-50 dark:bg-amber-950/20 font-medium"
            value={form.amount_in_words || numberToWords(totalDebit || totalCredit)}
            onChange={(e) => setForm((p) => ({ ...p, amount_in_words: e.target.value }))}
            disabled={isPosted}
            placeholder="Auto-calculated from totals"
          />
        </div>

        {/* Remarks + Print Format */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Remarks</Label>
            <Textarea
              className="text-sm resize-none"
              rows={2}
              placeholder="Optional remarks..."
              value={form.remarks}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              disabled={isPosted}
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-500 mb-1.5 block">Print Format</Label>
            <Select
              value={form.print_format}
              onValueChange={(v) => setForm((p) => ({ ...p, print_format: v ?? "In House" }))}

              disabled={isPosted}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRINT_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Vouchers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Receipt, Payment, Journal, Debit Note &amp; Cash Deposit vouchers
          </p>
        </div>
        {/* Quick-create buttons */}
        <div className="flex flex-wrap gap-2">
          {VOUCHER_TYPES.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-semibold h-8"
              onClick={() => openCreate(t.value)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t.value}
            </Button>
          ))}
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search vouchers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {VOUCHER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.value} — {t.label.split(" - ")[1]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Posted">Posted</SelectItem>
            <SelectItem value="Voided">Voided</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={fetchVouchers}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Vouchers table */}
      <div className="bg-white dark:bg-[#111113] rounded-xl border border-gray-200 dark:border-[#1e1e21] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#1e1e21] bg-gray-50 dark:bg-[#0d0d0f]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Voucher #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#1a1a1d]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">ðŸ§¾</div>
                    <p className="text-sm font-medium text-gray-500">No vouchers found</p>
                    <p className="text-xs text-gray-400 mt-1">Create your first voucher using the buttons above</p>
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const typeInfo = VOUCHER_TYPES.find((t) => t.value === v.voucher_type);
                  return (
                    <tr
                      key={v._id}
                      className="hover:bg-gray-50/60 dark:hover:bg-[#111113]/60 cursor-pointer transition-colors"
                      onClick={() => openEdit(v)}
                    >
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {v.voucher_number}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${typeInfo?.color}`}>
                          {v.voucher_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {v.voucher_date ? new Date(v.voucher_date).toLocaleDateString("en-GB") : "â€”"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                        {v.name_on_voucher || "â€”"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-green-700 dark:text-green-400">
                        {v.total_debit ? v.total_debit.toLocaleString("en-PK") : "â€”"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-700 dark:text-blue-400">
                        {v.total_credit ? v.total_credit.toLocaleString("en-PK") : "â€”"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${STATUS_COLORS[v.status]}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {v.status !== "Posted" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                              onClick={() => handlePost(v._id, v.voucher_number)}
                              disabled={posting}
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                              Post
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => window.open(`/dashboard/vouchers/${v._id}/print`, "_blank")}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          {v.status !== "Posted" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleDelete(v._id, v.voucher_number)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[#1e1e21]">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * 20 + 1}â€“{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ Create Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
      <DialogContent className="w-[98vw] max-w-[1400px] max-h-[92vh] overflow-y-auto overflow-x-hidden">

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold ${VOUCHER_TYPES.find((t) => t.value === createType)?.color}`}>
                {createType}
              </span>
              New {VOUCHER_TYPES.find((t) => t.value === createType)?.label.split(" - ")[1]}
            </DialogTitle>
          </DialogHeader>
          {renderVoucherForm(false)}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="gap-2">
              {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Save Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Edit Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={!!showEdit} onOpenChange={(o) => { if (!o) setShowEdit(null); }}>
      <DialogContent className="w-[98vw] max-w-[1400px] max-h-[92vh] overflow-y-auto overflow-x-hidden">

          {showEdit && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold ${VOUCHER_TYPES.find((t) => t.value === showEdit.voucher_type)?.color}`}>
                    {showEdit.voucher_type}
                  </span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">{showEdit.voucher_number}</span>
                  <Badge className={STATUS_COLORS[showEdit.status]}>{showEdit.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                  <span className="text-base font-semibold">{showEdit.name_on_voucher || "â€”"}</span>
                </DialogTitle>
              </DialogHeader>
              {renderVoucherForm(true, showEdit)}
              <div className="flex justify-between gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-2">
                  {showEdit.status !== "Posted" && (
                    <Button
                      variant="outline"
                      className="gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/20"
                      onClick={() => handlePost(showEdit._id, showEdit.voucher_number)}
                      disabled={posting || saving}
                    >
                      {posting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
                      Post Voucher
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open(`/dashboard/vouchers/${showEdit._id}/print`, "_blank")}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowEdit(null)} disabled={saving}>
                    Close
                  </Button>
                  {showEdit.status !== "Posted" && (
                    <Button onClick={handleUpdate} disabled={saving} className="gap-2">
                      {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

