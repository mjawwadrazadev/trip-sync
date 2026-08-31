"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Clock, TrendingUp, TrendingDown, Loader2, Printer, FileText, UserCheck } from "lucide-react";

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  customer: string;
  date: string;
  currency: string;
  amount: number;
  amount_base: number;
  service_types: string[];
}

interface ExpenseDetail {
  id: string;
  description: string;
  category: string;
  date: string;
  amount: number;
  currency: string;
}

interface AgentPerformanceDetail {
  id: string;
  name: string;
  email: string;
  sales: number;
  commission: number;
  invoice_count: number;
}

interface PnlData {
  period: { from: string; to: string };
  base_currency: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  invoice_count: number;
  expense_count: number;
  invoices: InvoiceDetail[];
  expenses_detail: ExpenseDetail[];
  revenue_by_type: Record<string, number>;
  agent_performance: AgentPerformanceDetail[];
}

interface AgingEntry {
  customer: { id: string; name: string };
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  over_90: number;
  total: number;
}

const SERVICE_COLORS: Record<string, string> = {
  Ticket: "bg-blue-500",
  Hotel: "bg-emerald-500",
  Package: "bg-purple-500",
  Umrah: "bg-amber-500",
  Visa: "bg-rose-500",
  Other: "bg-gray-400",
};

