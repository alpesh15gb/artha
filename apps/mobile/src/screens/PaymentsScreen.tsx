import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { paymentApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function PaymentsScreen({ navigation }: any) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { business } = useAuthStore();

  const loadPayments = async () => {
    if (!business?.id) return;
    try {
      const res = await paymentApi.list(business.id);
      setPayments(res.data);
    } catch (error) {
      console.error('Load payments error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [business?.id]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: item.type === 'IN' ? '#10b98120' : '#ef444420' }]}>
          <Icon name={item.type === 'IN' ? 'arrow-down-bold' : 'arrow-up-bold'} size={24} color={item.type === 'IN' ? '#10b981' : '#ef4444'} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.partyName}>{item.party?.name || 'Cash Transaction'}</Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleDateString()} \u2022 {item.paymentMode}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amount, { color: item.type === 'IN' ? '#10b981' : '#ef4444' }]}>
            {item.type === 'IN' ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <Text style={styles.ref}>{item.reference || 'No Ref'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Payments</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#10b981" />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPayments(); }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="cash-off" size={64} color="#e2e8f0" />
              <Text style={styles.emptyText}>No payments found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#10b981', padding: 20, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  partyName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  date: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  ref: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontSize: 16 },
});
