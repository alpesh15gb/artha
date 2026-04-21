import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { itemApi, Item } from '../services/api';
import { useAuthStore } from '../store/auth';

export default function ItemsScreen({ navigation }: any) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const { business } = useAuthStore();
  
  const [form, setForm] = useState({ name: '', sku: '', hsnCode: '', unit: '', rate: 0, taxRate: 0, description: '' });

  const loadItems = async () => {
    if (!business?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await itemApi.list(business.id, params);
      setItems(res.data);
    } catch (error) {
      console.error('Load items error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [search, business?.id]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await itemApi.update(editingItem.id, form);
      } else {
        await itemApi.create({ ...form, businessId: business?.id });
      }
      setModalVisible(false);
      setEditingItem(null);
      setForm({ name: '', sku: '', hsnCode: '', unit: '', rate: 0, taxRate: 0, description: '' });
      loadItems();
    } catch (error) {
      console.error('Save item error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await itemApi.delete(id);
      loadItems();
    } catch (error) {
      console.error('Delete item error:', error);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setForm({ name: item.name, sku: item.sku || '', hsnCode: item.hsnCode || '', unit: item.unit || '', rate: item.rate, taxRate: item.taxRate || 0, description: item.description || '' });
    } else {
      setEditingItem(null);
      setForm({ name: '', sku: '', hsnCode: '', unit: '', rate: 0, taxRate: 0, description: '' });
    }
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)} onLongPress={() => handleDelete(item.id)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardPrice}>{formatCurrency(item.rate)}</Text>
      </View>
      {item.sku && <Text style={styles.cardText}>SKU: {item.sku}</Text>}
      {item.hsnCode && <Text style={styles.cardText}>HSN: {item.hsnCode}</Text>}
      {item.unit && <Text style={styles.cardText}>Unit: {item.unit}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Items</Text>
        <TextInput style={styles.search} placeholder="Search items..." value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <View style={styles.loading}><Text>Loading...</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add Item'}</Text>
            <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <TextInput style={styles.input} placeholder="SKU" value={form.sku} onChangeText={(v) => setForm({ ...form, sku: v })} />
            <TextInput style={styles.input} placeholder="HSN Code" value={form.hsnCode} onChangeText={(v) => setForm({ ...form, hsnCode: v })} />
            <TextInput style={styles.input} placeholder="Unit (e.g., kg, pcs, liter)" value={form.unit} onChangeText={(v) => setForm({ ...form, unit: v })} />
            <TextInput style={styles.input} placeholder="Rate" value={String(form.rate)} onChangeText={(v) => setForm({ ...form, rate: parseFloat(v) || 0 })} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Tax Rate (%)" value={String(form.taxRate)} onChangeText={(v) => setForm({ ...form, taxRate: parseFloat(v) || 0 })} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#f59e0b' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  search: { backgroundColor: '#fff', padding: 12, borderRadius: 8 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  cardPrice: { fontSize: 16, fontWeight: 'bold', color: '#f59e0b' },
  cardText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f59e0b', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});