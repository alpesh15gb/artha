import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert, Linking, Share
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  ShoppingBag, ArrowLeft, Plus, Download, Share2,
  Trash2, Search, Filter, ChevronRight
} from 'lucide-react-native';

const STATUS = {
  DRAFT:    { label: 'Draft',    color: '#94a3b8' },
  ORDERED:  { label: 'Ordered',  color: '#6366f1' },
  RECEIVED: { label: 'Received', color: '#10b981' },
  PARTIAL:  { label: 'Partial',  color: '#f59e0b' },
  PAID:     { label: 'Paid',     color: '#10b981' },
  CANCELLED:{ label: 'Cancelled',color: '#ef4444' },
};

const cfg = (s) => STATUS[s] || { label: s || 'Pending', color: '#f59e0b' };

const PurchasesScreen = ({ onBack, onCreate }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPurchases(); }, []);

  const fetchPurchases = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        const res = await arthaService.getPurchases(bizId);
        setPurchases(res.data || []);
      }
    } catch (e) {
      console.error('Fetch purchases:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deletePurchase = (id) => {
    Alert.alert('Confirm Delete', 'Delete this purchase? Stock will be reversed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await arthaService.client.delete(`/purchases/${id}`);
          fetchPurchases(true);
        } catch (e) { Alert.alert('Error', 'Failed to delete'); }
      }}
    ]);
  };

  const filtered = purchases.filter(p =>
    (p.purchaseNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.party?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const c = cfg(item.status);
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ShoppingBag color={theme.colors.primary} size={15} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textDim }}>{item.purchaseNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.color + '15' }]}>
            <Text style={[styles.badgeTxt, { color: c.color }]}>{c.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.party, { color: theme.colors.text }]} numberOfLines={1}>
              {item.party?.name || 'Unknown Supplier'}
            </Text>
            <Text style={{ color: theme.colors.textDim, fontSize: 12, marginTop: 2 }}>
              {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, { color: theme.colors.text }]}>₹{item.totalAmount?.toLocaleString('en-IN')}</Text>
            {item.balanceDue > 0 && <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold' }}>Unpaid: ₹{item.balanceDue}</Text>}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Details', `Supplier: ${item.party?.name}\nTotal: ₹${item.totalAmount}\nPaid: ₹${item.paidAmount}\nBalance: ₹${item.balanceDue}`)}>
             <Text style={[styles.actionTxt, { color: theme.colors.textDim }]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => deletePurchase(item.id)}>
             <Trash2 color="#ef444450" size={14} />
             <Text style={[styles.actionTxt, { color: '#ef444490' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Purchases</Text>
        <TouchableOpacity 
          style={[styles.iconBtn, { backgroundColor: theme.colors.primary }]} 
          onPress={onCreate}
        >
          <Plus color="white" size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Search color={theme.colors.textDim} size={18} />
          <TextInput
            placeholder="Search supplier or bill number…"
            placeholderTextColor={theme.colors.textDim}
            style={{ flex: 1, color: theme.colors.text, fontSize: 15, marginLeft: 10 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchPurchases(); }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <ShoppingBag color="#ccc" size={60} />
              <Text style={{ color: theme.colors.textDim, marginTop: 16 }}>No purchase records found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 20, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: 16 },
  list: { padding: 20, paddingBottom: 100 },
  card: { borderRadius: 24, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  party: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 17, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionTxt: { fontSize: 11, fontWeight: '700' }
});

export default PurchasesScreen;
