import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ArrowRightLeft,
  CreditCard,
  Banknote,
  History,
  TrendingUp,
  TrendingDown,
  Search,
  ExternalLink,
  MoreHorizontal,
  Wallet,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit3,
} from "lucide-react";
import { format } from "date-fns";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { Card, Badge, Button, Input, Modal, cn } from "../components/ui";
import toast from "react-hot-toast";

function Accounts() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [txSearch, setTxSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccountType, setAddAccountType] = useState("bank");
  const [accountForm, setAccountForm] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
    accountType: "SAVINGS",
    openingBalance: 0,
  });
  const [editingAccount, setEditingAccount] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromId: "",
    fromType: "BANK",
    toId: "",
    toType: "CASH",
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    reference: "",
  });

  const { data: bankAccountsData, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["bank-accounts", currentBusiness?.id],
    queryFn: () =>
      api
        .get(`/accounts/bank-accounts/business/${currentBusiness.id}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: cashAccountsData } = useQuery({
    queryKey: ["cash-accounts", currentBusiness?.id],
    queryFn: () =>
      api
        .get(`/accounts/cash-accounts/business/${currentBusiness.id}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: txData } = useQuery({
    queryKey: ["transactions", currentBusiness?.id, txSearch],
    queryFn: () =>
      api
        .get(
          `/accounts/transactions/business/${currentBusiness.id}?search=${txSearch}&limit=50`,
        )
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const accountMutation = useMutation({
    mutationFn: (data) => {
      const isBank = addAccountType === "bank";
      const endpoint = isBank ? "/accounts/bank-accounts" : "/accounts/cash-accounts";
      
      // Construct payload carefully
      let payload = {
        businessId: currentBusiness.id,
      };

      if (isBank) {
        payload = {
          ...payload,
          bankName: data.bankName,
          accountName: data.accountName || data.bankName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode || "UNKNOWN",
          branchName: data.branchName,
          accountType: data.accountType,
          openingBalance: data.openingBalance || 0,
        };
        if (!editingAccount) {
          payload.currentBalance = data.openingBalance || 0;
        }
      } else {
        payload = {
          ...payload,
          name: data.bankName,
          openingBalance: data.openingBalance || 0,
        };
        if (!editingAccount) {
          payload.currentBalance = data.openingBalance || 0;
        }
      }

      if (editingAccount) {
        return api.patch(`${endpoint}/${editingAccount.id}`, payload);
      }
      return api.post(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cash-accounts"] });
      queryClient.refetchQueries({ queryKey: ["bank-accounts"] });
      queryClient.refetchQueries({ queryKey: ["cash-accounts"] });
      toast.success(editingAccount ? "Account Details Updated" : "Resource Registered");
      setShowAddModal(false);
      setEditingAccount(null);
      setAccountForm({ 
        bankName: "", accountName: "", accountNumber: "", 
        ifscCode: "", branchName: "", accountType: "SAVINGS", 
        openingBalance: 0 
      });
    },
    onError: () => toast.error(editingAccount ? "Update Failed" : "Registration Failed"),
  });

  const transferMutation = useMutation({
    mutationFn: (data) => api.post("/accounts/transfer", { ...data, businessId: currentBusiness.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cash-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Liquid Assets Transferred");
      setShowTransferModal(false);
      setTransferForm({
        fromId: "",
        fromType: "BANK",
        toId: "",
        toType: "CASH",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        reference: "",
      });
    },
    onError: () => toast.error("Transfer Operation Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (acc) => {
      const endpoint = acc.bankName ? "/accounts/bank-accounts" : "/accounts/cash-accounts";
      return api.delete(`${endpoint}/${acc.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cash-accounts"] });
      toast.success("Account Link Removed");
    },
  });

  const bankAccounts = bankAccountsData?.data || [];
  const cashAccounts = cashAccountsData?.data || [];
  const accounts = [...bankAccounts, ...cashAccounts];
  const transactions = txData?.data || [];

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0),
    [accounts],
  );

  return (
    <div className="space-y-8 pb-20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Banking & Treasury</h1>
          <p className="page-subtitle">
            Manage liquidity, bank reconciliations, and cash assets
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowTransferModal(true)}
            className="btn-secondary !rounded-2xl !py-2 !px-4"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Fund Transfer
          </button>
          <button
            onClick={() => {
              setEditingAccount(null);
              setAccountForm({ 
                bankName: "", accountName: "", accountNumber: "", 
                ifscCode: "", branchName: "", accountType: "SAVINGS", 
                openingBalance: 0 
              });
              setAddAccountType("bank");
              setShowAddModal(true);
            }}
            className="btn-primary !rounded-2xl !py-2 !px-6"
          >
            <Plus className="w-4 h-4 mr-2" /> Link Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main Wallet ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-1 surface p-8 bg-slate-900 text-white relative overflow-hidden border-none shadow-2xl shadow-slate-900/40"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10 space-y-12">
            <div className="flex justify-between items-center">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                <Wallet className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                  Unified Vault
                </span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">
                Total Liquid Capital
              </p>
              <h2 className="text-6xl font-black tracking-tighter">
                ₹{totalBalance.toLocaleString("en-IN")}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">
                  Active Links
                </p>
                <p className="text-xl font-black">{accounts.length}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">
                  Compliance
                </p>
                <p className="text-xl font-black">100%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Individual Channels ── */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
          <AnimatePresence>
            {accounts.map((acc, i) => (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="surface p-7 flex flex-col justify-between hover:shadow-2xl hover:shadow-indigo-100 transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      acc.bankName
                        ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                        : "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
                    )}
                  >
                    {acc.bankName ? (
                      <Landmark className="w-6 h-6" />
                    ) : (
                      <Banknote className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex gap-1 transition-all">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingAccount(acc);
                        setAddAccountType(acc.bankName ? "bank" : "cash");
                        setAccountForm({
                          bankName: acc.bankName || acc.name,
                          accountName: acc.accountName || acc.bankName || acc.name,
                          accountNumber: acc.accountNumber || "",
                          ifscCode: acc.ifscCode || "",
                          branchName: acc.branchName || "",
                          accountType: acc.accountType || "SAVINGS",
                          openingBalance: acc.openingBalance || 0
                        });
                        setShowAddModal(true);
                      }}
                      className="p-3 bg-amber-400 rounded-xl text-slate-900 shadow-xl z-50 transform active:scale-95"
                    >
                      <Edit3 className="w-5 h-5 font-black" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(acc)}
                      className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-8">
                  <h3 className="text-base font-black text-slate-900 leading-none">
                    {acc.bankName || acc.name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                    {acc.accountNumber
                      ? `REF • **** ${String(acc.accountNumber).slice(-4)}`
                      : "OPERATIONAL LIQUIDITY"}
                  </p>
                </div>
                <div className="mt-8 pt-5 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Live Balance
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    ₹{acc.currentBalance?.toLocaleString("en-IN")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {accounts.length === 0 && (
            <div className="md:col-span-2 h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <Plus className="w-10 h-10 text-slate-200 mb-4" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                No banking resources linked yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Ledger ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <History className="w-6 h-6 text-indigo-500" />
            Treasury Statement
          </h2>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-80">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              name="search"
              placeholder="Search postings..."
              aria-label="Search postings"
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-900 w-full"
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="surface overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th className="!pl-8">Post Timestamp</th>
                <th>Allocation Segment</th>
                <th>Partner / Entity</th>
                <th className="text-right">Transaction Value</th>
                <th className="text-right !pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="group hover:bg-slate-50/50">
                  <td className="!pl-8 py-6">
                    <p className="text-sm font-black text-slate-900 tracking-tighter">
                      {format(new Date(tx.date), "dd MMM, yyyy")}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest opacity-60 font-mono">
                      {format(new Date(tx.date), "HH:mm:ss")}
                    </p>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          tx.type === "RECEIPT"
                            ? "bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100"
                            : "bg-rose-50 text-rose-600 shadow-sm shadow-rose-100",
                        )}
                      >
                        {tx.type === "RECEIPT" ? (
                          <ArrowDownLeft className="w-4.5 h-4.5" />
                        ) : (
                          <ArrowUpRight className="w-4.5 h-4.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">
                          {tx.type}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase leading-none opacity-60">
                          System Synchronized
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-sm font-black text-slate-700">
                      {tx.party?.name ||
                        tx.reference ||
                        "General Treasury Flow"}
                    </p>
                  </td>
                  <td className="text-right">
                    <p
                      className={cn(
                        "text-lg font-black tracking-tight",
                        tx.type === "RECEIPT"
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {tx.type === "RECEIPT" ? "+" : "-"} ₹
                      {tx.amount?.toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td className="text-right !pr-8 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-2.5 hover:bg-white rounded-xl text-slate-300 hover:text-indigo-600 shadow-sm transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? "Update Asset Identity" : "Link New Asset Account"}
      >
        <div className="space-y-6 pt-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              disabled={!!editingAccount}
              onClick={() => {
                setAddAccountType("bank");
                setAccountForm({ ...accountForm, bankName: "" });
              }}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                addAccountType === "bank"
                  ? "bg-white text-indigo-600 shadow-xl"
                  : "text-slate-400",
              )}
            >
              Bank Transfer
            </button>
            <button
              disabled={!!editingAccount}
              onClick={() => {
                setAddAccountType("cash");
                setAccountForm({ ...accountForm, bankName: "" });
              }}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                addAccountType === "cash"
                  ? "bg-white text-indigo-600 shadow-xl"
                  : "text-slate-400",
              )}
            >
              Cash Reserve
            </button>
          </div>

          <div className="space-y-4">
            <Input
              label={
                addAccountType === "bank" ? "Institution Name" : "Reserve Label"
              }
              placeholder={
                addAccountType === "bank"
                  ? "e.g. HDFC Bank Main Account"
                  : "e.g. Petty Cash Vault"
              }
              value={accountForm.bankName}
              onChange={(e) =>
                setAccountForm({ ...accountForm, bankName: e.target.value })
              }
            />
            {addAccountType === "bank" && (
              <>
                <Input
                  label="Display Name of Account"
                  placeholder="e.g. Current Account - Main"
                  value={accountForm.accountName}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, accountName: e.target.value })
                  }
                />
                <Input
                  label="Account Number"
                  placeholder="e.g. 501004562..."
                  value={accountForm.accountNumber}
                  onChange={(e) =>
                    setAccountForm({ ...accountForm, accountNumber: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="IFSC Code"
                    placeholder="HDFC000..."
                    value={accountForm.ifscCode}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, ifscCode: e.target.value.toUpperCase() })
                    }
                  />
                  <Input
                    label="Branch Name"
                    placeholder="e.g. New Delhi"
                    value={accountForm.branchName}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, branchName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Account Type</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    value={accountForm.accountType}
                    onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
                  >
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                    <option value="OVERDRAFT">Overdraft</option>
                    <option value="CREDIT">Credit Card</option>
                  </select>
                </div>
              </>
            )}
            <Input
              label="Opening Liquidity (₹)"
              type="number"
              placeholder="0.00"
              value={accountForm.openingBalance}
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  openingBalance: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <button
            onClick={() => accountMutation.mutate(accountForm)}
            disabled={!accountForm.bankName || accountMutation.isPending}
            className="btn-primary w-full !py-3 !rounded-2xl flex items-center justify-center gap-2"
          >
            {accountMutation.isPending ? "Syncing..." : editingAccount ? "Save Changes" : "Link Asset"}{" "}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </Modal>

      {/* ── Transfer Modal ── */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Inter-Account Fund Transfer"
      >
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Source Account</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                value={`${transferForm.fromId}|${transferForm.fromType}`}
                onChange={(e) => {
                  const [id, type] = e.target.value.split("|");
                  setTransferForm({ ...transferForm, fromId: id, fromType: type });
                }}
              >
                <option value="">Select Source</option>
                <optgroup label="Bank Accounts">
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={`${acc.id}|BANK`}>
                      {acc.bankName} (₹{acc.currentBalance})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cash Accounts">
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={`${acc.id}|CASH`}>
                      {acc.name} (₹{acc.currentBalance})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400">Destination</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
                value={`${transferForm.toId}|${transferForm.toType}`}
                onChange={(e) => {
                  const [id, type] = e.target.value.split("|");
                  setTransferForm({ ...transferForm, toId: id, toType: type });
                }}
              >
                <option value="">Select Destination</option>
                <optgroup label="Bank Accounts">
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={`${acc.id}|BANK`}>
                      {acc.bankName} (₹{acc.currentBalance})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cash Accounts">
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={`${acc.id}|CASH`}>
                      {acc.name} (₹{acc.currentBalance})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <Input
            label="Transfer Amount (₹)"
            type="number"
            placeholder="0.00"
            value={transferForm.amount}
            onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Transfer Date"
              type="date"
              value={transferForm.date}
              onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
            />
            <Input
              label="Reference"
              placeholder="e.g. ATM Withdrawal"
              value={transferForm.reference}
              onChange={(e) => setTransferForm({ ...transferForm, reference: e.target.value })}
            />
          </div>

          <button
            onClick={() => transferMutation.mutate(transferForm)}
            disabled={!transferForm.fromId || !transferForm.toId || transferForm.amount <= 0 || transferMutation.isPending}
            className="btn-primary w-full !py-3 !rounded-2xl flex items-center justify-center gap-2"
          >
            {transferMutation.isPending ? "Executing..." : "Authorize Transfer"} <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default Accounts;
