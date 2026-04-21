import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard,
  ArrowUpRight, ArrowDownRight, Plus, FileText,
  Users, Package, FileCheck, ChevronRight, Clock,
  AlertCircle, CheckCircle2, ShoppingCart
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { format, subMonths } from 'date-fns';
import api from '../services/api';
import { useBusinessStore } from '../store/auth';
import { cn } from '../components/ui';

const MONTHS_PALETTE = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

// ── Custom tooltip ────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-3 min-w-[140px]">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs font-semibold text-slate-600 capitalize">{p.name}</span>
          </div>
          <span className="text-xs font-black text-slate-900">₹{Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, color, trend, trendValue, delay = 0 }) {
  const colors = {
    indigo: { ring: 'bg-indigo-50', icon: 'text-indigo-600', badge: 'bg-indigo-600', border: 'border-indigo-100' },
    emerald: { ring: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-600', border: 'border-emerald-100' },
    rose: { ring: 'bg-rose-50', icon: 'text-rose-500', badge: 'bg-rose-500', border: 'border-rose-100' },
    amber: { ring: 'bg-amber-50', icon: 'text-amber-500', badge: 'bg-amber-500', border: 'border-amber-100' },
    purple: { ring: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-600', border: 'border-purple-100' },
  };
  const c = colors[color] || colors.indigo;
  const isPositive = trend === 'up';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col gap-4 hover:-translate-y-0.5 transition-all duration-300"
      style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)' }}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.ring)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {trendValue !== undefined && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold',
            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trendValue)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{title}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight leading-none font-header">
          {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
        </p>
        {sub && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 opacity-70">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Invoice Row ───────────────────────────────
const STATUS_CONFIG = {
  SENT: { label: 'Unpaid', class: 'pill-warning' },
  PAID: { label: 'Paid', class: 'pill-success' },
  PARTIAL: { label: 'Partial', class: 'pill-info' },
  DRAFT: { label: 'Draft', class: 'pill-muted' },
  OVERDUE: { label: 'Overdue', class: 'pill-danger' },
};

// ── Main Dashboard ─────────────────────────────
function Dashboard() {
  const navigate = useNavigate();
  const { currentBusiness } = useBusinessStore();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-report', currentBusiness?.id],
    queryFn: () => api.get(`/reports/business/${currentBusiness.id}/dashboard`).then(r => r.data),
    enabled: !!currentBusiness?.id,
  });

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

  const stats = dashboardData?.data || {};
  const invoices = invoicesData?.data || [];
  const purchases = purchasesData?.data || [];

  const totalRevenue = stats?.totals?.invoices?.amount || 0;
  const totalPurchases = stats?.totals?.purchases?.amount || 0;
  const totalExpenses = stats?.totals?.expenses?.amount || 0;
  const receivables = stats?.receivables || 0;

  // Last 6 months chart data
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      months.push({ id: format(d, 'yyyy-MM'), name: format(d, 'MMM'), revenue: 0, expense: 0 });
    }
    invoices.forEach(inv => {
      const m = months.find(m => m.id === format(new Date(inv.date), 'yyyy-MM'));
      if (m) m.revenue += inv.totalAmount || 0;
    });
    purchases.forEach(pur => {
      const m = months.find(m => m.id === format(new Date(pur.date), 'yyyy-MM'));
      if (m) m.expense += pur.totalAmount || 0;
    });
    return months;
  }, [invoices, purchases]);

  const growthRate = useMemo(() => {
    if (chartData.length < 2) return 0;
    const cur = chartData.at(-1).revenue;
    const prev = chartData.at(-2).revenue;
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round((cur - prev) / prev * 100);
  }, [chartData]);

  const recentInvoices = invoices.slice(0, 6);
  const pendingCount = invoices.filter(i => i.status === 'SENT').length;
  const overdueCount = invoices.filter(i => i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < new Date()).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100">
              <div className="skeleton h-10 w-10 rounded-xl mb-4" />
              <div className="skeleton h-3 w-20 rounded mb-3" />
              <div className="skeleton h-7 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── Page Header ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Financial Overview</h1>
          <p className="page-subtitle">
            {currentBusiness?.name} · {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/invoices/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={totalRevenue}
          sub={`${growthRate >= 0 ? '+' : ''}${growthRate}% vs last month`}
          icon={TrendingUp}
          color="indigo"
          trend={growthRate >= 0 ? 'up' : 'down'}
          trendValue={growthRate}
          delay={0}
        />
        <StatCard
          title="Receivables"
          value={receivables}
          sub={`${pendingCount} unpaid · ${overdueCount} overdue`}
          icon={CreditCard}
          color="amber"
          delay={0.05}
        />
        <StatCard
          title="Total Purchases"
          value={totalPurchases + totalExpenses}
          sub="Purchases + Expenses"
          icon={ShoppingCart}
          color="rose"
          delay={0.1}
        />
        <StatCard
          title="Active Parties"
          value={stats?.totals?.parties || 0}
          sub={`${stats?.totals?.items || 0} stock items`}
          icon={Users}
          color="emerald"
          delay={0.15}
        />
      </div>

      {/* ── Charts + Recent ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6"
          style={{ boxShadow: '0 4px 20px -4px rgb(0 0 0 / 0.06)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue vs Expenses</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">6-month cash flow comparison</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-[11px] font-semibold text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-[11px] font-semibold text-slate-500">Expenses</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800, fontFamily: 'Outfit' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gradRevenue)" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} strokeDasharray="6 4" fill="url(#gradExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-slate-100 p-6"
          style={{ boxShadow: '0 4px 20px -4px rgb(0 0 0 / 0.06)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Revenue</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Last 6 months</p>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={MONTHS_PALETTE[index] || '#4f46e5'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Activity + Quick Stats ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent Invoices */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: '0 4px 20px -4px rgb(0 0 0 / 0.06)' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Invoices</h3>
              <p className="text-xs text-slate-400 mt-0.5">{invoices.length} total invoices</p>
            </div>
            <Link to="/invoices" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileText className="w-7 h-7 text-slate-300" /></div>
              <p className="text-sm font-semibold text-slate-400">No invoices yet</p>
              <p className="text-xs text-slate-300 mt-1">Create your first invoice to see activity</p>
              <button onClick={() => navigate('/invoices/new')} className="mt-4 btn-primary text-xs px-4 py-2">Create Invoice</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map(inv => {
                  const st = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={inv.id} onClick={() => navigate(`/invoices/edit/${inv.id}`)} className="cursor-pointer">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                          <span className="font-semibold text-slate-900 text-sm">#{inv.invoiceNumber}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[9px] text-white font-bold">
                            {(inv.party?.name || 'C')[0].toUpperCase()}
                          </div>
                          <span className="text-slate-700 font-medium">{inv.party?.name || 'Walk-in'}</span>
                        </div>
                      </td>
                      <td><span className="text-slate-400 font-medium">{format(new Date(inv.date), 'dd MMM yy')}</span></td>
                      <td className="text-right font-bold text-slate-900">₹{(inv.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={cn('text-[11px] font-semibold px-2.5 py-1', st.class)}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* Quick Stats Panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col gap-4"
        >
          {/* Pending Alert */}
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">Payment Pending</p>
              </div>
              <p className="text-2xl font-black text-amber-900">{pendingCount}</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">invoices awaiting payment</p>
              <Link to="/invoices" className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors">
                Collect Now <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Overdue Alert */}
          {overdueCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <p className="text-sm font-bold text-rose-800">Overdue</p>
              </div>
              <p className="text-2xl font-black text-rose-900">{overdueCount}</p>
              <p className="text-xs text-rose-600 font-medium mt-0.5">invoices past due date</p>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 4px 20px -4px rgb(0 0 0 / 0.06)' }}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-1">
              {[
                { label: 'Create Invoice', path: '/invoices/new', icon: FileText, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'New Estimate', path: '/estimates/new', icon: FileCheck, color: 'text-purple-600 bg-purple-50' },
                { label: 'View Reports', path: '/reports', icon: Package, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Add Party', path: '/parties', icon: Users, color: 'text-blue-600 bg-blue-50' },
              ].map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.color)}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 flex-1">{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;
