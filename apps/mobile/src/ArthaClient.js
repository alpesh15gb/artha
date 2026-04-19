import axios from 'axios';

// Use the LAN IP discovered to connect Android/iOS to the local server
const API_BASE_URL = 'http://192.168.0.201:3001/api';

class ArthaService {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
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
    // The API returns { success: true, data: { token: '...', user: {...} } }
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
    // If businessId is 'all', we might need to adjust or keep it
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
