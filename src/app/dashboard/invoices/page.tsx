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
import {
  Plus, Send, Ban, CreditCard, Trash2, History, Loader2, Pencil,
  Printer, Plane, FileText, Calculator, Search, X, RotateCcw, AlertTriangle, Check
} from "lucide-react";

interface Invoice {
  _id: string;
  invoice_number: string;
  customer_id: { _id: string; name: string } | string;
  status: string;
  currency: string;
  total_amount: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: "Paid" | "Partial" | "Unpaid";
  bsp_flag: boolean;
  payment_mode?: string;
  remarks?: string;
  print_name?: string;
  cost_center?: string;
  created_at: string;
}

interface Customer { _id: string; name: string; }
interface Supplier { _id: string; name: string; code?: string; }
interface UserItem { _id: string; name: string; role: string; }

interface FlightSegment {
  city: string;
  flight_no: string;
  booking_class: string;
  dep_date: string;
  dep_time: string;
  arr_time: string;
  fare_basis: string;
}

interface DynamicTaxItem {
  code: string;
  amount: string;
}

interface LineItemInput {
  service_type: string;
  description: string;
  amount: string;
  commission_override_rate: string;
  tax_code_id: string;
  
  // Passenger & Airline Details (Green-ticked in ERP screenshot)
  pax_name?: string;
  pax_type?: string;
  passport_no?: string;
  passport_issue_date?: string;
  ticket_number?: string;
  conjunction_ticket_no?: string;
  conjunction_route?: string;
  gds_pnr?: string;
  gds_name?: string;
  airline_name?: string;
  airline_code?: string;
  sector?: string;
  trip_type?: string;
  doc_type?: string;
  tour_code?: string;
  issue_date?: string;
  our_xo?: string;
  flight_segments?: FlightSegment[];
  
  // Dynamic Taxes (Top of Right Box)
  airline_city_taxes?: DynamicTaxItem[];
  city_taxes?: DynamicTaxItem[];

  // 14 IATA Standard Airline Taxes
  base_fare?: string;
  tax_dof?: string;
  tax_yq?: string;
  tax_yr?: string;
  tax_rg?: string;
  tax_pk?: string;
  tax_apt?: string;
  tax_kbr?: string;
  tax_kbp?: string;
  tax_pb?: string;
  tax_xz?: string;
  tax_yd?: string;
  tax_yi?: string;
  tax_rn?: string;
  tax_city?: string;
  tax_airline_city?: string;
  other_taxes?: string;

  // Commercials & Deductions Matrix
  wht_percent?: string;
  wht_amount?: string;
  commission_percent?: string;
  commission_amount?: string;
  discount_percent?: string;
  discount_amount?: string;
  psf_percent?: string;
  psf_amount?: string;
  gst_percent?: string;
  gst_amount?: string;
  auto_update?: boolean;

  // Cancellation Charges
  cancellation_charges_self?: string;
  cancellation_charges_supplier?: string;

