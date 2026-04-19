import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Pencil,
  Printer,
  ChevronDown,
  TrendingUp,
  CreditCard,
  Filter,
  MoreHorizontal,
  Copy,
  X,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { cn, Portal } from "../components/ui";
import toast from "react-hot-toast";
import { exportToPDF } from "../utils/export";
import { InvoiceTemplate1 } from "../components/invoices/InvoiceTemplate1";
import { InvoiceTemplate2 } from "../components/invoices/InvoiceTemplate2";
import { InvoiceTemplate3 } from "../components/invoices/InvoiceTemplate3";
import { EstimateTemplateAlphesh } from "../components/invoices/EstimateTemplateAlphesh";

// ── Status Config ────────────────────────────
const STATUS_CONFIG = {
  PAID: { label: "Paid", pillClass: "pill-success", icon: CheckCircle2 },
  SENT: { label: "Unpaid", pillClass: "pill-warning", icon: Clock },
  PARTIAL: { label: "Partial", pillClass: "pill-info", icon: AlertCircle },
  OVERDUE: { label: "Overdue", pillClass: "pill-danger", icon: AlertCircle },
  DRAFT: { label: "Draft", pillClass: "pill-muted", icon: FileText },
};

const STATUS_TABS = [
  { id: "ALL", label: "All" },
  { id: "SENT", label: "Unpaid" },
  { id: "OVERDUE", label: "Overdue" },
  { id: "PAID", label: "Paid" },
  { id: "DRAFT", label: "Draft" },
];

function resolveStatus(inv) {
  if (inv.status === "PAID") return "PAID";
  if (inv.status === "PARTIAL") return "PARTIAL";
  if (inv.status === "DRAFT") return "DRAFT";
  if (inv.status === "SENT") {
    if (inv.dueDate && isBefore(new Date(inv.dueDate), new Date()))
      return "OVERDUE";
    return "SENT";
  }
  return inv.status;
}