export default function ReportsPage() {
  const [pnl, setPnl] = useState<PnlData | null>(null);
  const [aging, setAging] = useState<AgingEntry[]>([]);
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-12-31");
  const [loadingPnl, setLoadingPnl] = useState(false);
  const [loadingAging, setLoadingAging] = useState(false);

  async function loadPnl() {
    setLoadingPnl(true);
    const res = await fetch(`/api/reports/pnl?from=${fromDate}&to=${toDate}`);
    setPnl(await res.json());
    setLoadingPnl(false);
  }

  async function loadAging() {
    setLoadingAging(true);
    const res = await fetch(`/api/reports/dues-aging?as_of_date=${new Date().toISOString()}`);
    const data = await res.json();
    setAging(data.aging || []);
    setLoadingAging(false);
  }

  function printReport() {
    window.print();
  }

  const maxRevType = pnl ? Math.max(...Object.values(pnl.revenue_by_type), 1) : 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Reports</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Financial reports and analytics</p>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList className="mb-6">
          <TabsTrigger value="pnl" className="gap-2"><BarChart3 className="h-3.5 w-3.5" /> Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="aging" className="gap-2"><Clock className="h-3.5 w-3.5" /> Dues &amp; Aging</TabsTrigger>
          <TabsTrigger value="agents" className="gap-2"><UserCheck className="h-3.5 w-3.5" /> Agent Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl">
          <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
            <CardHeader className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">Profit &amp; Loss Report</CardTitle>
                {pnl && (
                  <Button variant="outline" size="sm" onClick={printReport} className="gap-2 text-[12px]">
                    <Printer className="h-3.5 w-3.5" /> Print Report
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-6">
                <div className="space-y-1.5 w-full sm:w-auto"><Label className="text-[13px]">From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 w-full" /></div>
                <div className="space-y-1.5 w-full sm:w-auto"><Label className="text-[13px]">To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10 w-full" /></div>
                <Button onClick={loadPnl} disabled={loadingPnl} className="h-10 gap-2 w-full sm:w-auto">
                  {loadingPnl ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                  Generate
                </Button>
              </div>

              {pnl && (
                <div className="space-y-8">
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 font-medium">All amounts in {pnl.base_currency} (converted at current exchange rates)</p>

                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Revenue</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300">{pnl.revenue.toLocaleString()}</p>
                      <p className="text-[11px] text-emerald-500 mt-1">{pnl.invoice_count} posted invoices</p>
                    </div>
                    <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        <p className="text-[12px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Expenses</p>
                      </div>
                      <p className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300">{pnl.expenses.toLocaleString()}</p>
                      <p className="text-[11px] text-rose-500 mt-1">{pnl.expense_count} entries</p>
                    </div>
                    <div className={`p-5 rounded-xl border ${pnl.net_profit >= 0 ? "bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10" : "bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10"}`}>
                      <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Net Profit</p>
                      <p className={`text-2xl font-bold font-mono ${pnl.net_profit >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-700 dark:text-red-300"}`}>
                        {pnl.net_profit >= 0 ? "" : "-"}{Math.abs(pnl.net_profit).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Revenue by Service Type */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Revenue by Service Type
                    </h3>
                    <div className="space-y-2.5">
                      {Object.entries(pnl.revenue_by_type).map(([type, amount]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400 w-16 flex-shrink-0">{type}</span>
                          <div className="flex-1 bg-gray-100 dark:bg-[#1a1a1d] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${SERVICE_COLORS[type] || "bg-gray-400"}`}
                              style={{ width: `${(amount / maxRevType) * 100}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-mono font-semibold text-gray-700 dark:text-gray-300 w-24 text-right">
                            {pnl.base_currency} {amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invoice Ledger */}
                  {pnl.invoices.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Invoice Ledger
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#1e1e21]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-100 dark:border-[#1e1e21] bg-gray-50/50 dark:bg-[#0e0e10]/50">
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Invoice #</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Customer</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Services</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">{pnl.base_currency} Equiv.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pnl.invoices.map((inv) => (
                              <TableRow key={inv.id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                                <TableCell className="font-mono text-[13px] font-medium text-gray-900 dark:text-gray-100">{inv.invoice_number}</TableCell>
                                <TableCell className="text-[13px] text-gray-600 dark:text-gray-300">{inv.customer}</TableCell>
                                <TableCell className="text-[13px] text-gray-500">{new Date(inv.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {inv.service_types.map((st) => (
                                      <span key={st} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary dark:bg-primary/20">
                                        {st}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-[13px] text-gray-600 dark:text-gray-300">{inv.currency} {inv.amount.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-100">{inv.amount_base.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 border-gray-200 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-500/5">
                              <TableCell colSpan={5} className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">Total Revenue</TableCell>
                              <TableCell className="text-right font-mono text-[13px] font-bold text-emerald-700 dark:text-emerald-300">{pnl.revenue.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Expense Ledger */}
                  {pnl.expenses_detail.length > 0 && (
                    <div>
                      <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-rose-500" /> Expense Ledger
                      </h3>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#1e1e21]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-100 dark:border-[#1e1e21] bg-gray-50/50 dark:bg-[#0e0e10]/50">
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Description</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Category</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pnl.expenses_detail.map((exp) => (
                              <TableRow key={exp.id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                                <TableCell className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{exp.description}</TableCell>
                                <TableCell className="text-[13px] text-gray-500">{exp.category}</TableCell>
                                <TableCell className="text-[13px] text-gray-500">{new Date(exp.date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right font-mono text-[13px] font-semibold text-rose-600 dark:text-rose-400">{exp.currency} {exp.amount.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 border-gray-200 dark:border-gray-700 bg-rose-50/50 dark:bg-rose-500/5">
                              <TableCell colSpan={3} className="text-[12px] font-bold text-rose-700 dark:text-rose-300">Total Expenses</TableCell>
                              <TableCell className="text-right font-mono text-[13px] font-bold text-rose-700 dark:text-rose-300">{pnl.expenses.toLocaleString()}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {pnl.invoices.length === 0 && pnl.expenses_detail.length === 0 && (
                    <p className="text-center text-[13px] text-gray-400 py-4">No posted invoices or expenses in this period.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
            <CardHeader className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">Dues &amp; Aging Report</CardTitle>
                <Button onClick={loadAging} disabled={loadingAging} className="h-9 gap-2 text-[13px]">
                  {loadingAging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  Generate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              {aging.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Clock className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] text-gray-400">Click Generate to load the aging report</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-100 dark:border-[#1e1e21]">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Customer</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Current</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">1-30 Days</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">31-60 Days</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">61-90 Days</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">90+ Days</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aging.map((a) => (
                        <TableRow key={a.customer.id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                          <TableCell className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{a.customer.name}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] text-gray-600 dark:text-gray-300">{a.current.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] text-gray-600 dark:text-gray-300">{a.days_30.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] text-amber-600 dark:text-amber-400">{a.days_60.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] text-orange-600 dark:text-orange-400">{a.days_90.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] font-semibold text-red-600 dark:text-red-400">{a.over_90.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] font-bold text-gray-900 dark:text-gray-100">{a.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents">
          <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
            <CardHeader className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">Agent Performance Report</CardTitle>
                {pnl && (
                  <Button variant="outline" size="sm" onClick={printReport} className="gap-2 text-[12px]">
                    <Printer className="h-3.5 w-3.5" /> Print Report
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              {!pnl ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <UserCheck className="h-7 w-7 text-gray-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] text-gray-400">Generate Profit &amp; Loss report first to load agent data</p>
                </div>
              ) : pnl.agent_performance.length === 0 ? (
                <p className="text-center py-12 text-[13px] text-gray-400">No agents registered or sales recorded in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-100 dark:border-[#1e1e21]">
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Agent Name</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Invoices Posted</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Total Sales ({pnl.base_currency})</TableHead>
                        <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Commission Earned ({pnl.base_currency})</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pnl.agent_performance.map((ap) => (
                        <TableRow key={ap.id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                          <TableCell className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{ap.name}</TableCell>
                          <TableCell className="text-[13px] text-gray-500">{ap.email}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] text-gray-600 dark:text-gray-300">{ap.invoice_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">{ap.sales.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-[13px] font-bold text-gray-900 dark:text-gray-100">{ap.commission.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}