import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, Alert, Share } from 'react-native';
import { invoiceApi, estimateApi, purchaseApi, partyApi, itemApi, Party, Item } from '../services/api';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type DocType = 'INVOICE' | 'ESTIMATE' | 'PURCHASE' | 'PURCHASE_ORDER' | 'SALE_ORDER';

export default function DocumentBuilderScreen({ route, navigation }: any) {
  const { id, type = 'INVOICE' } = route.params || {};
  const { business, token } = useAuthStore();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [docNumber, setDocNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  
  const [partiesModal, setPartiesModal] = useState(false);
  const [itemsModal, setItemsModal] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');

  const getApi = () => {
    switch (type) {
      case 'ESTIMATE': return estimateApi;
      case 'PURCHASE':
      case 'PURCHASE_ORDER': return purchaseApi;
      default: return invoiceApi;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'ESTIMATE': return 'Estimate';
      case 'PURCHASE': return 'Purchase';
      case 'PURCHASE_ORDER': return 'Purchase Order';
      case 'SALE_ORDER': return 'Sale Order';
      default: return 'Invoice';
    }
  };

  useEffect(() => {
    if (business?.id) {
      if (id) loadDocument();
      else generateDocNumber();
      loadData();
    }
  }, [id, business?.id]);

  const loadDocument = async () => {
    try {
      const api = getApi();
      const res = await api.get(id);
      const doc = res.data;
      if (!doc) throw new Error('Data not found');

      setDocNumber(doc.invoiceNumber || doc.estimateNumber || doc.purchaseNumber || '');
      if (doc.date) setDate(new Date(doc.date).toISOString().split('T')[0]);
      setSelectedParty(doc.party);
      
      setItems(doc.items.map((it: any) => ({
        itemId: it.itemId,
        item: it.item || { name: it.description || 'Ad-hoc Item' },
        quantity: it.quantity || 0,
        rate: it.rate || 0,
        taxRate: it.taxRate || (it.cgstRate + it.sgstRate + it.igstRate) || 0,
        amount: it.taxableAmount || (it.rate * it.quantity) || 0
      })));
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const generateDocNumber = () => {
    const prefix = type.substring(0, 3).toUpperCase();
    setDocNumber(`${prefix}-${Date.now().toString().slice(-6)}`);
  };

  const loadData = async () => {
    if (!business?.id) return;
    try {
      const partyType = (type === 'PURCHASE' || type === 'PURCHASE_ORDER') ? 'SUPPLIER' : 'CUSTOMER';
      const [pRes, iRes] = await Promise.all([
        partyApi.list(business.id, { type: partyType }),
        itemApi.list(business.id)
      ]);
      setParties(pRes.data);
      setAvailableItems(iRes.data);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const addItem = (item: Item) => {
    const newItem = {
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
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, it) => sum + (it.amount || 0), 0);
    const taxAmount = items.reduce((sum, it) => sum + ((it.amount || 0) * (it.taxRate || 0) / 100), 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSave = async () => {
    if (!selectedParty) return Alert.alert('Error', 'Please select a party');
    setSaving(true);
    const { subtotal, taxAmount, total } = calculateTotals();
    
    const data: any = {
      businessId: business?.id,
      date,
      partyId: selectedParty.id,
      items: items.map(it => ({
        itemId: it.itemId,
        quantity: it.quantity,
        rate: it.rate,
        taxRate: it.taxRate,
        amount: it.amount
      })),
      subtotal,
      totalAmount: total,
      status: 'DRAFT'
    };

    if (type === 'INVOICE') {
      data.invoiceNumber = docNumber;
      data.totalTax = taxAmount;
      data.balanceDue = total;
    } else if (type === 'ESTIMATE') {
      data.estimateNumber = docNumber;
      data.taxAmount = taxAmount;
    } else if (type === 'PURCHASE' || type === 'PURCHASE_ORDER') {
      data.purchaseNumber = docNumber;
      data.invoiceType = type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER' : 'PURCHASE_INVOICE';
      data.balanceDue = total;
    }

    try {
      const api = getApi();
      if (id) await api.update(id, data);
      else await api.create(data);
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!id) return Alert.alert('Notice', 'Please save the document first to share it.');
    setSharing(true);
    
    // Web backend endpoint (using /doc/ namespace to avoid 404 conflicts)
    const remoteUrl = `http://192.168.0.201:3001/api/download/doc/${type.toLowerCase()}/${id}?token=${encodeURIComponent(token || '')}`;
    const localUri = `${FileSystem.cacheDirectory}${type.toLowerCase()}_${id}.pdf`;
    console.log(`[DOWNLOAD DEBUG] URL: ${remoteUrl}`);

    try {
      // 1. Download the PDF file to local cache (token provided in query string)
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
      
      if (downloadRes.status !== 200) {
        throw new Error(`Failed to download PDF from server (Status: ${downloadRes.status})`);
      }

      // 2. share the LOCAL file (this sends the actual PDF file)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${getTitle()}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        // Fallback for web or non-sharing devices
        await Share.share({
          message: `Check out this ${getTitle()}: ${remoteUrl}`,
          url: remoteUrl
        });
      }
    } catch (error) {
      console.error('Sharing error:', error);
      Alert.alert('Error', 'Could not generate or share the PDF file. Please ensure you are connected to the server.');
    } finally {
      setSharing(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0284c7" /></View>;

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{id ? 'Edit' : 'New'} {getTitle()}</Text>
        {id && (
          <TouchableOpacity onPress={handleShare} disabled={sharing}>
            {sharing ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="share-variant" size={24} color="#fff" />}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.label}>{getTitle()} Number</Text>
          <TextInput style={styles.input} value={docNumber} onChangeText={setDocNumber} />
          <Text style={styles.label}>Date</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} />
        </View>

        <TouchableOpacity style={styles.partyPicker} onPress={() => setPartiesModal(true)}>
          <View style={styles.row}>
            <Icon name="account" size={24} color="#0284c7" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.label}>Bill To</Text>
              <Text style={selectedParty ? styles.partyName : styles.placeholder}>
                {selectedParty?.name || 'Select Customer/Supplier'}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#94a3b8" />
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Items</Text>
            <TouchableOpacity onPress={() => setItemsModal(true)} style={styles.addButton}>
              <Text style={styles.addText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.item?.name || item.description}</Text>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Icon name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.itemInputs}>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Qty</Text>
                  <TextInput style={styles.smallInput} keyboardType="numeric" value={String(item.quantity)} onChangeText={(v) => updateItemQuantity(index, v)} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Rate</Text>
                  <TextInput style={styles.smallInput} keyboardType="numeric" value={String(item.rate)} onChangeText={(v) => updateItemRate(index, v)} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.miniLabel}>Tax %</Text>
                  <TextInput style={styles.smallInput} keyboardType="numeric" value={String(item.taxRate)} onChangeText={(v) => updateItemTax(index, v)} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(taxAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandLabel}>Grand Total</Text>
            <Text style={styles.grandValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save {getTitle()}</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={partiesModal} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Party</Text>
            <TouchableOpacity onPress={() => setPartiesModal(false)}>
              <Icon name="close" size={28} />
            </TouchableOpacity>
          </View>
          <TextInput style={styles.search} placeholder="Search names..." value={search} onChangeText={setSearch} />
          <FlatList
            data={parties.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.partyItem} onPress={() => { setSelectedParty(item); setPartiesModal(false); }}>
                <Text style={styles.partyItemName}>{item.name}</Text>
                <Text style={styles.partyItemSub}>{item.phone || item.email}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      <Modal visible={itemsModal} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Item</Text>
            <TouchableOpacity onPress={() => setItemsModal(false)}>
              <Icon name="close" size={28} />
            </TouchableOpacity>
          </View>
          <TextInput style={styles.search} placeholder="Search items..." value={search} onChangeText={setSearch} />
          <FlatList
            data={availableItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.partyItem} onPress={() => addItem(item)}>
                <Text style={styles.partyItemName}>{item.name}</Text>
                <Text style={styles.partyItemSub}>{formatCurrency(item.rate)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#0284c7', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  form: { flex: 1, padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 16 },
  partyPicker: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  partyName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  placeholder: { fontSize: 16, color: '#94a3b8' },
  addButton: { padding: 4 },
  addText: { color: '#0284c7', fontWeight: 'bold' },
  itemRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  itemInputs: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  miniLabel: { fontSize: 10, color: '#94a3b8', marginBottom: 4 },
  smallInput: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 6, textAlign: 'center' },
  totalsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 40, elevation: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: '#64748b' },
  totalValue: { fontWeight: '600' },
  grandTotal: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  grandLabel: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  grandValue: { fontSize: 18, fontWeight: 'bold', color: '#0284c7' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelBtn: { flex: 1, padding: 16, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center' },
  cancelText: { color: '#64748b', fontWeight: 'bold' },
  saveBtn: { flex: 2, padding: 16, backgroundColor: '#0284c7', borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold' },
  modal: { flex: 1, backgroundColor: '#fff', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  search: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, marginBottom: 16 },
  partyItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  partyItemName: { fontSize: 16, fontWeight: 'bold' },
  partyItemSub: { fontSize: 12, color: '#64748b' },
});
