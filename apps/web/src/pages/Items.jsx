import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ChevronDown,
  Box,
  AlertTriangle,
  List,
  Layers,
  ShoppingBag,
  Info,
  X,
  Tag,
  Zap,
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

function Items() {
  const { currentBusiness } = useBusinessStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockFilter, setStockFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["items", currentBusiness?.id, search],
    queryFn: () =>
      api
        .get(`/items/business/${currentBusiness.id}?search=${search}`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(["items"]);
      toast.success("Item archived");
    },
  });

  const items = data?.data || [];

  const filteredItems = useMemo(() => {
    let list = items;
    if (stockFilter === "LOW")
      list = list.filter(
        (i) =>
          !i.isService &&
          i.currentStock <= (i.reorderLevel || 0) &&
          i.currentStock > 0,
      );
    if (stockFilter === "OUT")
      list = list.filter((i) => !i.isService && i.currentStock <= 0);
    if (stockFilter === "SERVICES") list = list.filter((i) => i.isService);
    return list;
  }, [items, stockFilter]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      low: items.filter(
        (i) =>
          !i.isService &&
          i.currentStock <= (i.reorderLevel || 0) &&
          i.currentStock > 0,
      ).length,
      out: items.filter((i) => !i.isService && i.currentStock <= 0).length,
    };
  }, [items]);

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Master catalog and stock management</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add New Item
        </button>
      </div>

      {/* ── Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Catalog",
            value: stats.total,
            icon: Layers,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Low Stock Alert",
            value: stats.low,
            icon: AlertTriangle,
            color: "text-amber-600 bg-amber-50",
          },
          {
            label: "Shortage / Out",
            value: stats.out,
            icon: Box,
            color: "text-rose-600 bg-rose-50",
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
            placeholder="Search by name, SKU, or HSN..."
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
            { id: "LOW", label: "Low Stock" },
            { id: "OUT", label: "Out" },
            { id: "SERVICES", label: "Services" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStockFilter(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
                stockFilter === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="surface overflow-hidden"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="!pl-8">Product / Service</th>
              <th>Catalog Identity</th>
              <th className="text-right">Price Matrix</th>
              <th className="text-center">Live Inventory</th>
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
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <ShoppingBag className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 italic">
                      No inventory items found
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const isOut = item.currentStock <= 0 && !item.isService;
                const isLow =
                  item.currentStock <= (item.reorderLevel || 0) &&
                  !item.isService;

                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group"
                  >
                    <td className="!pl-8 py-5">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-all duration-300",
                            item.isService
                              ? "bg-purple-100 text-purple-600"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {item.isService
                            ? "SV"
                            : item.name[0]?.toUpperCase() || "P"}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">
                            {item.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                            {item.category || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Tag className="w-2.5 h-2.5 text-slate-300" />{" "}
                          {item.sku || "No SKU"}
                        </p>
                        <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                          <Zap className="w-2.5 h-2.5 text-slate-300" /> HSN:{" "}
                          {item.hsnCode || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        ₹{item.sellingPrice?.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        PUR: ₹{item.purchasePrice?.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td>
                      <div className="flex flex-col items-center">
                        {item.isService ? (
                          <span className="pill-purple font-black text-[9px] px-2 py-0.5">
                            SERVICE
                          </span>
                        ) : (
                          <>
                            <p
                              className={cn(
                                "text-sm font-black",
                                isOut
                                  ? "text-rose-600"
                                  : isLow
                                    ? "text-amber-600"
                                    : "text-emerald-600",
                              )}
                            >
                              {item.currentStock}{" "}
                              <span className="text-[10px] font-bold opacity-60 ml-0.5">
                                {item.unit || "PCS"}
                              </span>
                            </p>
                            <div className="w-16 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${Math.min(100, (item.currentStock / ((item.reorderLevel || 1) * 2)) * 100)}%`,
                                }}
                                className={cn(
                                  "h-full rounded-full",
                                  isOut
                                    ? "bg-rose-500"
                                    : isLow
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="!pr-8 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
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

      <ItemModal
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

function ItemModal({ isOpen, onClose, item, businessId }) {
  const queryClient = useQueryClient();
  const isEditing = !!item;

  const mutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? api.put(`/items/${item.id}`, data)
        : api.post("/items", { ...data, businessId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["items"]);
      toast.success(isEditing ? "Synched" : "Onboarded");
      onClose();
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Transaction error"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      name: fd.get("name"),
      sku: fd.get("sku"),
      hsnCode: fd.get("hsnCode"),
      category: fd.get("category"),
      unit: fd.get("unit"),
      taxRate: parseFloat(fd.get("taxRate")) || 0,
      sellingPrice: parseFloat(fd.get("sellingPrice")) || 0,
      purchasePrice: parseFloat(fd.get("purchasePrice")) || 0,
      mrp: parseFloat(fd.get("mrp")) || null,
      openingStock: parseFloat(fd.get("openingStock")) || 0,
      currentStock: parseFloat(fd.get("currentStock")) || 0,
      reorderLevel: parseFloat(fd.get("reorderLevel")) || 0,
      isService: fd.get("isService") === "true",
    };
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Modifying Asset" : "New Catalog Entry"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-xl self-start w-fit">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="isService"
              value="false"
              defaultChecked={!item?.isService}
              className="hidden peer"
            />
            <div className="px-5 py-1.5 text-[10px] font-black rounded-lg transition-all peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm text-slate-400 uppercase tracking-widest">
              Product
            </div>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              name="isService"
              value="true"
              defaultChecked={item?.isService}
              className="hidden peer"
            />
            <div className="px-5 py-1.5 text-[10px] font-black rounded-lg transition-all peer-checked:bg-white peer-checked:text-indigo-600 peer-checked:shadow-sm text-slate-400 uppercase tracking-widest">
              Service
            </div>
          </label>
        </div>

        <div className="surface p-5 space-y-4 !bg-slate-50/50">
          <Input
            label="Asset Nomenclature *"
            name="name"
            defaultValue={item?.name}
            placeholder="Item or Service primary name"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registry Code (SKU)"
              name="sku"
              defaultValue={item?.sku}
              placeholder="SKU-XXX"
            />
            <Input
              label="Statutory Code (HSN)"
              name="hsnCode"
              defaultValue={item?.hsnCode}
              placeholder="HSN-XXXX"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Input
            label="Category Group"
            name="category"
            defaultValue={item?.category}
            placeholder="General"
          />
          <Input
            label="Measurement Unit"
            name="unit"
            defaultValue={item?.unit || "NOS"}
            placeholder="e.g. PCS, KGS"
          />
        </div>

        <div className="surface p-5 space-y-5 !bg-indigo-50/30">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <CreditCard className="w-3 h-3" /> Financial Anchors
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Price (MRP)"
              name="mrp"
              type="number"
              defaultValue={item?.mrp}
            />
            <Input
              label="Sale Price"
              name="sellingPrice"
              type="number"
              defaultValue={item?.sellingPrice}
            />
            <Input
              label="Purchase"
              name="purchasePrice"
              type="number"
              defaultValue={item?.purchasePrice}
            />
            <Input
              label="GST %"
              name="taxRate"
              type="number"
              defaultValue={item?.taxRate || 18}
            />
          </div>

          {!item?.isService && (
            <div className="grid grid-cols-3 gap-4 border-t border-indigo-100 pt-5 mt-5">
              <Input
                label="Opening Qty"
                name="openingStock"
                type="number"
                defaultValue={item?.openingStock || 0}
              />
              <Input
                label="Live Inventory"
                name="currentStock"
                type="number"
                defaultValue={item?.currentStock || 0}
              />
              <Input
                label="Restock Level"
                name="reorderLevel"
                type="number"
                defaultValue={item?.reorderLevel || 0}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold text-slate-400 tracking-widest uppercase"
          >
            Dismiss
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-xl shadow-indigo-600/20 tracking-widest uppercase transition-all"
          >
            Commit Entry
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default Items;
