import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  ArrowLeft, Package, TrendingUp, TrendingDown,
  Clock, PackageCheck, AlertCircle, Info, ShoppingCart
} from 'lucide-react-native';

const ItemDetailScreen = ({ itemId, onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ item: null, history: [] });

  useEffect(() => { fetchHistory(); }, [itemId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await arthaService.client.get(`/items/${itemId}/history`);
      setData(res.data.data);
    } catch (e) {
      console.error('Fetch History:', e);
      Alert.alert('Error', 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isOut = item.type === 'SALE';
    return (
      <View style={[styles.historyRow, { borderBottomColor: 'rgba(0,0,0,0.05)' }]}>
         <View style={[styles.dotBox, { backgroundColor: isOut ? '#ef444415' : '#10b98115' }]}>
            {isOut ? <TrendingDown color="#ef4444" size={14} /> : <TrendingUp color="#10b981" size={14} />}
         </View>
         <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.histType, { color: theme.colors.text }]}>
                {item.type === 'SALE' ? 'Sold via Invoice' : 'Purchased via Bill'}
            </Text>
            <Text style={{ fontSize: 11, color: theme.colors.textDim }}>{item.ref} • {item.party}</Text>
         </View>
         <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.histQty, { color: isOut ? '#ef4444' : '#10b981' }]}>
                {item.qty > 0 ? '+' : ''}{item.qty}
            </Text>
            <Text style={{ fontSize: 10, color: theme.colors.textDim }}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
         </View>
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  const it = data.item;
  const isLow = it?.currentStock <= (it?.reorderLevel || 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Item Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hero}>
         <View style={[styles.heroIcon, { backgroundColor: theme.colors.primary + '15' }]}>
            <Package color={theme.colors.primary} size={32} />
         </View>
         <Text style={[styles.itemName, { color: theme.colors.text }]}>{it?.name}</Text>
         <Text style={{ color: theme.colors.textDim }}>SKU: {it?.sku || 'N/A'} • HSN: {it?.hsnCode || 'N/A'}</Text>
         
         <View style={styles.stockPanel}>
            <View style={styles.stat}>
                <Text style={styles.statVal}>{it?.currentStock}</Text>
                <Text style={styles.statLbl}>Stock Left</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.stat}>
                <Text style={[styles.statVal, { color: '#10b981' }]}>₹{it?.sellingPrice}</Text>
                <Text style={styles.statLbl}>Price</Text>
            </View>
         </View>

         {isLow && (
             <View style={styles.lowBadge}>
                 <AlertCircle color="#ef4444" size={14} />
                 <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginLeft: 6 }}>REORDER RECOMMENDED</Text>
             </View>
         )}
      </View>

      <View style={styles.histHeader}>
        <Clock size={16} color={theme.colors.textDim} />
        <Text style={[styles.histTitle, { color: theme.colors.textDim }]}>Stock Movement Timeline</Text>
      </View>

      <FlatList
        data={data.history}
        renderItem={renderItem}
        keyExtractor={(item, idx) => item.id + idx}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Info color="#ccc" size={40} />
                <Text style={{ color: theme.colors.textDim, marginTop: 12 }}>No movement history found</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  heroIcon: { width: 70, height: 70, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  itemName: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  stockPanel: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 20, marginTop: 24, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLbl: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
  statSep: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  lowBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef444415', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 16 },
  histHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, gap: 10 },
  histTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  list: { padding: 20, paddingBottom: 100 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  dotBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  histType: { fontSize: 14, fontWeight: '700' },
  histQty: { fontSize: 15, fontWeight: '800' }
});

export default ItemDetailScreen;
