import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView,
  ActivityIndicator, TextInput, Alert, Modal
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import {
  ArrowLeft, Plus, User, Phone, MapPin,
  Search, Mail, Hash, X, ChevronRight, Building2
} from 'lucide-react-native';

const TYPES = ['CUSTOMER', 'VENDOR', 'BOTH'];

const PartiesScreen = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [bizId, setBizId] = useState(null);

  // Create party modal
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'CUSTOMER', phone: '', email: '',
    gstin: '', address: '', city: '', state: ''
  });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { fetchParties(); }, []);

  const fetchParties = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const id = bizRes.data.data?.[0]?.id;
      if (id) {
        setBizId(id);
        const res = await arthaService.client.get(`/parties/business/${id}`);
        setParties(res.data.data || []);
      }
    } catch (e) { console.error('Parties fetch:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const createParty = async () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Party name is required');
    setSaving(true);
    try {
      await arthaService.client.post('/parties', {
        businessId: bizId,
        name: form.name,
        type: form.type,
        phone: form.phone,
        email: form.email,
        gstin: form.gstin,
        address: form.address,
        city: form.city,
        state: form.state,
      });
      Alert.alert('✅ Party Created');
      setModal(false);
      setForm({ name: '', type: 'CUSTOMER', phone: '', email: '', gstin: '', address: '', city: '', state: '' });
      fetchParties(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create party');
    } finally { setSaving(false); }
  };

  const filtered = parties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  const typeColor = (t) => ({ CUSTOMER: '#6366f1', VENDOR: '#f59e0b', BOTH: '#10b981' })[t] || '#94a3b8';

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() => onSelectParty && onSelectParty(item.id)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: typeColor(item.type) + '20' }]}>
          <User color={typeColor(item.type)} size={22} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor(item.type) + '20' }]}>
              <Text style={[styles.typeTxt, { color: typeColor(item.type) }]}>{item.type}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: (item.closingBalance || item.balance || 0) > 0 ? '#ef4444' : '#10b981' }}>
              ₹{(item.closingBalance || item.balance || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        <ChevronRight color={theme.colors.textDim} size={18} />
      </View>
      <View style={styles.info}>
        {item.phone ? (
          <View style={styles.infoRow}>
            <Phone color={theme.colors.textDim} size={13} />
            <Text style={[styles.infoTxt, { color: theme.colors.text }]}>{item.phone}</Text>
          </View>
        ) : null}
        {item.email ? (
          <View style={styles.infoRow}>
            <Mail color={theme.colors.textDim} size={13} />
            <Text style={[styles.infoTxt, { color: theme.colors.text }]} numberOfLines={1}>{item.email}</Text>
          </View>
        ) : null}
        {item.gstin ? (
          <View style={styles.infoRow}>
            <Hash color={theme.colors.textDim} size={13} />
            <Text style={[styles.infoTxt, { color: theme.colors.text }]}>{item.gstin}</Text>
          </View>
        ) : null}
        {item.city ? (
          <View style={styles.infoRow}>
            <MapPin color={theme.colors.textDim} size={13} />
            <Text style={[styles.infoTxt, { color: theme.colors.text }]}>{item.city}, {item.state}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Parties</Text>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setModal(true)}>
          <Plus color={theme.colors.primary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Search color={theme.colors.textDim} size={18} />
          <TextInput
            placeholder="Search name, GSTIN or phone…"
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
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchParties(); }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 80 }}>
              <Building2 color="#ccc" size={64} />
              <Text style={{ color: theme.colors.textDim, marginTop: 16 }}>
                {search ? 'No matching parties' : 'No parties yet'}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 }}
                onPress={() => setModal(true)}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add First Party</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => setModal(true)}>
        <Plus color="white" size={28} />
      </TouchableOpacity>

      {/* CREATE PARTY MODAL */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>New Party</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <X color={theme.colors.textDim} size={24} />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <Text style={[styles.lbl, { color: theme.colors.textDim }]}>Party Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, form.type === t && { backgroundColor: typeColor(t) }]}
                  onPress={() => setF('type', t)}
                >
                  <Text style={{ color: form.type === t ? '#fff' : theme.colors.textDim, fontSize: 12, fontWeight: '600' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {[
              { label: 'Name *', key: 'name', kb: 'default' },
              { label: 'Phone', key: 'phone', kb: 'phone-pad' },
              { label: 'Email', key: 'email', kb: 'email-address' },
              { label: 'GSTIN', key: 'gstin', kb: 'default' },
              { label: 'Address', key: 'address', kb: 'default' },
              { label: 'City', key: 'city', kb: 'default' },
              { label: 'State', key: 'state', kb: 'default' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 10 }}>
                <Text style={[styles.lbl, { color: theme.colors.textDim }]}>{f.label}</Text>
                <TextInput
                  style={[styles.inp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                  value={form[f.key]}
                  keyboardType={f.kb}
                  onChangeText={v => setF(f.key, v)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
              onPress={createParty}
              disabled={saving}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                {saving ? 'Creating…' : 'Create Party'}
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
  card: { borderRadius: 22, padding: 18, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  info: { gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoTxt: { fontSize: 13 },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  lbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inp: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 2 },
  typeChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
  saveBtn: { height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
});

export default PartiesScreen;
