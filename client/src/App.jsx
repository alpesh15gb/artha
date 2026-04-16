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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const { businesses, currentBusiness } = useBusinessStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
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
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<ProtectedRoute><BusinessOnboarding /></ProtectedRoute>} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
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
