import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
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

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
