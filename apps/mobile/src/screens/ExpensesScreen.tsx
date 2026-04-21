import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, ActivityIndicator } from 'react-native';
import { expenseApi, Expense, partyApi, Party } from '../services/api';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const { business } = useAuthStore();

  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'General',
    type: 'EXPENSE' as const,
    partyId: ''
  });

  const loadExpenses = async () => {
    if (!business?.id) return;
    try {
      const res = await expenseApi.list(business.id);
      setExpenses(res.data);
    } catch (error) {
      console.error('Load expenses error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadParties = async () => {
    if (!business?.id) return;
    try {
      const res = await partyApi.list(business.id, { type: 'SUPPLIER' });
      setParties(res.data);
    } catch (error) {
      console.error('Load parties error:', error);
    }
  };

  useEffect(() => {
    loadExpenses();
    loadParties();
  }, [business?.id]);

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await expenseApi.create({
        ...form,
        businessId: business.id,
        amount: parseFloat(form.amount) || 0
      });
      setModalVisible(false);
      setForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'General',
        type: 'EXPENSE',
        partyId: ''
      });
      loadExpenses();
    } catch (error) {
      console.error('Save expense error:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name={item.type === 'EXPENSE' ? 'minus-circle-outline' : 'plus-circle-outline'} size={24} color={item.type === 'EXPENSE' ? '#ef4444' : '#10b981'} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardDesc}>{item.description || 'No Description'}</Text>
        <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.cardAmount, { color: item.type === 'EXPENSE' ? '#ef4444' : '#10b981' }]}>
        {item.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(item.amount)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExpenses(); }} />}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Amount" 
              keyboardType="numeric" 
              value={form.amount} 
              onChangeText={v => setForm({ ...form, amount: v })} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Description" 
              value={form.description} 
              onChangeText={v => setForm({ ...form, description: v })} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Category" 
              value={form.category} 
              onChangeText={v => setForm({ ...form, category: v })} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Date (YYYY-MM-DD)" 
              value={form.date} 
              onChangeText={v => setForm({ ...form, date: v })} 
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#ef4444' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
  cardIcon: { marginRight: 16 },
  cardContent: { flex: 1 },
  cardDesc: { fontSize: 16, fontWeight: '500', color: '#1e293b' },
  cardDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold' },
});
