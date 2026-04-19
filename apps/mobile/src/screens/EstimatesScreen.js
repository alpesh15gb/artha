import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, TextInput, Alert, Linking, Share
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  FileText, ArrowLeft, Plus, Download, Share2,
  CheckCircle2, XCircle, Clock, ChevronRight, Edit3
} from 'lucide-react-native';
import DocumentBuilderScreen from './DocumentBuilderScreen';

const STATUS = {
  DRAFT:    { label: 'Draft',    color: '#94a3b8' },
  SENT:     { label: 'Sent',     color: '#6366f1' },
  ACCEPTED: { label: 'Accepted', color: '#10b981' },
  REJECTED: { label: 'Rejected', color: '#ef4444' },
  EXPIRED:  { label: 'Expired',  color: '#f59e0b' },
};

const cfg = (s) => STATUS[s] || { label: s || 'Pending', color: '#f59e0b' };

const EstimatesScreen = ({ onBack, onCreate }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [estimates, setEstimates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [lockDate, setLockDate] = useState(null);

  useEffect(() => { fetchEstimates(); }, []);

  const fetchEstimates = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        const [estRes, setRes] = await Promise.all([
          arthaService.client.get(`/estimates/business/${bizId}`),
          arthaService.getSettings(bizId)
        ]);
        setEstimates(estRes.data.data || []);
        if (setRes.data?.enableFinancialLock) {
          setLockDate(new Date(setRes.data.lockDate));
        } else {
          setLockDate(null);
        }
      }
    } catch (e) { console.error('Fetch estimates:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const isLocked = (date) => {
    if (!lockDate) return false;
    return new Date(date) <= lockDate;
  };

  const changeStatus = async (est, newStatus) => {
    try {
      await arthaService.client.put(`/estimates/${est.id}`, { status: newStatus });
      fetchEstimates(true);
    } catch (e) { Alert.alert('Error', 'Could not update status'); }
  };

  const downloadPDF = (est) => {
    const url = `http://192.168.0.201:3001/api/download/estimate/${est.id}?token=${arthaService.getToken()}`;
    Linking.openURL(url);
  };

  const shareEstimate = (est) => {
    const url = `http://192.168.0.201:3001/api/download/estimate/${est.id}?token=${arthaService.getToken()}`;
    Share.share({ message: `Estimate ${est.estimateNumber} – ₹${est.totalAmount}\n${url}` });
  };

  const showActions = (est) => {
    const isPending = est.status === 'DRAFT' || est.status === 'SENT';
    const locked = isLocked(est.date);

    if (locked) {
      return Alert.alert(`${est.estimateNumber}  •  LOCKED`, 'This transaction is in a finalized period and cannot be modified.', [
        { text: 'Download PDF', onPress: () => downloadPDF(est) },
        { text: 'Share', onPress: () => shareEstimate(est) },
        { text: 'OK', style: 'cancel' },
      ]);
    }

    Alert.alert(est.estimateNumber, `₹${est.totalAmount}  •  ${cfg(est.status).label}`, [
...
      { text: 'Edit', onPress: () => setSelected(est) },
      { text: 'Download PDF', onPress: () => downloadPDF(est) },
      { text: 'Share', onPress: () => shareEstimate(est) },
      ...(isPending ? [
...
      ] : []),
      { text: 'Delete', onPress: () => deleteEstimate(est), style: 'destructive' },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteEstimate = async (est) => {
    Alert.alert('Delete Estimate', `Are you sure you want to delete ${est.estimateNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await arthaService.client.delete(`/estimates/${est.id}`);
          fetchEstimates(true);
        } catch (e) { Alert.alert('Error', 'Failed to delete estimate'); }
      }},
    ]);
  };

  if (selected) {
    return (
      <DocumentBuilderScreen
        type="ESTIMATE"
        initialData={selected}
        onBack={() => setSelected(null)}
        onSaveSuccess={() => { setSelected(null); fetchEstimates(true); }}
      />
    );
  }

  const filtered = estimates.filter(e =>
    (e.estimateNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.party?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const c = cfg(item.status);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => showActions(item)}
        onLongPress={() => setSelected(item)}
      >
        <View style={styles.cardTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileText color={theme.colors.primary} size={15} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textDim }}>{item.estimateNumber}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {isLocked(item.date) && (
              <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Text style={[styles.badgeTxt, { color: '#ef4444' }]}>LOCKED</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: c.color + '20' }]}>
              <Text style={[styles.badgeTxt, { color: c.color }]}>{c.label}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.party, { color: theme.colors.text }]} numberOfLines={1}>
              {item.party?.name || 'No Party'}
            </Text>
            <Text style={{ color: theme.colors.textDim, fontSize: 12, marginTop: 2 }}>
              {new Date(item.date).toLocaleDateString('en-IN')}
            </Text>
          </View>
          <Text style={[styles.amount, { color: theme.colors.text }]}>
            ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
          </Text>
        </View>
        {!isLocked(item.date) && (
          <View style={styles.actionStrip}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setSelected(item)}>
              <Edit3 color={theme.colors.primary} size={14} />
              <Text style={[styles.actionTxt, { color: theme.colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => downloadPDF(item)}>
              <Download color={theme.colors.textDim} size={14} />
              <Text style={[styles.actionTxt, { color: theme.colors.textDim }]}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => shareEstimate(item)}>
              <Share2 color={theme.colors.textDim} size={14} />
              <Text style={[styles.actionTxt, { color: theme.colors.textDim }]}>Share</Text>
            </TouchableOpacity>
            {(item.status === 'DRAFT' || item.status === 'SENT') && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item, 'ACCEPTED')}>
                <CheckCircle2 color='#10b981' size={14} />
                <Text style={[styles.actionTxt, { color: '#10b981' }]}>Accept</Text>
              </TouchableOpacity>
            )}
            {(item.status === 'DRAFT' || item.status === 'SENT') && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => changeStatus(item, 'REJECTED')}>
                <XCircle color='#ef4444' size={14} />
                <Text style={[styles.actionTxt, { color: '#ef4444' }]}>Reject</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Estimates</Text>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]} onPress={onCreate}>
          <Plus color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            placeholder="Search estimate or party…"
            placeholderTextColor={theme.colors.textDim}
            style={{ flex: 1, color: theme.colors.text, fontSize: 15 }}
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
          onRefresh={() => { setRefreshing(true); fetchEstimates(); }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.colors.textDim, marginTop: 60 }}>
              {search ? 'No matching estimates' : 'No estimates yet — tap + to create one'}
            </Text>
          }
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={onCreate}>
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 20, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, borderRadius: 16 },
  list: { padding: 20, paddingBottom: 120 },
  card: { borderRadius: 20, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 10, fontWeight: '700' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  party: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 17, fontWeight: '800' },
  actionStrip: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)', paddingTop: 10, gap: 4, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)', marginBottom: 4 },
  actionTxt: { fontSize: 11, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});

export default EstimatesScreen;
