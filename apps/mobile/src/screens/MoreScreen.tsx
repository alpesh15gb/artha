import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function MoreScreen({ navigation }: any) {
  const menuItems = [
    { title: 'Bank Accounts', icon: 'bank', color: '#0284c7', screen: 'Accounts' },
    { title: 'Estimates', icon: 'file-edit', color: '#f59e0b', screen: 'Estimates' },
    { title: 'Purchases', icon: 'cart-plus', color: '#ef4444', screen: 'Purchases' },
    { title: 'Purchase Orders', icon: 'cart-arrow-down', color: '#10b981', screen: 'PurchaseOrders' },
    { title: 'Expenses', icon: 'wallet-outline', color: '#6366f1', screen: 'Expenses' },
    { title: 'Payments', icon: 'cash-check', color: '#10b981', screen: 'Payments' },
    { title: 'Reports', icon: 'chart-bar', color: '#8b5cf6', screen: 'Reports' },
    { title: 'Settings', icon: 'cog-outline', color: '#64748b', screen: 'Settings' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More Actions</Text>
      </View>
      <View style={styles.grid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.card} 
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
              <Icon name={item.icon as any} size={28} color={item.color} />
            </View>
            <Text style={styles.label}>{item.title}</Text>
            <Icon name="chevron-right" size={20} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  grid: { padding: 16 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 2
  },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: '#334155' },
});
