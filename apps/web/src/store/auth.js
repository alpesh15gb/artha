import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, token } = response.data.data;
        set({ user, token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Refresh businesses for the new user
        await useBusinessStore.getState().fetchBusinesses(true);
        
        return response.data;
      },

      register: async (email, password, name) => {
        const response = await api.post('/auth/register', { email, password, name });
        const { user, token, business } = response.data.data;
        set({ user, token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Also set current business
        if (business) {
          useBusinessStore.getState().setCurrentBusiness(business);
          useBusinessStore.getState().fetchBusinesses();
        }
        
        return response.data;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
        }
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
        // Clear business data too
        useBusinessStore.getState().clearBusinessData();
      },

      initAuth: () => {
        const token = get().token;
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },
    }),
    {
      name: 'artha-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const useBusinessStore = create(
  persist(
    (set, get) => ({
      currentBusiness: null,
      businesses: [],
      isLoading: false,
      settings: {},
      setSettings: (settings) => set({ settings }),

      setCurrentBusiness: (business) => set({ currentBusiness: business }),
      clearBusinessData: () => set({ currentBusiness: null, businesses: [] }),

      fetchBusinesses: async (forceSelectFirst = false) => {
        set({ isLoading: true });
        try {
          const response = await api.get('/businesses');
          const businesses = response.data.data;
          set({ businesses, isLoading: false });
          
          const current = get().currentBusiness;
          const isValid = current && businesses.some(b => b.id === current.id);
          
          if (forceSelectFirst || !isValid) {
            if (businesses.length > 0) {
              set({ currentBusiness: businesses[0] });
            } else {
              set({ currentBusiness: null });
            }
          }
          return businesses;
        } catch (error) {
          set({ isLoading: false });
          if (error.response?.status === 401) {
             set({ currentBusiness: null, businesses: [] });
          }
          throw error;
        }
      },
    }),
    {
      name: 'artha-business',
      partialize: (state) => ({ currentBusiness: state.currentBusiness, businesses: state.businesses }),
    }
  )
);
