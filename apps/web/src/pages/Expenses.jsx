import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  Receipt,
  TrendingDown,
  CreditCard,
  Wallet,
  Banknote,
  Search,
  X,
  PieChart,
  ArrowRight,
  Info,
  Filter,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { Button, Input, Card, Badge, Modal, cn } from "../components/ui";
import toast from "react-hot-toast";

function Expenses() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFormModal, setShowFormModal] = useState({
    isOpen: false,
    initialData: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/expenses/business/${currentBusiness?.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      toast.success("Expense record purged");
    },
    onError: () => toast.error("Check dependencies"),
  });

  const expenses = data?.data || [];

  const metrics = useMemo(
    () => ({
      total: expenses.reduce((s, e) => s + (e.totalAmount || 0), 0),
      count: expenses.length,
      thisMonth: expenses
        .filter((e) => {
          const d = new Date(e.date);
          const now = new Date();
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        })
        .reduce((s, e) => s + (e.totalAmount || 0), 0),
    }),
    [expenses],
  );

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track operational spend and overheads</p>
        </div>
        <button
          onClick={() => setShowFormModal({ isOpen: true, initialData: null })}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Record Expense
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Outflow",
            value: metrics.total,
            icon: TrendingDown,
            color: "text-rose-600 bg-rose-50",
          },
          {
            label: "This Month",
            value: metrics.thisMonth,
            icon: Calendar,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Total Vouchers",
            value: metrics.count,
            icon: Receipt,
            color: "text-slate-600 bg-slate-50",
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
                {typeof m.value === "number" && m.label !== "Total Vouchers"
                  ? `₹${m.value.toLocaleString("en-IN")}`
                  : m.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filter ── */}
      <div className="surface p-4 flex items-center gap-4">
        <div className="flex items-center gap-2.5 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 min-w-0 focus-within:ring-2 focus-within:ring-indigo-400/30 focus-within:border-indigo-300 transition-all">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            name="search"
            placeholder="Search by category, description, or voucher..."
            aria-label="Search expenses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 w-full"
          />
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
              <th className="!pl-8">Voucher</th>
              <th>Category & Description</th>
              <th>Date</th>
              <th>Payment Source</th>
              <th className="text-right">Amount</th>
              <th className="text-right !pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={6} className="p-8">
                    <div className="skeleton h-12 w-full rounded-xl" />
                  </td>
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <Receipt className="w-12 h-12 text-slate-100 mb-4" />
                    <p className="text-sm font-bold text-slate-400 italic">
                      No operational expenses recorded yet
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((e, idx) => (
                <tr
                  key={e.id}
                  className="group hover:bg-slate-50/50 transition-colors"
                >
                  <td className="!pl-8 py-5">
                    <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase tracking-tighter shadow-sm">
                      #{e.expenseNumber}
                    </span>
                  </td>
                  <td>
                    <p className="text-sm font-black text-slate-900 leading-none">
                      {e.category}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase truncate max-w-[200px]">
                      {e.description || "No memo"}
                    </p>
                  </td>
                  <td>
                    <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-300" />
                      {format(new Date(e.date), "dd MMM yyyy")}
                    </p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center",
                          e.paymentMethod === "BANK"
                            ? "bg-indigo-50 text-indigo-500"
                            : "bg-emerald-50 text-emerald-500",
                        )}
                      >
                        {e.paymentMethod === "BANK" ? (
                          <CreditCard className="w-3.5 h-3.5" />
                        ) : (
                          <Wallet className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {e.paymentMethod || "CASH"}
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <p className="text-sm font-black text-slate-900">
                      ₹{(e.totalAmount || 0).toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td className="!pr-8 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() =>
                          setShowFormModal({ isOpen: true, initialData: e })
                        }
                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-indigo-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="p-2 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      <ExpenseFormModal
        isOpen={showFormModal.isOpen}
        onClose={() => setShowFormModal({ isOpen: false, initialData: null })}
        initialData={showFormModal.initialData}
        businessId={currentBusiness?.id}
      />
    </div>
  );
}

function ExpenseFormModal({ isOpen, onClose, initialData, businessId }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(
    initialData?.paymentMethod === "BANK" ? "bank" : "cash",
  );
  const [formData, setFormData] = useState({
    category: initialData?.category || "",
    amount: initialData?.totalAmount || 0,
    description: initialData?.description || "",
    accountId: initialData?.bankAccountId || initialData?.cashAccountId || "",
  });

  const { data: bankData } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: () =>
      api
        .get(`/accounts/bank-accounts/business/${businessId}`)
        .then((r) => r.data),
    enabled: !!isOpen,
  });

  const { data: cashData } = useQuery({
    queryKey: ["cash-accounts", businessId],
    queryFn: () =>
      api
        .get(`/accounts/cash-accounts/business/${businessId}`)
        .then((r) => r.data),
    enabled: !!isOpen,
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      initialData
        ? api.put(`/expenses/${initialData.id}`, data)
        : api.post("/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["expenses"]);
      queryClient.invalidateQueries(["bank-accounts"]);
      queryClient.invalidateQueries(["cash-accounts"]);
      toast.success(initialData ? "Record Updated" : "Expense Captured");
      onClose();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.accountId) return toast.error("Account source required");

    mutation.mutate({
      businessId,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: new Date().toISOString(),
      paymentMethod: activeTab.toUpperCase(),
      bankAccountId: activeTab === "bank" ? formData.accountId : undefined,
      cashAccountId: activeTab === "cash" ? formData.accountId : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Refining Voucher" : "Capture Expenditure"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="surface p-5 space-y-4 !bg-slate-50/50">
          <Input
            label="Expense Category *"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            placeholder="e.g. Rent, Electricity, Salaries"
            required
          />
          <div className="relative">
            <Input
              label="Total Amount (₹) *"
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
              className="!pl-10 !text-xl !font-black"
            />
            <Banknote className="absolute left-3 top-10 w-5 h-5 text-slate-300" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
            Payment Channel
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("cash");
                setFormData({ ...formData, accountId: "" });
              }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest",
                activeTab === "cash"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400",
              )}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("bank");
                setFormData({ ...formData, accountId: "" });
              }}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest",
                activeTab === "bank"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400",
              )}
            >
              Bank Transfer
            </button>
          </div>

          <select
            className="input-base !bg-white !text-sm !font-bold mt-2"
            value={formData.accountId}
            onChange={(e) =>
              setFormData({ ...formData, accountId: e.target.value })
            }
            required
          >
            <option value="">Select Ledger Source...</option>
            {activeTab === "cash"
              ? cashData?.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Bal: ₹{c.currentBalance})
                  </option>
                ))
              : bankData?.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} (Bal: ₹{b.currentBalance})
                  </option>
                ))}
          </select>
        </div>

        <div className="surface p-4 !bg-slate-50 border-none">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
            Internal Memo
          </label>
          <textarea
            rows={3}
            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0 outline-none"
            placeholder="What was this for?"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-slate-900 border-none text-white rounded-xl text-xs font-black shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Commit Record
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default Expenses;
