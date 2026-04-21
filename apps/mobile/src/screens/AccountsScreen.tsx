import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { accountApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function AccountsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const { business } = useAuthStore();

  const loadAccounts = async () => {
    if (!business?.id) return;
    try {
      const res = await accountApi.list(business.id);
      setAccounts(res.data || []);
    } catch (error) {
      console.error('Load accounts error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [business?.id]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Icon name={item.accountType === 'CASH' ? 'cash' : 'bank'} size={24} color="#0284c7" />
      </View>
      <View style={styles.details}>
        <Text style={styles.name}>{item.name || item.bankName}</Text>
        <Text style={styles.type}>{item.accountNumber ? `****${item.accountNumber.slice(-4)}` : item.accountType}</Text>
      </View>
      <View style={styles.balanceContainer}>
        <Text style={[styles.balance, { color: item.currentBalance >= 0 ? '#10b981' : '#ef4444' }]}>
          {formatCurrency(item.currentBalance)}
        </Text>
        <Text style={styles.label}>Current Balance</Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0284c7" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bank Accounts</Text>
        <Text style={styles.subtitle}>In sync with your web app</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAccounts(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="bank-off-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No accounts found on the web app.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  list: { padding: 16 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 2 
  },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  details: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  type: { fontSize: 12, color: '#64748b', marginTop: 2 },
  balanceContainer: { alignItems: 'flex-end' },
  balance: { fontSize: 16, fontWeight: 'bold' },
  label: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' },
  empty: { marginTop: 100, alignItems: 'center' },
  emptyText: { marginTop: 16, color: '#64748b', fontSize: 16 },
});
