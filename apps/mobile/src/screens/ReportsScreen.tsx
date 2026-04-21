import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Share, ActivityIndicator, Alert } from 'react-native';
import { reportApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { business, token } = useAuthStore();

  const loadSummary = async () => {
    if (!business?.id) return;
    try {
      const res = await reportApi.dashboard(business.id);
      setSummary(res.data);
    } catch (error) {
      console.error('Load summary error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [business?.id]);

  const handleDownload = async (reportType: string, format: 'PDF' | 'CSV') => {
    if (!business?.id) return;
    setDownloading(reportType + format);
    
    // In a real app, you'd have specific CSV endpoints. 
    // Here we use a generic download route pattern.
    const ext = format === 'PDF' ? 'pdf' : 'csv';
    const remoteUrl = `http://192.168.0.201:3001/api/download/report/${reportType}?businessId=${encodeURIComponent(business.id)}&format=${format}&token=${encodeURIComponent(token || '')}`;
    const localUri = `${FileSystem.cacheDirectory}${reportType}_report.${ext}`;
    console.log(`[DOWNLOAD DEBUG] URL: ${remoteUrl}`);

    try {
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
      
      if (downloadRes.status !== 200) {
        throw new Error(`Server returned error ${downloadRes.status} during download`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        Alert.alert('Download Complete', `Your ${format} report is saved locally.`);
      }
    } catch (error: any) {
      console.error('Download error:', error);
      const msg = error.response?.data?.message || error.message || 'Unknown error';
      const status = error.response?.status || 'Network Error';
      Alert.alert('Download Error', `Stats: ${status}\nMessage: ${msg}`);
    } finally {
      setDownloading(null);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const ReportItem = ({ title, icon, color, type }: any) => (
    <View style={styles.reportCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.reportTitle}>{title}</Text>
      <View style={styles.actionGroup}>
        <TouchableOpacity 
          style={styles.actionIcon} 
          onPress={() => handleDownload(type, 'PDF')}
          disabled={!!downloading}
        >
          {downloading === type + 'PDF' ? <ActivityIndicator size="small" color="#0284c7" /> : <Icon name="file-pdf-box" size={24} color="#ef4444" />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionIcon} 
          onPress={() => handleDownload(type, 'CSV')}
          disabled={!!downloading}
        >
          {downloading === type + 'CSV' ? <ActivityIndicator size="small" color="#0284c7" /> : <Icon name="file-excel-outline" size={24} color="#10b981" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0284c7" /></View>;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSummary(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Download actual PDF and Excel documents</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Sales</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summary?.totals?.invoices?.amount)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{summary?.totals?.invoices?.count || 0} Invoices</Text>
          </View>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Purchases</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{formatCurrency(summary?.totals?.purchases?.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.badgeText, { color: '#ef4444' }]}>{summary?.totals?.purchases?.count || 0} Bills</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Statements</Text>
        <ReportItem title="Profit & Loss" icon="chart-areaspline" color="#8b5cf6" type="profit-loss" />
        <ReportItem title="Balance Sheet" icon="scale-balance" color="#0ea5e9" type="balance-sheet" />
        <ReportItem title="Cash Flow" icon="cash-multiple" color="#10b981" type="cash-flow" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voucher Registers</Text>
        <ReportItem title="Sales Register" icon="file-document-outline" color="#f59e0b" type="sales-register" />
        <ReportItem title="Purchase Register" icon="cart-outline" color="#ec4899" type="purchase-register" />
        <ReportItem title="Expenses Report" icon="wallet-outline" color="#6366f1" type="expenses" />
        <ReportItem title="Stock Summary" icon="archive-outline" color="#14b8a6" type="stock-summary" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GST Reports</Text>
        <ReportItem title="GSTR-1 Summary" icon="file-check-outline" color="#f43f5e" type="gstr1" />
        <ReportItem title="GSTR-3B Summary" icon="file-table-outline" color="#3b82f6" type="gstr3b" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  summaryGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, elevation: 2 },
  summaryLabel: { fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  badge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 8 },
  badgeText: { fontSize: 10, color: '#0284c7', fontWeight: 'bold' },
  section: { padding: 16, paddingTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginBottom: 12, marginLeft: 4 },
  reportCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 8,
    elevation: 1
  },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  reportTitle: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: 'bold' },
  actionGroup: { flexDirection: 'row', gap: 16 },
  actionIcon: { padding: 4 },
});
