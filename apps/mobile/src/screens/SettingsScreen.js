import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Switch } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  Settings, 
  ArrowLeft, 
  User, 
  Building2, 
  CreditCard,
  Bell,
  Lock,
  ChevronRight,
  LogOut,
  Globe
} from 'lucide-react-native';
import { useThemeControl } from '../ThemeContext';

const SettingsScreen = ({ onBack, onLogout, onNavigate }) => {
  const theme = useTheme();
  const { isDark, toggleTheme } = useThemeControl();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await arthaService.client.get('/auth/me');
      setProfile(res.data.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const SettingItem = ({ icon: Icon, title, subtitle, color = '#6366f1', onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color + '10' }]}>
        <Icon color={color} size={20} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{title}</Text>
        {subtitle && <Text style={{ color: theme.colors.textDim, fontSize: 12 }}>{subtitle}</Text>}
      </View>
      <ChevronRight color={theme.colors.textDim} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={[styles.profileCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.avatarText}>{profile?.user?.name?.[0] || 'U'}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.user?.name}</Text>
                <Text style={{ color: theme.colors.textDim }}>{profile?.user?.email}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{profile?.user?.subscription?.plan?.name || 'PLATINUM'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>ACCOUNT SETUP</Text>
              <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
                <SettingItem 
                  icon={User} 
                  title="Personal Profile" 
                  subtitle="Name, Phone, Email" 
                  onPress={() => onNavigate('personal_profile')}
                />
                <View style={styles.divider} />
                <SettingItem 
                  icon={Building2} 
                  title="Business Profile" 
                  subtitle="GSTIN, Address, Logo" 
                  color="#10b981" 
                  onPress={() => onNavigate('business_profile')}
                />
                <View style={styles.divider} />
                <SettingItem 
                  icon={Lock} 
                  title="Fiscal Year & Locking" 
                  subtitle="Manage periods & locks" 
                  color="#6366f1" 
                  onPress={() => onNavigate('fiscal_year')}
                />
                <View style={styles.divider} />
                <SettingItem icon={Globe} title="Regional Settings" subtitle="Currency, Timezone" color="#f59e0b" />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>PREFERENCES</Text>
              <View style={[styles.group, { backgroundColor: theme.colors.surface }]}>
                {/* Dark Mode Toggle */}
                <View style={[styles.item, { justifyContent: 'space-between' }]}>
                  <View style={[styles.iconBox, { backgroundColor: '#6366f110' }]}>
                    <Bell color="#6366f1" size={20} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemTitle, { color: theme.colors.text }]}>Dark Mode</Text>
                    <Text style={{ color: theme.colors.textDim, fontSize: 12 }}>{isDark ? 'Enabled' : 'Disabled'}</Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: '#767577', true: '#6366f1' }}
                    thumbColor={isDark ? '#fff' : '#f4f3f4'}
                  />
                </View>
                <View style={styles.divider} />
                <SettingItem icon={Bell} title="Notifications" subtitle="Alerts, Invoice Updates" color="#ec4899" />
                <View style={styles.divider} />
                <SettingItem icon={CreditCard} title="Billing & Subscription" subtitle="Manage your plan" color="#8b5cf6" />
                <View style={styles.divider} />
                <SettingItem icon={Lock} title="Security" subtitle="Password, Biometrics" color="#f43f5e" />
              </View>
            </View>

            <TouchableOpacity 
              onPress={onLogout}
              style={[styles.logoutButton, { backgroundColor: theme.colors.error + '10' }]}
            >
              <LogOut color={theme.colors.error} size={20} />
              <Text style={{ color: theme.colors.error, fontWeight: 'bold', marginLeft: 12 }}>Sign Out from Artha</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Artha Mobile v1.0.4 - Premium</Text>
          </>
        )}
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
  profileCard: { padding: 20, borderRadius: 28, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  avatar: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold' },
  badge: { 
    backgroundColor: '#ffd70030', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8, 
    alignSelf: 'flex-start',
    marginTop: 8
  },
  badgeText: { color: '#b8860b', fontSize: 10, fontWeight: 'bold' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 12, marginLeft: 10 },
  group: { borderRadius: 24, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.03)', marginHorizontal: 16 },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20, 
    borderRadius: 20,
    marginTop: 10
  },
  version: { textAlign: 'center', color: '#ccc', fontSize: 10, marginTop: 30, marginBottom: 20 },
});

export default SettingsScreen;
