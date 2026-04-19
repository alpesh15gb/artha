import axios from 'axios';
import axiosRetry from 'axios-retry';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Self-Healing: Auto-retry for network/idempotent errors
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});

api.interceptors.request.use((config) => {
  try {
    const auth = localStorage.getItem('artha-auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      const token = parsed?.state?.token;
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
  (error) => {
    // Meaningful Logs for Desktop Debugging
    const errObj = {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
      method: error.config?.method
    };
    console.error(`[SYSTEM-ERROR] ${errObj.status} | ${errObj.method} ${errObj.url} | ${errObj.message}`);

    if (error.response?.status === 401) {
      localStorage.removeItem('artha-auth');
      window.location.hash = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
