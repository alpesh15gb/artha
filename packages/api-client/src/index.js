import axios from 'axios';

class ArthaClient {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Items
  async getItems(businessId) {
    const res = await this.client.get(`/items/business/${businessId}`);
    return res.data;
  }

  async createItem(itemData) {
    const res = await this.client.post('/items', itemData);
    return res.data;
  }

  // Invoices
  async getInvoices(businessId) {
    const res = await this.client.get(`/invoices/business/${businessId}`);
    return res.data;
  }

  // Parties
  async getParties(businessId) {
    const res = await this.client.get(`/parties/business/${businessId}`);
    return res.data;
  }
}

export const createClient = (baseURL) => new ArthaClient(baseURL);
