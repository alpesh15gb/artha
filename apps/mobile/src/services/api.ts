import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your computer's local IP address for physical device testing
const API_BASE_URL = 'http://192.168.0.201:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  try {
    const authStr = await AsyncStorage.getItem('artha-auth');
    if (authStr) {
      const auth = JSON.parse(authStr);
      const token = auth?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.error('Auth interception failed', err);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('artha-auth');
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logo?: string;
  settings?: {
    currency?: string;
    currencySymbol?: string;
    themeColor?: string;
    invoicePrefix?: string;
    showBankDetails?: boolean;
  };
}

export interface Party {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  state?: string;
  openingBalance?: number;
}

export interface Item {
  id: string;
  name: string;
  sku?: string;
  hsn?: string;
  unit?: string;
  rate: number;
  taxRate?: number;
  description?: string;
  openingStock?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  partyId: string;
  party?: Party;
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'PARTIAL';
}

export interface InvoiceItem {
  id: string;
  itemId: string;
  item?: Item;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

export interface Expense {
  id: string;
  partyId?: string;
  party?: Party;
  amount: number;
  date: string;
  description?: string;
  category?: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  mode?: string;
  reference?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalReceivable: number;
  totalPayable: number;
  invoiceCount: number;
  partyCount: number;
  itemCount: number;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (data: { email: string; password: string; name?: string; phone?: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const businessApi = {
  list: async () => {
    const res = await api.get('/businesses');
    return res.data;
  },
  create: async (data: Business) => {
    const res = await api.post('/businesses', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Business>) => {
    const res = await api.put(`/businesses/${id}`, data);
    return res.data;
  },
};

export const reportApi = {
  dashboard: async (businessId: string) => {
    const res = await api.get(`/reports/business/${businessId}/dashboard`);
    return res.data;
  },
  salesRegister: async (businessId: string, params?: any) => {
    const res = await api.get(`/reports/business/${businessId}/sales-register`, { params });
    return res.data;
  },
  purchaseRegister: async (businessId: string, params?: any) => {
    const res = await api.get(`/reports/business/${businessId}/purchase-register`, { params });
    return res.data;
  },
  outstanding: async (businessId: string, params?: any) => {
    const res = await api.get(`/reports/business/${businessId}/outstanding`, { params });
    return res.data;
  },
};

export const partyApi = {
  list: async (businessId: string, params?: any) => {
    const res = await api.get(`/parties/business/${businessId}`, { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/parties/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/parties', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/parties/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/parties/${id}`);
    return res.data;
  },
};

export const itemApi = {
  list: async (businessId: string, params?: any) => {
    const res = await api.get(`/items/business/${businessId}`, { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/items/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/items', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/items/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/items/${id}`);
    return res.data;
  },
};

export const invoiceApi = {
  list: async (businessId: string, params?: any) => {
    const res = await api.get(`/invoices/business/${businessId}`, { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/invoices', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/invoices/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },
};

export const expenseApi = {
  list: async (businessId: string, params?: any) => {
    const res = await api.get(`/expenses/business/${businessId}`, { params });
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/expenses', data);
    return res.data;
  },
};

export const estimateApi = {
  list: async (businessId: string, params?: any) => {
    const res = await api.get(`/estimates/business/${businessId}`, { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/estimates/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/estimates', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/estimates/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/estimates/${id}`);
    return res.data;
  },
};

export const purchaseApi = {
  list: async (businessId: string, params?: any) => {
    const res = await api.get(`/purchases/business/${businessId}`, { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/purchases/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/purchases', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/purchases/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/purchases/${id}`);
    return res.data;
  },
};

export const accountApi = {
  list: async (businessId: string) => {
    const res = await api.get(`/accounts/business/${businessId}`);
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/accounts/${id}`);
    return res.data;
  },
};

export default api;