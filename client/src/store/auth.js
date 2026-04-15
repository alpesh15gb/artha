import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, token } = response.data.data;
        set({ user, token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return response.data;
      },

      register: async (email, password, name) => {
        const response = await api.post('/auth/register', { email, password, name });
        const { user, token } = response.data.data;
        set({ user, token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return response.data;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
        }
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
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
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export const useBusinessStore = create(
  persist(
    (set, get) => ({
      currentBusiness: null,
      businesses: [],

      setCurrentBusiness: (business) => set({ currentBusiness: business }),

      fetchBusinesses: async () => {
        const response = await api.get('/businesses');
        set({ businesses: response.data.data });
        if (!get().currentBusiness && response.data.data.length > 0) {
          set({ currentBusiness: response.data.data[0] });
        }
        return response.data.data;
      },
    }),
    {
      name: 'artha-business',
      partialize: (state) => ({ currentBusiness: state.currentBusiness, businesses: state.businesses }),
    }
  )
);
