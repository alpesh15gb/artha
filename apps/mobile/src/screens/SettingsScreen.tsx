import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { useAuthStore } from '../store/auth';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, business, businesses, setBusiness, logout } = useAuthStore();
  const [notifications, setNotifications] = React.useState(true);
  const [biometric, setBiometric] = React.useState(false);
  const [apiUrl, setApiUrl] = React.useState('https://artha.sytes.net/api');

  const handleEditServer = () => {
    Alert.prompt(
      'Server Configuration',
      'Enter the API endpoint URL:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: (url) => {
            if (url) {
              setApiUrl(url);
              // In a real app, we'd save this to AsyncStorage and reload the API client
              Alert.alert('Success', 'Server URL updated. Please restart the app.');
            }
          }
        }
      ],
      'plain-text',
      apiUrl
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const handleSwitchBusiness = () => {
    if (businesses.length <= 1) {
      Alert.alert('Info', 'You only have one business registered.');
      return;
    }

    const options = businesses.map(b => ({
      text: b.name + (b.id === business?.id ? ' (Active)' : ''),
      onPress: () => setBusiness(b)
    }));
    
    Alert.alert(
      'Switch Business',
      'Select a business to manage:',
      [...options, { text: 'Cancel', style: 'cancel' }]
    );
  };

  const SettingItem = ({ icon, title, subtitle, onPress, type = 'chevron', value, onValueChange }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={type === 'switch'}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={22} color="#64748b" />
      </View>
      <View style={styles.content}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSub}>{subtitle}</Text>}
      </View>
      {type === 'chevron' && <Icon name="chevron-right" size={24} color="#cbd5e1" />}
      {type === 'switch' && <Switch value={value} onValueChange={onValueChange} trackColor={{ true: '#8b5cf6' }} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business</Text>
        <SettingItem 
          icon="swap-horizontal" 
          title="Switch Business" 
          subtitle={`Current: ${business?.name}`} 
          onPress={handleSwitchBusiness} 
        />
        <SettingItem icon="briefcase-outline" title="Business Details" />
        <SettingItem icon="file-percent-outline" title="Tax & GST Settings" />
        <SettingItem icon="bank-outline" title="Bank Accounts" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingItem 
          icon="bell-outline" 
          title="Notifications" 
          type="switch" 
          value={notifications} 
          onValueChange={setNotifications} 
        />
        <SettingItem 
          icon="fingerprint" 
          title="Biometric Login" 
          type="switch" 
          value={biometric} 
          onValueChange={setBiometric} 
        />
        <SettingItem icon="translate" title="Language" subtitle="English" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem icon="help-circle-outline" title="Help Center" />
        <SettingItem icon="shield-check-outline" title="Privacy Policy" />
        <SettingItem icon="information-outline" title="About Artha" subtitle="v1.0.0" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Configuration</Text>
        <SettingItem 
          icon="server-network" 
          title="API Endpoint" 
          subtitle={apiUrl} 
          onPress={handleEditServer} 
        />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  profileSection: { alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  userEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  editBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  editBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginLeft: 20, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  itemTitle: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  itemSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 32, marginBottom: 40, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#ef4444' },
});
