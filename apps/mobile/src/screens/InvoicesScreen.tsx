import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { invoiceApi, Invoice } from '../services/api';
import { useAuthStore } from '../store/auth';

export default function InvoicesScreen({ navigation }: any) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const { business } = useAuthStore();

  const loadInvoices = async () => {
    if (!business?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const params: any = {};
      if (filter) params.status = filter;
      const res = await invoiceApi.list(business.id, params);
      setInvoices(res.data);
    } catch (error) {
      console.error('Load invoices error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [filter, business?.id]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return '#10b981';
      case 'SENT': return '#0284c7';
      case 'PARTIAL': return '#f59e0b';
      case 'OVERDUE': return '#ef4444';
      default: return '#64748b';
    }
  };

  const renderItem = ({ item }: { item: Invoice }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('InvoiceBuilder', { id: item.id })}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.invoiceNumber}</Text>
        <Text style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) }]}>{item.status}</Text>
      </View>
      <Text style={styles.cardText}>{item.party?.name}</Text>
      <Text style={styles.cardText}>Date: {formatDate(item.date)}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardTotal}>{formatCurrency(item.total)}</Text>
        <Text style={styles.cardPaid}>Paid: {formatCurrency(item.paidAmount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <View style={styles.filters}>
          {(['', 'DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE'] as const).map((f) => (
            <TouchableOpacity key={f || 'ALL'} style={[styles.filterButton, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f || 'ALL'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}><Text>Loading...</Text></View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInvoices(); }} />}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('InvoiceBuilder', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#8b5cf6' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterActive: { backgroundColor: '#fff' },
  filterText: { color: '#fff', fontSize: 10 },
  filterTextActive: { color: '#8b5cf6' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  badge: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  cardText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardTotal: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  cardPaid: { fontSize: 12, color: '#10b981' },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: '#fff' },
});