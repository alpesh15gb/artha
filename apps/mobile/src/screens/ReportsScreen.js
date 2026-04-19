import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  TrendingUp, 
  ArrowLeft, 
  PieChart, 
  DollarSign, 
  BarChart3,
  Calendar,
  ChevronRight,
  ShieldCheck
} from 'lucide-react-native';

const ReportsScreen = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const bizId = bizRes.data.data?.[0]?.id;
      if (bizId) {
        const plRes = await arthaService.client.get(`/reports/business/${bizId}/profit-loss?range=this-month`);
        setReportData(plRes.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports(true);
  };

  const SummaryCard = ({ title, amount, label, color, icon: Icon }) => (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
        <Icon color={color} size={24} />
      </View>
      <View style={styles.summaryInfo}>
        <Text style={[styles.summaryTitle, { color: theme.colors.textDim }]}>{title}</Text>
        <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>₹{amount}</Text>
        <Text style={[styles.summaryLabel, { color: color }]}>{label}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Financial Reports</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <View style={[styles.periodBadge, { backgroundColor: theme.colors.surface, marginBottom: 0 }]}>
            <Calendar color={theme.colors.primary} size={16} />
            <Text style={{ color: theme.colors.textDim, marginLeft: 8 }}>
              {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.periodBadge, { backgroundColor: theme.colors.surface, marginBottom: 0 }]}>
            <ShieldCheck color={theme.colors.success} size={16} />
            <Text style={{ color: theme.colors.textDim, marginLeft: 8, fontSize: 12 }}>Compliance: ACTIVE</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.grid}>
              <SummaryCard 
                title="Gross Profit" 
                amount={reportData?.profit?.grossProfit?.toLocaleString('en-IN') || '0'} 
                label="+12% from last month"
                color={theme.colors.success}
                icon={TrendingUp}
              />
              <SummaryCard 
                title="Total Expenses" 
                amount={reportData?.expenses?.totalExpenses?.toLocaleString('en-IN') || '0'} 
                label="35% of revenue"
                color={theme.colors.error}
                icon={PieChart}
              />
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Revenue Breakdown</Text>
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textDim }}>Total Sales</Text>
                <Text style={{ color: theme.colors.text, fontWeight: 'bold' }}>₹{reportData?.income?.sales?.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textDim }}>Tax Collected</Text>
                <Text style={{ color: theme.colors.text }}>₹{reportData?.income?.taxCollected?.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={{ color: theme.colors.textDim }}>Profit Margin</Text>
                <Text style={{ color: theme.colors.success, fontWeight: 'bold' }}>{reportData?.profit?.profitMargin}%</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.primary + '10' }]}
              onPress={() => Alert.alert('P&L Statement', `Revenue: ₹${reportData?.income?.sales?.toLocaleString('en-IN') || 0}\nExpenses: ₹${reportData?.expenses?.totalExpenses?.toLocaleString('en-IN') || 0}\nNet Profit: ₹${reportData?.profit?.grossProfit?.toLocaleString('en-IN') || 0}`)}
            >
              <BarChart3 color={theme.colors.primary} size={20} />
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginLeft: 12 }}>View Detailed P&L Statement</Text>
              <ChevronRight color={theme.colors.primary} size={20} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.colors.success + '10', marginTop: 12 }]}
              onPress={() => Alert.alert('GST Summary', `Tax Collected: ₹${reportData?.income?.taxCollected?.toLocaleString('en-IN') || 0}\nCGST: ₹${(reportData?.gst?.cgst || 0).toLocaleString('en-IN')}\nSGST: ₹${(reportData?.gst?.sgst || 0).toLocaleString('en-IN')}`)}
            >
              <ShieldCheck color={theme.colors.success} size={20} />
              <Text style={{ color: theme.colors.success, fontWeight: 'bold', marginLeft: 12 }}>GST Summary (GSTR-1)</Text>
              <ChevronRight color={theme.colors.success} size={20} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
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
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  grid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 20 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryTitle: { fontSize: 12, marginBottom: 4 },
  summaryAmount: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  summaryLabel: { fontSize: 10, fontWeight: 'bold' },
  section: { padding: 20, borderRadius: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20 },
});

export default ReportsScreen;
