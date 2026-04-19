import React from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useBusinessStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Parties from './pages/Parties';
import Items from './pages/Items';
import Invoices from './pages/Invoices';
import InvoiceBuilder from './pages/InvoiceBuilder';
import Estimates from './pages/Estimates';
import EstimateBuilder from './pages/EstimateBuilder';
import Purchases from './pages/Purchases';
import PurchaseBuilder from './pages/PurchaseBuilder';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import Import from './pages/Import';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import BusinessOnboarding from './pages/BusinessOnboarding';
import Landing from './pages/Landing';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const { businesses, isLoading } = useBusinessStore();
  const location = useLocation();

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-indigo-200 font-bold uppercase tracking-widest text-[10px]">Restoring Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Wait for businesses to load before making redirection decisions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-indigo-200 font-bold uppercase tracking-widest text-[10px]">Initializing Workspace...</p>
      </div>
    );
  }

  // If authenticated but no businesses, and not already on onboarding or superadmin
  if (businesses.length === 0 && 
      !location.pathname.startsWith('/onboarding') && 
      !location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/onboarding" />;
  }

  return children;
}

function App() {
  const { initAuth, isAuthenticated, isHydrated } = useAuthStore();

  React.useEffect(() => {
    initAuth();
  }, []);

  if (!isHydrated) return null;

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<ProtectedRoute><BusinessOnboarding /></ProtectedRoute>} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/parties" element={<Parties />} />
                <Route path="/items" element={<Items />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceBuilder />} />
                <Route path="/invoices/edit/:id" element={<InvoiceBuilder />} />
                <Route path="/estimates" element={<Estimates />} />
                <Route path="/estimates/new" element={<EstimateBuilder />} />
                <Route path="/estimates/edit/:id" element={<EstimateBuilder />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/purchases/new" element={<PurchaseBuilder />} />
                <Route path="/purchases/edit/:id" element={<PurchaseBuilder />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/import" element={<Import />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/superadmin" element={<SuperAdmin />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
