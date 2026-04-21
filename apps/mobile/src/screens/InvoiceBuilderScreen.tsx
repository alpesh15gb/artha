import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { invoiceApi, partyApi, itemApi, Party, Item, InvoiceItem } from '../services/api';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';

export default function InvoiceBuilderScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const { business } = useAuthStore();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  const [partiesModal, setPartiesModal] = useState(false);
  const [itemsModal, setItemsModal] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (business?.id) {
      if (id) {
        loadInvoice();
      } else {
        generateInvoiceNumber();
      }
      loadData();
    }
  }, [id, business?.id]);

  const loadInvoice = async () => {
    try {
      console.log('Fetching invoice ID:', id);
      const res = await invoiceApi.get(id);
      console.log('Invoice data fetched:', JSON.stringify(res.data, null, 2));
      const inv = res.data;
      
      if (!inv) throw new Error('Invoice data not found');

      setInvoiceNumber(inv.invoiceNumber || '');
      
      if (inv.date) {
        const dateStr = typeof inv.date === 'string' ? inv.date : new Date(inv.date).toISOString();
        setDate(dateStr.split('T')[0]);
      }

      // Ensure we set the selected party correctly
      if (inv.party) {
        setSelectedParty(inv.party);
        console.log('Selected Party:', inv.party.name);
      }

      if (inv.items) {
        setItems(inv.items.map((it: any) => ({
          itemId: it.itemId,
          item: it.item || { name: it.description || 'Ad-hoc Item' },
          quantity: it.quantity || 0,
          rate: it.rate || 0,
          taxRate: it.taxRate || (it.cgstRate + it.sgstRate + it.igstRate) || 0,
          amount: it.taxableAmount || (it.rate * it.quantity) || 0
        })));
      }
    } catch (error) {
      console.error('Load invoice error:', error);
      Alert.alert('Error', 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
  };

  const loadData = async () => {
    if (!business?.id) return;
    try {
      const [pRes, iRes] = await Promise.all([
        partyApi.list(business.id, { type: 'CUSTOMER' }),
        itemApi.list(business.id)
      ]);
      setParties(pRes.data);
      setAvailableItems(iRes.data);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const addItem = (item: Item) => {
    const newItem: Partial<InvoiceItem> = {
      itemId: item.id,
      item: item,
      quantity: 1,
      rate: item.rate,
      taxRate: item.taxRate || 0,
      amount: item.rate
    };
    setItems([...items, newItem]);
    setItemsModal(false);
  };

  const updateItemQuantity = (index: number, qty: string) => {
    const newItems = [...items];
    const q = parseFloat(qty) || 0;
    newItems[index].quantity = q;
    newItems[index].amount = q * (newItems[index].rate || 0);
    setItems(newItems);
  };

  const updateItemRate = (index: number, rate: string) => {
    const newItems = [...items];
    const r = parseFloat(rate) || 0;
    newItems[index].rate = r;
    newItems[index].amount = (newItems[index].quantity || 0) * r;
    setItems(newItems);
  };

  const updateItemTax = (index: number, tax: string) => {
    const newItems = [...items];
    newItems[index].taxRate = parseFloat(tax) || 0;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const taxAmount = items.reduce((sum, it) => sum + ((it.amount || 0) * (it.taxRate || 0) / 100), 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSave = async () => {
    if (!selectedParty) return Alert.alert('Error', 'Please select a party');
    if (items.length === 0) return Alert.alert('Error', 'Please add at least one item');

    setSaving(true);
    const { subtotal, taxAmount, total } = calculateTotals();
    const data: any = {
      invoiceNumber,
      date,
      partyId: selectedParty.id,
      businessId: business?.id,
      items: items.map(it => ({
        itemId: it.itemId,
        quantity: it.quantity,
        rate: it.rate,
        taxRate: it.taxRate,
        amount: it.amount
      })),
      subtotal,
      taxAmount,
      total,
      paidAmount: 0,
      status: 'DRAFT'
    };

    try {
      if (id) {
        await invoiceApi.update(id, data);
      } else {
        await invoiceApi.create(data);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Save invoice error:', error);
      Alert.alert('Error', 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.label}>Invoice Details</Text>
          <TextInput style={styles.input} placeholder="Invoice Number" value={invoiceNumber} onChangeText={setInvoiceNumber} />
          <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        </View>

        <TouchableOpacity style={styles.partyPicker} onPress={() => setPartiesModal(true)}>
          <Text style={styles.label}>Bill To</Text>
          {selectedParty ? (
            <View>
              <Text style={styles.partyName}>{selectedParty.name}</Text>
              <Text style={styles.partySub}>{selectedParty.phone || selectedParty.email}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>Select a Customer</Text>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Items</Text>
            <TouchableOpacity onPress={() => setItemsModal(true)}>
              <Text style={styles.addText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.item?.name || item.description}</Text>
                <View style={styles.itemInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>Qty</Text>
                    <TextInput
                      style={styles.smallInput}
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={(v) => updateItemQuantity(index, v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>Rate</Text>
                    <TextInput
                      style={styles.smallInput}
                      keyboardType="numeric"
                      value={String(item.rate)}
                      onChangeText={(v) => updateItemRate(index, v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.miniLabel}>Tax %</Text>
                    <TextInput
                      style={styles.smallInput}
                      keyboardType="numeric"
                      value={String(item.taxRate)}
                      onChangeText={(v) => updateItemTax(index, v)}
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.deleteBtn}>
                <Icon name="delete-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>{formatCurrency(taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Invoice</Text>}
        </TouchableOpacity>
      </View>

      {/* Partis Modal */}
      <Modal visible={partiesModal} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Customer</Text>
          <FlatList
            data={parties}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedParty(item); setPartiesModal(false); }}>
                <Text style={styles.modalItemText}>{item.name}</Text>
                <Text style={styles.modalItemSub}>{item.phone}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setPartiesModal(false)}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Items Modal */}
      <Modal visible={itemsModal} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Item</Text>
          <FlatList
            data={availableItems}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => addItem(item)}>
                <Text style={styles.modalItemText}>{item.name}</Text>
                <Text style={styles.modalItemSub}>{formatCurrency(item.rate)}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setItemsModal(false)}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { flex: 1, padding: 16 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  partyPicker: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  partyName: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  partySub: { fontSize: 14, color: '#64748b' },
  placeholder: { color: '#94a3b8' },
  addText: { color: '#8b5cf6', fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  itemInputs: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' },
  smallInput: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, fontSize: 14, textAlign: 'center' },
  deleteBtn: { padding: 8, marginLeft: 8 },
  totals: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 32, elevation: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  grandTotal: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: '#8b5cf6' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 8, backgroundColor: '#f1f5f9' },
  saveBtn: { flex: 2, padding: 16, alignItems: 'center', borderRadius: 8, backgroundColor: '#8b5cf6' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  modalContent: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemText: { fontSize: 16, fontWeight: '500' },
  modalItemSub: { fontSize: 12, color: '#64748b' },
  closeBtn: { marginTop: 16, padding: 16, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8 },
  closeBtnText: { fontWeight: '600' },
});
