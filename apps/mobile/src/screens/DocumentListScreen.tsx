import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { invoiceApi, estimateApi, purchaseApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

type DocType = 'INVOICE' | 'ESTIMATE' | 'PURCHASE' | 'PURCHASE_ORDER';

export default function DocumentListScreen({ route, navigation }: any) {
  const { type = 'INVOICE' } = route.params || {};
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { business } = useAuthStore();

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
      case 'ESTIMATE': return 'Estimates';
      case 'PURCHASE': return 'Purchases';
      case 'PURCHASE_ORDER': return 'Purchase Orders';
      default: return 'Invoices';
    }
  };

  const loadDocs = async () => {
    if (!business?.id) return;
    try {
      const api = getApi();
      const params: any = {};
      if (search) params.search = search;
      if (type === 'PURCHASE_ORDER') params.invoiceType = 'PURCHASE_ORDER';
      if (type === 'PURCHASE') params.invoiceType = 'PURCHASE_INVOICE';
      
      const res = await api.list(business.id, params);
      setDocs(res.data);
    } catch (error) {
      console.error('Load docs error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [business?.id, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'ACCEPTED':
      case 'RECEIVED': return '#10b981';
      case 'PARTIAL': return '#f59e0b';
      case 'SENT': return '#0284c7';
      default: return '#64748b';
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('DocumentBuilder', { id: item.id, type })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardId}>{item.invoiceNumber || item.estimateNumber || item.purchaseNumber}</Text>
          <Text style={styles.cardParty}>{item.party?.name || 'Cash Customer'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
        <Text style={styles.cardAmount}>{formatCurrency(item.totalAmount)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{getTitle()}</Text>
          <View style={{ width: 32 }} />
        </View>
        <TextInput 
          style={styles.search} 
          placeholder={`Search ${getTitle().toLowerCase()}...`} 
          value={search} 
          onChangeText={setSearch} 
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0284c7" />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocs(); }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="file-search-outline" size={64} color="#e2e8f0" />
              <Text style={styles.emptyText}>No {getTitle().toLowerCase()} found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('DocumentBuilder', { type })}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0284c7', padding: 16, paddingTop: 50 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  search: { backgroundColor: '#fff', padding: 12, borderRadius: 12 },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardId: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardParty: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  cardDate: { fontSize: 12, color: '#94a3b8' },
  cardAmount: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
});
