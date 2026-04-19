import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShoppingCart,
  Truck,
  ArrowUpRight,
  X,
  FileText,
  Package,
  Calendar,
} from "lucide-react";
import { format, isBefore } from "date-fns";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { Button, Card, Badge, cn } from "../components/ui";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  PAID: { label: "Paid", pillClass: "pill-success", icon: CheckCircle2 },
  ORDERED: { label: "Ordered", pillClass: "pill-info", icon: Clock },
  RECEIVED: { label: "Received", pillClass: "pill-warning", icon: Truck },
  DRAFT: { label: "Draft", pillClass: "pill-muted", icon: FileText },
};

const STATUS_TABS = [
  { id: "ALL", label: "All Bills" },
  { id: "ORDERED", label: "Ordered" },
  { id: "RECEIVED", label: "Received" },
  { id: "PAID", label: "Paid" },
];

function Purchases() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ["purchases", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/purchases/business/${currentBusiness.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const purchases = purchasesData?.data || [];

  const counts = useMemo(() => {
    const c = {
      ALL: purchases.length,
      ORDERED: 0,
      RECEIVED: 0,
      PAID: 0,
      DRAFT: 0,
    };
    purchases.forEach((p) => {
      if (c[p.status] !== undefined) c[p.status]++;
    });
    return c;
  }, [purchases]);

  const filteredPurchases = useMemo(
    () =>
      activeTab === "ALL"
        ? purchases
        : purchases.filter((p) => p.status === activeTab),
    [purchases, activeTab],
  );

  const metrics = useMemo(
    () => ({
      totalSpend: purchases.reduce((s, p) => s + (p.totalAmount || 0), 0),
      ordered: purchases
        .filter((p) => p.status === "ORDERED")
        .reduce((s, p) => s + (p.totalAmount || 0), 0),
      received: purchases
        .filter((p) => p.status === "RECEIVED")
        .reduce((s, p) => s + (p.totalAmount || 0), 0),
    }),
    [purchases],
  );

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["purchases"]);
      toast.success("Record Deleted");
    },
  });

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">
            Track vendor bills and inventory intake
          </p>
        </div>
        <button
          onClick={() => navigate("/purchases/new")}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Log Purchase
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Procurement",
            value: metrics.totalSpend,
            icon: ShoppingCart,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Pending Arrival",
            value: metrics.ordered,
            icon: Clock,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Goods Received",
            value: metrics.received,
            icon: Truck,
            color: "text-emerald-600 bg-emerald-50",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="surface p-5 flex items-center gap-4"
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
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {m.label}
              </p>
              <p className="text-2xl font-black text-slate-900 leading-none">
                ₹{m.value.toLocaleString("en-IN")}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-0 focus-within:ring-2 focus-within:ring-indigo-400/30 focus-within:border-indigo-300 transition-all">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            name="search"
            placeholder="Search vendor, bill number, or products..."
            aria-label="Search purchases"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span
                  className={cn(
                    "ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
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

      {/* ── Data Table ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="surface overflow-hidden"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="!pl-8">Bill Reference</th>
              <th>Supplier / Vendor</th>
              <th>Date</th>
              <th className="text-right">Taxable</th>
              <th className="text-right">Total Amount</th>
              <th>Status</th>
              <th className="text-right !pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={7} className="p-8">
                    <div className="skeleton h-12 w-full rounded-xl" />
                  </td>
                </tr>
              ))
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <ShoppingCart className="w-16 h-16 text-slate-100 mb-4" />
                    <p className="text-sm font-bold text-slate-400 italic">
                      No purchase records matching your criteria
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPurchases.map((p, idx) => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = sc.icon;
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group"
                  >
                    <td className="!pl-8 py-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">
                            #{p.purchaseNumber}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                            {p.refNo || "Direct Purchase"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm font-black text-slate-900 leading-none">
                        {p.party?.name || "Vendor"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-tighter">
                        {p.party?.gstin || "Unregistered"}
                      </p>
                    </td>
                    <td>
                      <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {format(new Date(p.date), "dd MMM yyyy")}
                      </p>
                    </td>
                    <td className="text-right">
                      <p className="text-[11px] font-bold text-slate-400 italic">
                        ₹{p.subtotal?.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        ₹{p.totalAmount?.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td>
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 uppercase tracking-widest",
                          sc.pillClass,
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </div>
                    </td>
                    <td className="!pr-8 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => navigate(`/purchases/edit/${p.id}`)}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(p.id)}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

export default Purchases;
