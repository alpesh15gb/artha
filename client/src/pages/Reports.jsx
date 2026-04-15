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
import { Card, Badge, Button, cn } from '../components/ui';

function Reports() {
  const { currentBusiness } = useBusinessStore();
  const [activeTab, setActiveTab] = useState('profit-loss');
  const [dateRange, setDateRange] = useState('this-month');

  // Profit & Loss Query
  const { data: plData, isLoading: isLoadingPL } = useQuery({
    queryKey: ['report-pl', currentBusiness?.id, dateRange],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/profit-loss`).then(r => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'profit-loss',
  });

  // Balance Summary Query
  const { data: balanceData, isLoading: isLoadingBal } = useQuery({
    queryKey: ['report-balance', currentBusiness?.id],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/party-balance-summary`).then(r => r.data),
    enabled: !!currentBusiness?.id && activeTab === 'balances',
  });

  const pl = plData?.data;
  const balances = balanceData?.data;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Consolidated statements and business performance analysis.</p>
        </div>
        <div className="flex gap-3">
           <Button variant="secondary" icon={Download}>Export PDF</Button>
           <Button icon={PieChart}>Advanced Analytics</Button>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <SummaryCard 
                 title="Total Sales" 
                 value={pl?.totalSales || 0} 
                 icon={TrendingUp} 
                 color="emerald" 
                 extra="Billed Revenue"
               />
               <SummaryCard 
                 title="Total Expenses" 
                 value={pl?.totalExpenses || 0} 
                 icon={TrendingDown} 
                 color="rose" 
                 extra="Operating Costs"
               />
               <SummaryCard 
                 title="Net Profit" 
                 value={pl?.netProfit || 0} 
                 icon={BarChart3} 
                 color="indigo" 
                 extra="After Expenses"
               />
            </div>

            <Card className="!p-8 border-none shadow-xl shadow-gray-200/50">
               <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">P&L Detailed Breakdown</h3>
               <div className="space-y-6">
                  <BreakdownRow label="Gross Sales" value={pl?.totalSales} sub="Combined value of all invoices" />
                  <BreakdownRow label="Taxes Collected" value={pl?.totalTax} sub="CGST + SGST + IGST" />
                  <BreakdownRow label="Discounts Given" value={pl?.totalDiscounts} sub="Deducted at source" color="rose" />
                  <div className="h-px bg-gray-100 my-4" />
                  <BreakdownRow label="Net Operating Revenue" value={pl?.netSales} sub="Gross sales minus discounts" bold />
                  <BreakdownRow label="Total Operating Expenses" value={pl?.totalExpenses} sub="Purchases and overheads" color="rose" />
                  <div className="pt-6 border-t-2 border-gray-900 mt-6 flex justify-between items-center">
                    <div>
                      <h4 className="text-xl font-black text-gray-900">Net Profit / Loss</h4>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Accrual Basis Period</p>
                    </div>
                    <p className={cn("text-3xl font-black", (pl?.netProfit >= 0) ? 'text-indigo-600' : 'text-rose-600')}>
                      ₹{(pl?.netProfit || 0).toLocaleString()}
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
                              <span className={cn("text-sm font-black tracking-tight", p.balanceType === 'RECEIVABLE' ? 'text-emerald-600' : 'text-rose-500')}>
                                 {p.balanceType === 'RECEIVABLE' ? '+' : '-'} ₹{p.totalBalance?.toLocaleString()}
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
           <motion.div key="gst" className="py-20 text-center">
              <Badge variant="warning">Coming with Q1 Update</Badge>
              <h3 className="text-lg font-bold mt-4 text-gray-900">Advanced GST Filing Support</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">We are finalizing GSTR-1 and GSTR-3B export features. Stay tuned!</p>
           </motion.div>
        )}
      </AnimatePresence>
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

export default Reports;
