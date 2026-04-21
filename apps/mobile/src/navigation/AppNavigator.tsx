import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/auth';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DocumentListScreen from '../screens/DocumentListScreen';
import DocumentBuilderScreen from '../screens/DocumentBuilderScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PartiesScreen from '../screens/PartiesScreen';
import ItemsScreen from '../screens/ItemsScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import AccountsScreen from '../screens/AccountsScreen';
import MoreScreen from '../screens/MoreScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} />
      <MoreStack.Screen name="Accounts" component={AccountsScreen} options={{ headerShown: true }} />
      <MoreStack.Screen name="Estimates" component={DocumentListScreen} initialParams={{ type: 'ESTIMATE' }} options={{ headerShown: true }} />
      <MoreStack.Screen name="Purchases" component={DocumentListScreen} initialParams={{ type: 'PURCHASE' }} options={{ headerShown: true }} />
      <MoreStack.Screen name="PurchaseOrders" component={DocumentListScreen} initialParams={{ type: 'PURCHASE_ORDER' }} options={{ headerShown: true }} />
      <MoreStack.Screen name="Expenses" component={ExpensesScreen} options={{ headerShown: true }} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} options={{ headerShown: true }} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true }} />
      <MoreStack.Screen name="Payments" component={PaymentsScreen} options={{ headerShown: true }} />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="view-dashboard" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Parties"
        component={PartiesScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="account-group" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Items"
        component={ItemsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="package-variant" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Invoices"
        component={DocumentListScreen}
        initialParams={{ type: 'INVOICE' }}
        options={{ tabBarIcon: ({ color, size }) => <Icon name="file-document" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackScreen}
        options={{ 
          unmountOnBlur: true,
          tabBarIcon: ({ color, size }) => <Icon name="dots-horizontal" size={size} color={color} /> 
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="DocumentBuilder" component={DocumentBuilderScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loadAuth } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadAuth().finally(() => setIsLoading(false));
    
    // Notifications disabled for better Expo Go experience (due to SDK 53 limitation)
    /*
    if (isAuthenticated) {
      requestPermissions().then(granted => {
        if (granted) scheduleReminders();
      });
    }
    */
  }, [isAuthenticated]);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}