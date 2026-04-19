import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator, Alert, Modal, FlatList, Platform
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  ArrowLeft, Save, Plus, Trash2, User, Package,
  Calendar, ChevronRight, FileText, Percent, Hash
} from 'lucide-react-native';
import { calculateDocumentTotals, numberToWords } from '@artha/common';

// Shared calculation engine from @artha/common is used for all totals

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

// ---------- component ----------
const DocumentBuilderScreen = ({ type = 'INVOICE', initialData = null, onBack, onSaveSuccess }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [partyModal, setPartyModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [dateInput, setDateInput] = useState('');   // editable text "DD/MM/YYYY"
  const [dueDateInput, setDueDateInput] = useState('');

  const isEdit = !!initialData?.id;
  const typeLabel = type === 'INVOICE' ? 'Invoice' : 'Estimate';

  // Preload existing items with taxRate synthesized from cgstRate+sgstRate+igstRate
  const seedItems = (rawItems) =>
    (rawItems || []).map(i => ({
      ...i,
      // Favor the master taxRate field if present to avoid accidental doubling
      taxRate: i.taxRate ?? ((i.cgstRate || 0) + (i.sgstRate || 0) + (i.igstRate || 0)),
      discountPercent: i.discountPercent || 0,
    }));

  const [docData, setDocData] = useState({
    id: initialData?.id || '',
    partyId: initialData?.partyId || '',
    partyName: initialData?.party?.name || '',
    invoiceNumber: initialData?.invoiceNumber || initialData?.estimateNumber || '',
    reference: initialData?.reference || '',
    notes: initialData?.notes || '',
    terms: initialData?.terms || '',
    discountPercent: initialData?.discountPercent || 0,
    items: seedItems(initialData?.items),
  });

  const [totals, setTotals] = useState({ subtotal: 0, totalTax: 0, totalAmount: 0 });

  useEffect(() => {
    const d = initialData?.date ? new Date(initialData.date) : new Date();
    setDateInput(fmtDate(d.toISOString()));
    if (initialData?.dueDate) setDueDateInput(fmtDate(new Date(initialData.dueDate).toISOString()));
    bootstrap();
  }, []);

  useEffect(() => {
    const res = calculateDocumentTotals(docData.items, docData.discountPercent);
    setTotals(res);
  }, [docData.items, docData.discountPercent]);

  const bootstrap = async () => {
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        setBusinessId(bizId);
        const [pRes, iRes] = await Promise.all([
          arthaService.client.get(`/parties/business/${bizId}`),
          arthaService.client.get(`/items/business/${bizId}`),
        ]);
        setParties(pRes.data.data || []);
        setCatalog(iRes.data.data || []);
      }
    } catch (e) { console.error('Bootstrap:', e); }
    finally { setLoading(false); }
  };

  const setField = (field, value) => setDocData(p => ({ ...p, [field]: value }));

  const addItem = (product) => {
    setDocData(p => ({
      ...p,
      items: [...p.items, {
        itemId: product.id,
        description: product.name,
        hsnCode: product.hsnCode || '',
        quantity: 1,
        rate: product.sellingPrice || 0,
        taxRate: product.gstRate || 0,
        discountPercent: 0,
        unit: product.unit || 'NOS',
      }]
    }));
    setItemModal(false);
  };

  const removeItem = (idx) => setDocData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, field, value) =>
    setDocData(p => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...p, items };
    });

  // Parse DD/MM/YYYY → ISO
  const parseDateInput = (str) => {
    const parts = str.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const dt = new Date(`${y}-${m}-${d}`);
      if (!isNaN(dt)) return dt.toISOString();
    }
    return new Date().toISOString();
  };

  const handleSave = async () => {
    if (!docData.partyId) return Alert.alert('Required', 'Please select a client / party');
    if (docData.items.length === 0) return Alert.alert('Required', 'Add at least one item');
    if (!docData.invoiceNumber?.trim()) return Alert.alert('Required', `${typeLabel} number is required`);

    setSaving(true);
    try {
      const t = calculateDocumentTotals(docData.items, docData.discountPercent);

      const payload = {
        businessId,
        partyId: docData.partyId,
        partyName: docData.partyName,
        [type === 'INVOICE' ? 'invoiceNumber' : 'estimateNumber']: docData.invoiceNumber,
        date: parseDateInput(dateInput),
        dueDate: dueDateInput ? parseDateInput(dueDateInput) : null,
        reference: docData.reference || '',
        notes: docData.notes || '',
        terms: docData.terms || '',
        discountPercent: parseFloat(docData.discountPercent) || 0,
        discountAmount: t.discountAmount,
        subtotal: t.subtotal,
        totalTax: t.totalTax,
        cgstAmount: t.cgstAmount,
        sgstAmount: t.sgstAmount,
        igstAmount: t.igstAmount,
        cessAmount: 0,
        roundOff: 0,
        totalAmount: t.totalAmount,
        amountInWords: numberToWords(t.totalAmount),
        paidAmount: 0,
        items: t.items,
        tags: [],
        ...(type === 'INVOICE' && { invoiceType: 'TAX_INVOICE', template: 'template1' }),
      };

      if (isEdit) {
        const ep = type === 'INVOICE' ? `/invoices/${docData.id}` : `/estimates/${docData.id}`;
        await arthaService.client.put(ep, payload);
      } else {
        const ep = type === 'INVOICE' ? '/invoices' : '/estimates';
        await arthaService.client.post(ep, payload);
      }

      Alert.alert('✅ Success', `${typeLabel} ${isEdit ? 'updated' : 'created'} successfully`);
      if (onSaveSuccess) onSaveSuccess();
      onBack();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Unexpected error';
      console.error('Save failed:', err.response?.data || err);
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  };

  const filteredParties = parties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    (p.gstin || '').toLowerCase().includes(partySearch.toLowerCase())
  );

  const filteredCatalog = catalog.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.hsnCode || '').includes(itemSearch)
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator style={{ marginTop: 100 }} size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {isEdit ? `Edit ${typeLabel}` : `New ${typeLabel}`}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.iconBtn}>
          {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Save color={theme.colors.primary} size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Party ── */}
        <TouchableOpacity style={[styles.card, { backgroundColor: theme.colors.surface }]} onPress={() => setPartyModal(true)}>
          <User color={theme.colors.primary} size={20} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.fieldLabel}>Billed To</Text>
            <Text style={[styles.fieldValue, { color: docData.partyId ? theme.colors.text : theme.colors.textDim }]}>
              {docData.partyName || 'Select Party'}
            </Text>
          </View>
          <ChevronRight color={theme.colors.textDim} size={18} />
        </TouchableOpacity>

        {/* ── Doc Number ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Hash color={theme.colors.primary} size={20} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.fieldLabel}>{typeLabel} Number *</Text>
            <TextInput
              style={[styles.fieldValue, { color: theme.colors.text }]}
              value={docData.invoiceNumber}
              placeholder="e.g. INV-001"
              placeholderTextColor={theme.colors.textDim}
              onChangeText={v => setField('invoiceNumber', v)}
            />
          </View>
        </View>

        {/* ── Dates Row ── */}
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, backgroundColor: theme.colors.surface }]}>
            <Calendar color={theme.colors.primary} size={18} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.fieldLabel}>Date (DD/MM/YYYY)</Text>
              <TextInput
                style={[styles.fieldValue, { color: theme.colors.text }]}
                value={dateInput}
                placeholder="DD/MM/YYYY"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textDim}
                onChangeText={setDateInput}
              />
            </View>
          </View>
          {type === 'INVOICE' && (
            <View style={[styles.card, { flex: 1, backgroundColor: theme.colors.surface }]}>
              <Calendar color={theme.colors.textDim} size={18} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fieldLabel}>Due Date</Text>
                <TextInput
                  style={[styles.fieldValue, { color: theme.colors.text }]}
                  value={dueDateInput}
                  placeholder="DD/MM/YYYY"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textDim}
                  onChangeText={setDueDateInput}
                />
              </View>
            </View>
          )}
        </View>

        {/* ── Reference & Discount Row ── */}
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, backgroundColor: theme.colors.surface }]}>
            <FileText color={theme.colors.textDim} size={18} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.fieldLabel}>Reference / PO No</Text>
              <TextInput
                style={[styles.fieldValue, { color: theme.colors.text }]}
                value={docData.reference}
                placeholder="Optional"
                placeholderTextColor={theme.colors.textDim}
                onChangeText={v => setField('reference', v)}
              />
            </View>
          </View>
          <View style={[styles.card, { flex: 0.5, backgroundColor: theme.colors.surface }]}>
            <Percent color={theme.colors.textDim} size={18} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.fieldLabel}>Discount %</Text>
              <TextInput
                style={[styles.fieldValue, { color: theme.colors.text }]}
                value={String(docData.discountPercent)}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textDim}
                onChangeText={v => setField('discountPercent', v)}
              />
            </View>
          </View>
        </View>

        {/* ── Line Items ── */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Line Items</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary + '15' }]} onPress={() => setItemModal(true)}>
            <Plus color={theme.colors.primary} size={16} />
            <Text style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 4, fontSize: 13 }}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {docData.items.length === 0 && (
          <View style={[styles.emptyItems, { borderColor: theme.colors.surface }]}>
            <Package color={theme.colors.textDim} size={40} />
            <Text style={{ color: theme.colors.textDim, marginTop: 8 }}>No items added yet</Text>
          </View>
        )}

        {docData.items.map((item, idx) => {
          const lineTotal = (item.quantity || 0) * (item.rate || 0);
          const taxAmt = lineTotal * (item.taxRate || 0) / 100;
          return (
            <View key={idx} style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}>
              {/* Item name + delete */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <TextInput
                  style={[styles.itemName, { color: theme.colors.text, flex: 1 }]}
                  value={item.description}
                  onChangeText={v => updateItem(idx, 'description', v)}
                />
                <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                  <Trash2 color={theme.colors.error} size={18} />
                </TouchableOpacity>
              </View>

              {/* HSN */}
              <View style={styles.itemRow}>
                <Text style={styles.miniLabel}>HSN Code</Text>
                <TextInput
                  style={[styles.miniInput, { color: theme.colors.text, borderColor: theme.colors.surface }]}
                  value={item.hsnCode}
                  placeholder="–"
                  placeholderTextColor={theme.colors.textDim}
                  onChangeText={v => updateItem(idx, 'hsnCode', v)}
                />
              </View>

              {/* Qty | Rate | Tax | Unit */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {[
                  { label: 'Qty', field: 'quantity', type: 'numeric' },
                  { label: 'Rate (₹)', field: 'rate', type: 'numeric' },
                  { label: 'Tax %', field: 'taxRate', type: 'numeric' },
                  { label: 'Discount %', field: 'discountPercent', type: 'numeric' },
                ].map(f => (
                  <View key={f.field} style={{ flex: 1 }}>
                    <Text style={styles.miniLabel}>{f.label}</Text>
                    <TextInput
                      keyboardType={f.type}
                      style={[styles.numInput, { color: theme.colors.text, borderColor: theme.colors.surface }]}
                      value={String(item[f.field] ?? '')}
                      onChangeText={v => updateItem(idx, f.field, parseFloat(v) || 0)}
                    />
                  </View>
                ))}
              </View>

              {/* Line total display */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 16 }}>
                <Text style={{ fontSize: 11, color: theme.colors.textDim }}>Taxable: ₹{lineTotal.toFixed(2)}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textDim }}>GST: ₹{taxAmt.toFixed(2)}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Total: ₹{(lineTotal + taxAmt).toFixed(2)}</Text>
              </View>
            </View>
          );
        })}

        {/* ── Totals ── */}
        <View style={[styles.totalsBox, { backgroundColor: theme.colors.surface }]}>
          {[
            { label: 'Subtotal', val: totals.subtotal },
            { label: 'CGST', val: totals.cgstAmount },
            { label: 'SGST', val: totals.sgstAmount },
            { label: 'Total Tax', val: totals.totalTax },
          ].map(r => (
            <View key={r.label} style={styles.totalRow}>
              <Text style={{ color: theme.colors.textDim }}>{r.label}</Text>
              <Text style={{ color: theme.colors.text }}>₹{(r.val || 0).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, styles.grandRow]}>
            <Text style={{ fontWeight: '800', fontSize: 17, color: theme.colors.text }}>Grand Total</Text>
            <Text style={{ fontWeight: '900', fontSize: 18, color: theme.colors.primary }}>₹{(totals.totalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, marginBottom: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.fieldValue, { color: theme.colors.text }]}
              value={docData.notes}
              placeholder="e.g. Thank you for your business"
              placeholderTextColor={theme.colors.textDim}
              multiline
              onChangeText={v => setField('notes', v)}
            />
          </View>
        </View>

        {/* ── Terms ── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, marginBottom: 24 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Terms & Conditions</Text>
            <TextInput
              style={[styles.fieldValue, { color: theme.colors.text }]}
              value={docData.terms}
              placeholder="e.g. Payment within 30 days"
              placeholderTextColor={theme.colors.textDim}
              multiline
              onChangeText={v => setField('terms', v)}
            />
          </View>
        </View>

        {/* ── Save Button ── */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : isEdit ? `Update ${typeLabel}` : `Create ${typeLabel}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ══ PARTY MODAL ══ */}
      <Modal visible={partyModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPartyModal(false)}>
              <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Party</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, margin: 16 }]}>
            <TextInput
              style={{ flex: 1, color: theme.colors.text, fontSize: 15 }}
              placeholder="Search by name or GSTIN…"
              placeholderTextColor={theme.colors.textDim}
              value={partySearch}
              onChangeText={setPartySearch}
            />
          </View>
          <FlatList
            data={filteredParties}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => {
                setField('partyId', item.id);
                setField('partyName', item.name);
                setPartyModal(false);
              }}>
                <User color={theme.colors.textDim} size={20} />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text }}>{item.name}</Text>
                  {item.gstin ? <Text style={{ fontSize: 11, color: theme.colors.textDim }}>GSTIN: {item.gstin}</Text> : null}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.colors.textDim, marginTop: 40 }}>No parties found</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* ══ ITEM MODAL ══ */}
      <Modal visible={itemModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setItemModal(false)}>
              <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Item</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, margin: 16 }]}>
            <TextInput
              style={{ flex: 1, color: theme.colors.text, fontSize: 15 }}
              placeholder="Search items…"
              placeholderTextColor={theme.colors.textDim}
              value={itemSearch}
              onChangeText={setItemSearch}
            />
          </View>
          <FlatList
            data={filteredCatalog}
            keyExtractor={i => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => addItem(item)}>
                <Package color={theme.colors.textDim} size={20} />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.text }}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textDim }}>
                    HSN: {item.hsnCode || '–'} | ₹{item.sellingPrice} | GST {item.gstRate || 0}%
                  </Text>
                </View>
                <Plus color={theme.colors.primary} size={20} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.colors.textDim, marginTop: 40 }}>No items found</Text>}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 19, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 80 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  fieldLabel: { fontSize: 10, color: '#999', fontWeight: '700', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  emptyItems: { alignItems: 'center', padding: 40, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 16 },
  itemCard: { borderRadius: 20, padding: 16, marginBottom: 14 },
  itemName: { fontSize: 15, fontWeight: '700', marginRight: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniLabel: { fontSize: 9, color: '#999', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  miniInput: { fontSize: 13, borderBottomWidth: 1, paddingBottom: 2, minWidth: 60 },
  numInput: { fontSize: 14, fontWeight: '700', borderBottomWidth: 1, paddingBottom: 2, textAlign: 'center' },
  totalsBox: { borderRadius: 24, padding: 20, marginVertical: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  grandRow: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', marginTop: 8, paddingTop: 14 },
  saveBtn: { height: 62, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 48 },
});

export default DocumentBuilderScreen;
