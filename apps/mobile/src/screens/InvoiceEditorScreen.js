import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Calendar, 
  Type,
  AlignLeft,
  Info
} from 'lucide-react-native';

const InvoiceEditorScreen = ({ invoice, onBack, onSaveSuccess }) => {
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: invoice.invoiceNumber,
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    reference: invoice.reference || '',
    status: invoice.status
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await arthaService.client.put(`/invoices/${invoice.id}`, {
        ...invoice, // Keep existing items etc
        ...formData
      });
      Alert.alert('Success', 'Invoice updated successfully!');
      if (onSaveSuccess) onSaveSuccess();
      onBack();
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Error', 'Failed to update invoice.');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, icon: Icon, value, onChangeText, multiline = false }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.colors.textDim }]}>{label}</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, height: multiline ? 100 : 56, alignItems: multiline ? 'flex-start' : 'center' }]}>
        <Icon color={theme.colors.primary} size={20} style={{ marginTop: multiline ? 16 : 0, marginRight: 12 }} />
        <TextInput 
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          style={[styles.input, { color: theme.colors.text, paddingTop: multiline ? 16 : 0 }]}
          placeholder={`Enter ${label}...`}
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Invoice</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Save color={theme.colors.primary} size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Info color={theme.colors.primary} size={18} />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: 13, color: theme.colors.textMuted }}>
            Editing {formData.invoiceNumber}. Changes will sync to web instantly.
          </Text>
        </View>

        <InputField 
          label="Reference / PO Number" 
          icon={Type} 
          value={formData.reference} 
          onChangeText={(t) => setFormData({...formData, reference: t})} 
        />

        <InputField 
          label="Notes" 
          icon={AlignLeft} 
          value={formData.notes} 
          multiline
          onChangeText={(t) => setFormData({...formData, notes: t})} 
        />

        <InputField 
          label="Terms & Conditions" 
          icon={FileText} 
          value={formData.terms} 
          multiline
          onChangeText={(t) => setFormData({...formData, terms: t})} 
        />

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Updating...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: { padding: 20 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.08)', marginBottom: 24 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', borderRadius: 16, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  saveButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default InvoiceEditorScreen;
