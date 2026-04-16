import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useBusinessStore } from '../store/auth';
import { cn } from '../components/ui';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  FileCheck,
  ShoppingCart,
  CreditCard,
  Receipt,
  Wallet,
  BarChart3,
  Upload,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronDown,
  Bell,
  Search,
  Plus,
  HelpCircle,
  ShieldAlert,
  Calendar,
  Zap
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/parties', label: 'Parties', icon: Users },
  { path: '/items', label: 'Items', icon: Package },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/estimates', label: 'Estimates', icon: FileCheck },
  { path: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/expenses', label: 'Expenses', icon: Receipt },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/import', label: 'Import', icon: Upload },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/superadmin', label: 'System Control', icon: ShieldAlert, adminOnly: true },
];

const quickActions = [
  { label: 'New Invoice', path: '/invoices/new', icon: FileText },
  { label: 'New Expense', path: '/expenses', icon: Receipt },
  { label: 'New Party', path: '/parties', icon: Users },
];

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, initAuth } = useAuthStore();
  const { currentBusiness, businesses, fetchBusinesses, setCurrentBusiness } = useBusinessStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    initAuth();
    const checkBusinesses = async () => {
      try {
        const data = await fetchBusinesses();
        if (data.length === 0 && !location.pathname.startsWith('/onboarding') && !location.pathname.startsWith('/superadmin')) {
          navigate('/onboarding');
        }
      } catch (err) {
        console.error('Failed to fetch businesses on mount', err);
      }
    };
    
    if (user) {
      checkBusinesses();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 88 }}
        className="bg-white border-r border-gray-100 flex flex-col relative z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 mb-2">
          <Link to="/" className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[14px] flex items-center justify-center shadow-xl shadow-indigo-500/30 ring-4 ring-indigo-50">
              <span className="text-white font-black text-2xl tracking-tighter">A</span>
            </div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <span className="font-black text-2xl text-gray-900 tracking-tight">Artha</span>
                <span className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest -mt-1">Accounting</span>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Business Selector */}
        {sidebarOpen && (
          <div className="px-4 mb-6">
            <div className="bg-gray-50/50 rounded-2xl p-1 border border-gray-100">
               <div className="relative group">
                  <select
                    value={currentBusiness?.id || ''}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') {
                        navigate('/onboarding');
                        return;
                      }
                      const business = businesses.find((b) => b.id === e.target.value);
                      setCurrentBusiness(business);
                    }}
                    className="w-full appearance-none bg-transparent rounded-xl pl-10 pr-10 py-3 text-sm font-bold text-gray-900 cursor-pointer focus:outline-none transition-all group-hover:bg-white"
                  >
                    <optgroup label="Your Businesses">
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Actions">
                      <option value="ADD_NEW">+ Add New Business</option>
                    </optgroup>
                  </select>
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar pb-8">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'ADMIN') return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 translate-x-1'
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                {sidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{item.label}</motion.span>
                )}
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-white rounded-full ml-1" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-3 bg-gray-50/50 border-t border-gray-100">
          {/* Subscription Status */}
          {sidebarOpen && user?.subscription && (
            <div className="px-3 py-4 bg-white rounded-3xl shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-indigo-50 rounded-xl">
                        <Zap className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Plan</p>
                        <p className="text-sm font-black text-gray-900 leading-none mt-0.5">{user.subscription.plan.name}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     {(() => {
                        const daysLeft = differenceInDays(new Date(user.subscription.endDate), new Date());
                        return (
                          <p className={cn(
                            "text-sm font-black tracking-tighter",
                            daysLeft < 5 ? "text-rose-500" : "text-emerald-500"
                          )}>
                             {daysLeft} Days
                          </p>
                        );
                     })()}
                     <p className="text-[9px] font-black text-gray-400 uppercase">Left</p>
                  </div>
               </div>
               
               <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, (differenceInDays(new Date(user.subscription.endDate), new Date()) / (user.subscription.plan.duration || 365)) * 100))}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      differenceInDays(new Date(user.subscription.endDate), new Date()) < 30 ? "bg-rose-500" : "bg-indigo-600"
                    )}
                  />
               </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 rounded-[24px] bg-white shadow-sm border border-gray-100 group">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
                <span className="text-white font-black">{user?.name?.[0]?.toUpperCase() || 'A'}</span>
             </div>
             {sidebarOpen && (
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate tracking-tight">{user?.name || 'Admin Account'}</p>
                  <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-widest">{user?.email?.split('@')[0]}</p>
               </div>
             )}
             <button onClick={handleLogout} className="p-2 text-gray-300 hover:text-rose-500 transition-colors">
                <LogOut className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-4 top-24 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-50 text-indigo-600"
        >
          <Menu className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-90")} />
        </button>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 glass sticky top-0 z-40 flex items-center justify-between px-8 mx-6 mt-4 rounded-3xl shadow-sm border border-white/40">
           <div className="flex items-center gap-6">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                 <input
                    type="text"
                    placeholder="Search invoices, reports..."
                    className="w-96 pl-12 pr-6 py-3 bg-gray-100/50 border-transparent rounded-[18px] text-sm font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                 />
              </div>
           </div>

           <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-5 py-3 bg-gray-100/80 hover:bg-white rounded-2xl text-sm font-black text-gray-500 transition-all">
                 <HelpCircle className="w-5 h-5" />
                 Support
              </button>
              
              <div className="relative">
                 <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                 >
                    <Plus className="w-5 h-5" />
                    QUICK ADD
                 </button>
                 
                 <AnimatePresence>
                    {showQuickActions && (
                       <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full mt-3 w-56 bg-white rounded-[24px] shadow-2xl border border-gray-100 p-2 z-[60]"
                       >
                          {quickActions.map((action) => (
                             <Link
                                key={action.path}
                                to={action.path}
                                onClick={() => setShowQuickActions(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                             >
                                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white">
                                   <action.icon className="w-4 h-4" />
                                </div>
                                {action.label}
                             </Link>
                          ))}
                       </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              <div className="h-10 w-px bg-gray-100 mx-2" />

              <button className="p-3 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-2xl transition-all relative group">
                 <Bell className="w-6 h-6" />
                 <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 border-4 border-white rounded-full" />
              </button>
           </div>
        </header>

        {/* Body Container */}
        <main className="flex-1 overflow-auto custom-scrollbar p-8">
           {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