function Invoices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/invoices/business/${currentBusiness.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const invoices = invoicesData?.data || [];

  // Enrich with resolved status
  const enrichedInvoices = useMemo(
    () =>
      invoices.map((inv) => ({ ...inv, _resolvedStatus: resolveStatus(inv) })),
    [invoices],
  );

  // Counts for tab badges
  const counts = useMemo(() => {
    const c = {
      ALL: enrichedInvoices.length,
      SENT: 0,
      OVERDUE: 0,
      PAID: 0,
      DRAFT: 0,
    };
    enrichedInvoices.forEach((inv) => {
      if (c[inv._resolvedStatus] !== undefined) c[inv._resolvedStatus]++;
    });
    return c;
  }, [enrichedInvoices]);

  // Filtered list
  const filteredInvoices = useMemo(
    () =>
      activeTab === "ALL"
        ? enrichedInvoices
        : enrichedInvoices.filter((i) => i._resolvedStatus === activeTab),
    [enrichedInvoices, activeTab],
  );

  // Summary metrics
  const metrics = useMemo(
    () => ({
      totalRevenue: invoices.reduce((s, i) => s + (i.totalAmount || 0), 0),
      collected: invoices
        .filter((i) => i.status === "PAID")
        .reduce((s, i) => s + (i.totalAmount || 0), 0),
      outstanding: invoices
        .filter((i) => i.status !== "PAID" && i.status !== "DRAFT")
        .reduce((s, i) => s + (i.balanceDue || i.totalAmount || 0), 0),
    }),
    [invoices],
  );

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["invoices"]);
      toast.success("Invoice deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  React.useEffect(() => {
    if (previewInvoice || isExporting)
      document.body.classList.add("is-printing");
    else document.body.classList.remove("is-printing");
    return () => document.body.classList.remove("is-printing");
  }, [previewInvoice, isExporting]);

  const handleDownload = async (inv) => {
    setPreviewInvoice(inv);
    setTimeout(async () => {
      try {
        setIsExporting(true);
        await exportToPDF("print-area", `Invoice_${inv.invoiceNumber}.pdf`);
        toast.success("PDF Downloaded");
      } catch {
        toast.error("Failed to generate PDF");
      } finally {
        setIsExporting(false);
        setPreviewInvoice(null);
      }
    }, 800);
  };

  const handlePrint = (inv) => {
    setPreviewInvoice(inv);
    setTimeout(() => {
      window.print();
      const cleanup = () => {
        setPreviewInvoice(null);
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 30000);
    }, 600);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* ── Page Header ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} invoices total</p>
        </div>
        <button
          onClick={() => navigate("/invoices/new")}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* ── Metrics Strip ───────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Billed",
            value: metrics.totalRevenue,
            icon: FileText,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Collected",
            value: metrics.collected,
            icon: CheckCircle2,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Outstanding",
            value: metrics.outstanding,
            icon: CreditCard,
            color: "text-amber-600 bg-amber-50",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4"
            style={{ boxShadow: "0 2px 12px -2px rgb(0 0 0 / 0.05)" }}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                m.color,
              )}
            >
              <m.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {m.label}
              </p>
              <p className="text-xl font-black text-slate-900 leading-tight">
                ₹{m.value.toLocaleString("en-IN")}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────── */}
      <div
        className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ boxShadow: "0 2px 12px -2px rgb(0 0 0 / 0.04)" }}
      >
        {/* Search */}
        <div className="flex items-center gap-2.5 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-0 focus-within:ring-2 focus-within:ring-indigo-400/30 focus-within:border-indigo-300 transition-all">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            name="search"
            placeholder="Search invoices, customers..."
            aria-label="Search invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 w-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span
                  className={cn(
                    "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeTab === tab.id
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-slate-200 text-slate-500",
                  )}
                >
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        style={{ boxShadow: "0 2px 12px -2px rgb(0 0 0 / 0.05)" }}
      >
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="skeleton h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-4 w-32 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              {search ? `No results for "${search}"` : "No invoices found"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search
                ? "Try a different search term"
                : "Create your first invoice to get started"}
            </p>
            {!search && (
              <button
                onClick={() => navigate("/invoices/new")}
                className="mt-5 btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Invoice
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Tax</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filteredInvoices.map((inv, idx) => {
                  const sc =
                    STATUS_CONFIG[inv._resolvedStatus] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = sc.icon;
                  const isOverdue = inv._resolvedStatus === "OVERDUE";
                  return (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group"
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              #{inv.invoiceNumber}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {inv.invoiceType || "Tax Invoice"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                            {(inv.party?.name || "C")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-700 truncate max-w-[120px]">
                            {inv.party?.name || inv.partyName || "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-slate-500 font-medium">
                          {format(new Date(inv.date), "dd MMM yyyy")}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isOverdue
                              ? "text-rose-600 font-bold"
                              : "text-slate-500",
                          )}
                        >
                          {inv.dueDate
                            ? format(new Date(inv.dueDate), "dd MMM yyyy")
                            : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-black text-slate-900">
                          ₹{(inv.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm text-slate-400 font-medium">
                          ₹
                          {(
                            (inv.cgstAmount || 0) +
                            (inv.sgstAmount || 0) +
                            (inv.igstAmount || 0)
                          ).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1",
                            sc.pillClass,
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionBtn
                            icon={Pencil}
                            title="Edit"
                            onClick={() => navigate(`/invoices/edit/${inv.id}`)}
                          />
                          <ActionBtn
                            icon={Printer}
                            title="Print"
                            onClick={() => handlePrint(inv)}
                          />
                          <ActionBtn
                            icon={Download}
                            title="Download PDF"
                            onClick={() => handleDownload(inv)}
                          />
                          <ActionBtn
                            icon={Trash2}
                            title="Delete"
                            onClick={() => deleteMutation.mutate(inv.id)}
                            danger
                          />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </motion.div>

      {/* Export Loading Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center no-print">
          <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-slate-900">Generating PDF...</p>
          </div>
        </div>
      )}

      {/* Print Portal */}
      {previewInvoice && (
        <Portal>
          <div
            id="print-root"
            className="fixed inset-0 z-[10000] bg-white overflow-auto"
          >
            <div id="print-area" className="w-[210mm] mx-auto">
              {(!previewInvoice.template ||
                previewInvoice.template === "template1") && (
                <InvoiceTemplate1
                  invoice={previewInvoice}
                  business={currentBusiness}
                  party={previewInvoice.party}
                  items={previewInvoice.items}
                  totals={{
                    subtotal: previewInvoice.subtotal,
                    cgst: previewInvoice.cgstAmount,
                    sgst: previewInvoice.sgstAmount,
                    igst: previewInvoice.igstAmount,
                    total: previewInvoice.totalAmount,
                  }}
                />
              )}
              {previewInvoice.template === "template2" && (
                <InvoiceTemplate2
                  invoice={previewInvoice}
                  business={currentBusiness}
                  party={previewInvoice.party}
                  items={previewInvoice.items}
                  totals={{
                    subtotal: previewInvoice.subtotal,
                    cgst: previewInvoice.cgstAmount,
                    sgst: previewInvoice.sgstAmount,
                    igst: previewInvoice.igstAmount,
                    total: previewInvoice.totalAmount,
                  }}
                />
              )}
              {previewInvoice.template === "template3" && (
                <InvoiceTemplate3
                  invoice={previewInvoice}
                  business={currentBusiness}
                  party={previewInvoice.party}
                  items={previewInvoice.items}
                  totals={{
                    subtotal: previewInvoice.subtotal,
                    cgst: previewInvoice.cgstAmount,
                    sgst: previewInvoice.sgstAmount,
                    igst: previewInvoice.igstAmount,
                    total: previewInvoice.totalAmount,
                  }}
                />
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-lg transition-all",
        danger
          ? "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
          : "text-slate-300 hover:text-indigo-600 hover:bg-indigo-50",
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default Invoices;
