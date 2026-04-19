import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Switch, TextInput, Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  ArrowLeft, 
  Lock, 
  Calendar,
  Save,
  ShieldAlert,
  Zap
} from 'lucide-react-native';

const FiscalYearScreen = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bid = bizRes.data.data?.[0]?.id;
      setBusinessId(bid);
      if (bid) {
        const res = await arthaService.getSettings(bid);
        setSettings(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await arthaService.client.put(`/settings/${businessId}`, settings);
      Alert.alert('Success', 'Fiscal settings synchronized');
      onBack();
    } catch (error) {
       Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const runClosingWizard = () => {
    Alert.alert(
      'Confirm Year-End Closing',
      'This will calculate profit/loss and lock transactions. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finalize', 
          onPress: async () => {
             try {
               await arthaService.client.post(`/settings/${businessId}/close-year`, {
                 endDate: new Date().toISOString()
               });
               Alert.alert('Success', 'Fiscal year closed successfully');
               fetchSettings();
             } catch (e) {
               Alert.alert('Error', 'Closing protocol failed');
             }
          } 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Fiscal Year</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Save color={theme.colors.primary} size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusCard, { backgroundColor: settings?.enableFinancialLock ? theme.colors.error + '10' : theme.colors.success + '10' }]}>
           <Lock color={settings?.enableFinancialLock ? theme.colors.error : theme.colors.success} size={32} />
           <View style={{ marginLeft: 15 }}>
             <Text style={[styles.statusTitle, { color: settings?.enableFinancialLock ? theme.colors.error : theme.colors.success }]}>
               {settings?.enableFinancialLock ? 'Books Locked' : 'Books Open'}
             </Text>
             <Text style={{ color: theme.colors.textDim, fontSize: 11 }}>Status for {businessId ? 'Primary Business' : 'Workspace'}</Text>
           </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>PERIOD CONFIGURATION</Text>
          <View style={[styles.box, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.textDim }]}>Fiscal Year Start</Text>
              <Text style={[styles.value, { color: theme.colors.text }]}>April 1st (India Std)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>LOCKING PROTOCOL</Text>
          <View style={[styles.box, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.row}>
              <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Enable Closing Lock</Text>
              <Switch
                value={settings?.enableFinancialLock}
                onValueChange={(val) => setSettings({...settings, enableFinancialLock: val})}
                trackColor={{ false: '#767577', true: theme.colors.primary }}
              />
            </View>
            
            {settings?.enableFinancialLock && (
              <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 20 }}>
                <Text style={[styles.label, { color: theme.colors.textDim }]}>Lock Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderBottomColor: theme.colors.primary }]}
                  value={settings?.lockDate ? new Date(settings.lockDate).toISOString().split('T')[0] : ''}
                  onChangeText={(t) => setSettings({...settings, lockDate: t})}
                  placeholder="2024-03-31"
                />
                <Text style={{ color: theme.colors.error, fontSize: 10, marginTop: 8 }}>
                  * No transactions before this date will be editable.
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.wizardBtn, { backgroundColor: theme.colors.primary }]}
          onPress={runClosingWizard}
        >
          <Zap color="white" size={20} />
          <Text style={styles.wizardBtnText}>Run Closing Wizard</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  scrollContent: { padding: 20 },
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: 25, borderRadius: 32, marginBottom: 30 },
  statusTitle: { fontSize: 22, fontWeight: '900' },
  section: { marginBottom: 30 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, marginLeft: 5 },
  box: { padding: 20, borderRadius: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  value: { fontSize: 16, fontWeight: '700' },
  input: { fontSize: 18, fontWeight: '800', borderBottomWidth: 2, paddingVertical: 8 },
  wizardBtn: { flexDirection: 'row', height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 12 },
  wizardBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default FiscalYearScreen;
