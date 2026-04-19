import { useEffect, useMemo, useState } from "react";
import {
  PieChart as RePie,
  Pie,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  PieChart,
  Receipt,
  Shield,
  TrendingDown,
  TrendingUp,
  Printer,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  User,
  Package,
  CreditCard,
  Wallet,
  Zap,
  Info,
  ExternalLink,
  Search,
  X,
  Activity,
  Scale,
} from "lucide-react";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { Card, Button, cn, Modal, Badge } from "../components/ui";
import { exportToPDF } from "../utils/export";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  exportGSTR1Excel,
  exportHSNSummaryExcel,
  exportBillWiseProfitExcel,
  exportAllTransactionsExcel,
} from "../utils/exactReportExports";

const DATE_RANGES = [
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
  { id: "this-quarter", label: "This Quarter" },
  { id: "this-year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const REPORT_SECTIONS = [
  {
    id: "financial",
    label: "Accounting Core",
    icon: Activity,
    tabs: [
      { id: "overview", label: "Executive Dashboard" },
      { id: "bill-wise-profit", label: "Bill Profitability" },
      { id: "trial-balance", label: "Trial Balance" },
      { id: "balance-sheet", label: "Balance Sheet" },
      { id: "day-book", label: "Day Book" },
    ],
  },
  {
    id: "party",
    label: "Partner Analysis",
    icon: User,
    tabs: [
      { id: "party-ledger", label: "Party Statement" },
      { id: "balances", label: "Balances Summary" },
    ],
  },
  {
    id: "gst",
    label: "GST Compliance",
    icon: Shield,
    tabs: [
      { id: "gst-summary", label: "GST Overview" },
      { id: "gstr-1", label: "GSTR-1" },
      { id: "gstr-3b", label: "GSTR-3B" },
      { id: "sale-summary-hsn", label: "HSN Summary" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Assets",
    icon: Package,
    tabs: [
      { id: "stock-summary", label: "Stock Valuation" },
      { id: "item-wise-profit", label: "Item Integrity" },
    ],
  },
];

function Reports() {
  const { currentBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("this-year");
  const [customDates, setCustomDates] = useState({ fromDate: "", toDate: "" });
  const [gstSubTab, setGstSubTab] = useState("Summary");
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // ── Date Param Helper ──────────────────────
  const getDateParams = () => {
    const params = new URLSearchParams();
    const now = new Date();
    if (dateRange === "custom") {
      if (customDates.fromDate) params.append("fromDate", customDates.fromDate);
      if (customDates.toDate) params.append("toDate", customDates.toDate);
    } else {
      let from, to;
      if (dateRange === "this-month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (dateRange === "last-month") {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
      } else if (dateRange === "this-year") {
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
      }
      if (from) params.append("fromDate", from.toISOString().split("T")[0]);
      if (to) params.append("toDate", to.toISOString().split("T")[0]);
    }
    return params.toString();
  };

  // ── Queries ────────────────────────────────
  const { data: billsData } = useQuery({
    queryKey: ["report-bills", currentBusiness?.id, dateRange],
    queryFn: () =>
      api
        .get(
          `/reports/business/${currentBusiness.id}/bill-wise-profit?${getDateParams()}`,
        )
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: plData } = useQuery({
    queryKey: ["report-pl", currentBusiness?.id, dateRange],
    queryFn: () =>
      api
        .get(
          `/reports/business/${currentBusiness.id}/profit-loss?${getDateParams()}`,
        )
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: stockData } = useQuery({
    queryKey: ["report-stock", currentBusiness?.id],
    queryFn: () =>
      api
        .get(`/reports/business/${currentBusiness.id}/stock-summary`)
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: gstData } = useQuery({
    queryKey: ["report-gst", currentBusiness?.id, dateRange],
    queryFn: () =>
      api
        .get(
          `/reports/business/${currentBusiness.id}/gst-summary?${getDateParams()}`,
        )
        .then((r) => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: partiesData } = useQuery({
    queryKey: ["report-parties", currentBusiness?.id],
    queryFn: () =>
      api.get(`/parties/business/${currentBusiness.id}`).then((r) => r.data),
    enabled: !!currentBusiness?.id && activeTab === "party-ledger",
  });

  const { data: ledgerData } = useQuery({
    queryKey: [
      "report-ledger",
      currentBusiness?.id,
      selectedPartyId,
      dateRange,
    ],
    queryFn: () =>
      api
        .get(
          `/reports/business/${currentBusiness.id}/party-ledger?partyId=${selectedPartyId}&${getDateParams()}`,
        )
        .then((r) => r.data),
    enabled: !!selectedPartyId && activeTab === "party-ledger",
  });

  const metrics = useMemo(() => {
    const pl = plData?.data || {};
    return {
      revenue: pl.income?.netSales || 0,
      profit: pl.profit?.netProfit || 0,
      margin: pl.profit?.profitMargin || 0,
      stockValue: stockData?.data?.totalValuation || 0,
    };
  }, [plData, stockData]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 -m-8">
      {/* ── Sub Header ── */}
      <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            Business Intelligence
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Unified reporting interface
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Date Filter */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn-secondary !py-2 !px-4 !rounded-xl !text-[10px]">
            <Download className="w-3.5 h-3.5 mr-1" /> EXPORT PDF
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar Nav ── */}
        <aside className="w-72 border-r border-slate-200 bg-white p-6 space-y-8 overflow-y-auto no-scrollbar">
          {REPORT_SECTIONS.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <section.icon className="w-3.5 h-3.5 text-slate-400" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {section.label}
                </h4>
              </div>
              <div className="space-y-1">
                {section.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group",
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    {tab.label}
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 opacity-0 group-hover:opacity-100 transition-all",
                        activeTab === tab.id ? "opacity-100 translate-x-1" : "",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Content Area ── */}
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-6xl mx-auto space-y-8 pb-20"
            >
              {/* ── Tab: Overview ─────────────────────── */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <HighlightCard
                      label="Net Revenue"
                      value={metrics.revenue}
                      icon={TrendingUp}
                      color="indigo"
                      trend="+12%"
                    />
                    <HighlightCard
                      label="Operational Profit"
                      value={metrics.profit}
                      icon={Activity}
                      color="emerald"
                      trend="+5.2%"
                    />
                    <HighlightCard
                      label="Profit Margin"
                      value={metrics.margin}
                      icon={PieChart}
                      color="blue"
                      suffix="%"
                    />
                    <HighlightCard
                      label="Inventory Asset"
                      value={metrics.stockValue}
                      icon={Package}
                      color="amber"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                          Revenue Trajectory
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black"
                        >
                          LAST 6 MONTHS
                        </Badge>
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={[
                              { n: "Jan", v: 4000 },
                              { n: "Feb", v: 3000 },
                              { n: "Mar", v: 5000 },
                              { n: "Apr", v: 4500 },
                              { n: "May", v: 6000 },
                              { n: "Jun", v: 5500 },
                            ]}
                          >
                            <defs>
                              <linearGradient
                                id="colorV"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="5%"
                                  stopColor="#4f46e5"
                                  stopOpacity={0.1}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="#4f46e5"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="n"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fontSize: 10,
                                fontWeight: 700,
                                fill: "#94a3b8",
                              }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fontSize: 10,
                                fontWeight: 700,
                                fill: "#94a3b8",
                              }}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "16px",
                                border: "none",
                                boxShadow: "0 10px 15px -3px rgb(0 0 0/0.1)",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="v"
                              stroke="#4f46e5"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorV)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>

                    <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                          Expense Distribution
                        </h3>
                        <Badge
                          variant="purple"
                          className="text-[9px] font-black capitalize"
                        >
                          Operational View
                        </Badge>
                      </div>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePie>
                            <Pie
                              data={[
                                { n: "Purchase", v: 400 },
                                { n: "Salaries", v: 300 },
                                { n: "Rent", v: 200 },
                                { n: "Misc", v: 100 },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="v"
                            >
                              <Cell fill="#4f46e5" />
                              <Cell fill="#8b5cf6" />
                              <Cell fill="#ec4899" />
                              <Cell fill="#f43f5e" />
                            </Pie>
                            <Tooltip />
                          </RePie>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* ── Tab: Bill Profitability ────────────── */}
              {activeTab === "bill-wise-profit" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                      Bill Profitability Ledger
                    </h2>
                    <button
                      onClick={() =>
                        exportBillWiseProfitExcel(
                          currentBusiness,
                          {},
                          billsData?.data,
                        )
                      }
                      className="btn-secondary !text-[10px]"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> EXCEL
                    </button>
                  </div>
                  <Card className="!p-0 overflow-hidden surface">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="!pl-6">Invoice #</th>
                          <th>Partner Name</th>
                          <th>Date</th>
                          <th className="text-right">Sale Value</th>
                          <th className="text-right">Cost Value</th>
                          <th className="text-right">Profit / Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {billsData?.data?.invoices?.map((inv, idx) => {
                          const isProfit = inv.profit >= 0;
                          return (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50/50 group"
                            >
                              <td className="!pl-6 py-4">
                                <p className="text-xs font-black text-slate-900 tracking-tight">
                                  {inv.invoiceNumber}
                                </p>
                              </td>
                              <td>
                                <p className="text-xs font-bold text-slate-600">
                                  {inv.partyName}
                                </p>
                              </td>
                              <td>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">
                                  {format(new Date(inv.date), "dd MMM yyyy")}
                                </p>
                              </td>
                              <td className="text-right font-black text-slate-900">
                                ₹{inv.totalAmount.toLocaleString()}
                              </td>
                              <td className="text-right font-bold text-slate-400 italic">
                                ₹{inv.costPrice?.toLocaleString() || "0"}
                              </td>
                              <td className="text-right">
                                <span
                                  className={cn(
                                    "text-xs font-black px-2.5 py-1 rounded-lg",
                                    isProfit
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                      : "bg-rose-50 text-rose-600 border border-rose-100",
                                  )}
                                >
                                  {isProfit ? "+" : ""}₹
                                  {inv.profit.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                </div>
              )}

              {/* ── Tab: Party Ledger ─────────────────── */}
              {activeTab === "party-ledger" && (
                <div className="space-y-6">
                  <div className="surface p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                          Specify Transaction Partner
                        </label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-black focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                          value={selectedPartyId}
                          onChange={(e) => setSelectedPartyId(e.target.value)}
                        >
                          <option value="">Select party identity...</option>
                          {partiesData?.data?.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        Closing Balance
                      </p>
                      <p
                        className={cn(
                          "text-3xl font-black tracking-tighter",
                          (ledgerData?.data?.closingBalance || 0) >= 0
                            ? "text-emerald-600"
                            : "text-rose-500",
                        )}
                      >
                        ₹
                        {(
                          ledgerData?.data?.closingBalance || 0
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Card className="!p-0 overflow-hidden surface">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="!pl-6">Post Date</th>
                          <th>Voucher Reference</th>
                          <th>Type</th>
                          <th className="text-right">Debit (Out)</th>
                          <th className="text-right">Credit (In)</th>
                          <th className="text-right !pr-6">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium">
                        {ledgerData?.data?.ledger?.map((e, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="!pl-6 py-4 text-slate-400 font-bold">
                              {format(new Date(e.date), "dd/MM/yyyy")}
                            </td>
                            <td className="font-black text-slate-900 uppercase tracking-tight">
                              {e.reference || "-"}
                            </td>
                            <td>
                              <Badge
                                variant={
                                  e.type === "INVOICE"
                                    ? "info"
                                    : e.type === "PAYMENT"
                                      ? "success"
                                      : "default"
                                }
                                className="!text-[9px] font-black"
                              >
                                {e.type}
                              </Badge>
                            </td>
                            <td className="text-right text-rose-500 font-bold">
                              ₹{e.debit > 0 ? e.debit.toLocaleString() : "-"}
                            </td>
                            <td className="text-right text-emerald-600 font-bold">
                              ₹{e.credit > 0 ? e.credit.toLocaleString() : "-"}
                            </td>
                            <td className="text-right !pr-6 font-black text-slate-950">
                              ₹{e.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!selectedPartyId ||
                      !ledgerData?.data?.ledger?.length) && (
                      <div className="py-24 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Activity className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">
                          Load a party to reveal ledger dynamics
                        </p>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* ── Tab: GST Summary ─────────────────── */}
              {activeTab === "gst-summary" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                          Output Pipeline (Sales)
                        </h3>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="space-y-4">
                        <GstMetric
                          label="Total Taxable Sales"
                          value={gstData?.data?.sales?.totalTaxableSales}
                          color="slate"
                        />
                        <div className="h-px bg-slate-100 mx-2" />
                        <GstMetric
                          label="CGST Collected"
                          value={gstData?.data?.sales?.cgstCollected}
                          color="indigo"
                        />
                        <GstMetric
                          label="SGST Collected"
                          value={gstData?.data?.sales?.sgstCollected}
                          color="indigo"
                        />
                        <GstMetric
                          label="IGST Collected"
                          value={gstData?.data?.sales?.igstCollected}
                          color="indigo"
                        />
                      </div>
                    </Card>
                    <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                          Input Tax Credit (Purchases)
                        </h3>
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="space-y-4">
                        <GstMetric
                          label="Total Taxable Intake"
                          value={
                            gstData?.data?.purchases?.totalTaxablePurchases
                          }
                          color="slate"
                        />
                        <div className="h-px bg-slate-100 mx-2" />
                        <GstMetric
                          label="CGST Input"
                          value={gstData?.data?.purchases?.cgstPaid}
                          color="rose"
                        />
                        <GstMetric
                          label="SGST Input"
                          value={gstData?.data?.purchases?.sgstPaid}
                          color="rose"
                        />
                        <GstMetric
                          label="IGST Input"
                          value={gstData?.data?.purchases?.igstPaid}
                          color="rose"
                        />
                      </div>
                    </Card>
                  </div>

                  <Card className="!p-10 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden border-none text-center">
                    <Shield className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
                    <div className="relative z-10">
                      <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">
                        Statutory Net Offset Liability
                      </p>
                      <h2 className="text-6xl font-black tracking-tighter mb-4">
                        ₹{(gstData?.data?.netTax?.total || 0).toLocaleString()}
                      </h2>
                      <div className="flex items-center justify-center gap-6">
                        <div className="px-5 py-2 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                          <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1">
                            Net CGST
                          </p>
                          <p className="text-sm font-black text-white">
                            ₹
                            {(
                              gstData?.data?.netTax?.cgst || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="px-5 py-2 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md">
                          <p className="text-[9px] font-bold opacity-50 uppercase tracking-widest mb-1">
                            Net SGST
                          </p>
                          <p className="text-sm font-black text-white">
                            ₹
                            {(
                              gstData?.data?.netTax?.sgst || 0
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  suffix = "",
}) {
  const colors = {
    indigo: "text-indigo-600 bg-indigo-50 shadow-indigo-100/50",
    emerald: "text-emerald-600 bg-emerald-50 shadow-emerald-100/50",
    rose: "text-rose-600 bg-rose-50 shadow-rose-100/50",
    blue: "text-blue-600 bg-blue-50 shadow-blue-100/50",
    amber: "text-amber-600 bg-amber-50 shadow-amber-100/50",
    slate: "text-slate-600 bg-slate-50 shadow-slate-100/50",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200 transition-all duration-500"
    >
      <div className="flex justify-between items-start mb-6">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            colors[color],
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
              trend.startsWith("+")
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600",
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
          {label}
        </p>
        <p className="text-2xl font-black text-slate-900 leading-none">
          {typeof value === "number" && suffix !== "%"
            ? `₹${value.toLocaleString()}`
            : value}
          {suffix}
        </p>
      </div>
    </motion.div>
  );
}

function GstMetric({ label, value, color }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-black",
          color === "indigo"
            ? "text-indigo-600"
            : color === "rose"
              ? "text-rose-600"
              : "text-slate-900",
        )}
      >
        ₹{(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

export default Reports;
