import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { partyApi, Party } from '../services/api';
import { useAuthStore } from '../store/auth';

export default function PartiesScreen({ navigation }: any) {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'BOTH'>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);
  const { business } = useAuthStore();
  
  const [form, setForm] = useState({ name: '', partyType: 'CUSTOMER' as any, email: '', phone: '', address: '', gstin: '', state: '' });

  const loadParties = async () => {
    if (!business?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const params: any = {};
      if (filter !== 'ALL') params.type = filter;
      if (search) params.search = search;
      const res = await partyApi.list(business.id, params);
      setParties(res.data);
    } catch (error) {
      console.error('Load parties error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, [filter, search, business?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingParty) {
        await partyApi.update(editingParty.id, form);
      } else {
        await partyApi.create({ ...form, businessId: business?.id });
      }
      setModalVisible(false);
      setEditingParty(null);
      setForm({ name: '', type: 'CUSTOMER', email: '', phone: '', address: '', gstin: '', state: '' });
      loadParties();
    } catch (error) {
      console.error('Save party error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await partyApi.delete(id);
      loadParties();
    } catch (error) {
      console.error('Delete party error:', error);
    }
  };

  const openModal = (party?: any) => {
    if (party) {
      setEditingParty(party);
      setForm({ name: party.name, partyType: party.partyType, email: party.email || '', phone: party.phone || '', address: party.address || '', gstin: party.gstin || '', state: party.state || '' });
    } else {
      setEditingParty(null);
      setForm({ name: '', partyType: 'CUSTOMER', email: '', phone: '', address: '', gstin: '', state: '' });
    }
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Party }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)} onLongPress={() => handleDelete(item.id)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={[styles.badge, item.partyType === 'CUSTOMER' && styles.customerBadge, item.partyType === 'SUPPLIER' && styles.vendorBadge]}>{item.partyType}</Text>
      </View>
      {item.phone && <Text style={styles.cardText}>{item.phone}</Text>}
      {item.email && <Text style={styles.cardText}>{item.email}</Text>}
      {item.gstin && <Text style={styles.cardText}>GSTIN: {item.gstin}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parties</Text>
        <TextInput style={styles.search} placeholder="Search parties..." value={search} onChangeText={setSearch} />
        <View style={styles.filters}>
          {(['ALL', 'CUSTOMER', 'SUPPLIER', 'BOTH'] as const).map((f) => (
            <TouchableOpacity key={f} style={[styles.filterButton, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}><Text>Loading...</Text></View>
      ) : (
        <FlatList
          data={parties}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadParties(); }} />}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingParty ? 'Edit Party' : 'Add Party'}</Text>
            <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <View style={styles.typeSelector}>
              {(['CUSTOMER', 'SUPPLIER', 'BOTH'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.typeButton, form.partyType === t && styles.typeActive]} onPress={() => setForm({ ...form, partyType: t })}>
                  <Text style={[styles.typeText, form.partyType === t && styles.typeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
            <TextInput style={styles.input} placeholder="GSTIN" value={form.gstin} onChangeText={(v) => setForm({ ...form, gstin: v })} />
            <TextInput style={styles.input} placeholder="State" value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#0284c7' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  search: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12 },
  filters: { flexDirection: 'row', gap: 8 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)' },
  filterActive: { backgroundColor: '#fff' },
  filterText: { color: '#fff', fontSize: 12 },
  filterTextActive: { color: '#0284c7' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  badge: { fontSize: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#e2e8f0' },
  customerBadge: { backgroundColor: '#dbeafe', color: '#0284c7' },
  vendorBadge: { backgroundColor: '#dcfce7', color: '#10b981' },
  cardText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  fabText: { fontSize: 28, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  typeActive: { backgroundColor: '#0284c7' },
  typeText: { fontSize: 12, color: '#64748b' },
  typeTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#0284c7', alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});