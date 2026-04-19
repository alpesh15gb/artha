import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  ArrowLeft, 
  Plus, 
  CreditCard,
  ShoppingBag,
  Lock,
  Tag,
  Calendar,
  Wallet
} from 'lucide-react-native';

const ExpensesScreen = ({ onBack, onCreate }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lockDate, setLockDate] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        const [expRes, setRes] = await Promise.all([
          arthaService.getExpenses(bizId),
          arthaService.getSettings(bizId)
        ]);
        setExpenses(expRes.data || []);
        if (setRes.data?.enableFinancialLock) {
          setLockDate(new Date(setRes.data.lockDate));
        } else {
          setLockDate(null);
        }
      }
    } catch (error) {
      console.error('Expenses fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = (date) => {
    if (!lockDate) return false;
    return new Date(date) <= lockDate;
  };

  const renderItem = ({ item }) => {
    const locked = isLocked(item.date);
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, opacity: locked ? 0.8 : 1 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: locked ? 'rgba(0,0,0,0.05)' : theme.colors.error + '15' }]}>
            {locked ? <Lock color={theme.colors.textDim} size={20} /> : <ShoppingBag color={theme.colors.error} size={20} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.category, { color: theme.colors.text }]}>{item.category || 'General Expense'}</Text>
              {locked && (
                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                   <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: 'bold' }}>LOCKED</Text>
                </View>
              )}
            </View>
            <Text style={{ color: theme.colors.textDim, fontSize: 12 }}>{item.expenseNumber}</Text>
          </View>
          <Text style={[styles.amount, { color: theme.colors.text }]}>₹{item.totalAmount.toLocaleString()}</Text>
        </View>
      
      <View style={styles.cardInfo}>
        <View style={styles.infoItem}>
          <Calendar color={theme.colors.textDim} size={14} />
          <Text style={styles.infoText}>{new Date(item.date).toLocaleDateString('en-IN')}</Text>
        </View>
        <View style={styles.infoItem}>
          <Wallet color={theme.colors.textDim} size={14} />
          <Text style={styles.infoText}>{item.paymentMethod || 'Cash'}</Text>
        </View>
      </View>
      
      {item.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Expenses</Text>
        <TouchableOpacity style={styles.addButton} onPress={onCreate}>
          <Plus color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchExpenses().finally(() => setRefreshing(false)); }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CreditCard color="#ccc" size={64} />
              <Text style={{ marginTop: 16, color: '#999' }}>No expenses recorded</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={onCreate}
      >
        <Plus color="white" size={32} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  addButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  card: { borderRadius: 24, padding: 18, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  category: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '800' },
  cardInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, color: '#666' },
  notesBox: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 10 },
  notesText: { fontSize: 11, color: '#888', fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  }
});

export default ExpensesScreen;
