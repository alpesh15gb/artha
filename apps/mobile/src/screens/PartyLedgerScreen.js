import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Linking, Share
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  ArrowLeft, FileText, ShoppingBag, ArrowDownLeft,
  ArrowUpRight, Share2, Phone, Mail, Calendar, Info
} from 'lucide-react-native';

const PartyLedgerScreen = ({ partyId, onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ party: null, ledger: [] });

  useEffect(() => { fetchLedger(); }, [partyId]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await arthaService.client.get(`/parties/${partyId}/ledger`);
      setData(res.data.data);
    } catch (e) {
      console.error('Fetch Ledger:', e);
      Alert.alert('Error', 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const shareLedger = () => {
    const { party, ledger } = data;
    const balance = ledger.reduce((acc, curr) => {
        // Simple logic for summary
        return acc + curr.amount;
    }, 0);
    const msg = `Ledger Statement for ${party.name}\nCurrent Balance: ₹${balance}\nSent via Artha Cloud`;
    Share.share({ message: msg });
  };

  const renderItem = ({ item }) => {
    const isDoc = item.type === 'INVOICE' || item.type === 'PURCHASE';
    const isIncome = item.type === 'INVOICE' || item.type === 'RECEIPT';
    
    return (
      <View style={[styles.item, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.iconBox, { backgroundColor: isIncome ? '#10b98115' : '#ef444415' }]}>
          {item.type === 'INVOICE' && <FileText color="#10b981" size={18} />}
          {item.type === 'PURCHASE' && <ShoppingBag color="#ef4444" size={18} />}
          {item.type === 'RECEIPT' && <ArrowDownLeft color="#10b981" size={18} />}
          {item.type === 'PAYMENT' && <ArrowUpRight color="#ef4444" size={18} />}
        </View>
        
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.ref, { color: theme.colors.text }]}>{item.ref || item.type}</Text>
          <Text style={{ fontSize: 11, color: theme.colors.textDim }}>
            {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {item.type}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amount, { color: isIncome ? '#10b981' : '#ef4444' }]}>
            {isIncome ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.status, { color: theme.colors.textDim }]}>{item.status}</Text>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  const party = data.party;
  const balance = data.ledger.reduce((acc, curr) => {
      // Very basic net balance for display
      return acc + (curr.type === 'INVOICE' || curr.type === 'PAYMENT' ? curr.amount : -curr.amount);
  }, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Ledger</Text>
        <TouchableOpacity onPress={shareLedger} style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
          <Share2 color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.topCard}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>Balance Statement</Text>
        <Text style={styles.partyName}>{party?.name}</Text>
        <View style={styles.balanceBox}>
            <Text style={styles.balanceAmt}>₹{Math.abs(balance).toLocaleString('en-IN')}</Text>
            <View style={styles.balanceBadge}>
                <Text style={styles.balanceType}>{balance >= 0 ? 'RECEIVABLE' : 'PAYABLE'}</Text>
            </View>
        </View>
      </View>

      <View style={styles.contactStrip}>
         <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${party?.phone}`)}>
            <Phone size={16} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Call</Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${party?.email}`)}>
            <Mail size={16} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Email</Text>
         </TouchableOpacity>
      </View>

      <FlatList
        data={data.ledger}
        renderItem={renderItem}
        keyExtractor={(i, idx) => i.id + idx}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={[styles.sectionTitle, { color: theme.colors.textDim }]}>Transaction History</Text>}
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Info color="#ccc" size={40} />
                <Text style={{ color: theme.colors.textDim, marginTop: 10 }}>No transactions yet</Text>
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
  title: { fontSize: 20, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  topCard: { margin: 20, backgroundColor: '#6366f1', borderRadius: 24, padding: 24 },
  partyName: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 8 },
  balanceBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  balanceAmt: { color: 'white', fontSize: 32, fontWeight: '900' },
  balanceBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  balanceType: { color: 'white', fontSize: 10, fontWeight: '800' },
  contactStrip: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 10 },
  contactBtn: { flex: 1, backgroundColor: 'rgba(99, 102, 241, 0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 16 },
  list: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  ref: { fontSize: 14, fontWeight: '700' },
  amount: { fontSize: 15, fontWeight: '800' },
  status: { fontSize: 10, fontWeight: '600', marginTop: 2 }
});

export default PartyLedgerScreen;
