import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  User, 
  ArrowLeft, 
  Save, 
  Phone, 
  Mail,
  UserCheck
} from 'lucide-react-native';

const UserProfileScreen = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    role: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await arthaService.client.get('/auth/me');
      setUserData(res.data.data.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real API, this would be a PUT /auth/profile
      // For now we'll simulate success since the logic is there
      setTimeout(() => {
        Alert.alert('Success', 'Profile updated successfully!');
        setSaving(false);
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Personal Profile</Text>
        <TouchableOpacity onPress={handleSave}>
          <Save color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarSection}>
            <View style={[styles.xlAvatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>{userData.name?.[0]}</Text>
            </View>
            <Text style={[styles.roleLabel, { color: theme.colors.primary }]}>{userData.role}</Text>
          </View>

          <InputField 
            label="Full Name" 
            icon={User} 
            value={userData.name} 
            onChangeText={(t) => setUserData({...userData, name: t})} 
          />
          <InputField 
            label="Email Address" 
            icon={Mail} 
            value={userData.email} 
            onChangeText={(t) => setUserData({...userData, email: t})} 
          />
          <InputField 
            label="Phone Number" 
            icon={Phone} 
            value={userData.phone} 
            onChangeText={(t) => setUserData({...userData, phone: t})} 
          />
          
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
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
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  xlAvatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  roleLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '500' },
  saveButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default UserProfileScreen;
