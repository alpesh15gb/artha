import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert, Modal
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  Package, ArrowLeft, Plus, Search, Warehouse,
  TrendingUp, TrendingDown, AlertCircle, X, Check
} from 'lucide-react-native';

const InventoryScreen = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Stock adjustment modal
  const [adjustModal, setAdjustModal] = useState(null);  // item being adjusted
  const [adjQty, setAdjQty] = useState('');
  const [adjType, setAdjType] = useState('IN');  // IN or OUT
  const [adjReason, setAdjReason] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // Add new item modal  
  const [addModal, setAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', unit: 'PCS', sellingPrice: '', purchasePrice: '', gstRate: '18', hsnCode: '', openingStock: '0' });
  const [addSaving, setAddSaving] = useState(false);
  const [bizId, setBizId] = useState(null);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const id = bizRes.data.data?.[0]?.id;
      if (id) {
        setBizId(id);
        const res = await arthaService.getItems(id);
        setItems(res.data || []);
      }
    } catch (e) { console.error('Inventory fetch:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const adjustStock = async () => {
    const qty = parseInt(adjQty);
    if (!qty || qty <= 0) return Alert.alert('Error', 'Enter a valid quantity');
    setAdjSaving(true);
    try {
      await arthaService.client.post(`/items/${adjustModal.id}/stock`, {
        type: adjType,
        quantity: qty,
        reason: adjReason || (adjType === 'IN' ? 'Stock Added' : 'Stock Reduced'),
      });
      Alert.alert('✅ Stock Updated');
      setAdjustModal(null); setAdjQty(''); setAdjReason('');
      fetchInventory(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Stock adjustment failed');
    } finally { setAdjSaving(false); }
  };

  const createItem = async () => {
    if (!newItem.name.trim()) return Alert.alert('Error', 'Item name is required');
    if (!newItem.sellingPrice) return Alert.alert('Error', 'Selling price is required');
    setAddSaving(true);
    try {
      await arthaService.client.post('/items', {
        businessId: bizId,
        name: newItem.name,
        unit: newItem.unit,
        sellingPrice: parseFloat(newItem.sellingPrice) || 0,
        purchasePrice: parseFloat(newItem.purchasePrice) || 0,
        gstRate: parseFloat(newItem.gstRate) || 0,
        hsnCode: newItem.hsnCode,
        currentStock: parseInt(newItem.openingStock) || 0,
        itemType: 'PRODUCT',
      });
      Alert.alert('✅ Item Added');
      setAddModal(false);
      setNewItem({ name: '', unit: 'PCS', sellingPrice: '', purchasePrice: '', gstRate: '18', hsnCode: '', openingStock: '0' });
      fetchInventory(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create item');
    } finally { setAddSaving(false); }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.hsnCode || '').includes(search)
  );

  const renderItem = ({ item }) => {
    const low = item.currentStock <= (item.reorderLevel || 5);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => onSelectItem && onSelectItem(item.id)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.icon, { backgroundColor: theme.colors.primary + '15' }]}>
            <Package color={theme.colors.primary} size={20} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.itemName, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={{ color: theme.colors.textDim, fontSize: 12 }}>
              HSN: {item.hsnCode || '–'}  •  GST: {item.gstRate || 0}%
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.stockNum, { color: low ? theme.colors.error : theme.colors.success }]}>
              {item.currentStock} {item.unit || 'PCS'}
            </Text>
            {low && <Text style={{ fontSize: 9, color: theme.colors.error, fontWeight: '700' }}>LOW STOCK</Text>}
          </View>
        </View>
        <View style={styles.cardFoot}>
          <View>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={[styles.price, { color: theme.colors.text }]}>₹{item.sellingPrice?.toLocaleString()}</Text>
          </View>
          <View style={styles.sep} />
          <View>
            <Text style={styles.priceLabel}>Purchase Price</Text>
            <Text style={[styles.price, { color: theme.colors.text }]}>₹{item.purchasePrice?.toLocaleString()}</Text>
          </View>
          <View style={styles.sep} />
          <View>
            <Text style={styles.priceLabel}>Margin</Text>
            <Text style={[styles.price, { color: '#10b981' }]}>
              {item.purchasePrice > 0
                ? `${(((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(0)}%`
                : '–'}
            </Text>
          </View>
        </View>
        {/* Quick adjust buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.adjBtn, { backgroundColor: '#10b98120' }]}
            onPress={() => { setAdjustModal(item); setAdjType('IN'); setAdjQty(''); setAdjReason(''); }}
          >
            <TrendingUp color='#10b981' size={14} />
            <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Add Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.adjBtn, { backgroundColor: '#ef444420' }]}
            onPress={() => { setAdjustModal(item); setAdjType('OUT'); setAdjQty(''); setAdjReason(''); }}
          >
            <TrendingDown color='#ef4444' size={14} />
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Reduce Stock</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Inventory</Text>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setAddModal(true)}>
          <Plus color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Search color={theme.colors.textDim} size={18} />
          <TextInput
            placeholder="Search items or HSN…"
            placeholderTextColor={theme.colors.textDim}
            style={{ flex: 1, color: theme.colors.text, fontSize: 15, marginLeft: 8 }}
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
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchInventory(); }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Warehouse color="#ccc" size={64} />
              <Text style={{ color: theme.colors.textDim, marginTop: 16 }}>No items found</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setAddModal(true)}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal visible={!!adjustModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Adjust Stock</Text>
              <TouchableOpacity onPress={() => setAdjustModal(null)}>
                <X color={theme.colors.textDim} size={24} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.textDim, marginBottom: 20 }}>
              {adjustModal?.name}  •  Current: {adjustModal?.currentStock} {adjustModal?.unit}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {['IN', 'OUT'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    { backgroundColor: adjType === t ? (t === 'IN' ? '#10b981' : '#ef4444') : theme.colors.background }
                  ]}
                  onPress={() => setAdjType(t)}
                >
                  {t === 'IN' ? <TrendingUp color={adjType === t ? '#fff' : theme.colors.textDim} size={16} /> : <TrendingDown color={adjType === t ? '#fff' : theme.colors.textDim} size={16} />}
                  <Text style={{ color: adjType === t ? '#fff' : theme.colors.textDim, fontWeight: '700', marginLeft: 6 }}>
                    {t === 'IN' ? 'Add Stock' : 'Reduce'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.lbl, { color: theme.colors.textDim }]}>Quantity</Text>
            <TextInput
              style={[styles.sheetInput, { color: theme.colors.text, borderColor: theme.colors.primary }]}
              keyboardType="numeric"
              value={adjQty}
              onChangeText={setAdjQty}
              placeholder="0"
              placeholderTextColor={theme.colors.textDim}
              autoFocus
            />

            <Text style={[styles.lbl, { color: theme.colors.textDim, marginTop: 14 }]}>Reason (optional)</Text>
            <TextInput
              style={[styles.reasonInput, { color: theme.colors.text, borderColor: theme.colors.surface, backgroundColor: theme.colors.background }]}
              value={adjReason}
              onChangeText={setAdjReason}
              placeholder="e.g. Purchase from supplier"
              placeholderTextColor={theme.colors.textDim}
            />

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: adjType === 'IN' ? '#10b981' : '#ef4444' }]}
              onPress={adjustStock}
              disabled={adjSaving}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {adjSaving ? 'Updating…' : `Confirm ${adjType === 'IN' ? '+' : '-'}${adjQty || '0'} ${adjustModal?.unit || ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADD ITEM MODAL */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>New Item</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <X color={theme.colors.textDim} size={24} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Item Name *', key: 'name', kb: 'default' },
              { label: 'HSN Code', key: 'hsnCode', kb: 'default' },
              { label: 'Unit (PCS / KG / LTR)', key: 'unit', kb: 'default' },
              { label: 'Selling Price ₹ *', key: 'sellingPrice', kb: 'numeric' },
              { label: 'Purchase Price ₹', key: 'purchasePrice', kb: 'numeric' },
              { label: 'GST Rate %', key: 'gstRate', kb: 'numeric' },
              { label: 'Opening Stock', key: 'openingStock', kb: 'numeric' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <Text style={[styles.lbl, { color: theme.colors.textDim }]}>{f.label}</Text>
                <TextInput
                  style={[styles.reasonInput, { color: theme.colors.text, borderColor: theme.colors.surface, backgroundColor: theme.colors.background }]}
                  value={newItem[f.key]}
                  keyboardType={f.kb}
                  onChangeText={v => setNewItem(p => ({ ...p, [f.key]: v }))}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
              onPress={createItem}
              disabled={addSaving}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {addSaving ? 'Creating…' : 'Add to Inventory'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 20, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, borderRadius: 16 },
  card: { borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  icon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '700' },
  stockNum: { fontSize: 17, fontWeight: '800' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  priceLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  price: { fontSize: 14, fontWeight: '700' },
  sep: { width: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  adjBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12 },
  emptyBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  lbl: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sheetInput: { borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  reasonInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16 },
  confirmBtn: { height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
});

export default InventoryScreen;
