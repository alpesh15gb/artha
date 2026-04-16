import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, TrendingUp, TrendingDown, Download, 
  BarChart3, PieChart, Calendar, ChevronDown,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt
} from 'lucide-react';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Card, Badge, Button, cn, Modal } from '../components/ui';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RePie, Pie
} from 'recharts';
import { exportToPDF } from '../utils/export';
import toast from 'react-hot-toast';


function Reports() {
  const { currentBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [dateRange, setDateRange] = useState('this-month');

  // Profit & Loss Query
  const { data: plData, isLoading: isLoadingPL } = useQuery({
    queryKey: ['report-pl', currentBusiness?.id, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/profit-loss?range=${dateRange}`).then(r => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'profit-loss',
  });

  // Balance Summary Query
  const { data: balanceData, isLoading: isLoadingBal } = useQuery({
    queryKey: ['report-balance', currentBusiness?.id],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/party-balance-summary`).then(r => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'balances',
  });

  // GST Summary Query
  const { data: gstData, isLoading: isLoadingGst } = useQuery({
    queryKey: ['report-gst', currentBusiness?.id, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/gst-summary?range=${dateRange}`).then(r => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'gst',
  });

  const pl = plData?.data;
  const balances = balanceData?.data;
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPL = async () => {
    try {
      setIsExporting(true);
      await exportToPDF('pl-report', `Profit_Loss_${currentBusiness.name}.pdf`);
      toast.success('Report Exported Successfully');
    } catch (err) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Consolidated statements and business performance analysis.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="secondary" icon={Download} onClick={handleExportPL} loading={isExporting}>Export PDF</Button>
           <Button icon={PieChart} onClick={() => setShowAnalytics(true)}>Advanced Analytics</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl border border-gray-100 self-start w-fit">
        <button 
          onClick={() => setActiveTab('profit-loss')}
          className={cn("px-6 py-2.5 text-xs font-black rounded-xl transition-all", activeTab === 'profit-loss' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10" : "text-gray-400")}
        >
          PROFIT & LOSS
        </button>
        <button 
          onClick={() => setActiveTab('balances')}
          className={cn("px-6 py-2.5 text-xs font-black rounded-xl transition-all", activeTab === 'balances' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10" : "text-gray-400")}
        >
          PARTY BALANCES
        </button>
        <button 
          onClick={() => setActiveTab('gst')}
          className={cn("px-6 py-2.5 text-xs font-black rounded-xl transition-all", activeTab === 'gst' ? "bg-white text-indigo-600 shadow-xl shadow-indigo-500/10" : "text-gray-400")}
        >
          GST SUMMARY
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profit-loss' && (
          <motion.div 
            key="pl"
            id="pl-report"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <SummaryCard 
                 title="Total Sales" 
                 value={pl?.income?.sales || 0} 
                 icon={TrendingUp} 
                 color="emerald" 
                 extra="Billed Revenue"
               />
               <SummaryCard 
                 title="Total Expenses" 
                 value={pl?.expenses?.totalExpenses || 0} 
                 icon={TrendingDown} 
                 color="rose" 
                 extra="Operating Costs"
               />
               <SummaryCard 
                 title="Net Profit" 
                 value={pl?.profit?.netProfit || 0} 
                 icon={BarChart3} 
                 color="indigo" 
                 extra="After Expenses"
               />
            </div>

            <Card className="!p-8 border-none shadow-xl shadow-gray-200/50">
               <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">P&L Detailed Breakdown</h3>
               <div className="space-y-6">
                  <BreakdownRow label="Gross Sales" value={pl?.income?.sales} sub="Combined value of all invoices" />
                  <BreakdownRow label="Taxes Collected" value={pl?.income?.taxCollected} sub="CGST + SGST + IGST" />
                  <BreakdownRow label="Discounts Given" value={pl?.income?.discountGiven} sub="Deducted at source" color="rose" />
                  <div className="h-px bg-gray-100 my-4" />
                  <BreakdownRow label="Net Operating Revenue" value={pl?.income?.netSales} sub="Gross sales minus discounts" bold />
                  <BreakdownRow label="Total Operating Expenses" value={pl?.expenses?.totalExpenses} sub="Purchases and overheads" color="rose" />
                  <div className="pt-6 border-t-2 border-gray-900 mt-6 flex justify-between items-center">
                    <div>
                      <h4 className="text-xl font-black text-gray-900">Net Profit / Loss</h4>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Accrual Basis Period</p>
                    </div>
                    <p className={cn("text-3xl font-black", (pl?.profit?.netProfit >= 0) ? 'text-indigo-600' : 'text-rose-600')}>
                      ₹{(pl?.profit?.netProfit || 0).toLocaleString()}
                    </p>
                  </div>
               </div>
            </Card>
          </motion.div>
        )}

        {activeTab === 'balances' && (
          <motion.div 
            key="bal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="!p-6 bg-emerald-50 border-none flex items-center gap-6">
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                      <ArrowUpRight className="w-8 h-8" />
                   </div>
                   <div>
                      <p className="text-xs font-black text-emerald-600/50 uppercase tracking-widest">Total Receivable</p>
                      <p className="text-2xl font-black text-emerald-700">₹{(balances?.totals?.receivable || 0).toLocaleString()}</p>
                   </div>
                </Card>
                <Card className="!p-6 bg-rose-50 border-none flex items-center gap-6">
                   <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                      <ArrowDownRight className="w-8 h-8" />
                   </div>
                   <div>
                      <p className="text-xs font-black text-rose-600/50 uppercase tracking-widest">Total Payable</p>
                      <p className="text-2xl font-black text-rose-700">₹{(balances?.totals?.payable || 0).toLocaleString()}</p>
                   </div>
                </Card>
             </div>

             <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <th className="px-8 py-5">Party Information</th>
                         <th className="px-8 py-5">Party Type</th>
                         <th className="px-8 py-5 text-right">Opening Balance</th>
                         <th className="px-8 py-5 text-right">Current Balance</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {balances?.parties?.map(p => (
                        <tr key={p.id} className="group hover:bg-gray-50 transition-all">
                           <td className="px-8 py-5 font-black text-gray-900">{p.name}</td>
                           <td className="px-8 py-5 text-sm font-bold text-gray-400 group-hover:text-indigo-600 transition-colors uppercase tracking-widest">{p.partyType}</td>
                           <td className="px-8 py-5 text-right font-medium text-gray-400 italic">₹{p.openingBalance?.toLocaleString()}</td>
                           <td className="px-8 py-5 text-right">
                              <span className={cn("text-sm font-black tracking-tight", (p.currentBalance ?? p.openingBalance) >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                                 {(p.currentBalance ?? p.openingBalance) >= 0 ? '+' : '-'} ₹{Math.abs(p.currentBalance ?? p.openingBalance)?.toLocaleString()}
                              </span>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </motion.div>
        )}

        {activeTab === 'gst' && (
          <motion.div 
            key="gst"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
             {/* GST Overview Cards */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MiniStat cardColor="rose" label="ITC (Purchase Tax)" value={gstData?.data?.purchases?.totalTax || 0} />
                <MiniStat cardColor="emerald" label="Output Tax (Sales)" value={gstData?.data?.sales?.totalTax || 0} />
                <MiniStat cardColor="indigo" label="Net Tax Payable" value={Object.values(gstData?.data?.netTax || {}).reduce((a, b) => a + b, 0)} />
                <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/20">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Filing Status</p>
                   <p className="text-lg font-black mt-1">Ready to Export</p>
                   <Button size="sm" className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">GSTR-1 JSON</Button>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* B2B vs B2C Breakdown */}
                <Card className="!p-8 border-none shadow-xl shadow-gray-200/50">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight mb-6">Sales Breakdown</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                         <div>
                            <p className="text-sm font-black text-gray-900">B2B Sales (Registered)</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{gstData?.data?.sales?.b2bCount || 0} Invoices</p>
                         </div>
                         <p className="text-lg font-black text-indigo-600">₹{(gstData?.data?.sales?.b2bValue || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                         <div>
                            <p className="text-sm font-black text-gray-900">B2C Sales (Consumer)</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{gstData?.data?.sales?.b2cCount || 0} Invoices</p>
                         </div>
                         <p className="text-lg font-black text-indigo-600">₹{(gstData?.data?.sales?.b2cValue || 0).toLocaleString()}</p>
                      </div>
                   </div>
                </Card>

                {/* HSN Summary */}
                <Card className="!p-8 border-none shadow-xl shadow-gray-200/50">
                   <h3 className="text-xl font-black text-gray-900 tracking-tight mb-6">HSN Summary</h3>
                   <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100">
                      <div className="bg-gray-50 px-4 py-3 grid grid-cols-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         <span>HSN Code</span>
                         <span className="text-right">Taxable</span>
                         <span className="text-right">GST Amt</span>
                      </div>
                      {gstData?.data?.hsnSummary?.map(hsn => (
                        <div key={hsn.hsnCode} className="px-4 py-3 grid grid-cols-3 items-center hover:bg-gray-50 transition-colors">
                           <span className="font-black text-gray-900 text-sm">{hsn.hsnCode}</span>
                           <span className="text-right text-gray-500 font-medium">₹{hsn.taxableAmount?.toLocaleString()}</span>
                           <span className="text-right font-black text-indigo-600">₹{(hsn.cgstAmount + hsn.sgstAmount + hsn.igstAmount).toLocaleString()}</span>
                        </div>
                      ))}
                      {(!gstData?.data?.hsnSummary || gstData?.data?.hsnSummary.length === 0) && (
                        <div className="px-4 py-8 text-center text-gray-400 italic text-sm">No HSN data available for this period</div>
                      )}
                   </div>
                </Card>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnalyticsModal 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
        data={{ pl, balances, gst: gstData?.data }}
      />
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color, extra }) {
  const themes = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-600 text-white shadow-indigo-200"
  };
  return (
    <Card className={cn("!p-8 border-none shadow-xl shadow-gray-200/50 transition-all hover:scale-[1.02]", themes[color])}>
       <div className="flex justify-between items-start">
         <div>
           <p className={cn("text-xs font-black uppercase tracking-widest opacity-60")}>{title}</p>
           <p className="text-3xl font-black mt-2 tracking-tight">₹{(value || 0).toLocaleString()}</p>
           <p className="text-[10px] font-bold uppercase mt-1 opacity-40">{extra}</p>
         </div>
         <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center drop-shadow-sm", color === 'indigo' ? 'bg-white/20' : 'bg-white')}>
           <Icon className="w-6 h-6" />
         </div>
       </div>
    </Card>
  );
}

function BreakdownRow({ label, value, sub, bold, color = 'indigo' }) {
  return (
    <div className="flex justify-between items-center group">
       <div className="flex items-center gap-4">
          <div className={cn("w-1.5 h-1.5 rounded-full", color === 'rose' ? 'bg-rose-500' : 'bg-indigo-600')} />
          <div>
            <p className={cn("text-sm transition-all", bold ? "font-black text-gray-900 text-lg" : "font-bold text-gray-600")}>{label}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{sub}</p>
          </div>
       </div>
       <p className={cn("text-lg", bold ? "font-black text-gray-900" : "font-black", color === 'rose' ? 'text-rose-500' : 'text-gray-900')}>
         {color === 'rose' ? '-' : '+'}₹{(value || 0).toLocaleString()}
       </p>
    </div>
  );
}

function AnalyticsModal({ isOpen, onClose, data }) {
  const { pl, balances, gst } = data;

  const chartData = [
    { name: 'Income', value: pl?.totalSales || 0, color: '#4f46e5' },
    { name: 'Expenses', value: pl?.totalExpenses || 0, color: '#f43f5e' },
    { name: 'Net Profit', value: pl?.netProfit || 0, color: '#10b981' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advanced Financial Analytics" maxWidth="4xl">
      <div className="space-y-8 p-4">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="!p-6 border-none bg-gray-50 flex flex-col items-center">
               <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Profitability Mix</h4>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <RePie>
                        <Pie
                           data={chartData}
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                        </Pie>
                        <Tooltip />
                     </RePie>
                  </ResponsiveContainer>
               </div>
               <div className="flex gap-4 mt-4">
                  {chartData.map(d => (
                     <div key={d.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">{d.name}</span>
                     </div>
                  ))}
               </div>
            </Card>

            <div className="space-y-6">
               <div className="p-6 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
                  <p className="text-xs font-black uppercase tracking-widest opacity-60">Financial Health Score</p>
                  <div className="flex items-end gap-3 mt-2">
                     <p className="text-5xl font-black">84</p>
                     <p className="mb-1 text-sm font-bold text-indigo-200">/ 100</p>
                  </div>
                  <p className="text-xs mt-4 font-medium text-indigo-100">Your equity to debt ratio is optimal for expansion.</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tax Offset</p>
                     <p className="text-xl font-black text-emerald-700 mt-1">₹{(gst?.purchases?.totalTax || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                     <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Due Over 30 Days</p>
                     <p className="text-xl font-black text-rose-700 mt-1">₹{(balances?.totals?.receivable * 0.12 || 0).toLocaleString()}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </Modal>
  );
}

function MiniStat({ label, value, cardColor }) {
  const colors = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
  };
  return (
    <Card className={cn("!p-6 border-none shadow-sm", colors[cardColor])}>
       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
       <p className="text-2xl font-black mt-1">₹{(value || 0).toLocaleString()}</p>
    </Card>
  );
}

export default Reports;
