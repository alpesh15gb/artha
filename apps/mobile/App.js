import React, { useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TrendingUp, Settings } from 'lucide-react-native';
import { ThemeProvider } from './src/ThemeContext';
import Dashboard from './src/screens/Dashboard';
import LoginScreen from './src/screens/LoginScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import BusinessProfileScreen from './src/screens/BusinessProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import EstimatesScreen from './src/screens/EstimatesScreen';
import ExpensesScreen from './src/screens/ExpensesScreen';
import PurchasesScreen from './src/screens/PurchasesScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import PurchaseBuilderScreen from './src/screens/PurchaseBuilderScreen';
import DocumentBuilderScreen from './src/screens/DocumentBuilderScreen';
import ExpenseBuilderScreen from './src/screens/ExpenseBuilderScreen';
import PartyLedgerScreen from './src/screens/PartyLedgerScreen';
import PartiesScreen from './src/screens/PartiesScreen';
import { arthaService } from './src/ArthaClient';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [docBuilderType, setDocBuilderType] = useState('INVOICE');
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen('dashboard');
  };

  const handleLogin = async (credentials) => {
    try {
      console.log('Attempting Secure Login...');
      const response = await arthaService.login(credentials.email, credentials.password);
      
      if (response.success) {
        setIsAuthenticated(true);
      } else {
        alert('Invalid response from server. Please try again.');
      }
    } catch (error) {
      console.error('Login Failed:', error);
      alert(error.response?.data?.message || 'Connection Error. Please check your network.');
    }
  };

  const renderScreen = () => {
    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;
    
    switch (currentScreen) {
      case 'new_invoice':
        return <DocumentBuilderScreen
          type="INVOICE"
          onBack={() => setCurrentScreen('dashboard')}
          onSaveSuccess={() => setCurrentScreen('invoices')}
        />;
      case 'invoices':
        return <InvoicesScreen 
          onBack={() => {
            console.log('Navigating back to dashboard');
            setCurrentScreen('dashboard');
          }} 
          onCreate={() => {
            setDocBuilderType('INVOICE');
            setCurrentScreen('document_builder');
          }}
        />;
      case 'estimates':
        return <EstimatesScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onCreate={() => {
            setDocBuilderType('ESTIMATE');
            setCurrentScreen('document_builder');
          }}
        />;
      case 'expenses':
        return <ExpensesScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onCreate={() => setCurrentScreen('expense_builder')}
        />;
      case 'expense_builder':
        return <ExpenseBuilderScreen onBack={() => setCurrentScreen('expenses')} />;
      case 'purchases':
        return <PurchasesScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onCreate={() => setCurrentScreen('purchase_builder')}
        />;
      case 'purchase_builder':
        return <PurchaseBuilderScreen 
          onBack={() => setCurrentScreen('purchases')} 
          onSaveSuccess={() => setCurrentScreen('purchases')} 
        />;
      case 'inventory':
        return <InventoryScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onSelectItem={(id) => {
            setSelectedItemId(id);
            setCurrentScreen('item_details');
          }}
        />;
      case 'item_details':
        return <ItemDetailScreen 
          itemId={selectedItemId} 
          onBack={() => setCurrentScreen('inventory')} 
        />;
      case 'reports':
        return <ReportsScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'parties':
        return <PartiesScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onSelectParty={(id) => {
            setSelectedPartyId(id);
            setCurrentScreen('party_ledger');
          }}
        />;
      case 'party_ledger':
        return <PartyLedgerScreen 
          partyId={selectedPartyId} 
          onBack={() => setCurrentScreen('parties')} 
        />;
      case 'more':
        return <PartiesScreen onBack={() => setCurrentScreen('dashboard')} />;
      case 'settings':
        return <SettingsScreen 
          onBack={() => setCurrentScreen('dashboard')} 
          onLogout={handleLogout}
          onNavigate={(subScreen) => setCurrentScreen(subScreen)}
        />;
      case 'document_builder':
        return <DocumentBuilderScreen 
          type={docBuilderType} 
          onBack={() => setCurrentScreen(docBuilderType === 'INVOICE' ? 'invoices' : 'estimates')} 
          onSaveSuccess={() => setCurrentScreen(docBuilderType === 'INVOICE' ? 'invoices' : 'estimates')} 
        />;
      case 'business_profile':
        return <BusinessProfileScreen onBack={() => setCurrentScreen('settings')} />;
      case 'personal_profile':
        return <UserProfileScreen onBack={() => setCurrentScreen('settings')} />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={(screen) => {
          console.log('Navigating to:', screen);
          setCurrentScreen(screen);
        }} />;
    }
  };

  return (
    <ThemeProvider>
      <StatusBar style="light" />
      {renderScreen()}
    </ThemeProvider>
  );
}
