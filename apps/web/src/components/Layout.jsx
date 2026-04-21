import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useBusinessStore } from "../store/auth";
import { cn } from "../components/ui";
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
  ChevronDown,
  Bell,
  Plus,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Search,
  Globe,
  MoreVertical,
  Calendar,
  CheckCircle,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Banknote,
  Landmark,
  ArrowRight,
  Filter,
  Download,
  Activity,
  Calculator,
  Zap,
  AlertTriangle,
  Clock,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  User,
  ClipboardList,
  AlertCircle,
  Box,
  List,
  Layers,
  ShoppingBag,
  Tag,
  ShieldCheck,
  Percent,
  Hash,
  FileJson,
  FileSpreadsheet,
  Printer,
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  ArrowUpLeft,
  ExternalLink,
  Scale,
  PieChart,
  X,
  Send,
  Truck,
  Info,
  Save,
  ArrowDown,
  ChevronUp,
  MoreHorizontal,
  XSquare,
  PercentSquare,
  BoxSelect,
  Layers as LayersIcon,
  Undo2,
  Redo2,
  MousePointer2,
  Maximize2,
  Columns,
  Rows,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sales Activity",
    items: [
      { path: "/invoices", label: "Invoices", icon: FileText },
      { path: "/estimates", label: "Estimates", icon: FileCheck },
      { path: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Purchases",
    items: [
      { path: "/purchases", label: "Purchases", icon: ShoppingCart },
      { path: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    label: "Core Assets",
    items: [
      { path: "/parties", label: "Parties", icon: Users },
      { path: "/items", label: "Items", icon: Package },
      { path: "/accounts", label: "Accounts", icon: Wallet },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/tasks", label: "Tasks", icon: ClipboardList },
      { path: "/complaints", label: "Complaints", icon: AlertCircle },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { path: "/reports", label: "Reports", icon: BarChart3 },
      { path: "/import", label: "Import", icon: Upload },
    ],
  },
  {
    label: "Configuration",
    items: [{ path: "/settings", label: "Settings", icon: Settings }],
  },
];

const QUICK_ACTIONS = [
  {
    label: "Create Invoice",
    path: "/invoices/new",
    icon: FileText,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    label: "Create Estimate",
    path: "/estimates/new",
    icon: FileCheck,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    label: "Record Purchase",
    path: "/purchases/new",
    icon: ShoppingCart,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    label: "Add Party",
    path: "/parties",
    icon: Users,
    color: "bg-indigo-50 text-indigo-600",
  },
];

function NavItem({ item, isCollapsed }) {
  const location = useLocation();
  const isActive =
    location.pathname === item.path ||
    (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
        isActive
          ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/40"
          : "text-slate-400 hover:bg-white/5 hover:text-white",
        isCollapsed && "justify-center px-0",
      )}
    >
      <Icon
        className={cn(
          "w-[18px] h-[18px] transition-transform duration-300",
          isActive ? "scale-110" : "group-hover:scale-110",
        )}
      />
      {!isCollapsed && (
        <span className="text-[11px] font-black uppercase tracking-widest leading-none">
          {item.label}
        </span>
      )}
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="navDot"
          className="absolute right-4 w-1.5 h-1.5 bg-white/40 rounded-full"
        />
      )}
    </Link>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentBusiness, businesses, fetchBusinesses, setCurrentBusiness } =
    useBusinessStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddRef = useRef(null);

  useEffect(() => {
    if (user && businesses.length === 0) {
      fetchBusinesses().then((data) => {
        if (
          (data?.length || 0) === 0 &&
          !location.pathname.startsWith("/onboarding")
        ) {
          navigate("/onboarding");
        }
      });
    }
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) {
        setShowQuickAdd(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentPage = NAV_GROUPS.flatMap((g) => g.items).find(
    (i) =>
      location.pathname === i.path ||
      (i.path !== "/dashboard" && location.pathname.startsWith(i.path)),
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* ── Mobile Bottom Navigation ────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-50 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        {[
          { path: "/dashboard", label: "Home", icon: LayoutDashboard },
          { path: "/invoices", label: "Sales", icon: FileText },
          { path: "/purchases", label: "Buy", icon: ShoppingCart },
          { path: "/reports", label: "Reports", icon: BarChart3 },
          { path: "/settings", label: "Settings", icon: Settings },
        ].map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all",
                isActive ? "text-indigo-600 scale-105" : "text-slate-400"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-black uppercase tracking-tighter">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Sidebar (Desktop Only) ────────────────────────── */}
      <motion.aside
        animate={{ width: isCollapsed ? 88 : 280 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="hidden md:flex flex-col bg-[#0f172a] text-white z-50 relative no-print shadow-2xl"
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center h-24 px-6 mb-4",
            isCollapsed && "justify-center px-0",
          )}
        >
          <Link to="/dashboard" className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-200 group overflow-hidden">
              <span className="text-white font-black text-xl tracking-tighter group-hover:scale-110 transition-transform">
                A
              </span>
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h1 className="text-lg font-black text-white leading-none tracking-tighter uppercase">
                  Artha
                </h1>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1 opacity-90">
                  Accounting
                </p>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Business Selector */}
        {!isCollapsed && (
          <div className="px-6 mb-8">
            <label htmlFor="business-select" className="sr-only">
              Select Business
            </label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-indigo-600" />
              <select
                id="business-select"
                value={currentBusiness?.id || ""}
                onChange={(e) => {
                  if (e.target.value === "__new__")
                    return navigate("/onboarding");
                  const b = businesses.find((x) => x.id === e.target.value);
                  if (b) setCurrentBusiness(b);
                }}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl pl-11 pr-10 py-3 text-[11px] font-black text-slate-200 uppercase tracking-widest appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.toUpperCase()}
                  </option>
                ))}
                <option value="__new__">⊕ ADD BUSINESS</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-8">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-3">
              {!isCollapsed && (
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-4">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem
                    key={item.path}
                    item={item}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile Footer */}
        <div className="p-5 border-t border-slate-100 mt-auto">
          <div
            className={cn(
              "flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group cursor-pointer",
              isCollapsed && "justify-center",
            )}
          >
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-900/40">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate uppercase tracking-tighter leading-none">
                    {user?.name}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 truncate mt-1.5 uppercase tracking-widest opacity-80">
                    Operations
                  </p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="p-2 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-10 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-xl hover:text-indigo-600 transition-all z-[60]"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </motion.aside>

      {/* ── Main Canvas ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-10 z-40 no-print sticky top-0">
          <div className="flex items-center gap-6">
            <div className="md:hidden w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">A</div>
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl w-64 md:w-80 group focus-within:ring-4 focus-within:ring-indigo-600/5 transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="search"
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-900 w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5" ref={quickAddRef}>
            <div className="relative">
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">ADD NEW</span>
              </button>
              <AnimatePresence>
                {showQuickAdd && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-3 w-56 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-3 z-50"
                  >
                    {QUICK_ACTIONS.map((a) => (
                      <Link
                        key={a.path}
                        to={a.path}
                        onClick={() => setShowQuickAdd(false)}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-slate-50 group transition-all"
                      >
                        <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-400">
                          <a.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                          {a.label}
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:block h-4 w-px bg-slate-200" />
            <button className="p-2 text-slate-400 hover:text-indigo-600 relative">
              <Bell className="w-5 h-5" />
            </button>
            <Link to="/settings" className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar relative">
          <div className="p-4 md:p-8 pb-32">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
