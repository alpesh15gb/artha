import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { reportApi, DashboardStats } from '../services/api';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';

export default function DashboardScreen({ navigation }: any) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { business, user } = useAuthStore();

  const loadDashboard = async () => {
    if (!business?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await reportApi.dashboard(business.id);
      setStats(res.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [business?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const formatCurrency = (amount: number) => {
    const symbol = business?.settings?.currencySymbol || '₹';
    return `${symbol}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(amount || 0)}`;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={[styles.header, { backgroundColor: business?.settings?.themeColor || '#0284c7' }]}>
        <Text style={styles.businessName}>{business?.name || 'Artha'}</Text>
        <Text style={styles.welcome}>Welcome, {user?.name || 'User'}</Text>
      </View>

      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Invoices')}>
          <Icon name="file-document" size={28} color="#0284c7" />
          <Text style={styles.statValue}>{stats?.totals?.invoices?.count || 0}</Text>
          <Text style={styles.statLabel}>Invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Parties')}>
          <Icon name="account-group" size={28} color="#10b981" />
          <Text style={styles.statValue}>{stats?.totals?.parties || 0}</Text>
          <Text style={styles.statLabel}>Parties</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Items')}>
          <Icon name="package-variant" size={28} color="#f59e0b" />
          <Text style={styles.statValue}>{stats?.totals?.items || 0}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sales Overview</Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Total Sales</Text>
            <Text style={styles.overviewValue}>{formatCurrency(stats?.totals?.invoices?.amount)}</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Total Purchases</Text>
            <Text style={styles.overviewValue}>{formatCurrency(stats?.totals?.purchases?.amount)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outstanding</Text>
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Receivable</Text>
            <Text style={[styles.overviewValue, styles.receivable]}>{formatCurrency(stats?.receivables)}</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Payable</Text>
            <Text style={[styles.overviewValue, styles.payable]}>{formatCurrency(stats?.payables)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Invoices')}>
            <Icon name="file-plus" size={24} color="#0284c7" />
            <Text style={styles.actionText}>Invoices</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('More', { screen: 'Estimates' })}>
            <Icon name="file-edit" size={24} color="#f59e0b" />
            <Text style={styles.actionText}>Estimates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('More', { screen: 'Purchases' })}>
            <Icon name="cart-plus" size={24} color="#ef4444" />
            <Text style={styles.actionText}>Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('More', { screen: 'Reports' })}>
            <Icon name="chart-bar" size={24} color="#8b5cf6" />
            <Text style={styles.actionText}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: '#0284c7' },
  businessName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  welcome: { fontSize: 14, color: '#bae6fd', marginTop: 4 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  section: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  overviewCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 2 },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  overviewLabel: { fontSize: 14, color: '#64748b' },
  overviewValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  receivable: { color: '#10b981' },
  payable: { color: '#ef4444' },
  quickActions: { padding: 16, paddingTop: 0 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  actionText: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
});