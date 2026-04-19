import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert, Modal, Share, Linking
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  FileText, Search, ArrowLeft, Plus, Download, ChevronRight,
  CheckCircle, Clock, XCircle, DollarSign, Share2, Edit3, Trash2
} from 'lucide-react-native';
import DocumentBuilderScreen from './DocumentBuilderScreen';

const STATUS_CONFIG = {
  PAID:    { label: 'Paid',    color: '#10b981' },
  SENT:    { label: 'Sent',    color: '#6366f1' },
  DRAFT:   { label: 'Draft',   color: '#94a3b8' },
  OVERDUE: { label: 'Overdue', color: '#ef4444' },
  Paid:    { label: 'Paid',    color: '#10b981' },
  Sent:    { label: 'Sent',    color: '#6366f1' },
  Draft:   { label: 'Draft',   color: '#94a3b8' },
  Overdue: { label: 'Overdue', color: '#ef4444' },
};

const statusCfg = (s) => STATUS_CONFIG[s] || { label: s || 'Pending', color: '#f59e0b' };

const InvoicesScreen = ({ onBack, onCreate }) => {
  const theme = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null);  // invoice being paid
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        const res = await arthaService.getInvoices(bizId);
        setInvoices(res.data || []);
      }
    } catch (e) { console.error('Fetch invoices:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const deleteInvoice = async (invoice) => {
    Alert.alert('Delete Invoice', `Are you sure you want to delete ${invoice.invoiceNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await arthaService.client.delete(`/invoices/${invoice.id}`);
          fetchInvoices(silent = true);
        } catch (e) { Alert.alert('Error', 'Failed to delete invoice'); }
      }},
    ]);
  };

  const changeStatus = async (invoice, newStatus) => {
    try {
      await arthaService.client.put(`/invoices/${invoice.id}`, { status: newStatus });
      fetchInvoices(true);
    } catch (e) { Alert.alert('Error', 'Could not update status'); }
  };

  const recordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return Alert.alert('Error', 'Enter a valid amount');
    try {
      await arthaService.client.post('/payments', {
        businessId: payModal.businessId,
        partyId: payModal.partyId,
        date: new Date().toISOString(),
        amount: parseFloat(payAmount),
        paymentMethod: payMethod.toUpperCase().replace(' ', '_'),
        adjustments: [
          { invoiceId: payModal.id, amount: parseFloat(payAmount) }
        ],
        notes: `Payment for ${payModal.invoiceNumber}`
      });
      Alert.alert('✅ Payment recorded');
      setPayModal(null);
      setPayAmount('');
      fetchInvoices(true);
    } catch (e) {
      const msg = e.response?.data?.message || 'Payment failed';
      Alert.alert('Error', msg);
    }
  };

  const shareInvoice = (item) => {
    const url = `http://192.168.0.201:3001/api/download/invoice/${item.id}?token=${arthaService.getToken()}`;
    Share.share({ message: `Invoice ${item.invoiceNumber} – ₹${item.totalAmount}\n${url}` });
  };

  const downloadInvoice = (item) => {
    const url = `http://192.168.0.201:3001/api/download/invoice/${item.id}?token=${arthaService.getToken()}`;
    Linking.openURL(url);
  };

  const showActions = (item) => {
    const cfg = statusCfg(item.status);
    const actions = ['Edit', 'Download PDF', 'Share', 'Record Payment'];
    if (item.status !== 'PAID' && item.status !== 'Paid') actions.push('Mark as Paid');
    if (item.status === 'DRAFT' || item.status === 'Draft') actions.push('Mark as Sent');
    actions.push('Cancel');

    Alert.alert(`${item.invoiceNumber}  •  ${cfg.label}`, `₹${item.totalAmount}`, [
      { text: 'Edit', onPress: () => setSelectedInvoice(item) },
      { text: 'Download PDF', onPress: () => downloadInvoice(item) },
      { text: 'Share', onPress: () => shareInvoice(item) },
      { text: 'Record Payment', onPress: () => { setPayModal(item); setPayAmount(String(item.balanceDue || item.totalAmount || '')); } },
      ...(item.status !== 'PAID' && item.status !== 'Paid' ? [{ text: 'Mark as Paid', onPress: () => changeStatus(item, 'PAID') }] : []),
      ...(item.status === 'DRAFT' || item.status === 'Draft' ? [{ text: 'Mark as Sent', onPress: () => changeStatus(item, 'SENT') }] : []),
      { text: 'Delete', onPress: () => deleteInvoice(item), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (selectedInvoice) {
    return (
      <DocumentBuilderScreen
        type="INVOICE"
        initialData={selectedInvoice}
        onBack={() => setSelectedInvoice(null)}
        onSaveSuccess={() => { setSelectedInvoice(null); fetchInvoices(true); }}
      />
    );
  }

  const filtered = invoices.filter(inv =>
    (inv.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.party?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const cfg = statusCfg(item.status);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => showActions(item)}
        onLongPress={() => setSelectedInvoice(item)}
      >
        <View style={styles.cardTop}>
          <View style={styles.numRow}>
            <FileText color={theme.colors.primary} size={15} />
            <Text style={[styles.invNum, { color: theme.colors.textDim }]}>{item.invoiceNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
            <Text style={[styles.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.party, { color: theme.colors.text }]} numberOfLines={1}>
              {item.party?.name || 'Walking Customer'}
            </Text>
            <Text style={{ color: theme.colors.textDim, fontSize: 12, marginTop: 2 }}>
              {new Date(item.date).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amount, { color: theme.colors.text }]}>
              ₹{(item.totalAmount || item.total || 0).toLocaleString('en-IN')}
            </Text>
            {item.balanceDue > 0 && (
              <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>
                Due: ₹{item.balanceDue.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>
        {/* Quick action strip */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedInvoice(item)}>
            <Edit3 color={theme.colors.primary} size={14} />
            <Text style={[styles.actionTxt, { color: theme.colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => downloadInvoice(item)}>
            <Download color={theme.colors.textDim} size={14} />
            <Text style={[styles.actionTxt, { color: theme.colors.textDim }]}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => shareInvoice(item)}>
            <Share2 color={theme.colors.textDim} size={14} />
            <Text style={[styles.actionTxt, { color: theme.colors.textDim }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { setPayModal(item); setPayAmount(String(item.balanceDue || item.totalAmount || '')); }}
          >
            <DollarSign color='#10b981' size={14} />
            <Text style={[styles.actionTxt, { color: '#10b981' }]}>Pay</Text>
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
        <Text style={[styles.title, { color: theme.colors.text }]}>Invoices</Text>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]} onPress={onCreate}>
          <Plus color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Search color={theme.colors.textDim} size={18} />
          <TextInput
            placeholder="Search invoice or party…"
            placeholderTextColor={theme.colors.textDim}
            style={[styles.searchInput, { color: theme.colors.text }]}
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
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchInvoices(); }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.colors.textDim, marginTop: 60 }}>
              {search ? 'No matching invoices' : 'No invoices yet — tap + to create one'}
            </Text>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={onCreate}>
        <Plus color="white" size={28} />
      </TouchableOpacity>

      {/* Payment Modal */}
      <Modal visible={!!payModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>Record Payment</Text>
            <Text style={{ color: theme.colors.textDim, marginBottom: 20 }}>
              {payModal?.invoiceNumber}  •  ₹{payModal?.totalAmount}
            </Text>
            <Text style={[styles.fieldLabel, { color: theme.colors.textDim }]}>Amount Received (₹)</Text>
            <TextInput
              style={[styles.sheetInput, { color: theme.colors.text, borderColor: theme.colors.primary }]}
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textDim, marginTop: 16 }]}>Payment Method</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
              {['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, payMethod === m && { backgroundColor: theme.colors.primary }]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text style={{ color: payMethod === m ? '#fff' : theme.colors.textDim, fontSize: 12 }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: theme.colors.background, flex: 1 }]}
                onPress={() => setPayModal(null)}
              >
                <Text style={{ color: theme.colors.textDim, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: theme.colors.primary, flex: 2 }]}
                onPress={recordPayment}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
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
  searchWrap: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, borderRadius: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 20, paddingBottom: 120 },
  card: { borderRadius: 20, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invNum: { fontSize: 12, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  party: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 17, fontWeight: '800' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)', paddingTop: 10, gap: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)' },
  actionTxt: { fontSize: 11, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sheetInput: { borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  sheetBtn: { height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
});

export default InvoicesScreen;
