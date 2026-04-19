import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  Tag,
  CreditCard,
  Building2,
  FileText,
  ChevronRight
} from 'lucide-react-native';

const PAYMENT_METHODS = ['CASH', 'UPI', 'BANK', 'CARD', 'CHEQUE', 'NEFT', 'RTGS'];

const ExpenseBuilderScreen = ({ onBack, onSaveSuccess }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [methodModal, setMethodModal] = useState(false);

  // Form State — paymentMethod MUST be uppercase to match API enum
  const [expenseData, setExpenseData] = useState({
    category: 'General Expense',
    amount: '',
    description: '',          // 'description' is in schema (not 'notes')
    paymentMethod: 'CASH',    // uppercase enum
    date: new Date().toISOString(),
  });

  const categories = [
    'General Expense', 'Salaries', 'Rent', 'Utilities',
    'Travel', 'Marketing', 'Office Supplies', 'Others'
  ];

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) setBusinessId(bizId);
    } catch (error) {
      console.error('Business fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const amt = parseFloat(expenseData.amount);
    if (!amt || amt <= 0) return Alert.alert('Error', 'Please enter a valid amount');

    setSaving(true);
    try {
      // Only send fields that are in createExpenseSchema — no extra keys
      const payload = {
        businessId,
        category: expenseData.category,
        description: expenseData.description || undefined,
        amount: amt,
        taxAmount: 0,
        totalAmount: amt,
        paymentMethod: expenseData.paymentMethod,          // already uppercase
        date: new Date(expenseData.date).toISOString(),    // ISO datetime required
      };

      const res = await arthaService.client.post('/expenses', payload);
      Alert.alert('✅ Success', `Expense recorded: EXP-${res.data.data?.expenseNumber || ''}`);
      if (onSaveSuccess) onSaveSuccess();
      onBack();
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to save expense';
      console.error('Expense creation failed:', error.response?.data || error);
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Record Expense</Text>
        <Button 
          onPress={handleSave} 
          disabled={saving} 
          icon={<Save color={theme.colors.primary} size={24} />} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={{ color: theme.colors.textDim, fontSize: 13, fontWeight: 'bold' }}>EXPENSE AMOUNT</Text>
          <View style={styles.amountInputRow}>
            <Text style={[styles.currency, { color: theme.colors.text }]}>₹</Text>
            <TextInput 
              style={[styles.mainInput, { color: theme.colors.text }]}
              placeholder="0.00"
              keyboardType="numeric"
              value={expenseData.amount}
              autoFocus
              onChangeText={(v) => setExpenseData({...expenseData, amount: v})}
            />
          </View>
        </View>

        {/* Details Section */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={styles.field}
            onPress={() => setCategoryModal(true)}
          >
            <Tag color={theme.colors.primary} size={20} />
            <View style={styles.fieldText}>
              <Text style={styles.fieldLabel}>Category</Text>
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>{expenseData.category}</Text>
            </View>
            <ChevronRight color={theme.colors.textDim} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Payment Method — chip selector, NOT free text */}
          <View style={[styles.field, { flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <CreditCard color={theme.colors.primary} size={20} />
              <Text style={[styles.fieldLabel, { marginLeft: 16, marginTop: 0 }]}>Payment Method</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 4 }}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setExpenseData({ ...expenseData, paymentMethod: m })}
                  style={[styles.chip, expenseData.paymentMethod === m && { backgroundColor: theme.colors.primary }]}
                >
                  <Text style={[styles.chipTxt, { color: expenseData.paymentMethod === m ? '#fff' : theme.colors.textDim }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Calendar color={theme.colors.primary} size={20} />
            <View style={styles.fieldText}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Text style={[styles.fieldValue, { color: theme.colors.text }]}>
                {new Date(expenseData.date).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 20 }]}>
          <View style={styles.field}>
            <FileText color={theme.colors.primary} size={20} />
            <View style={styles.fieldText}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldValue, { color: theme.colors.text }]}
                placeholder="What was this for?"
                placeholderTextColor={theme.colors.textDim}
                multiline
                value={expenseData.description}
                onChangeText={(v) => setExpenseData({ ...expenseData, description: v })}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Recording...' : 'Record Expense'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Category Selection */}
      <Modal visible={categoryModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCategoryModal(false)}><ArrowLeft color={theme.colors.text} size={24} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Expense Category</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList 
            data={categories}
            keyExtractor={c => c}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => {
                setExpenseData({...expenseData, category: item});
                setCategoryModal(false);
              }}>
                <Tag color={theme.colors.textDim} size={20} />
                <Text style={{ marginLeft: 12, fontSize: 16, color: theme.colors.text }}>{item}</Text>
                {expenseData.category === item && <Check color={theme.colors.primary} size={20} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const Button = ({ onPress, icon, disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
    {icon}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  scrollContent: { padding: 20 },
  amountSection: { alignItems: 'center', marginVertical: 30 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  currency: { fontSize: 32, fontWeight: 'bold', marginRight: 8 },
  mainInput: { fontSize: 48, fontWeight: '900', minWidth: 150, textAlign: 'center' },
  card: { borderRadius: 28, paddingHorizontal: 20, paddingVertical: 10 },
  field: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  fieldText: { flex: 1, marginLeft: 16 },
  fieldLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  fieldValue: { fontSize: 16, marginTop: 4, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  saveButton: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 40, marginBottom: 40 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)' },
  chipTxt: { fontSize: 12, fontWeight: '700' },
});

export default ExpenseBuilderScreen;
