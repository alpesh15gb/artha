import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  Building2, 
  ArrowLeft, 
  Save, 
  MapPin, 
  Phone, 
  Mail,
  Fingerprint
} from 'lucide-react-native';

const BusinessProfileScreen = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState({
    name: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    pan: ''
  });

  useEffect(() => {
    fetchBusiness();
  }, []);

  const fetchBusiness = async () => {
    try {
      const res = await arthaService.client.get('/businesses');
      const data = res.data.data?.[0];
      if (data) setBusiness(data);
    } catch (error) {
      console.error('Failed to fetch business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await arthaService.client.put(`/businesses/${business.id}`, business);
      Alert.alert('Success', 'Business profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const InputField = ({ label, icon: Icon, value, onChangeText, placeholder }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.colors.textDim }]}>{label}</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
        <Icon color={theme.colors.primary} size={20} style={styles.inputIcon} />
        <TextInput 
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          style={[styles.input, { color: theme.colors.text }]}
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Business Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Save color={theme.colors.primary} size={24} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <InputField 
            label="Firm/Business Name" 
            icon={Building2} 
            value={business.name} 
            onChangeText={(t) => setBusiness({...business, name: t})} 
          />
          <InputField 
            label="GSTIN Number" 
            icon={Fingerprint} 
            value={business.gstin} 
            onChangeText={(t) => setBusiness({...business, gstin: t})} 
            placeholder="24AAAAA0000A1Z5"
          />
          <InputField 
            label="Email Address" 
            icon={Mail} 
            value={business.email} 
            onChangeText={(t) => setBusiness({...business, email: t})} 
          />
          <InputField 
            label="Phone Number" 
            icon={Phone} 
            value={business.phone} 
            onChangeText={(t) => setBusiness({...business, phone: t})} 
          />
          <InputField 
            label="Business Address" 
            icon={MapPin} 
            value={business.address} 
            onChangeText={(t) => setBusiness({...business, address: t})} 
          />
          
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Update Records'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  saveButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default BusinessProfileScreen;