  // 2-Sided Accounting Totals
  supplier_id?: string;
  customer_gross?: number;
  customer_net?: number;
  supplier_gross?: number;
  supplier_net?: number;
  supplier_gross_wo_wht?: number;
  agency_margin?: number;
}

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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  // Delete invoice state
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Double-submission protection states
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Action dialogs state
  const [voidDialog, setVoidDialog] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [creditDialog, setCreditDialog] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  // Invoice Header State (Green-ticked in ERP screenshot)
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newCurrency] = useState("PKR");
  const [newPaymentMode, setNewPaymentMode] = useState("CR");
  const [newRemarks, setNewRemarks] = useState("NORMAL");
  const [newVisitType, setNewVisitType] = useState("Visitor");
  const [newSpoId, setNewSpoId] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newPrintName, setNewPrintName] = useState("");
  const [newCostCenter, setNewCostCenter] = useState("");
  const [newInvDate, setNewInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [newAdjDate, setNewAdjDate] = useState(new Date().toISOString().split("T")[0]);
  const [newOurXo, setNewOurXo] = useState("E");
  const [newClientXo, setNewClientXo] = useState("");
  const [newDocStatus, setNewDocStatus] = useState("Draft");
  const [newBsp] = useState(false);
  const [newBspBillingPeriod] = useState("");

  const defaultType = (typeFilter && typeFilter !== "Other") ? typeFilter : "Ticket";

  // Ticket Line item default matching ERP screenshot exactly
  const createDefaultTicketItem = (): LineItemInput => ({
    service_type: "Ticket",
    description: "",
    amount: "0",
    commission_override_rate: "",
    tax_code_id: "",
    pax_name: "",
    pax_type: "A",
    passport_no: "",
    passport_issue_date: "",
    ticket_number: "",
    conjunction_ticket_no: "",
    conjunction_route: "",
    gds_pnr: "",
    gds_name: "Amadeus",
    airline_name: "",
    airline_code: "",
    sector: "",
    trip_type: "International",
    doc_type: "BSPD",
    tour_code: "",
    our_xo: "E",
    issue_date: new Date().toISOString().split("T")[0],
    flight_segments: [
      { city: "LHE", flight_no: "621", booking_class: "Y", dep_date: "", dep_time: "", arr_time: "", fare_basis: "KLE01PK" },
      { city: "DOH", flight_no: "621", booking_class: "Y", dep_date: "", dep_time: "", arr_time: "", fare_basis: "KLE01PK" },
    ],
    airline_city_taxes: [
      { code: "XT", amount: "0" },
    ],
    city_taxes: [
      { code: "City Tax", amount: "0" },
    ],
    base_fare: "37024",
    tax_dof: "976",
    tax_yq: "0",
    tax_yr: "0",
    tax_rg: "0",
    tax_pk: "0",
    tax_apt: "0",
    tax_kbr: "0",
    tax_kbp: "0",
    tax_pb: "0",
    tax_xz: "0",
    tax_yd: "0",
    tax_yi: "0",
    tax_rn: "0",
    tax_city: "0",
    tax_airline_city: "0",
    other_taxes: "0",
    wht_percent: "12",
    wht_amount: "0",
    commission_percent: "0",
    commission_amount: "0",
    discount_percent: "0",
    discount_amount: "0",
    psf_percent: "0",
    psf_amount: "0",
    gst_percent: "5",
    gst_amount: "0",
    auto_update: true,
    cancellation_charges_self: "0",
    cancellation_charges_supplier: "0",
    customer_gross: 38000,
    customer_net: 38000,
    supplier_gross: 37024,
    supplier_net: 37024,
    supplier_gross_wo_wht: 37024,
    agency_margin: 976,
  });

  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    defaultType === "Ticket"
      ? createDefaultTicketItem()
      : { service_type: defaultType, description: "", amount: "", commission_override_rate: "", tax_code_id: "" },
  ]);

  // Audit Logs state
  const [auditDialogInvoice, setAuditDialogInvoice] = useState<Invoice | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Edit state
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editCurrency, setEditCurrency] = useState("PKR");
  const [editPaymentMode, setEditPaymentMode] = useState("CR");
  const [editRemarks, setEditRemarks] = useState("NORMAL");
  const [editVisitType, setEditVisitType] = useState("Visitor");
  const [editSpoId, setEditSpoId] = useState("");
  const [editSupplierId, setEditSupplierId] = useState("");
  const [editPrintName, setEditPrintName] = useState("");
  const [editCostCenter, setEditCostCenter] = useState("");
  const [editAdjDate, setEditAdjDate] = useState("");
  const [editOurXo, setEditOurXo] = useState("");
  const [editClientXo, setEditClientXo] = useState("");
  const [editDocStatus, setEditDocStatus] = useState("Draft");
  const [editBsp, setEditBsp] = useState(false);
  const [editBspBillingPeriod, setEditBspBillingPeriod] = useState("");
  const [editLineItems, setEditLineItems] = useState<LineItemInput[]>([]);

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

  // Load Invoices with Search and Filter Parameters
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (dateRangeFilter && dateRangeFilter !== "all") params.set("date_range", dateRangeFilter);
    if (paymentStatusFilter && paymentStatusFilter !== "all") params.set("payment_status", paymentStatusFilter);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    if (customerFilter && customerFilter !== "all") params.set("customer_id", customerFilter);

    const url = `/api/invoices?${params.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    setInvoices(data.invoices || []);
    setLoading(false);
  }, [typeFilter, searchQuery, dateRangeFilter, paymentStatusFilter, statusFilter, customerFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadInvoices]);

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || []));
    fetch("/api/suppliers").then((r) => r.json()).then((d) => setSuppliers(d.suppliers || []));
    fetch("/api/users").then((r) => r.json()).then((d) => setStaffUsers(d.users || []));
  }, []);

  // Helper functions to resolve display names
  const getCustomerName = (id: string) => {
    const c = customers.find((item) => item._id === id);
    return c ? c.name : id ? id : "Select Customer";
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find((item) => item._id === id);
    return s ? `${s.name}${s.code ? ` (${s.code})` : ''}` : id ? id : "BSP / Airline";
  };

  const getAgentName = (id: string) => {
    const u = staffUsers.find((item) => item._id === id);
    return u ? `${u.name} (${u.role})` : id ? id : "Booking Agent";
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setDateRangeFilter("all");
    setPaymentStatusFilter("all");
    setStatusFilter("all");
    setCustomerFilter("all");
  };

  // Delete invoice
  async function confirmDeleteInvoice() {
    if (!deleteInvoiceId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/invoices/${deleteInvoiceId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteInvoiceId(null);
        loadInvoices();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete invoice");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting invoice");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Dual-Sided Travel Accounting Calculations (Matching ERP Screenshot Exactly)
  function calculateTicketTotals(item: LineItemInput): LineItemInput {
    const baseFare = parseFloat(item.base_fare || "0") || 0;
    
    // Dynamic Airline City Tax Sum
    const airlineCityTaxSum = (item.airline_city_taxes || []).reduce(
      (sum, t) => sum + (parseFloat(t.amount || "0") || 0), 0
    );

    // Dynamic City Tax Sum
    const cityTaxSum = (item.city_taxes || []).reduce(
      (sum, t) => sum + (parseFloat(t.amount || "0") || 0), 0
    );

    const taxes = (parseFloat(item.tax_dof || "0") || 0) +
      (parseFloat(item.tax_yq || "0") || 0) +
      (parseFloat(item.tax_yr || "0") || 0) +
      (parseFloat(item.tax_rg || "0") || 0) +
      (parseFloat(item.tax_pk || "0") || 0) +
      (parseFloat(item.tax_apt || "0") || 0) +
      (parseFloat(item.tax_kbr || "0") || 0) +
      (parseFloat(item.tax_kbp || "0") || 0) +
      (parseFloat(item.tax_pb || "0") || 0) +
      (parseFloat(item.tax_xz || "0") || 0) +
      (parseFloat(item.tax_yd || "0") || 0) +
      (parseFloat(item.tax_yi || "0") || 0) +
      (parseFloat(item.tax_rn || "0") || 0) +
      (parseFloat(item.tax_city || "0") || 0) +
      (parseFloat(item.tax_airline_city || "0") || 0) +
      (parseFloat(item.other_taxes || "0") || 0) +
      airlineCityTaxSum +
      cityTaxSum;

    const grossFare = baseFare + taxes;
    const commPct = parseFloat(item.commission_percent || "0") || 0;
    const commAmt = (baseFare * commPct) / 100;

    const whtPct = parseFloat(item.wht_percent || "0") || 0;
    const whtAmt = (baseFare * whtPct) / 100;

    const disPct = parseFloat(item.discount_percent || "0") || 0;
    const disAmt = (grossFare * disPct) / 100;

    const psfFlat = parseFloat(item.psf_amount || "0") || 0;
    const psfPct = parseFloat(item.psf_percent || "0") || 0;
    const psfPctAmt = (grossFare * psfPct) / 100;
    const totalPsf = psfFlat + psfPctAmt;

    const gstPct = parseFloat(item.gst_percent || "0") || 0;
    const gstAmt = (totalPsf * gstPct) / 100;

    const customerGross = grossFare + totalPsf;
    const customerNet = customerGross - disAmt + gstAmt;

    const supplierGross = grossFare;
    const supplierNet = supplierGross - commAmt + whtAmt;
    const supplierGrossWoWht = supplierGross - whtAmt;

    const margin = customerNet - supplierNet;

    return {
      ...item,
      commission_amount: commAmt.toFixed(2),
      wht_amount: whtAmt.toFixed(2),
      discount_amount: disAmt.toFixed(2),
      gst_amount: gstAmt.toFixed(2),
      customer_gross: Math.round(customerGross),
      customer_net: Math.round(customerNet),
      supplier_gross: Math.round(supplierGross),
      supplier_net: Math.round(supplierNet),
      supplier_gross_wo_wht: Math.round(supplierGrossWoWht),
      agency_margin: Math.round(margin),
      amount: String(Math.round(customerNet)),
    };
  }

  function updateTicketLineItem(index: number, field: string, value: unknown, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    let item = { ...list[index], [field]: value };
    if (item.auto_update !== false) {
      item = calculateTicketTotals(item);
    }
    list[index] = item;
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  // Flight Segments Helpers
  function addFlightSegment(index: number, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const segs = [...(list[index].flight_segments || [])];
    segs.push({ city: "", flight_no: "", booking_class: "Y", dep_date: "", dep_time: "", arr_time: "", fare_basis: "" });
    list[index] = { ...list[index], flight_segments: segs };
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  function updateFlightSegment(lineIdx: number, segIdx: number, field: keyof FlightSegment, value: string, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const segs = [...(list[lineIdx].flight_segments || [])];
    segs[segIdx] = { ...segs[segIdx], [field]: value };
    list[lineIdx] = { ...list[lineIdx], flight_segments: segs };
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  function removeFlightSegment(lineIdx: number, segIdx: number, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const segs = (list[lineIdx].flight_segments || []).filter((_, i) => i !== segIdx);
    list[lineIdx] = { ...list[lineIdx], flight_segments: segs };
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  // Dynamic Airline City Tax Helpers
  function addAirlineCityTax(itemIdx: number, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const current = [...(list[itemIdx].airline_city_taxes || [])];
    current.push({ code: "XT", amount: "0" });
    list[itemIdx] = calculateTicketTotals({ ...list[itemIdx], airline_city_taxes: current });
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  function removeAirlineCityTax(itemIdx: number, taxIdx: number, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const current = (list[itemIdx].airline_city_taxes || []).filter((_, i) => i !== taxIdx);
    list[itemIdx] = calculateTicketTotals({ ...list[itemIdx], airline_city_taxes: current });
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  function updateAirlineCityTax(itemIdx: number, taxIdx: number, field: "code" | "amount", val: string, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const current = [...(list[itemIdx].airline_city_taxes || [])];
    current[taxIdx] = { ...current[taxIdx], [field]: val };
    list[itemIdx] = calculateTicketTotals({ ...list[itemIdx], airline_city_taxes: current });
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  // Dynamic City Tax Helpers
  function addCityTax(itemIdx: number, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const current = [...(list[itemIdx].city_taxes || [])];
    current.push({ code: "City Tax", amount: "0" });
    list[itemIdx] = calculateTicketTotals({ ...list[itemIdx], city_taxes: current });
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  function removeCityTax(itemIdx: number, taxIdx: number, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const current = (list[itemIdx].city_taxes || []).filter((_, i) => i !== taxIdx);
    list[itemIdx] = calculateTicketTotals({ ...list[itemIdx], city_taxes: current });
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  function updateCityTax(itemIdx: number, taxIdx: number, field: "code" | "amount", val: string, isEdit = false) {
    const list = isEdit ? [...editLineItems] : [...lineItems];
    const current = [...(list[itemIdx].city_taxes || [])];
    current[taxIdx] = { ...current[taxIdx], [field]: val };
    list[itemIdx] = calculateTicketTotals({ ...list[itemIdx], city_taxes: current });
    if (isEdit) setEditLineItems(list);
    else setLineItems(list);
  }

  async function createInvoice() {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: newCustomerId,
          currency: newCurrency,
          bsp_flag: newBsp,
          bsp_billing_period: newBspBillingPeriod || null,
          payment_mode: newPaymentMode,
          remarks: newRemarks,
          visit_type: newVisitType,
          spo_id: newSpoId || null,
          supplier_id: newSupplierId || null,
          print_name: newPrintName,
          cost_center: newCostCenter,
          adj_date: newAdjDate,
          our_xo: newOurXo,
          client_xo: newClientXo,
          status: newDocStatus,
          line_items: lineItems,
        }),
      });
      if (res.ok) {
        setShowNew(false);
        setNewCustomerId("");
        setLineItems([defaultType === "Ticket" ? createDefaultTicketItem() : { service_type: defaultType, description: "", amount: "", commission_override_rate: "", tax_code_id: "" }]);
        loadInvoices();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create invoice");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred while creating invoice.");
    } finally {
      setIsCreating(false);
    }
  }

  async function postInvoice(id: string) {
    const res = await fetch(`/api/invoices/${id}/post`, { method: "POST" });
    if (res.ok) loadInvoices();
    else { const d = await res.json(); alert(d.error); }
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

  async function openEditDialog(inv: Invoice) {
    setEditInvoiceId(inv._id);
    setEditLoading(true);
    const res = await fetch(`/api/invoices/${inv._id}`);
    const data = await res.json();
    const customerId = typeof inv.customer_id === "object" ? inv.customer_id._id : inv.customer_id;
    setEditCustomerId(customerId);
    setEditCurrency(inv.currency);
    setEditBsp(inv.bsp_flag);
    setEditPaymentMode(data.invoice?.payment_mode || "CR");
    setEditRemarks(data.invoice?.remarks || "NORMAL");
    setEditVisitType(data.invoice?.visit_type || "Visitor");
    setEditSpoId(data.invoice?.spo_id?._id || data.invoice?.spo_id || "");
    setEditSupplierId(data.invoice?.supplier_id?._id || data.invoice?.supplier_id || "");
    setEditPrintName(data.invoice?.print_name || "");
    setEditCostCenter(data.invoice?.cost_center || "");
    setEditAdjDate(data.invoice?.adj_date ? new Date(data.invoice.adj_date).toISOString().split("T")[0] : "");
    setEditOurXo(data.invoice?.our_xo || "E");
    setEditClientXo(data.invoice?.client_xo || "");
    setEditDocStatus(data.invoice?.status || "Draft");

    const items: LineItemInput[] = (data.line_items || []).map((li: Record<string, unknown>) => ({
      service_type: String(li.service_type || "Ticket"),
      description: String(li.description || ""),
      amount: String(li.amount),
      commission_override_rate: li.commission_override_rate ? String(li.commission_override_rate) : "",
      tax_code_id: li.tax_code_id && typeof li.tax_code_id === "object" && "_id" in (li.tax_code_id as object) ? String((li.tax_code_id as { _id: unknown })._id) : String(li.tax_code_id || ""),
      pax_name: String(li.pax_name || ""),
      pax_type: String(li.pax_type || "A"),
      passport_no: String(li.passport_no || ""),
      passport_issue_date: String(li.passport_issue_date || ""),
      ticket_number: String(li.ticket_number || ""),
      conjunction_ticket_no: String(li.conjunction_ticket_no || ""),
      conjunction_route: String(li.conjunction_route || ""),
      gds_pnr: String(li.gds_pnr || ""),
      gds_name: String(li.gds_name || "Amadeus"),
      airline_name: String(li.airline_name || ""),
      airline_code: String(li.airline_code || ""),
      sector: String(li.sector || ""),
      trip_type: String(li.trip_type || "International"),
      doc_type: String(li.doc_type || "BSPD"),
      tour_code: String(li.tour_code || ""),
      issue_date: String(li.issue_date || ""),
      our_xo: String(li.our_xo || "E"),
      flight_segments: Array.isArray(li.flight_segments) ? (li.flight_segments as FlightSegment[]) : [],
      airline_city_taxes: Array.isArray(li.airline_city_taxes) ? (li.airline_city_taxes as DynamicTaxItem[]) : [{ code: "XT", amount: "0" }],
      city_taxes: Array.isArray(li.city_taxes) ? (li.city_taxes as DynamicTaxItem[]) : [{ code: "City Tax", amount: "0" }],
      base_fare: String(li.base_fare || "0"),
      tax_dof: String(li.tax_dof || "0"),
      tax_yq: String(li.tax_yq || "0"),
      tax_yr: String(li.tax_yr || "0"),
      tax_rg: String(li.tax_rg || "0"),
      tax_pk: String(li.tax_pk || "0"),
      tax_apt: String(li.tax_apt || "0"),
      tax_kbr: String(li.tax_kbr || "0"),
      tax_kbp: String(li.tax_kbp || "0"),
      tax_pb: String(li.tax_pb || "0"),
      tax_xz: String(li.tax_xz || "0"),
      tax_yd: String(li.tax_yd || "0"),
      tax_yi: String(li.tax_yi || "0"),
      tax_rn: String(li.tax_rn || "0"),
      tax_city: String(li.tax_city || "0"),
      tax_airline_city: String(li.tax_airline_city || "0"),
      other_taxes: String(li.other_taxes || "0"),
      wht_percent: String(li.wht_percent || "12"),
      wht_amount: String(li.wht_amount || "0"),
      commission_percent: String(li.commission_percent || "0"),
      commission_amount: String(li.commission_amount || "0"),
      discount_percent: String(li.discount_percent || "0"),
      discount_amount: String(li.discount_amount || "0"),
      psf_percent: String(li.psf_percent || "0"),
      psf_amount: String(li.psf_amount || "0"),
      gst_percent: String(li.gst_percent || "5"),
      gst_amount: String(li.gst_amount || "0"),
      auto_update: li.auto_update !== undefined ? Boolean(li.auto_update) : true,
      cancellation_charges_self: String(li.cancellation_charges_self || "0"),
      cancellation_charges_supplier: String(li.cancellation_charges_supplier || "0"),
      supplier_id: li.supplier_id && typeof li.supplier_id === "object" && "_id" in (li.supplier_id as object) ? String((li.supplier_id as { _id: unknown })._id) : String(li.supplier_id || ""),
      customer_gross: Number(li.customer_gross) || 0,
      customer_net: Number(li.customer_net) || Number(li.amount) || 0,
      supplier_gross: Number(li.supplier_gross) || 0,
      supplier_net: Number(li.supplier_net) || 0,
      supplier_gross_wo_wht: Number(li.supplier_gross_wo_wht) || 0,
      agency_margin: Number(li.agency_margin) || 0,
    }));
    setEditLineItems(items.length > 0 ? items : [createDefaultTicketItem()]);
    setEditLoading(false);
  }

  async function saveEditInvoice() {
    if (!editInvoiceId || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/invoices/${editInvoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: editCustomerId,
          currency: editCurrency,
          bsp_flag: editBsp,
          bsp_billing_period: editBspBillingPeriod || null,
          payment_mode: editPaymentMode,
          remarks: editRemarks,
          visit_type: editVisitType,
          spo_id: editSpoId || null,
          supplier_id: editSupplierId || null,
          print_name: editPrintName,
          cost_center: editCostCenter,
          adj_date: editAdjDate,
          our_xo: editOurXo,
          client_xo: editClientXo,
          status: editDocStatus,
          line_items: editLineItems,
        }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Failed to save"); return; }
      setEditInvoiceId(null);
      loadInvoices();
    } catch (err) {
      console.error(err);
      alert("Error saving invoice changes");
    } finally {
      setIsSavingEdit(false);
    }
  }

  const statusStyles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    Confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Posted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Voided: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  const paymentStyles: Record<string, string> = {
    Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60",
    Partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60",
    Unpaid: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60",
  };

  // Render Ticket Booking Form (Exact Clone of User's ERP Window)
  const renderTicketForm = (item: LineItemInput, itemIdx: number, isEdit = false) => {
    return (
      <div className="space-y-4 text-[12px] bg-slate-50/50 dark:bg-[#0c0c0e] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
        {/* Passenger & Ticket Main Details (Ticked in ERP Screenshot) */}
        <div className="p-3 bg-white dark:bg-[#111113] rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b pb-1 flex justify-between">
            <span>Passenger &amp; Ticketing Information</span>
            <span className="font-mono text-primary font-bold">{item.airline_name || "Airline Booking"}</span>
          </div>

          {/* Row 1: Pax, Pax Type, PP No, PP Issue Dt */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pax *</Label>
              <Input
                placeholder="MR JAVED JAHANZEEB"
                value={item.pax_name || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "pax_name", e.target.value.toUpperCase(), isEdit)}
                className="h-8 text-[12px] uppercase font-semibold bg-white dark:bg-[#161619]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pax Type *</Label>
              <Select value={item.pax_type || "A"} onValueChange={(v) => updateTicketLineItem(itemIdx, "pax_type", v || "A", isEdit)}>
                <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                  <SelectValue>
                    {(val) => val === "A" ? "Adult (A)" : val === "C" ? "Child (C)" : val === "I" ? "Infant (I)" : val || "Adult (A)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Adult (A)</SelectItem>
                  <SelectItem value="C">Child (C)</SelectItem>
                  <SelectItem value="I">Infant (I)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">PP No.</Label>
              <Input
                placeholder="e.g. AB1234567"
                value={item.passport_no || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "passport_no", e.target.value.toUpperCase(), isEdit)}
                className="h-8 text-[12px] uppercase bg-white dark:bg-[#161619]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">PP Issue Dt</Label>
              <Input
                type="date"
                value={item.passport_issue_date || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "passport_issue_date", e.target.value, isEdit)}
                className="h-8 text-[12px] bg-white dark:bg-[#161619]"
              />
            </div>
          </div>

          {/* Row 2: Ticket No, PNR, GDS, Airline, Supplier/BSP, Sector, Doc, Type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Ticket No. *</Label>
              <Input
                placeholder="157-2127-850-017"
                value={item.ticket_number || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "ticket_number", e.target.value, isEdit)}
                className="h-8 text-[12px] font-mono font-bold bg-white dark:bg-[#161619]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">PNR</Label>
              <Input
                placeholder="PNR123"
                value={item.gds_pnr || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "gds_pnr", e.target.value.toUpperCase(), isEdit)}
                className="h-8 text-[12px] font-mono uppercase font-bold text-blue-600 bg-white dark:bg-[#161619]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">GDS</Label>
              <Select value={item.gds_name || "Amadeus"} onValueChange={(v) => updateTicketLineItem(itemIdx, "gds_name", v || "Amadeus", isEdit)}>
                <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                  <SelectValue>{(val) => val || "Amadeus"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Amadeus">Amadeus</SelectItem>
                  <SelectItem value="Sabre">Sabre</SelectItem>
                  <SelectItem value="Galileo">Galileo</SelectItem>
                  <SelectItem value="Worldspan">Worldspan</SelectItem>
                  <SelectItem value="Direct">Direct Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Airline *</Label>
              <Input
                placeholder="QATAR / 157"
                value={item.airline_name || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "airline_name", e.target.value.toUpperCase(), isEdit)}
                className="h-8 text-[12px] uppercase bg-white dark:bg-[#161619]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Supplier / BSP *</Label>
              <Select
                value={item.supplier_id || (isEdit ? editSupplierId : newSupplierId) || ""}
                onValueChange={(v) => {
                  const val = v || "";
                  updateTicketLineItem(itemIdx, "supplier_id", val, isEdit);
                  if (isEdit) setEditSupplierId(val);
                  else setNewSupplierId(val);
                }}
              >
                <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                  <SelectValue placeholder="BSP / Airline">
                    {(val) => getSupplierName(val)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Sector *</Label>
              <Input
                placeholder="FOU / LHE-DOH"
                value={item.sector || ""}
                onChange={(e) => updateTicketLineItem(itemIdx, "sector", e.target.value.toUpperCase(), isEdit)}
                className="h-8 text-[12px] uppercase font-mono bg-white dark:bg-[#161619]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Doc *</Label>
              <Select value={item.doc_type || "BSPD"} onValueChange={(v) => updateTicketLineItem(itemIdx, "doc_type", v || "BSPD", isEdit)}>
                <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                  <SelectValue>{(val) => val || "BSPD"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BSPD">BSPD</SelectItem>
                  <SelectItem value="E-Ticket">E-Ticket</SelectItem>
                  <SelectItem value="MCO">MCO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Type *</Label>
              <Select value={item.trip_type || "International"} onValueChange={(v) => updateTicketLineItem(itemIdx, "trip_type", v || "International", isEdit)}>
                <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                  <SelectValue>{(val) => val === "International" ? "I (Int)" : "D (Dom)"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="International">International (I)</SelectItem>
                  <SelectItem value="Domestic">Domestic (D)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Left Green Box vs Right Green Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT GREEN BOX (Routing & Segments Table + Conjunction Ticket) */}
          <div className="lg:col-span-6 space-y-3.5 flex flex-col justify-between">
            {/* Flight Segments Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111113]">
              <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 text-blue-600" /> Flight Routing &amp; Segments
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 gap-1 bg-white dark:bg-slate-800"
                  onClick={() => addFlightSegment(itemIdx, isEdit)}
                >
                  <Plus className="h-2.5 w-2.5" /> Add Leg
                </Button>
              </div>
              <div className="w-full">
                <table className="w-full text-[11px] table-auto">
                  <thead className="bg-slate-50 dark:bg-[#161618] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="p-1.5 text-left w-20">City</th>
                      <th className="p-1.5 text-left w-16">Fl.No</th>
                      <th className="p-1.5 text-left w-12">Cl</th>
                      <th className="p-1.5 text-left w-28">Dep. Date</th>
                      <th className="p-1.5 text-left w-20">Dep. Time</th>
                      <th className="p-1.5 text-left w-20">Arr. Time</th>
                      <th className="p-1.5 text-left">Fare Basis</th>
                      <th className="p-1.5 text-center w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(item.flight_segments || []).map((seg, segIdx) => (
                      <tr key={segIdx} className="border-b border-slate-100 dark:border-slate-800/60">
                        <td className="p-1">
                          <Input
                            placeholder="LHE"
                            value={seg.city}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "city", e.target.value.toUpperCase(), isEdit)}
                            className="h-7 text-[11px] uppercase font-mono w-full bg-transparent"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            placeholder="621"
                            value={seg.flight_no}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "flight_no", e.target.value, isEdit)}
                            className="h-7 text-[11px] w-full bg-transparent"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            placeholder="Y"
                            value={seg.booking_class}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "booking_class", e.target.value.toUpperCase(), isEdit)}
                            className="h-7 text-[11px] uppercase font-mono w-full text-center bg-transparent"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="date"
                            value={seg.dep_date}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "dep_date", e.target.value, isEdit)}
                            className="h-7 text-[11px] w-full bg-transparent"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            placeholder="14:30"
                            value={seg.dep_time}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "dep_time", e.target.value, isEdit)}
                            className="h-7 text-[11px] font-mono w-full bg-transparent"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            placeholder="18:45"
                            value={seg.arr_time}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "arr_time", e.target.value, isEdit)}
                            className="h-7 text-[11px] font-mono w-full bg-transparent"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            placeholder="KLE01PK"
                            value={seg.fare_basis}
                            onChange={(e) => updateFlightSegment(itemIdx, segIdx, "fare_basis", e.target.value.toUpperCase(), isEdit)}
                            className="h-7 text-[11px] font-mono uppercase w-full bg-transparent"
                          />
                        </td>
                        <td className="p-1 text-center">
                          {(item.flight_segments || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFlightSegment(itemIdx, segIdx, isEdit)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conjunction Ticket Box (Directly below Flight Segments in ERP) */}
            <div className="p-3 bg-white dark:bg-[#111113] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-[11px] text-blue-600 dark:text-blue-400 border-b pb-1 flex justify-between">
                <span>Conjunction Ticket</span>
                <span className="text-[10px] text-slate-400 font-normal">Secondary ticket for extended sectors</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Ticket No.</Label>
                  <Input
                    placeholder="157-2127-850-018"
                    value={item.conjunction_ticket_no || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "conjunction_ticket_no", e.target.value, isEdit)}
                    className="h-7 text-[11px] font-mono bg-white dark:bg-[#161619]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 font-semibold">Route Details</Label>
                  <Input
                    placeholder="LHE"
                    value={item.conjunction_route || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "conjunction_route", e.target.value.toUpperCase(), isEdit)}
                    className="h-7 text-[11px] font-mono uppercase bg-white dark:bg-[#161619]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT GREEN BOX (Airline City Tax, IATA Taxes, Commercials, Cancellation, Totals) */}
          <div className="lg:col-span-6 space-y-3">
            
            {/* Top: Airline City Tax & City Tax Side-by-Side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Airline City Tax Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111113]">
                <div className="bg-slate-100 dark:bg-slate-900 px-2 py-1 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">Airline City Tax</span>
                  <button
                    type="button"
                    onClick={() => addAirlineCityTax(itemIdx, isEdit)}
                    className="text-primary hover:text-primary/80 text-[10px] font-bold flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-1 space-y-1 max-h-24 overflow-y-auto">
                  {(item.airline_city_taxes || []).map((t, tIdx) => (
                    <div key={tIdx} className="flex gap-1 items-center">
                      <Input
                        placeholder="XT"
                        value={t.code}
                        onChange={(e) => updateAirlineCityTax(itemIdx, tIdx, "code", e.target.value.toUpperCase(), isEdit)}
                        className="h-6 text-[10px] font-mono uppercase w-16"
                      />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={t.amount}
                        onChange={(e) => updateAirlineCityTax(itemIdx, tIdx, "amount", e.target.value, isEdit)}
                        className="h-6 text-[10px] font-mono flex-1 text-right"
                      />
                      {(item.airline_city_taxes || []).length > 1 && (
                        <button type="button" onClick={() => removeAirlineCityTax(itemIdx, tIdx, isEdit)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* City Tax Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-[#111113]">
                <div className="bg-slate-100 dark:bg-slate-900 px-2 py-1 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-[10px] text-slate-700 dark:text-slate-300">City Tax</span>
                  <button
                    type="button"
                    onClick={() => addCityTax(itemIdx, isEdit)}
                    className="text-primary hover:text-primary/80 text-[10px] font-bold flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-1 space-y-1 max-h-24 overflow-y-auto">
                  {(item.city_taxes || []).map((t, tIdx) => (
                    <div key={tIdx} className="flex gap-1 items-center">
                      <Input
                        placeholder="City Tax"
                        value={t.code}
                        onChange={(e) => updateCityTax(itemIdx, tIdx, "code", e.target.value, isEdit)}
                        className="h-6 text-[10px] font-mono flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={t.amount}
                        onChange={(e) => updateCityTax(itemIdx, tIdx, "amount", e.target.value, isEdit)}
                        className="h-6 text-[10px] font-mono w-20 text-right"
                      />
                      {(item.city_taxes || []).length > 1 && (
                        <button type="button" onClick={() => removeCityTax(itemIdx, tIdx, isEdit)} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: 14 IATA Standard Airline Taxes 4x4 Grid */}
            <div className="p-2.5 bg-white dark:bg-[#111113] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                {/* Row 1: Fare & RN */}
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase">Fare (Base Fare) *</span>
                  <Input
                    type="number"
                    value={item.base_fare || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "base_fare", e.target.value, isEdit)}
                    className="h-6 text-[11px] font-mono font-bold text-primary"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 font-semibold block">RN</span>
                  <Input
                    type="number"
                    value={item.tax_rn || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_rn", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>

                {/* Row 2: DOF, APT, RG, PK */}
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">DOF</span>
                  <Input
                    type="number"
                    value={item.tax_dof || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_dof", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">APT</span>
                  <Input
                    type="number"
                    value={item.tax_apt || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_apt", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">RG</span>
                  <Input
                    type="number"
                    value={item.tax_rg || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_rg", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">PK</span>
                  <Input
                    type="number"
                    value={item.tax_pk || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_pk", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>

                {/* Row 3: YR, KBR, KBP, PB */}
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">YR</span>
                  <Input
                    type="number"
                    value={item.tax_yr || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_yr", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">KBR</span>
                  <Input
                    type="number"
                    value={item.tax_kbr || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_kbr", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">KBP</span>
                  <Input
                    type="number"
                    value={item.tax_kbp || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_kbp", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">PB</span>
                  <Input
                    type="number"
                    value={item.tax_pb || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_pb", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>

                {/* Row 4: YQ, XZ, YD, YI */}
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">YQ</span>
                  <Input
                    type="number"
                    value={item.tax_yq || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_yq", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">XZ</span>
                  <Input
                    type="number"
                    value={item.tax_xz || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_xz", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">YD</span>
                  <Input
                    type="number"
                    value={item.tax_yd || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_yd", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-semibold block">YI</span>
                  <Input
                    type="number"
                    value={item.tax_yi || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "tax_yi", e.target.value, isEdit)}
                    className="h-6 text-[10px] font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Commercials, WHT & Deductions Matrix */}
            <div className="p-2.5 bg-white dark:bg-[#111113] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                {/* WHT & DIS */}
                <div className="flex items-center justify-between gap-1">
                  <span className="w-12 font-bold text-slate-600 dark:text-slate-400">WHT</span>
                  <Input
                    type="number"
                    placeholder="%"
                    value={item.wht_percent || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "wht_percent", e.target.value, isEdit)}
                    className="h-6 w-14 text-[10px] font-mono"
                  />
                  <Input
                    readOnly
                    value={item.wht_amount || "0.00"}
                    className="h-6 flex-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-900 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="w-12 font-bold text-slate-600 dark:text-slate-400">DIS</span>
                  <Input
                    type="number"
                    placeholder="%"
                    value={item.discount_percent || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "discount_percent", e.target.value, isEdit)}
                    className="h-6 w-14 text-[10px] font-mono"
                  />
                  <Input
                    readOnly
                    value={item.discount_amount || "0.00"}
                    className="h-6 flex-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-900 text-right"
                  />
                </div>

                {/* COM & PSF/P */}
                <div className="flex items-center justify-between gap-1">
                  <span className="w-12 font-bold text-slate-600 dark:text-slate-400">COM</span>
                  <Input
                    type="number"
                    placeholder="%"
                    value={item.commission_percent || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "commission_percent", e.target.value, isEdit)}
                    className="h-6 w-14 text-[10px] font-mono"
                  />
                  <Input
                    readOnly
                    value={item.commission_amount || "0.00"}
                    className="h-6 flex-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-900 text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="w-12 font-bold text-slate-600 dark:text-slate-400">PSF/P</span>
                  <Input
                    type="number"
                    placeholder="%"
                    value={item.psf_percent || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "psf_percent", e.target.value, isEdit)}
                    className="h-6 w-14 text-[10px] font-mono"
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={item.psf_amount || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "psf_amount", e.target.value, isEdit)}
                    className="h-6 flex-1 text-[10px] font-mono text-right"
                  />
                </div>

                {/* PSF flat & GST */}
                <div className="flex items-center justify-between gap-1">
                  <span className="w-12 font-bold text-slate-600 dark:text-slate-400">PSF</span>
                  <Input
                    type="number"
                    placeholder="Flat Fee"
                    value={item.psf_amount || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "psf_amount", e.target.value, isEdit)}
                    className="h-6 flex-1 text-[10px] font-mono text-right"
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="w-12 font-bold text-slate-600 dark:text-slate-400">GST</span>
                  <Input
                    type="number"
                    placeholder="%"
                    value={item.gst_percent || ""}
                    onChange={(e) => updateTicketLineItem(itemIdx, "gst_percent", e.target.value, isEdit)}
                    className="h-6 w-14 text-[10px] font-mono"
                  />
                  <Input
                    readOnly
                    value={item.gst_amount || "0.00"}
                    className="h-6 flex-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-900 text-right"
                  />
                </div>
              </div>

              {/* Auto Update Checkbox & Auto-Calc Trigger */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={item.auto_update !== false}
                    onChange={(e) => updateTicketLineItem(itemIdx, "auto_update", e.target.checked, isEdit)}
                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                  />
                  <span>Auto Update</span>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1"
                  onClick={() => updateTicketLineItem(itemIdx, "base_fare", item.base_fare, isEdit)}
                >
                  <Calculator className="h-3 w-3" /> Recalculate
                </Button>
              </div>
            </div>

            {/* Cancellation Charges */}
            <div className="p-2 bg-white dark:bg-[#111113] rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-[10px]">
              <span className="font-bold text-slate-600 dark:text-slate-400">Cancellation Charges</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Self:</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={item.cancellation_charges_self || ""}
                  onChange={(e) => updateTicketLineItem(itemIdx, "cancellation_charges_self", e.target.value, isEdit)}
                  className="h-6 w-20 text-[10px] font-mono text-right"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Supplier:</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={item.cancellation_charges_supplier || ""}
                  onChange={(e) => updateTicketLineItem(itemIdx, "cancellation_charges_supplier", e.target.value, isEdit)}
                  className="h-6 w-20 text-[10px] font-mono text-right"
                />
              </div>
            </div>

            {/* Totals Summary (Matching ERP Screenshot Exactly) */}
            <div className="p-3 bg-slate-900 text-white rounded-lg font-mono text-[11px] space-y-1 shadow">
              <div className="grid grid-cols-2 gap-x-4 border-b border-slate-800 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Receivables &amp; Gross</span>
                <span className="text-right">Payables &amp; Net</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 pt-1">
                <div className="flex justify-between text-slate-300">
                  <span>Customer Gross:</span>
                  <span className="font-bold">{item.customer_gross?.toLocaleString() || "0.00"}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Customer Net:</span>
                  <span>{item.customer_net?.toLocaleString() || "0.00"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Invoice Rec. Gross:</span>
                  <span>{item.customer_gross?.toLocaleString() || "0.00"}</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[10px]">
                  <span>Invoice Rec. Net:</span>
                  <span>{item.customer_net?.toLocaleString() || "0.00"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 border-t border-slate-800/80 pt-1">
                <div className="flex justify-between text-slate-300">
                  <span>Supplier Gross:</span>
                  <span className="font-bold">{item.supplier_gross?.toLocaleString() || "0.00"}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Supplier Net:</span>
                  <span>{item.supplier_net?.toLocaleString() || "0.00"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Invoice Pay. Gross:</span>
                  <span>{item.supplier_gross?.toLocaleString() || "0.00"}</span>
                </div>
                <div className="flex justify-between text-slate-300 text-[10px]">
                  <span>Invoice Pay. Net:</span>
                  <span>{item.supplier_net?.toLocaleString() || "0.00"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 border-t border-slate-800 pt-1">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Supplier Gross W/o WHT:</span>
                  <span>{item.supplier_gross_wo_wht?.toLocaleString() || item.supplier_gross?.toLocaleString() || "0.00"}</span>
                </div>
                <div className="flex justify-between text-right">
                  <span className="text-slate-400 uppercase font-bold text-[10px]">Agency Profit:</span>
                  <span className="font-bold text-blue-400 text-[12px]">
                    + {item.agency_margin?.toLocaleString() || "0.00"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  const hasActiveFilters = searchQuery || dateRangeFilter !== "all" || paymentStatusFilter !== "all" || statusFilter !== "all" || customerFilter !== "all";

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            Invoices{typeFilter ? ` — ${typeFilter}s` : ""}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Manage ticket sales, airline billing, and travel invoices</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> New Invoice / Ticket Sale
          </DialogTrigger>
          <DialogContent className="sm:max-w-[96vw] md:max-w-[95vw] lg:max-w-[1400px] w-[96vw] max-h-[96vh] overflow-y-auto p-5">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {defaultType === "Ticket" ? "Ticket Booking & Sale Invoice" : "Create New Invoice"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 pt-1">
              {/* Top Invoice Header Grid (All Green-Ticked Fields in Screenshot) */}
              <div className="p-3 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-[12px]">
                {/* Header Row 1: Inv. Date, Customer, Print Name, Pay. Mode, Status */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Inv. Date *</Label>
                    <Input type="date" value={newInvDate} onChange={(e) => setNewInvDate(e.target.value)} className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Customer *</Label>
                    <Select value={newCustomerId} onValueChange={(v) => {
                      const val = v || "";
                      setNewCustomerId(val);
                      const cust = customers.find(c => c._id === val);
                      if (cust) setNewPrintName(cust.name);
                    }}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue placeholder="Select Customer">
                          {(val) => getCustomerName(val)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>{customers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Print Name *</Label>
                    <Input value={newPrintName} onChange={(e) => setNewPrintName(e.target.value)} placeholder="Print Name" className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Pay. Mode *</Label>
                    <Select value={newPaymentMode} onValueChange={(v) => setNewPaymentMode(v || "CR")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue>{(val) => val === "CR" ? "CR (Credit)" : val || "CR"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CR">CR (Credit)</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Status *</Label>
                    <Select value={newDocStatus} onValueChange={(v) => setNewDocStatus(v || "Draft")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue>{(val) => val === "Draft" ? "Draft (D)" : "Confirmed (C)"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft (D)</SelectItem>
                        <SelectItem value="Confirmed">Confirmed (C)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Header Row 2: Adj. Date, Cost Center, SPO, Visit Type, Remarks */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Adj. Date</Label>
                    <Input type="date" value={newAdjDate} onChange={(e) => setNewAdjDate(e.target.value)} className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Cost Center</Label>
                    <Input value={newCostCenter} onChange={(e) => setNewCostCenter(e.target.value)} placeholder="Search" className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">SPO / Agent</Label>
                    <Select value={newSpoId} onValueChange={(v) => setNewSpoId(v || "")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue placeholder="Booking Agent">
                          {(val) => getAgentName(val)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>{staffUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Visit Type *</Label>
                    <Select value={newVisitType} onValueChange={(v) => setNewVisitType(v || "Visitor")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Visitor">Visitor</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Remarks</Label>
                    <Select value={newRemarks} onValueChange={(v) => setNewRemarks(v || "NORMAL")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">NORMAL</SelectItem>
                        <SelectItem value="REISSUE">REISSUE</SelectItem>
                        <SelectItem value="REFUND">REFUND</SelectItem>
                        <SelectItem value="DATE CHANGE">DATE CHANGE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Service Line Items */}
              {lineItems.map((li, idx) => (
                <div key={idx}>
                  {li.service_type === "Ticket" ? (
                    renderTicketForm(li, idx, false)
                  ) : (
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 bg-gray-50/50">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Description"
                          value={li.description}
                          onChange={(e) => {
                            const arr = [...lineItems];
                            arr[idx].description = e.target.value;
                            setLineItems(arr);
                          }}
                          className="flex-1 h-9 text-[13px]"
                        />
                        <Input
                          placeholder="Amount"
                          type="number"
                          value={li.amount}
                          onChange={(e) => {
                            const arr = [...lineItems];
                            arr[idx].amount = e.target.value;
                            setLineItems(arr);
                          }}
                          className="w-32 h-9 text-[13px] font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button onClick={createInvoice} disabled={!newCustomerId || lineItems.length === 0 || isCreating} className="gap-2">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {isCreating ? "Saving..." : "Save Invoice"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modern Search & Filters Bar */}
      <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm mb-5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by invoice #, customer, passenger, ticket, PNR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-[13px] bg-slate-50/50 dark:bg-[#161619] border-slate-200 dark:border-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
              {/* Date Range Filter */}
              <div className="w-36">
                <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v || "all")}>
                  <SelectTrigger className="h-9 text-[12px] bg-slate-50/50 dark:bg-[#161619] border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Date Range">
                      {(val) => {
                        const labels: Record<string, string> = {
                          all: "All Dates",
                          today: "Today",
                          this_week: "This Week",
                          last_week: "Last Week",
                          this_month: "This Month",
                          last_month: "Last Month",
                        };
                        return labels[val] || "All Dates";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status Filter (Paid / Partial / Unpaid) */}
              <div className="w-32">
                <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v || "all")}>
                  <SelectTrigger className="h-9 text-[12px] bg-slate-50/50 dark:bg-[#161619] border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Payment">
                      {(val) => {
                        const labels: Record<string, string> = {
                          all: "All Payments",
                          Paid: "Paid",
                          Partial: "Partial",
                          Unpaid: "Unpaid",
                        };
                        return labels[val] || "All Payments";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter (Draft / Posted / Voided) */}
              <div className="w-32">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                  <SelectTrigger className="h-9 text-[12px] bg-slate-50/50 dark:bg-[#161619] border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Status">
                      {(val) => {
                        const labels: Record<string, string> = {
                          all: "All Status",
                          Draft: "Draft",
                          Posted: "Posted",
                          Voided: "Voided",
                        };
                        return labels[val] || "All Status";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Posted">Posted</SelectItem>
                    <SelectItem value="Voided">Voided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Filter */}
              <div className="w-44">
                <Select value={customerFilter} onValueChange={(v) => setCustomerFilter(v || "all")}>
                  <SelectTrigger className="h-9 text-[12px] bg-slate-50/50 dark:bg-[#161619] border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="All Customers">
                      {(val) => val === "all" ? "All Customers" : getCustomerName(val)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-9 px-2 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 gap-1"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table Card */}
      <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <span>Invoice Register</span>
            <Badge variant="secondary" className="text-[11px] font-mono font-normal">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 dark:border-[#1e1e21]">
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Invoice #</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Customer</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Doc Status</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Payment</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Currency</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Total Amount</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Due Balance</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pay Mode</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-[13px] text-gray-400">
                        {hasActiveFilters ? "No invoices found matching your filters. Try clearing filters." : "No invoices recorded yet."}
                      </TableCell>
                    </TableRow>
                  ) : invoices.map((inv) => (
                    <TableRow key={inv._id} className="border-gray-100 dark:border-[#1e1e21] hover:bg-gray-50/50 dark:hover:bg-[#151517]">
                      <TableCell className="font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell className="text-[13px] text-gray-600 dark:text-gray-300">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {typeof inv.customer_id === "object" ? inv.customer_id.name : "-"}
                        </div>
                        {inv.print_name && inv.print_name !== (typeof inv.customer_id === "object" ? inv.customer_id.name : "") && (
                          <span className="text-[11px] text-slate-400 block">{inv.print_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyles[inv.status] || ""}`}>
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${paymentStyles[inv.payment_status || "Unpaid"] || ""}`}>
                          {inv.payment_status || "Unpaid"}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-gray-500">{inv.currency}</TableCell>
                      <TableCell className="text-right font-mono text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                        {inv.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[12px]">
                        <span className={inv.due_amount && inv.due_amount > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {(inv.due_amount ?? inv.total_amount).toLocaleString()}
                        </span>
                        {inv.paid_amount !== undefined && inv.paid_amount > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            Paid: {inv.paid_amount.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-mono">{inv.payment_mode || "CR"}</Badge></TableCell>
                      <TableCell className="text-[12px] text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 flex-wrap">
                          {inv.status === "Draft" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => postInvoice(inv._id)}>
                                <Send className="h-3 w-3" /> Post
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => openEditDialog(inv)}>
                                <Pencil className="h-3 w-3" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                onClick={() => setDeleteInvoiceId(inv._id)}
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            </>
                          )}
                          {inv.status === "Posted" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => setVoidDialog(inv._id)}>
                                <Ban className="h-3 w-3" /> Void
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setCreditDialog(inv._id)}>
                                <CreditCard className="h-3 w-3" /> Credit Note
                              </Button>
                            </>
                          )}
                          {inv.status === "Voided" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                              onClick={() => setDeleteInvoiceId(inv._id)}
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => window.open(`/dashboard/invoices/${inv._id}/print`, "_blank")}>
                            <Printer className="h-3 w-3" /> Print
                          </Button>
                          {isManager && (
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px] cursor-pointer" onClick={() => loadAuditLogs(inv)}>
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

      {/* Edit Invoice Dialog - Full ERP Clone */}
      <Dialog open={!!editInvoiceId} onOpenChange={(open) => !open && setEditInvoiceId(null)}>
        <DialogContent className="sm:max-w-[96vw] md:max-w-[95vw] lg:max-w-[1400px] w-[96vw] max-h-[96vh] overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Ticket Invoice
            </DialogTitle>
          </DialogHeader>
          {editLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {/* Top Header Grid for Edit Modal */}
              <div className="p-3 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-[12px]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Customer *</Label>
                    <Select value={editCustomerId} onValueChange={(v) => setEditCustomerId(v || "")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue placeholder="Select Customer">
                          {(val) => getCustomerName(val)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>{customers.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Print Name *</Label>
                    <Input value={editPrintName} onChange={(e) => setEditPrintName(e.target.value)} className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Pay. Mode *</Label>
                    <Select value={editPaymentMode} onValueChange={(v) => setEditPaymentMode(v || "CR")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue>{(val) => val === "CR" ? "CR (Credit)" : val || "CR"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CR">CR (Credit)</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Status *</Label>
                    <Select value={editDocStatus} onValueChange={(v) => setEditDocStatus(v || "Draft")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue>{(val) => val === "Draft" ? "Draft (D)" : "Confirmed (C)"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft (D)</SelectItem>
                        <SelectItem value="Confirmed">Confirmed (C)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Adj. Date</Label>
                    <Input type="date" value={editAdjDate} onChange={(e) => setEditAdjDate(e.target.value)} className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Cost Center</Label>
                    <Input value={editCostCenter} onChange={(e) => setEditCostCenter(e.target.value)} placeholder="Cost Center" className="h-8 text-[12px] bg-white dark:bg-[#161619]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">SPO / Agent</Label>
                    <Select value={editSpoId} onValueChange={(v) => setEditSpoId(v || "")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]">
                        <SelectValue placeholder="Booking Agent">
                          {(val) => getAgentName(val)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>{staffUsers.map((u) => <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Remarks</Label>
                    <Select value={editRemarks} onValueChange={(v) => setEditRemarks(v || "NORMAL")}>
                      <SelectTrigger className="h-8 text-[12px] bg-white dark:bg-[#161619]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">NORMAL</SelectItem>
                        <SelectItem value="REISSUE">REISSUE</SelectItem>
                        <SelectItem value="REFUND">REFUND</SelectItem>
                        <SelectItem value="DATE CHANGE">DATE CHANGE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {editLineItems.map((li, idx) => (
                <div key={idx}>
                  {li.service_type === "Ticket" ? renderTicketForm(li, idx, true) : (
                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 bg-gray-50/50">
                      <Input
                        placeholder="Description"
                        value={li.description}
                        onChange={(e) => {
                          const arr = [...editLineItems];
                          arr[idx].description = e.target.value;
                          setEditLineItems(arr);
                        }}
                        className="h-9 text-[13px]"
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button variant="outline" onClick={() => setEditInvoiceId(null)}>Cancel</Button>
                <Button onClick={saveEditInvoice} disabled={isSavingEdit} className="gap-2">
                  {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteInvoiceId} onOpenChange={() => setDeleteInvoiceId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Delete Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-[13px] text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete this invoice? All associated line items, flight legs, and tax breakdowns will be deleted.
            </p>
            <p className="text-[12px] font-semibold text-rose-600">
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={() => setDeleteInvoiceId(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteInvoice} disabled={deleteLoading} className="gap-2">
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <Ban className="h-4 w-4" /> Void Invoice
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
              <Label className="text-[13px]">Credit Amount</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="0" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Reason</Label>
              <Textarea value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="Reason for issuing credit note..." className="min-h-[80px]" />
            </div>
            <Button onClick={issueCreditNote} disabled={!creditAmount || !creditReason} className="w-full h-10 gap-2">
              <CreditCard className="h-4 w-4" /> Issue Credit Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Audit Logs Dialog */}
      <Dialog open={!!auditDialogInvoice} onOpenChange={() => setAuditDialogInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Audit Trail — {auditDialogInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : auditLogs.length === 0 ? (
              <p className="text-center py-8 text-[13px] text-gray-400">No modifications logged yet.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log._id} className="p-3 rounded-lg border border-gray-100 dark:border-[#1e1e21] bg-gray-50/50 dark:bg-[#0e0e10]/30 text-[12px] space-y-1">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{log.changed_by?.name || "System"}</span>
                      <span>{new Date(log.changed_at).toLocaleString()}</span>
                    </div>
                    <p className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                      Changed <span className="font-bold">{log.field_changed}</span> from <span className="text-red-500">{String(log.old_value)}</span> to <span className="text-emerald-500 font-bold">{String(log.new_value)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
