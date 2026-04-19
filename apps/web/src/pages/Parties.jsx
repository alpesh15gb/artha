import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Save,
  Eye,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Filter,
  User,
  Building2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  cn,
} from "../components/ui";
import toast from "react-hot-toast";

function Parties() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterType, setFilterType] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["parties", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/parties/business/${currentBusiness.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/parties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["parties"]);
      toast.success("Party archived");
    },
  });

  const parties = useMemo(() => {
    let list = data?.data || [];
    if (filterType !== "ALL") {
      list = list.filter(
        (p) =>
          p.partyType === filterType ||
          (filterType === "CUSTOMER" && p.partyType === "BOTH") ||
          (filterType === "SUPPLIER" && p.partyType === "BOTH"),
      );
    }
    return list;
  }, [data, filterType]);

  const metrics = useMemo(() => {
    const list = data?.data || [];
    return {
      total: list.length,
      customers: list.filter(
        (p) => p.partyType === "CUSTOMER" || p.partyType === "BOTH",
      ).length,
      suppliers: list.filter(
        (p) => p.partyType === "SUPPLIER" || p.partyType === "BOTH",
      ).length,
    };
  }, [data]);

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Parties</h1>
          <p className="page-subtitle">
            Relationship management for your ecosystem
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add New Party
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Contacts",
            value: metrics.total,
            icon: Users,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Customers",
            value: metrics.customers,
            icon: ArrowUpRight,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Suppliers",
            value: metrics.suppliers,
            icon: ArrowDownLeft,
            color: "text-amber-600 bg-amber-50",
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
                {m.value}
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
            placeholder="Search by name, phone, or GST..."
            aria-label="Search parties"
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
          {[
            { id: "ALL", label: "All" },
            { id: "CUSTOMER", label: "Customers" },
            { id: "SUPPLIER", label: "Suppliers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filterType === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
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
              <th className="!pl-8">Entity Name</th>
              <th>Contacts</th>
              <th>GST Identification</th>
              <th className="text-right">Balance Status</th>
              <th className="text-right !pr-8">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={5} className="p-8">
                    <div className="skeleton h-12 w-full rounded-xl" />
                  </td>
                </tr>
              ))
            ) : parties.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 italic">
                      No partners found matching your criteria
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              parties.map((party, idx) => {
                const balance =
                  party.currentBalance ?? party.openingBalance ?? 0;
                const isPositive = balance >= 0;
                return (
                  <motion.tr
                    key={party.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group"
                  >
                    <td className="!pl-8 py-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-xs shadow-sm group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                          {party.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">
                            {party.name}
                          </p>
                          <div className="flex gap-1.5 mt-1.5">
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                                party.partyType === "CUSTOMER"
                                  ? "bg-blue-50 text-blue-600"
                                  : party.partyType === "SUPPLIER"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-purple-50 text-purple-600",
                              )}
                            >
                              {party.partyType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        {party.phone && (
                          <p className="text-[11px] font-bold text-slate-600 italic flex items-center gap-1.5">
                            <Phone className="w-2.5 h-2.5 text-slate-300" />{" "}
                            {party.phone}
                          </p>
                        )}
                        {party.email && (
                          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-2.5 h-2.5 text-slate-300" />{" "}
                            {party.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <p className="text-[11px] font-black text-slate-900 tracking-[0.1em] uppercase">
                        {party.gstin || "NOT REGISTERED"}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                        Business Tax ID
                      </p>
                    </td>
                    <td className="text-right">
                      <p
                        className={cn(
                          "text-sm font-black",
                          isPositive ? "text-emerald-600" : "text-rose-500",
                        )}
                      >
                        {isPositive ? "+" : "-"} ₹
                        {Math.abs(balance).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5 tracking-widest">
                        {party.currentBalanceType || party.balanceType || "DR"}
                      </p>
                    </td>
                    <td className="!pr-8 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingItem(party);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(party.id)}
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

      <PartyModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        item={editingItem}
        businessId={currentBusiness?.id}
      />
    </div>
  );
}

function PartyModal({ isOpen, onClose, item, businessId }) {
  const queryClient = useQueryClient();
  const formRef = useRef(null);
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const isEditing = !!item;

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? api.put(`/parties/${item.id}`, data)
        : api.post("/parties", { ...data, businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["parties"]);
      toast.success(isEditing ? "Updated" : "Registered");
      onClose();
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Action failed"),
  });

  const handleGstLookup = async () => {
    const input = formRef.current?.elements["gstin"];
    const gstin = input?.value;
    if (!gstin || gstin.length < 15) return toast.error("Enter valid GSTIN");

    setIsFetchingGst(true);
    try {
      const response = await api.get(`/utils/gst-lookup/${gstin}`);
      const data = response.data?.data;
      if (data && formRef.current) {
        toast.success("Entity Found");
        formRef.current.elements["name"].value =
          data.tradeName || data.legalName;
        formRef.current.elements["address"].value =
          `${data.address.buildingName || ""} ${data.address.street || ""}`.trim();
        formRef.current.elements["city"].value = data.address.city;
        formRef.current.elements["state"].value = data.address.state;
        formRef.current.elements["pincode"].value = data.address.pincode;
      }
    } catch (e) {
      toast.error("Check GSTIN format");
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (data.openingBalance)
      data.openingBalance = parseFloat(data.openingBalance);
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Regulating Entity" : "New Partner Onboarding"}
      size="lg"
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="surface p-5 space-y-4 !bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
              Base Identity
            </h4>
          </div>
          <Input
            label="Full Business Name *"
            name="name"
            defaultValue={item?.name}
            placeholder="Legal name of business"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Primary Phone"
              name="phone"
              defaultValue={item?.phone}
              placeholder="+91 ..."
            />
            <Input
              label="Email Identity"
              name="email"
              defaultValue={item?.email}
              placeholder="office@company.in"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="Tax ID (GSTIN)"
                  name="gstin"
                  defaultValue={item?.gstin}
                  placeholder="15 Digit Alpha-num"
                />
              </div>
              <button
                type="button"
                onClick={handleGstLookup}
                disabled={isFetchingGst}
                className="h-[42px] px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isFetchingGst ? "Validating..." : "Verify"}
              </button>
            </div>
          </div>
          <div>
            <Select
              label="Partner Role"
              name="partyType"
              defaultValue={item?.partyType || "CUSTOMER"}
              options={[
                { value: "CUSTOMER", label: "Customer" },
                { value: "SUPPLIER", label: "Supplier" },
                { value: "BOTH", label: "Hybrid" },
              ]}
            />
          </div>
        </div>

        <div className="surface p-5 space-y-4 !bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-4 bg-purple-600 rounded-full" />
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
              Logistic Anchor
            </h4>
          </div>
          <Input
            label="Address Line"
            name="address"
            defaultValue={item?.address}
            placeholder="Street, Building, Landmark"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input label="City" name="city" defaultValue={item?.city} />
            <Input label="State Code" name="state" defaultValue={item?.state} />
            <Input
              label="Zip/Pin"
              name="pincode"
              defaultValue={item?.pincode}
            />
          </div>
        </div>

        <div className="surface p-5 space-y-4 !bg-indigo-900 !text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-4 bg-white/20 rounded-full" />
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">
              Financial Ledger
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={
                <span className="text-white opacity-60">
                  Opening Balance (₹)
                </span>
              }
              name="openingBalance"
              type="number"
              defaultValue={item?.openingBalance || 0}
              className="!bg-white/10 !border-white/10 !text-white"
            />
            <Select
              label={
                <span className="text-white opacity-60">Balance Sentiment</span>
              }
              name="balanceType"
              defaultValue={item?.balanceType || "RECEIVABLE"}
              options={[
                { value: "RECEIVABLE", label: "To Collect" },
                { value: "PAYABLE", label: "To Pay" },
              ]}
              className="!bg-white/10 !border-white/10 !text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest"
          >
            Discard
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xl shadow-indigo-600/20 uppercase tracking-widest transition-all"
          >
            Commit Entity
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default Parties;
