import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
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
  Calendar,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  Shield,
  TrendingUp,
  Printer,
  ChevronRight,
  User,
  Package,
  Info,
  Activity,
  TrendingDown,
} from "lucide-react";
import api from "../services/api";
import { useBusinessStore } from "../store/auth";
import { Card, Button, cn, Badge } from "../components/ui";
import toast from "react-hot-toast";
import {
  exportGSTR1Excel,
  exportGSTR2Excel,
  exportHSNSummaryExcel,
  exportBillWiseProfitExcel,
  exportTrialBalanceExcel,
  exportBalanceSheetExcel,
  exportStockSummaryExcel,
  exportPartyBalancesExcel,
  exportGSTR3BExcel,
  exportPartyLedgerExcel,
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
      { id: "overview", label: "Dashboard" },
      { id: "bill-wise-profit", label: "Bill Profitability" },
      { id: "trial-balance", label: "Trial Balance" },
      { id: "balance-sheet", label: "Balance Sheet" },
    ],
  },
  {
    id: "party",
    label: "Partner Analysis",
    icon: User,
    tabs: [
      { id: "party-ledger", label: "Party Ledger" },
      { id: "balances", label: "Balances Summary" },
    ],
  },
  {
    id: "gst",
    label: "GST Compliance",
    icon: Shield,
    tabs: [
      { id: "gst-summary", label: "GST Overview" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory Assets",
    icon: Package,
    tabs: [
      { id: "stock-summary", label: "Stock Summary" },
    ],
  },
];

export default function Reports() {
  const { currentBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("this-year");
  const [customDates, setCustomDates] = useState({ fromDate: "", toDate: "" });
  const [selectedPartyId, setSelectedPartyId] = useState("");

  const getDateParams = () => {
    const params = new URLSearchParams();
    const now = new Date();
    let from, to;
    if (dateRange === "custom") {
      if (customDates.fromDate) params.append("fromDate", customDates.fromDate);
      if (customDates.toDate) params.append("toDate", customDates.toDate);
    } else {
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

  const { data: billsData } = useQuery({
    queryKey: ["report-bills", currentBusiness?.id, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/bill-wise-profit?${getDateParams()}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: plData } = useQuery({
    queryKey: ["report-pl", currentBusiness?.id, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/profit-loss?${getDateParams()}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: stockData } = useQuery({
    queryKey: ["report-stock", currentBusiness?.id],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/stock-summary`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: gstData } = useQuery({
    queryKey: ["report-gst", currentBusiness?.id, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/gst-summary?${getDateParams()}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: partiesData } = useQuery({
    queryKey: ["report-parties", currentBusiness?.id],
    queryFn: () => api.get(`/parties/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: ledgerData } = useQuery({
    queryKey: ["report-ledger", currentBusiness?.id, selectedPartyId, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/party-ledger?partyId=${selectedPartyId}&${getDateParams()}`).then(r => r.data),
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
      <div className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Reports Center</h1>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="text-xs font-bold border-slate-200 rounded-lg p-1.5"
          >
            {DATE_RANGES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-6 overflow-y-auto">
          {REPORT_SECTIONS.map(section => (
            <div key={section.id} className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{section.label}</h4>
              <div className="space-y-1">
                {section.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center px-2 py-2 rounded-lg text-xs font-bold transition-all",
                      activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <HighlightCard label="Revenue" value={metrics.revenue} icon={TrendingUp} />
                  <HighlightCard label="Net Profit" value={metrics.profit} icon={Activity} />
                  <HighlightCard label="Margin" value={metrics.margin} icon={PieChartIcon} suffix="%" />
                  <HighlightCard label="Stock Value" value={metrics.stockValue} icon={Package} />
                </div>
              )}

              {activeTab === "bill-wise-profit" && (
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <h2 className="text-xl font-black">Bill Profitability</h2>
                     <Button onClick={() => exportBillWiseProfitExcel(currentBusiness, {}, billsData?.data)}>Export Excel</Button>
                   </div>
                   <Card className="!p-0 overflow-hidden">
                     <table className="w-full text-left">
                       <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                         <tr>
                           <th className="p-4">Invoice</th>
                           <th>Party</th>
                           <th className="text-right">Amount</th>
                           <th className="text-right p-4">Profit</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 italic font-bold">
                         {billsData?.data?.invoices?.map((inv, idx) => (
                           <tr key={idx}>
                             <td className="p-4 font-black not-italic">{inv.invoiceNumber}</td>
                             <td>{inv.partyName}</td>
                             <td className="text-right">Rs.{inv.totalAmount.toLocaleString()}</td>
                             <td className={cn("text-right p-4 not-italic", inv.profit >=0 ? "text-emerald-600" : "text-rose-600")}>
                               Rs.{inv.profit.toLocaleString()}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </Card>
                </div>
              )}

              {activeTab === "trial-balance" && <TrialBalanceView business={currentBusiness} params={getDateParams()} />}
              {activeTab === "balance-sheet" && <BalanceSheetView business={currentBusiness} params={getDateParams()} />}
              {activeTab === "stock-summary" && <StockSummaryView business={currentBusiness} />}
              {activeTab === "balances" && <BalancesSummaryView business={currentBusiness} />}
              {activeTab === "gst-summary" && <GstOverviewView business={currentBusiness} params={getDateParams()} />}
              {activeTab === "party-ledger" && (
                <div className="space-y-4">
                  <select 
                    className="w-full p-2 rounded-lg border border-slate-200"
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                  >
                    <option value="">Select Party</option>
                    {partiesData?.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {selectedPartyId && (
                    <Card className="!p-0">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black">
                          <tr>
                            <th className="p-4">Date</th>
                            <th>Reference</th>
                            <th className="text-right">Debit</th>
                            <th className="text-right">Credit</th>
                            <th className="text-right p-4">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y italic font-bold">
                          {ledgerData?.data?.ledger?.map((e, i) => (
                            <tr key={i}>
                              <td className="p-4 not-italic font-normal text-slate-400">{format(new Date(e.date), 'dd/MM/yyyy')}</td>
                              <td className="not-italic font-black">{e.reference || '-'}</td>
                              <td className="text-right text-rose-500">{e.debit > 0 ? e.debit.toLocaleString() : '-'}</td>
                              <td className="text-right text-emerald-600">{e.credit > 0 ? e.credit.toLocaleString() : '-'}</td>
                              <td className="text-right p-4 not-italic font-black">Rs.{e.balance.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function TrialBalanceView({ business, params }) {
  const { data } = useQuery({
    queryKey: ["t-balance", business?.id, params],
    queryFn: () => api.get(`/reports/business/${business.id}/trial-balance?${params}`).then(r => r.data),
    enabled: !!business?.id,
  });
  if (!data) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl font-black">Trial Balance</h2><Button onClick={() => exportTrialBalanceExcel(business, {}, data.data)}>Excel</Button></div>
      <Card className="!p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-[10px] uppercase font-black"><tr><th className="p-4">Account</th><th className="text-right">Debit</th><th className="text-right p-4">Credit</th></tr></thead>
          <tbody className="divide-y divide-slate-100 italic font-bold">
            {data.data.ledgerAccounts.map((acc, i) => (
              <tr key={i}><td className="p-4 not-italic font-black">{acc.name}</td><td className="text-right">{acc.debit > 0 ? acc.debit.toLocaleString() : '-'}</td><td className="text-right p-4">{acc.credit > 0 ? acc.credit.toLocaleString() : '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BalanceSheetView({ business, params }) {
  const { data } = useQuery({
    queryKey: ["b-sheet", business?.id, params],
    queryFn: () => api.get(`/reports/business/${business.id}/balance-sheet?${params}`).then(r => r.data),
    enabled: !!business?.id,
  });
  if (!data) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl font-black">Balance Sheet</h2><Button onClick={() => exportBalanceSheetExcel(business, {}, data.data)}>Excel</Button></div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="!p-0 overflow-hidden">
          <div className="bg-slate-900 text-white p-2 text-[10px] font-black uppercase">Liabilities</div>
          <table className="w-full">
            <tbody className="italic font-bold">
              {Object.entries(data.data.liabilities.currentLiabilities).map(([k, v]) => (
                <tr key={k} className="border-b"><td className="p-3 not-italic">{k}</td><td className="p-3 text-right">Rs.{v.toLocaleString()}</td></tr>
              ))}
              <tr className="bg-slate-50 font-black not-italic"><td className="p-3">TOTAL</td><td className="p-3 text-right">Rs.{data.data.summary.totalLiabilities.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card className="!p-0 overflow-hidden">
          <div className="bg-slate-800 text-white p-2 text-[10px] font-black uppercase">Assets</div>
          <table className="w-full">
            <tbody className="italic font-bold">
              {Object.entries(data.data.assets.currentAssets).map(([k, v]) => (
                <tr key={k} className="border-b"><td className="p-3 not-italic">{k}</td><td className="p-3 text-right">Rs.{v.toLocaleString()}</td></tr>
              ))}
              <tr className="bg-slate-50 font-black not-italic"><td className="p-3">TOTAL</td><td className="p-3 text-right">Rs.{data.data.summary.totalAssets.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function StockSummaryView({ business }) {
  const { data } = useQuery({
    queryKey: ["s-summary", business?.id],
    queryFn: () => api.get(`/reports/business/${business.id}/stock-summary`).then(r => r.data),
    enabled: !!business?.id,
  });
  if (!data) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl font-black">Stock Summary</h2><Button onClick={() => exportStockSummaryExcel(business, {}, data.data)}>Excel</Button></div>
      <Card className="!p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400"><tr><th className="p-4">Item</th><th className="text-right">Qty</th><th className="text-right p-4">Value</th></tr></thead>
          <tbody className="divide-y italic font-bold">
            {data.data.items.map((item, i) => (
              <tr key={i}><td className="p-4 not-italic font-black">{item.name}</td><td className="text-right">{item.currentStock}</td><td className="text-right p-4">Rs.{item.totalValuation.toLocaleString()}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BalancesSummaryView({ business }) {
  const { data } = useQuery({
    queryKey: ["p-balances", business?.id],
    queryFn: () => api.get(`/reports/business/${business.id}/party-balance-summary`).then(r => r.data),
    enabled: !!business?.id,
  });
  if (!data) return <div>Loading...</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl font-black">Balances Summary</h2><Button onClick={() => exportPartyBalancesExcel(business, {}, data.data)}>Excel</Button></div>
      <Card className="!p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-[10px] uppercase font-black"><tr><th className="p-4">Party</th><th className="text-right p-4">Closing Balance</th></tr></thead>
          <tbody className="divide-y italic font-bold">
            {data.data.parties.map((p, i) => (
              <tr key={i}><td className="p-4 not-italic font-black">{p.name}</td><td className={cn("text-right p-4", p.closingBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>Rs.{Math.abs(p.closingBalance).toLocaleString()} {p.closingBalance >= 0 ? 'Dr' : 'Cr'}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function HighlightCard({ label, value, icon: Icon, color = "slate", suffix = "" }) {
  return (
    <Card className="p-4 flex flex-col justify-between h-32 border-slate-200">
      <div className="flex justify-between items-start">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black">{typeof value === 'number' && suffix !== '%' ? `Rs.${value.toLocaleString()}` : value}{suffix}</p>
      </div>
    </Card>
  );
}

function GstOverviewView({ business, params }) {
  const { data: gstData } = useQuery({
    queryKey: ["gst", business?.id, params],
    queryFn: () => api.get(`/reports/business/${business.id}/gst-summary?${params}`).then(r => r.data),
    enabled: !!business?.id,
  });

  if (!gstData) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Output Tax (Sales)</h3>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <GstMetric label="Total Taxable Sales" value={gstData.data?.sales?.totalTaxableSales} />
            <div className="h-px bg-slate-100" />
            <GstMetric label="CGST Collected" value={gstData.data?.sales?.cgstCollected} />
            <GstMetric label="SGST Collected" value={gstData.data?.sales?.sgstCollected} />
            <GstMetric label="IGST Collected" value={gstData.data?.sales?.igstCollected} />
          </div>
        </Card>

        <Card className="!p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Input Tax (Purchases)</h3>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="space-y-4">
            <GstMetric label="Total Taxable Intake" value={gstData.data?.purchases?.totalTaxablePurchases} />
            <div className="h-px bg-slate-100" />
            <GstMetric label="CGST Input" value={gstData.data?.purchases?.cgstPaid} />
            <GstMetric label="SGST Input" value={gstData.data?.purchases?.sgstPaid} />
            <GstMetric label="IGST Input" value={gstData.data?.purchases?.igstPaid} />
          </div>
        </Card>
      </div>

      <Card className="!p-10 bg-zinc-950 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden border-none text-center">
        <Shield className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
        <div className="relative z-10">
          <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">Statutory Net Offset Liability</p>
          <h2 className="text-6xl font-black tracking-tighter mb-8 text-white">Rs.{(gstData.data?.netTax?.total || 0).toLocaleString()}</h2>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
               variant="outline" 
               className="bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 text-white !rounded-2xl px-6 py-6 h-auto"
               onClick={() => exportGSTR1Excel(business, {}, gstData.data)}
            >
              <FileSpreadsheet className="w-5 h-5 mr-3 text-indigo-400" />
              <div className="text-left">
                <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Generate</p>
                <p className="text-sm font-black text-white">GSTR-1 EXCEL</p>
              </div>
            </Button>
            <Button 
               variant="outline" 
               className="bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 text-white !rounded-2xl px-6 py-6 h-auto"
               onClick={() => exportGSTR2Excel(business, {}, gstData.data)}
            >
              <FileSpreadsheet className="w-5 h-5 mr-3 text-rose-400" />
              <div className="text-left">
                <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Generate</p>
                <p className="text-sm font-black text-white">GSTR-2 EXCEL</p>
              </div>
            </Button>
            <Button 
               variant="outline" 
               className="bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 text-white !rounded-2xl px-6 py-6 h-auto"
               onClick={() => exportGSTR3BExcel(business, {}, gstData.data)}
            >
              <FileSpreadsheet className="w-5 h-5 mr-3 text-emerald-400" />
              <div className="text-left">
                <p className="text-[9px] font-black opacity-50 uppercase tracking-widest">Generate</p>
                <p className="text-sm font-black text-white">GSTR-3B EXCEL</p>
              </div>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function GstMetric({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-black text-slate-900">Rs.{(value || 0).toLocaleString()}</span>
    </div>
  );
}
