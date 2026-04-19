/**
 * Artha Sync Engine (Outbox Pattern)
 * Handles queuing and processing changes when offline.
 */

export class SyncEngine {
  constructor(storage, apiClient) {
    this.storage = storage; // localStorage, AsyncStorage, or SQLite
    this.apiClient = apiClient;
    this.outbox = [];
    this.isSyncing = false;
  }

  async queue(action, payload) {
    const entry = {
      id: Date.now().toString(),
      action,
      payload,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    
    this.outbox.push(entry);
    await this.saveOutbox();
    
    // Attempt immediate sync
    this.sync();
    return entry;
  }

  async sync() {
    if (this.isSyncing || this.outbox.length === 0) return;
    
    this.isSyncing = true;
    console.log('🔄 Sync starting...');
    
    for (const item of this.outbox) {
      try {
        await this.processItem(item);
        item.status = 'synced';
      } catch (error) {
        console.error('❌ Sync failed for item:', item.id, error);
        break; // Stop sync on error (network issue)
      }
    }
    
    this.outbox = this.outbox.filter(i => i.status !== 'synced');
    await this.saveOutbox();
    this.isSyncing = false;
    console.log('✅ Sync finished.');
  }

  async processItem(item) {
    // Logic to call API based on action
    switch (item.action) {
      case 'CREATE_INVOICE':
        return this.apiClient.createInvoice(item.payload);
      case 'UPDATE_ITEM':
        return this.apiClient.updateItem(item.payload.id, item.payload.data);
      default:
        throw new Error(`Unknown action: ${item.action}`);
    }
  }

  async saveOutbox() {
    if (this.storage.setItem) {
      await this.storage.setItem('artha_outbox', JSON.stringify(this.outbox));
    }
  }

  async loadOutbox() {
    if (this.storage.getItem) {
      const data = await this.storage.getItem('artha_outbox');
      this.outbox = data ? JSON.parse(data) : [];
    }
  }
}
