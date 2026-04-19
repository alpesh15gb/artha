import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileCheck,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  XCircle,
  Pencil,
  Printer,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { cn, Portal } from "../components/ui";
import toast from "react-hot-toast";
import { EstimateTemplateAlphesh } from "../components/invoices/EstimateTemplateAlphesh";

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", pillClass: "pill-muted", icon: FileText },
  SENT: { label: "Sent", pillClass: "pill-info", icon: Send },
  ACCEPTED: {
    label: "Accepted",
    pillClass: "pill-success",
    icon: CheckCircle2,
  },
  REJECTED: { label: "Rejected", pillClass: "pill-danger", icon: XCircle },
  CONVERTED: { label: "Converted", pillClass: "pill-purple", icon: FileCheck },
  EXPIRED: { label: "Expired", pillClass: "pill-warning", icon: Clock },
};

const STATUS_TABS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SENT", label: "Sent" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "EXPIRED", label: "Expired" },
];

function resolveStatus(est) {
  if (
    est.status === "SENT" &&
    est.expiryDate &&
    isBefore(new Date(est.expiryDate), new Date())
  )
    return "EXPIRED";
  return est.status;
}

function Estimates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [printEstimate, setPrintEstimate] = useState(null);

  const { data: estimatesData, isLoading } = useQuery({
    queryKey: ["estimates", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/estimates/business/${currentBusiness.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const estimates = estimatesData?.data || [];

  const enriched = useMemo(
    () =>
      estimates.map((est) => ({ ...est, _resolvedStatus: resolveStatus(est) })),
    [estimates],
  );

  const counts = useMemo(() => {
    const c = {
      ALL: enriched.length,
      DRAFT: 0,
      SENT: 0,
      ACCEPTED: 0,
      EXPIRED: 0,
      REJECTED: 0,
      CONVERTED: 0,
    };
    enriched.forEach((e) => {
      if (c[e._resolvedStatus] !== undefined) c[e._resolvedStatus]++;
    });
    return c;
  }, [enriched]);

  const filtered = useMemo(
    () =>
      activeTab === "ALL"
        ? enriched
        : enriched.filter((e) => e._resolvedStatus === activeTab),
    [enriched, activeTab],
  );

  const metrics = useMemo(
    () => ({
      total: estimates.length,
      accepted: enriched.filter((e) => e._resolvedStatus === "ACCEPTED").length,
      totalValue: estimates.reduce((s, e) => s + (e.totalAmount || 0), 0),
      converted: enriched.filter((e) => e._resolvedStatus === "CONVERTED")
        .length,
    }),
    [enriched, estimates],
  );

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/estimates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["estimates"]);
      toast.success("Estimate deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const handlePrint = (est) => {
    setPrintEstimate(est);
    setTimeout(() => {
      window.print();
      const cleanup = () => {
        setPrintEstimate(null);
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(cleanup, 30000);
    }, 600);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Estimates</h1>
          <p className="page-subtitle">
            Professional quotations for your clients
          </p>
        </div>
        <button
          onClick={() => navigate("/estimates/new")}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Estimate
        </button>
      </div>

      {/* ── Metrics Strip ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Quotes",
            value: metrics.total,
            color: "text-indigo-600 bg-indigo-50",
            icon: FileCheck,
          },
          {
            label: "Accepted",
            value: metrics.accepted,
            color: "text-emerald-600 bg-emerald-50",
            icon: CheckCircle2,
          },
          {
            label: "Quote Value",
            value: `₹${metrics.totalValue.toLocaleString("en-IN")}`,
            color: "text-purple-600 bg-purple-50",
            icon: FileText,
          },
          {
            label: "Converted",
            value: metrics.converted,
            color: "text-blue-600 bg-blue-50",
            icon: ChevronRight,
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
                {m.value}
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
        <div className="flex items-center gap-2.5 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-indigo-400/30 focus-within:border-indigo-300 transition-all">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            name="search"
            placeholder="Search estimates, customers..."
            aria-label="Search estimates"
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
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
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
                <div className="skeleton h-8 w-8 rounded-lg" />
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 w-28 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileCheck className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">
              {search ? `No results for "${search}"` : "No estimates found"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {!search && "Create a quote to win your next client"}
            </p>
            {!search && (
              <button
                onClick={() => navigate("/estimates/new")}
                className="mt-5 btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> New Estimate
              </button>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Estimate #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Valid Until</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((est, idx) => {
                  const sc =
                    STATUS_CONFIG[est._resolvedStatus] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = sc.icon;
                  const isExpired = est._resolvedStatus === "EXPIRED";
                  return (
                    <motion.tr
                      key={est.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group"
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors flex-shrink-0">
                            <FileCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              #{est.estimateNumber}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                            {(est.partyName ||
                              est.party?.name ||
                              "C")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            {est.partyName || est.party?.name || "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-slate-500 font-medium">
                          {format(new Date(est.date), "dd MMM yyyy")}
                        </span>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isExpired
                              ? "text-rose-600 font-bold"
                              : "text-slate-500",
                          )}
                        >
                          {est.expiryDate
                            ? format(new Date(est.expiryDate), "dd MMM yyyy")
                            : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="text-sm font-black text-slate-900">
                          ₹{(est.totalAmount || 0).toLocaleString("en-IN")}
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
                            onClick={() =>
                              navigate(`/estimates/edit/${est.id}`)
                            }
                          />
                          <ActionBtn
                            icon={Printer}
                            title="Print"
                            onClick={() => handlePrint(est)}
                          />
                          <ActionBtn
                            icon={Trash2}
                            title="Delete"
                            onClick={() => deleteMutation.mutate(est.id)}
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

      {/* Print Portal */}
      {printEstimate && (
        <Portal>
          <div
            id="print-root"
            className="fixed inset-0 z-[10000] bg-white overflow-auto"
          >
            <div id="print-area" className="w-[210mm] mx-auto">
              <EstimateTemplateAlphesh
                invoice={printEstimate}
                business={currentBusiness}
                party={printEstimate.party}
                items={printEstimate.items}
                totals={{
                  subtotal: printEstimate.subtotal,
                  cgst: (printEstimate.taxAmount || 0) / 2,
                  sgst: (printEstimate.taxAmount || 0) / 2,
                  igst: 0,
                  total: printEstimate.totalAmount,
                }}
              />
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

export default Estimates;
