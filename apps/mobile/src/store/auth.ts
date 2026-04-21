import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, businessApi, User, Business } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  business: Business | null;
  businesses: Business[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  setBusiness: (business: Business) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  business: null,
  businesses: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password);
      const { user, token, business, businesses } = res.data;
      await AsyncStorage.setItem('artha-auth', JSON.stringify({ user, token, business }));
      set({ user, token, business, businesses, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Login failed', isLoading: false });
      throw error;
    }
  },

  register: async (data: { email: string; password: string; name?: string; phone?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(data);
      const { user, token, business, businesses } = res.data;
      await AsyncStorage.setItem('artha-auth', JSON.stringify({ user, token, business }));
      set({ user, token, business, businesses, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Registration failed', isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('artha-auth');
    set({ user: null, token: null, business: null, businesses: [], isAuthenticated: false });
  },

  loadAuth: async () => {
    set({ isLoading: true });
    try {
      const authStr = await AsyncStorage.getItem('artha-auth');
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth?.token) {
          // Set initial auth state
          set({ 
            user: auth.user, 
            token: auth.token, 
            business: auth.business, 
            isAuthenticated: true 
          });

          // Fetch fresh business list
          const res = await businessApi.list();
          const businesses = res.data || [];
          
          // If no business is currently selected but we have some, pick the first one
          let activeBusiness = auth.business;
          if (!activeBusiness && businesses.length > 0) {
            activeBusiness = businesses[0];
            await AsyncStorage.setItem('artha-auth', JSON.stringify({ 
              user: auth.user, 
              token: auth.token, 
              business: activeBusiness 
            }));
          }

          set({ businesses, business: activeBusiness, isLoading: false });
          return;
        }
      }
    } catch (error) {
      console.error('Load auth error:', error);
    }
    set({ isLoading: false });
  },

  setBusiness: (business: Business) => {
    set({ business });
    const { user, token } = get();
    AsyncStorage.setItem('artha-auth', JSON.stringify({ user, token, business }));
  },
}));