import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, Zap, CreditCard, 
  Search, Filter, CheckCircle, XCircle,
  MoreVertical, ArrowUpRight, TrendingUp, Activity,
  Globe, Clock, Layers, Award,
  Trash2, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import api from '../services/api';
import { Card, Badge, Button, cn, Modal, Input } from '../components/ui';
import toast from 'react-hot-toast';

function SuperAdmin() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Queries
  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
    enabled: activeTab === 'users' || activeTab === 'overview',
  });

  const { data: plansData } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => api.get('/admin/plans').then(r => r.data),
    enabled: activeTab === 'plans' || activeTab === 'subscriptions',
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get('/admin/audit-logs').then(r => r.data),
    enabled: activeTab === 'logs',
  });

  // Mutations
  const toggleUserStatus = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/admin/users/${id}/status`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User status updated');
    }
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success('User and data deleted permanently');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  });

  const stats = statsData?.data || {};
  const users = usersData?.data || [];
  const plans = plansData?.data || [];

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Control Portal</h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Super Admin Infrastructure Management</p>
        </div>
        
        <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 shadow-inner">
          {['overview', 'users', 'subscriptions', 'plans', 'logs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? "bg-white text-indigo-600 shadow-lg shadow-indigo-500/10" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatsCard title="Total Users" value={stats.totalUsers} sub="+100% Conversion" icon={Users} color="indigo" />
              <StatsCard title="Active Businesses" value={stats.totalBusinesses} sub="Organic Growth" icon={Activity} color="emerald" />
              <StatsCard title="Active Platinum Subs" value={stats.activeSubscriptions} sub="365 Day Trial" icon={Zap} color="amber" />
              <StatsCard title="Projected Revenue" value={`₹${stats.projectedRevenue?.toLocaleString()}`} sub="Billable next year" icon={TrendingUp} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-8 border-none shadow-2xl">
                <h3 className="text-xl font-black text-gray-900 mb-6">User Acquisition Trend</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={acquisitionData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-8 border-none shadow-2xl">
                 <h3 className="text-xl font-black text-gray-900 mb-6">Recent User Activity</h3>
                 <div className="space-y-6">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-indigo-100 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                               {user.name?.[0] || user.email[0].toUpperCase()}
                            </div>
                            <div>
                               <p className="font-black text-gray-900">{user.name || 'Anonymous'}</p>
                               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{user.email}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black text-gray-900">₹0.00 spent</p>
                            <p className="text-[10px] text-gray-400 font-bold">Standard User</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
             <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                   <input 
                      type="text" 
                      placeholder="Search global user database..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 ring-indigo-50 outline-none transition-all"
                   />
                </div>
             </div>

             <Card className="border-none shadow-2xl !p-0 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase font-black tracking-widest text-gray-400">
                      <tr>
                         <th className="px-8 py-6">User Identity</th>
                         <th className="px-8 py-6">Businesses</th>
                         <th className="px-8 py-6">Subscription</th>
                         <th className="px-8 py-6">Status</th>
                         <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-all group">
                           <td className="px-8 py-6">
                              <p className="font-black text-gray-900 text-base">{user.name || 'Set Profile'}</p>
                              <p className="text-xs text-indigo-500 font-bold tracking-tight">{user.email}</p>
                           </td>
                           <td className="px-8 py-6">
                              <p className="font-bold text-gray-600">{user._count.businesses} Business Account(s)</p>
                              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Global Account Active</p>
                           </td>
                           <td className="px-8 py-6">
                              {user.subscriptions?.[0] ? (
                                <div>
                                   <p className="font-black text-indigo-600">{user.subscriptions[0].plan.name} Plan</p>
                                   <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">Expires: {new Date(user.subscriptions[0].endDate).toLocaleDateString()}</p>
                                </div>
                              ) : (
                                <Badge variant="default" className="bg-gray-100 text-gray-400">Free Trial</Badge>
                              )}
                           </td>
                           <td className="px-8 py-6">
                              <Badge variant={user.isActive ? 'success' : 'danger'}>
                                 {user.isActive ? 'ACTIVE_SESSION' : 'BANNED'}
                              </Badge>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-2">
                                 <Button 
                                    size="sm" 
                                    variant={user.isActive ? 'danger' : 'success'} 
                                    onClick={() => toggleUserStatus.mutate({ id: user.id, isActive: !user.isActive })}
                                 >
                                    {user.isActive ? 'Suspend' : 'Activate'}
                                 </Button>
                                 <Button
                                    size="sm"
                                    variant="ghost"
                                    className="hover:bg-rose-50 hover:text-rose-600 border-none"
                                    onClick={() => {
                                      if (confirm(`CRITICAL: This will permanently delete ${user.email} and ALL their business data. This cannot be undone. Proceed?`)) {
                                        deleteUser.mutate(user.id);
                                      }
                                    }}
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </Card>
          </motion.div>
        )}

        {activeTab === 'plans' && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
             {plans.map((plan) => (
                <Card key={plan.id} className="p-8 border-none shadow-2xl relative overflow-hidden group">
                   <div className={cn(
                     "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-10 transition-transform group-hover:scale-110",
                     plan.name === 'Platinum' ? "bg-purple-500" : plan.name === 'Gold' ? "bg-amber-500" : "bg-slate-500"
                   )} />
                   
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-gray-50 rounded-2xl">
                         <Award className={cn("w-6 h-6", plan.name === 'Platinum' ? "text-purple-600" : "text-indigo-600")} />
                      </div>
                      <Badge variant="success" className="text-[10px] uppercase font-black">Active Offer</Badge>
                   </div>
                   
                   <h3 className="text-2xl font-black text-gray-900 mb-1">{plan.name} Tier</h3>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6">Subscription Price Model</p>
                   
                   <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-4xl font-black text-gray-900 tracking-tighter">₹{plan.price}</span>
                      <span className="text-sm text-gray-400 font-bold">/ month</span>
                   </div>
                   
                   <div className="space-y-4 mb-10">
                      {Object.entries(plan.features || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-3 text-sm font-bold text-gray-500">
                           <CheckCircle className="w-4 h-4 text-emerald-500" />
                           <span className="capitalize">{key}: {value}</span>
                        </div>
                      ))}
                   </div>
                   
                   <Button className="w-full btn-primary py-4">Configure Plan</Button>
                </Card>
             ))}
          </motion.div>
        )}

        {activeTab === 'subscriptions' && (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
             <Card className="border-none shadow-2xl !p-0 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase font-black tracking-widest text-gray-400">
                      <tr>
                         <th className="px-8 py-6">Subscriber</th>
                         <th className="px-8 py-6">License Plan</th>
                         <th className="px-8 py-6">Billing Window</th>
                         <th className="px-8 py-6">Status</th>
                         <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {users.filter(u => u.subscriptions?.length > 0).map(user => {
                        const sub = user.subscriptions[0];
                        return (
                          <tr key={sub.id} className="hover:bg-gray-50/50 transition-all">
                             <td className="px-8 py-6">
                                <p className="font-black text-gray-900">{user.name || user.email}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Global UID: {user.id.slice(0, 8)}</p>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="p-2 bg-indigo-50 rounded-lg"><Zap className="w-4 h-4 text-indigo-600" /></div>
                                   <div>
                                      <p className="font-black text-gray-900">{sub.plan.name}</p>
                                      <p className="text-[10px] text-indigo-500 font-bold uppercase">₹{sub.plan.price} Monthly</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                   <Clock className="w-4 h-4 text-gray-400" />
                                   <p className="text-sm font-bold text-gray-600">
                                      {new Date(sub.startDate).toLocaleDateString()} - {new Date(sub.endDate).toLocaleDateString()}
                                   </p>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <Badge variant="success" className="animate-pulse">Active</Badge>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <Button size="sm" variant="ghost">Manage License</Button>
                             </td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
                {users.every(u => !u.subscriptions?.length) && (
                  <div className="p-20 text-center">
                     <Layers className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                     <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No active paid licenses found</p>
                  </div>
                )}
             </Card>
          </motion.div>
        )}
        {activeTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
             <Card className="border-none shadow-2xl !p-0 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase font-black tracking-widest text-gray-400">
                      <tr>
                         <th className="px-8 py-6">Timestamp</th>
                         <th className="px-8 py-6">User</th>
                         <th className="px-8 py-6">Business</th>
                         <th className="px-8 py-6">Action</th>
                         <th className="px-8 py-6">Scope</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {logsData?.data?.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-all">
                           <td className="px-8 py-6">
                              <p className="text-xs font-black text-gray-900">{new Date(log.createdAt).toLocaleString()}</p>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-sm font-bold text-gray-900">{log.user?.email}</p>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-sm font-bold text-gray-600">{log.business?.name || 'N/A'}</p>
                           </td>
                           <td className="px-8 py-6">
                              <Badge variant="default" className="bg-indigo-50 text-indigo-600 border-none font-black uppercase text-[10px]">
                                {log.action}
                              </Badge>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{log.entityType}</p>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ title, value, sub, icon: Icon, color }) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-100',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-100'
  };

  return (
    <Card className={cn("p-6 border-none shadow-xl", colors[color])}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white rounded-2xl shadow-sm"><Icon className="w-6 h-6" /></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{title}</p>
      </div>
      <div className="flex items-baseline gap-2">
         <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{value}</h2>
         <span className="text-[10px] font-bold text-emerald-600">{sub}</span>
      </div>
    </Card>
  );
}

const acquisitionData = [
  { name: 'Mon', users: 45 },
  { name: 'Tue', users: 52 },
  { name: 'Wed', users: 48 },
  { name: 'Thu', users: 61 },
  { name: 'Fri', users: 55 },
  { name: 'Sat', users: 70 },
  { name: 'Sun', users: 65 },
];

export default SuperAdmin;
