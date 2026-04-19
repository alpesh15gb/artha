import axios from 'axios';
import axiosRetry from 'axios-retry';

// Use the LAN IP discovered to connect Android/iOS to the local server
const API_BASE_URL = 'http://192.168.0.201:3001/api';

class ArthaService {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10s timeout
    });

    // Self-Healing: Automatic Retry for network errors or idempotent 5xx errors
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(`[API] Retry attempt #${retryCount} for ${requestConfig.url}. Error: ${error.message}`);
      }
    });

    // Centralized Error Handling & Meaningful Logs
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorData = {
          message: error.response?.data?.message || error.message,
          code: error.response?.status || 'NETWORK_ERROR',
          url: error.config?.url,
          timestamp: new Date().toISOString()
        };

        console.error(`[API ERROR] ${errorData.code} | ${errorData.url} | ${errorData.message}`);
        
        if (this.errorListener) {
          this.errorListener(errorData);
        }
        
        return Promise.reject(error);
      }
    );
  }

  setErrorListener(listener) {
    this.errorListener = listener;
  }

  setAuthToken(token) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  getToken() {
    return this.token;
  }

  // Auth
  async login(email, password) {
    const res = await this.client.post('/auth/login', { email, password });
    if (res.data.data?.token) {
      this.setAuthToken(res.data.data.token);
    }
    return res.data;
  }

  // Items
  async getItems(businessId) {
    const res = await this.client.get(`/items/business/${businessId}`);
    return res.data;
  }

  // Invoices
  async getInvoices(businessId) {
    const res = await this.client.get(`/invoices/business/${businessId}`);
    return res.data;
  }

  async getParties(businessId) {
    const res = await this.client.get(`/parties/business/${businessId}`);
    return res.data;
  }

  // Estimates
  async getEstimates(businessId) {
    const res = await this.client.get(`/estimates/business/${businessId}`);
    return res.data;
  }

  // Purchases
  async getPurchases(businessId) {
    const res = await this.client.get(`/purchases/business/${businessId}`);
    return res.data;
  }
}

export const arthaService = new ArthaService(API_BASE_URL);
