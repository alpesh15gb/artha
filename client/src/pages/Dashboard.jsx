import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Wallet, TrendingUp, TrendingDown, Users, 
  FileText, ArrowUpRight, ArrowDownRight, 
  Calendar, ShoppingBag, CreditCard
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { Card, Badge, cn } from '../components/ui';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

function Dashboard() {
  const { currentBusiness } = useBusinessStore();

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices', currentBusiness?.id],
    queryFn: () => api.get(`/invoices/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const { data: purchasesData } = useQuery({
    queryKey: ['purchases', currentBusiness?.id],
    queryFn: () => api.get(`/purchases/business/${currentBusiness.id}`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

  const invoices = invoicesData?.data || [];
  const purchases = purchasesData?.data || [];

  // Metrics
  const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPaidRevenue = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalPurchases = purchases.reduce((acc, pur) => acc + (pur.totalAmount || 0), 0);
  const receivables = totalRevenue - totalPaidRevenue;

  // Chart Data Preparation (Last 6 months)
  const chartData = useMemo(() => {
    return [
      { name: 'Jan', revenue: 4000, expense: 2400 },
      { name: 'Feb', revenue: 3000, expense: 1398 },
      { name: 'Mar', revenue: 2000, expense: 9800 },
      { name: 'Apr', revenue: 2780, expense: 3908 },
      { name: 'May', revenue: 1890, expense: 4800 },
      { name: 'Jun', revenue: 2390, expense: 3800 },
    ];
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Financial Overview</h1>
          <p className="text-gray-500 font-medium mt-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Performance for {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl">Real-time</button>
           <button className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600">Last 30 Days</button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Billed Revenue" 
          amount={totalRevenue} 
          trend="+12.5%" 
          color="indigo" 
          icon={TrendingUp}
        />
        <StatCard 
          title="Total Collected" 
          amount={totalPaidRevenue} 
          trend="+8.2%" 
          color="emerald" 
          icon={Wallet}
        />
        <StatCard 
          title="Vendor Bills" 
          amount={totalPurchases} 
          trend="-2.4%" 
          color="rose" 
          icon={TrendingDown}
        />
        <StatCard 
          title="Receivables" 
          amount={receivables} 
          trend={receivables > 10000 ? "Attention" : "Healthy"} 
          color="amber" 
          icon={CreditCard}
        />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 !p-8 border-none shadow-xl shadow-gray-200/50">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Revenue vs Expenses</h3>
              <p className="text-sm text-gray-400 font-medium mt-1">Monthly cash flow and profit margins</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-indigo-600" />
                 <span className="text-xs font-bold text-gray-500 uppercase">Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-rose-500" />
                 <span className="text-xs font-bold text-gray-500 uppercase">Expense</span>
               </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 700}} dy={15} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                  itemStyle={{fontSize: '12px', fontWeight: 900}}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fill="none" strokeDasharray="8 8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="!p-8 border-none shadow-xl shadow-gray-200/50 flex flex-col">
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Quick Activity</h3>
          <div className="flex-1 space-y-6">
             {invoices.slice(0, 4).map((inv, i) => (
               <div key={inv.id} className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Invoice #{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400 font-medium">{inv.party?.name || inv.partyName || 'No Party'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">₹{inv.totalAmount?.toLocaleString()}</p>
                    <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'} className="text-[10px] px-2 py-0 mt-1">
                      {inv.status}
                    </Badge>
                  </div>
               </div>
             ))}
             {invoices.length === 0 && (
               <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No recent activity found</p>
               </div>
             )}
          </div>
          <button className="w-full py-4 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors border-t border-gray-50 mt-auto">
             View All Transactions
          </button>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="!p-6 border-none shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-lg font-black text-gray-900">128</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Parties</p>
         </Card>
         <Card className="!p-6 border-none shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-lg font-black text-gray-900">56</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Stock Items</p>
         </Card>
         <Card className="!p-6 border-none shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <p className="text-lg font-black text-gray-900">82%</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Growth rate</p>
         </Card>
         <Card className="lg:col-span-1 !p-1 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-xl shadow-indigo-500/20">
            <div className="bg-white/10 backdrop-blur-md rounded-[14px] p-5 text-white flex flex-col h-full">
               <p className="text-xs font-bold uppercase tracking-widest opacity-60">Subscription</p>
               <p className="text-lg font-black mt-2">Premium Plan</p>
               <button className="mt-auto w-full py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-lg">Upgrade</button>
            </div>
         </Card>
      </div>
    </div>
  );
}

function StatCard({ title, amount, trend, color, icon: Icon }) {
  const isPositive = trend.startsWith('+');
  
  const colors = {
    indigo: { dot: 'bg-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50', gradient: 'from-indigo-600 to-indigo-700' },
    emerald: { dot: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50', gradient: 'from-emerald-600 to-emerald-700' },
    rose: { dot: 'bg-rose-500', text: 'text-rose-500', bg: 'bg-rose-50', gradient: 'from-rose-500 to-rose-600' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-50', gradient: 'from-amber-500 to-amber-600' },
  };

  const c = colors[color];

  return (
    <Card className="!p-6 border-none shadow-xl shadow-gray-200/50 group hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={cn("p-3 rounded-2xl transition-colors", c.bg)}>
          <Icon className={cn("w-6 h-6", c.text)} />
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-lg text-[10px] font-black tracking-widest uppercase",
          isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {trend}
        </div>
      </div>
      <div className="mt-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">₹{amount.toLocaleString()}</p>
      </div>
    </Card>
  );
}

export default Dashboard;
