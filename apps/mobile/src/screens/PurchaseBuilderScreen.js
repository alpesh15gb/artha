import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  ArrowLeft, Save, Plus, Trash2, User, Package,
  Calendar, ShoppingBag, FileSearch, Camera, Upload
} from 'lucide-react-native';

const PurchaseBuilderScreen = ({ onBack, onSaveSuccess }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [parties, setParties] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [partyModal, setPartyModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  
  const [docData, setDocData] = useState({
    partyId: '',
    partyName: '',
    purchaseNumber: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    notes: '',
    totalAmount: 0
  });

  useEffect(() => { bootstrap(); }, []);

  const bootstrap = async () => {
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        const [pRes, iRes] = await Promise.all([
          arthaService.client.get(`/parties/business/${bizId}`),
          arthaService.client.get(`/items/business/${bizId}`),
        ]);
        setParties(pRes.data.data || []);
        setCatalog(iRes.data.data || []);
      }
    } catch (e) { console.error('Bootstrap:', e); }
  };

  const handleOcr = async () => {
    Alert.alert('OCR Feature', 'Scanning bill... (Simulated result for now as native picker requires local install)');
    setAnalyzing(true);
    
    // Simulate API call to /api/ocr/bill
    setTimeout(() => {
        setAnalyzing(false);
        const mockedData = {
            billNumber: 'BILL-8822',
            date: '2026-04-15',
            totalAmount: 4500.00,
            gstin: '27AAAAA0000A1Z5'
        };
        setDocData(p => ({
            ...p,
            purchaseNumber: mockedData.billNumber,
            totalAmount: mockedData.totalAmount,
            notes: `Auto-scanned via OCR. GSTIN: ${mockedData.gstin}`
        }));
        Alert.alert('✅ Bill Analyzed', 'Recognized Bill Number, Date and Total Amount.');
    }, 2000);
  };

  const setField = (f, v) => setDocData(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!docData.partyId) return Alert.alert('Required', 'Please select a supplier');
    setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      
      const payload = {
        businessId: bizId,
        partyId: docData.partyId,
        purchaseNumber: docData.purchaseNumber,
        date: new Date(docData.date).toISOString(),
        items: docData.items.length > 0 ? docData.items : [{ name: 'Manual Purchase Entry', quantity: 1, rate: docData.totalAmount, amount: docData.totalAmount }],
        subtotal: docData.totalAmount,
        totalAmount: docData.totalAmount,
      };

      await arthaService.client.post('/purchases', payload);
      Alert.alert('Success', 'Purchase recorded successfully');
      onSaveSuccess();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Record Purchase</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Save color={theme.colors.primary} size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* OCR Action Section */}
        <View style={[styles.ocrCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.ocrTitle, { color: theme.colors.primary }]}>Quick Bill Entry</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textDim }}>Snap a photo of the bill to auto-fill details using AI.</Text>
            </View>
            <TouchableOpacity style={[styles.ocrBtn, { backgroundColor: theme.colors.primary }]} onPress={handleOcr} disabled={analyzing}>
                {analyzing ? <ActivityIndicator color="white" size="small" /> : <Camera color="white" size={20} />}
            </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <TouchableOpacity style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => setPartyModal(true)}>
          <User color={theme.colors.textDim} size={20} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.label}>Supplier *</Text>
            <Text style={[styles.val, { color: docData.partyName ? theme.colors.text : theme.colors.textDim }]}>
              {docData.partyName || 'Select Supplier'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, backgroundColor: theme.colors.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Bill Number</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={docData.purchaseNumber}
                onChangeText={v => setField('purchaseNumber', v)}
                placeholder="e.g. PUR-001"
              />
            </View>
          </View>
          <View style={[styles.card, { flex: 1, backgroundColor: theme.colors.surface }]}>
            <Calendar color={theme.colors.textDim} size={18} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={docData.date}
                onChangeText={v => setField('date', v)}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Total Bill Amount (₹) *</Text>
            <TextInput
              style={[styles.amountInput, { color: theme.colors.primary }]}
              keyboardType="numeric"
              value={String(docData.totalAmount)}
              onChangeText={v => setField('totalAmount', parseFloat(v) || 0)}
              placeholder="0.00"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              multiline
              value={docData.notes}
              onChangeText={v => setField('notes', v)}
              placeholder="Any comments..."
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.submit, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
            <Text style={styles.submitTxt}>Save Purchase</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Supplier Modal */}
      <Modal visible={partyModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
           <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPartyModal(false)}><ArrowLeft color={theme.colors.text} size={24}/></TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.text }}>Select Supplier</Text>
                <View style={{ width: 24 }} />
           </View>
           <FlatList
             data={parties}
             keyExtractor={i => i.id}
             renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setDocData(p => ({ ...p, partyId: item.id, partyName: item.name })); setPartyModal(false); }}>
                    <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                </TouchableOpacity>
             )}
           />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  ocrCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', marginBottom: 20 },
  ocrTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  ocrBtn: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  val: { fontSize: 15, fontWeight: '600' },
  input: { fontSize: 15, fontWeight: '600', padding: 0 },
  amountInput: { fontSize: 32, fontWeight: '900', padding: 0 },
  submit: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitTxt: { color: 'white', fontSize: 17, fontWeight: '800' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  modalItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }
});

export default PurchaseBuilderScreen;
