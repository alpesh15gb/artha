import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';
import { arthaService } from '../ArthaClient';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Package, 
  Users, 
  TrendingUp, 
  LayoutDashboard,
  FileText,
  Settings,
  ShoppingBag
} from 'lucide-react-native';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};

const Dashboard = ({ onNavigate }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ receivable: '0', payable: '0', balance: '0' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const bizRes = await arthaService.client.get('/businesses');
      const biz = bizRes.data.data?.[0];
      if (biz) {
        setBusiness(biz);
        const [invRes, expRes] = await Promise.all([
          arthaService.getInvoices(biz.id),
          arthaService.client.get(`/expenses/business/${biz.id}`).catch(() => ({ data: { data: [] } }))
        ]);
        const invList = invRes.data || [];
        const expList = expRes.data?.data || [];
        setInvoices(invList);
        const receivable = invList.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
        const payable = expList.reduce((acc, exp) => acc + (parseFloat(exp.totalAmount) || 0), 0);
        setSummary({
          receivable: receivable.toLocaleString('en-IN'),
          payable: payable.toLocaleString('en-IN'),
          balance: biz.openingBalance || '0'
        });
      }
    } catch (error) {
      console.error('Dashboard fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, amount, icon: Icon, color, isNegative }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon color={color} size={20} />
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statTitle, { color: theme.colors.textMuted }]}>{title}</Text>
        <Text style={[styles.statAmount, { color: theme.colors.text }]}>₹{amount}</Text>
      </View>
      <View style={styles.statIndicator}>
        {isNegative ? (
          <ArrowDownLeft color={theme.colors.error} size={16} />
        ) : (
          <ArrowUpRight color={theme.colors.success} size={16} />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: theme.colors.textMuted }]}>{getGreeting()}</Text>
            <Text style={[styles.businessName, { color: theme.colors.text }]}>
              {business?.name || 'Artha User'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.profileButton, { backgroundColor: theme.colors.surface }]} onPress={() => onNavigate('settings')}>
            <Users color={theme.colors.primary} size={24} />
          </TouchableOpacity>
        </View>

        {/* Hero Balance Card */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View>
            <Text style={styles.heroLabel}>Business Balance</Text>
            <Text style={styles.heroAmount}>₹{summary.balance}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => onNavigate('new_invoice')}>
            <Plus color="white" size={24} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard 
            title="Receivable" 
            amount={summary.receivable} 
            icon={ArrowDownLeft} 
            color={theme.colors.success} 
          />
          <StatCard 
            title="Payable" 
            amount={summary.payable} 
            icon={ArrowUpRight} 
            color={theme.colors.error} 
            isNegative
          />
        </View>

        {/* Action Shortcuts */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
        </View>
        <View style={styles.shortcuts}>
          {[
            { name: 'Invoices', id: 'invoices', icon: FileText, color: '#3b82f6' },
            { name: 'Purchases', id: 'purchases', icon: ShoppingBag, color: '#f59e0b' },
            { name: 'Estimates', id: 'estimates', icon: FileText, color: '#8b5cf6' },
            { name: 'Expenses', id: 'expenses', icon: ShoppingBag, color: '#ef4444' },
          ].map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.shortcutItem} 
              onPress={() => onNavigate(item.id)}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: item.color + '15' }]}>
                <item.icon color={item.color} size={24} />
              </View>
              <Text style={[styles.shortcutText, { color: theme.colors.textMuted }]}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.shortcuts}>
          {[
            { name: 'Parties', id: 'parties', icon: Users, color: '#ec4899' },
            { name: 'Reports', id: 'reports', icon: TrendingUp, color: '#10b981' },
            { name: 'Inventory', id: 'inventory', icon: Package, color: '#f59e0b' },
            { name: 'Settings', id: 'settings', icon: Settings, color: '#6366f1' },
          ].map((item, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.shortcutItem} 
              onPress={() => onNavigate(item.id)}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: item.color + '15' }]}>
                <item.icon color={item.color} size={24} />
              </View>
              <Text style={[styles.shortcutText, { color: theme.colors.textMuted }]}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Invoices */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Invoices</Text>
          <TouchableOpacity onPress={() => onNavigate('invoices')}>
            <Text style={{ color: theme.colors.primary }}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {[...(invoices || [])].slice(0, 3).map((item) => (
          <View key={item.id} style={[styles.invoiceItem, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.invoiceLeft}>
              <View style={[styles.invoiceIcon, { backgroundColor: theme.colors.background }]}>
                <FileText color={theme.colors.textMuted} size={20} />
              </View>
              <View>
                <Text style={[styles.invoiceTitle, { color: theme.colors.text }]}>{item.invoiceNumber}</Text>
                <Text style={{ color: theme.colors.textDim, fontSize: 12 }}>
                  {new Date(item.date).toLocaleDateString('en-IN')}
                </Text>
              </View>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={[styles.invoiceAmount, { color: theme.colors.text }]}>₹{item.totalAmount || item.total}</Text>
              <Text style={{ 
                color: item.status === 'Paid' ? theme.colors.success : theme.colors.warning, 
                fontSize: 10 
              }}>
                {item.status || 'Sent'}
              </Text>
            </View>
          </View>
        ))}

      </ScrollView>

      {/* Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => onNavigate('dashboard')}>
          <LayoutDashboard color={theme.colors.primary} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('invoices')}>
          <FileText color={theme.colors.textDim} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('reports')}>
          <TrendingUp color={theme.colors.textDim} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onNavigate('settings')}>
          <Settings color={theme.colors.textDim} size={24} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
  heroAmount: {
    color: 'white',
    fontSize: 28,
    fontWeight: '900',
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  statAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  shortcuts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  shortcutItem: {
    alignItems: 'center',
    gap: 8,
  },
  shortcutIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '500',
  },
  invoiceItem: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  invoiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomNav: {
    height: 70,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  }
});

export default Dashboard;
