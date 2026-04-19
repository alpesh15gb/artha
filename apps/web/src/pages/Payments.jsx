import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  EmptyState,
  cn,
} from "../components/ui";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  CheckCircle2,
  CreditCard,
  Wallet,
  Banknote,
  Landmark,
  ArrowRight,
  Filter,
  Calendar,
  Download,
  MoreVertical,
  Activity,
  Calculator,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

const METHOD_CONFIG = {
  BANK: { icon: Landmark, color: "text-blue-600 bg-blue-50" },
  CASH: { icon: Banknote, color: "text-amber-600 bg-amber-50" },
  UPI: { icon: Zap, color: "text-purple-600 bg-purple-50" },
  CHEQUE: { icon: FileText, color: "text-slate-600 bg-slate-50" },
};

function Payments() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFormModal, setShowFormModal] = useState({
    isOpen: false,
    initialData: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["payments", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/payments/business/${currentBusiness.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: partiesData } = useQuery({
    queryKey: ["parties", currentBusiness?.id],
    queryFn: () =>
      api.get(`/parties/business/${currentBusiness.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["payments"]);
      queryClient.invalidateQueries(["invoices"]);
      queryClient.invalidateQueries(["purchases"]);
      toast.success("Transaction Voided");
    },
  });

  const payments = data?.data || [];
  const parties = partiesData?.data || [];

  const metrics = useMemo(() => {
    let receipts = 0,
      payouts = 0;
    payments.forEach((p) => {
      const isPayout = p.adjustments?.some((a) => a.purchaseId);
      if (isPayout) payouts += p.amount || 0;
      else receipts += p.amount || 0;
    });
    return { receipts, payouts, net: receipts - payouts };
  }, [payments]);

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payments & Cashflow</h1>
          <p className="page-subtitle">
            Track receipts, payouts, and automated bill settlements
          </p>
        </div>
        <button
          onClick={() => setShowFormModal({ isOpen: true, initialData: null })}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "Total Receipts (IN)",
            value: metrics.receipts,
            icon: ArrowDownLeft,
            color: "emerald",
          },
          {
            label: "Total Payouts (OUT)",
            value: metrics.payouts,
            icon: ArrowUpRight,
            color: "rose",
          },
          {
            label: "Net Liquidity",
            value: metrics.net,
            icon: Wallet,
            color: "indigo",
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="surface p-6 flex items-center gap-5"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center",
                m.color === "emerald"
                  ? "bg-emerald-50 text-emerald-600"
                  : m.color === "rose"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-indigo-50 text-indigo-600",
              )}
            >
              <m.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                {m.label}
              </p>
              <p className="text-3xl font-black text-slate-900 leading-none">
                ₹{Math.abs(m.value).toLocaleString("en-IN")}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 min-w-0">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by ID, party, or reference..."
            aria-label="Search payments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-slate-900 w-full"
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary !py-2 !px-4 !rounded-xl !text-[10px]">
            <Filter className="w-3.5 h-3.5 mr-1" /> FILTERS
          </button>
          <button className="btn-secondary !py-2 !px-4 !rounded-xl !text-[10px]">
            <Download className="w-3.5 h-3.5 mr-1" /> EXPORT
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="surface overflow-hidden"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="!pl-8">Identity & Date</th>
              <th>Partner Identity</th>
              <th>Transfer Method</th>
              <th className="text-right">Settlements</th>
              <th className="text-right">Impact Amount</th>
              <th className="text-right !pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={6} className="p-8">
                    <div className="skeleton h-12 w-full rounded-2xl" />
                  </td>
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-24 text-center">
                  <div className="flex flex-col items-center">
                    <Activity className="w-16 h-16 text-slate-100 mb-4" />
                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                      No financial movements tracked
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((p, idx) => {
                const isPayout = p.adjustments?.some((a) => a.purchaseId);
                const method =
                  METHOD_CONFIG[p.paymentMethod] || METHOD_CONFIG.CASH;
                const MethodIcon = method.icon;
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group"
                  >
                    <td className="!pl-8 py-5">
                      <div className="space-y-1.5">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                          #{p.paymentNumber}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(p.date), "dd MMM yyyy")}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <User className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-black text-slate-900">
                          {parties.find((x) => x.id === p.partyId)?.name ||
                            "Direct Ledger Entry"}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent",
                          method.color,
                        )}
                      >
                        <MethodIcon className="w-3.5 h-3.5" />
                        {p.paymentMethod}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {p.adjustments?.length ? (
                          p.adjustments.map((a, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded-md uppercase tracking-tighter"
                            >
                              {a.invoice?.invoiceNumber ||
                                a.purchase?.purchaseNumber ||
                                "General"}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 italic">
                            Unallocated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right">
                      <p
                        className={cn(
                          "text-sm font-black",
                          isPayout ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        {isPayout ? "-" : "+"}₹
                        {p.amount?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70 truncate max-w-[120px] ml-auto">
                        {p.reference || "No Narration"}
                      </p>
                    </td>
                    <td className="text-right !pr-8">
                      <button
                        onClick={() => deleteMutation.mutate(p.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      <PaymentFormModal
        isOpen={showFormModal.isOpen}
        onClose={() => setShowFormModal({ isOpen: false, initialData: null })}
        businessId={currentBusiness?.id}
        parties={parties}
      />
    </div>
  );
}

function PaymentFormModal({ isOpen, onClose, businessId, parties }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    partyId: "",
    amount: "",
    paymentMethod: "UPI",
    reference: "",
    adjustments: [],
  });
  const [activeTab, setActiveTab] = useState("info");

  const { data: pendingDocs } = useQuery({
    queryKey: ["pending-docs", formData.partyId],
    queryFn: async () => {
      const party = parties.find((p) => p.id === formData.partyId);
      const isSupplier = party?.partyType === "SUPPLIER";
      const endpoint = isSupplier
        ? `/purchases/business/${businessId}?partyId=${formData.partyId}&status=PARTIAL,RECEIVED`
        : `/invoices/business/${businessId}?partyId=${formData.partyId}&status=PARTIAL,SENT`;
      const res = await api.get(endpoint);
      return res.data;
    },
    enabled: !!formData.partyId && isOpen,
  });

  const docs = pendingDocs?.data || [];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        partyId: "",
        amount: "",
        paymentMethod: "UPI",
        reference: "",
        adjustments: [],
      });
      setActiveTab("info");
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: (data) => api.post("/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["payments", "invoices", "purchases"]);
      toast.success("Cashflow Logged");
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || "Sync failed"),
  });

  const handleDocAllocation = (doc, amt) => {
    const isPurchase = !!doc.purchaseNumber;
    setFormData((prev) => {
      const filtered = prev.adjustments.filter(
        (a) => (isPurchase ? a.purchaseId : a.invoiceId) !== doc.id,
      );
      if (amt > 0) {
        filtered.push({
          ...(isPurchase ? { purchaseId: doc.id } : { invoiceId: doc.id }),
          amount: parseFloat(amt),
        });
      }
      return { ...prev, adjustments: filtered };
    });
  };

  const autoAllocate = () => {
    const total = parseFloat(formData.amount || 0);
    let rem = total;
    const adjs = [];
    [...docs]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((d) => {
        if (rem <= 0) return;
        const alloc = Math.min(rem, d.balanceDue);
        adjs.push({
          [d.purchaseNumber ? "purchaseId" : "invoiceId"]: d.id,
          amount: Math.round(alloc * 100) / 100,
        });
        rem -= alloc;
      });
    setFormData({ ...formData, adjustments: adjs });
    toast.success("Greedy auto-allocation applied");
  };

  const totalAdjusted = (formData.adjustments || []).reduce(
    (s, a) => s + (a.amount || 0),
    0,
  );
  const remaining = parseFloat(formData.amount || 0) - totalAdjusted;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-600" /> New Cashflow Entry
        </div>
      }
      size="lg"
    >
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
        <button
          onClick={() => setActiveTab("info")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "info"
              ? "bg-white text-indigo-600 shadow-xl shadow-indigo-100"
              : "text-slate-400",
          )}
        >
          1. Master Log
        </button>
        <button
          onClick={() => setActiveTab("allocation")}
          disabled={!formData.partyId || !formData.amount}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "allocation"
              ? "bg-white text-indigo-600 shadow-xl shadow-indigo-100"
              : "text-slate-400 disabled:opacity-30",
          )}
        >
          2. Invoice Impact
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({
            ...formData,
            businessId,
            amount: parseFloat(formData.amount),
            date: new Date().toISOString(),
          });
        }}
        className="space-y-6"
      >
        <AnimatePresence mode="wait">
          {activeTab === "info" ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="space-y-6"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Account Identity
                </label>
                <select
                  className="input-base"
                  value={formData.partyId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      partyId: e.target.value,
                      adjustments: [],
                    })
                  }
                  required
                >
                  <option value="">Select Target Partner...</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.partyType})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Transfer Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="input-base !pl-10 font-black text-lg"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">
                      ₹
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Channel
                  </label>
                  <select
                    className="input-base font-bold"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    {Object.keys(METHOD_CONFIG).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Narration / Reference
                </label>
                <input
                  className="input-base"
                  placeholder="Txn ID, Cheque #, or internal remark..."
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("allocation")}
                  disabled={!formData.partyId || !formData.amount}
                  className="btn-primary !rounded-xl !px-10"
                >
                  ALLOCATE <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="alloc"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="surface p-4 border-indigo-100 bg-indigo-50/30">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                    Total Pool
                  </p>
                  <p className="text-xl font-black text-indigo-600">
                    ₹{parseFloat(formData.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div
                  className={cn(
                    "surface p-4 border-none transition-all",
                    Math.abs(remaining) < 0.1
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white",
                  )}
                >
                  <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-1">
                    Unallocated
                  </p>
                  <p className="text-xl font-black">
                    ₹{Math.abs(remaining).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Pending Settlements
                </h4>
                <button
                  type="button"
                  onClick={autoAllocate}
                  className="text-[10px] font-black text-indigo-600 flex items-center gap-1 uppercase tracking-widest"
                >
                  <Calculator className="w-3.5 h-3.5" /> SMART ALLOCATE
                </button>
              </div>

              <div className="space-y-3 max-h-[320px] overflow-y-auto no-scrollbar pb-6">
                {docs.map((d) => {
                  const cur =
                    formData.adjustments.find(
                      (a) =>
                        (d.invoiceNumber ? a.invoiceId : a.purchaseId) === d.id,
                    )?.amount || "";
                  return (
                    <div
                      key={d.id}
                      className="surface p-4 flex items-center justify-between hover:border-indigo-400 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {d.invoiceNumber || d.purchaseNumber}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Balance: ₹{d.balanceDue?.toLocaleString()} •{" "}
                            {format(new Date(d.date), "dd MMM")}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-32 bg-slate-50 border-none rounded-xl py-2 px-3 text-right font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                          placeholder="0.00"
                          value={cur}
                          onChange={(e) =>
                            handleDocAllocation(d, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                {docs.length === 0 && (
                  <div className="py-20 text-center text-slate-300 font-bold italic text-xs uppercase tracking-widest">
                    Zero pending documents
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("info")}
                  className="btn-secondary !text-[10px] !px-8"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  className="btn-primary !rounded-xl !px-12 flex items-center gap-2"
                >
                  COMMIT <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </Modal>
  );
}

export default Payments;
