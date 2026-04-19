import { useEffect } from "react";
import { useLocation, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore, useBusinessStore } from "./store/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Parties from "./pages/Parties";
import Items from "./pages/Items";
import Invoices from "./pages/Invoices";
import InvoiceBuilder from "./pages/InvoiceBuilder";
import Estimates from "./pages/Estimates";
import EstimateBuilder from "./pages/EstimateBuilder";
import Purchases from "./pages/Purchases";
import PurchaseBuilder from "./pages/PurchaseBuilder";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Accounts from "./pages/Accounts";
import Reports from "./pages/Reports";
import Import from "./pages/Import";
import Settings from "./pages/Settings";
import SuperAdmin from "./pages/SuperAdmin";
import BusinessOnboarding from "./pages/BusinessOnboarding";
import Landing from "./pages/Landing";
import Tasks from "./pages/Tasks";
import Complaints from "./pages/Complaints";

function ProtectedRoute({ children }) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const { businesses, isLoading } = useBusinessStore();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Loading...</p>
      </div>
    );
  }

  if (businesses.length === 0 && !location.pathname.startsWith("/onboarding") && !location.pathname.startsWith("/superadmin")) {
    return <Navigate to="/onboarding" />;
  }

  return children;
}

function BuilderLayout({ children }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}

function App() {
  const { initAuth, isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  if (!isHydrated) return null;

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<ProtectedRoute><BusinessOnboarding /></ProtectedRoute>} />
      
      {/* Builder pages - no sidebar/header */}
      <Route path="/invoices/new" element={<ProtectedRoute><BuilderLayout><InvoiceBuilder /></BuilderLayout></ProtectedRoute>} />
      <Route path="/invoices/edit/:id" element={<ProtectedRoute><BuilderLayout><InvoiceBuilder /></BuilderLayout></ProtectedRoute>} />
      <Route path="/estimates/new" element={<ProtectedRoute><BuilderLayout><EstimateBuilder /></BuilderLayout></ProtectedRoute>} />
      <Route path="/estimates/edit/:id" element={<ProtectedRoute><BuilderLayout><EstimateBuilder /></BuilderLayout></ProtectedRoute>} />
      <Route path="/purchases/new" element={<ProtectedRoute><BuilderLayout><PurchaseBuilder /></BuilderLayout></ProtectedRoute>} />
      <Route path="/purchases/edit/:id" element={<ProtectedRoute><BuilderLayout><PurchaseBuilder /></BuilderLayout></ProtectedRoute>} />
      
      {/* Main app with sidebar/header */}
      <Route path="/*" element={<ProtectedRoute><Layout><Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/parties" element={<Parties />} />
        <Route path="/items" element={<Items />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/estimates" element={<Estimates />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/import" element={<Import />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/superadmin" element={<SuperAdmin />} />
      </Routes></Layout></ProtectedRoute>} />
    </Routes>
  );
}

export default App;