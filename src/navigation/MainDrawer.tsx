import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '../theme';

import DrawerContent from '../components/DrawerContent';

// Real Screens
import DashboardScreen from '../screens/DashboardScreen';
import ClientsScreen from '../screens/ClientsScreen';
import AddClientScreen from '../screens/AddClientScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import InstallmentsScreen from '../screens/InstallmentsScreen';
import NewInstallmentScreen from '../screens/NewInstallmentScreen';
import InstallmentDetailScreen from '../screens/InstallmentDetailScreen';
import RecordPaymentScreen from '../screens/RecordPaymentScreen';
import ClientPaymentScreen from '../screens/ClientPaymentScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AgreementFormScreen from '../screens/AgreementFormScreen';
import BusinessProfileScreen from '../screens/BusinessProfileScreen';
import EditTermsScreen from '../screens/EditTermsScreen';
import CollectPaymentSelectionScreen from '../screens/CollectPaymentSelectionScreen';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack for Clients to allow pushing AddClient & Client Details
function ClientsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="ClientsList" component={ClientsScreen} />
      <Stack.Screen name="AddClientScreen" component={AddClientScreen} />
      <Stack.Screen name="ClientDetailScreen" component={ClientDetailScreen} />
      <Stack.Screen name="NewInstallmentScreen" component={NewInstallmentScreen} />
      <Stack.Screen name="ClientPaymentScreen" component={ClientPaymentScreen} />
      <Stack.Screen name="InstallmentDetailScreen" component={InstallmentDetailScreen} />
      <Stack.Screen name="RecordPaymentScreen" component={RecordPaymentScreen} />
      <Stack.Screen name="CollectPaymentSelection" component={CollectPaymentSelectionScreen} />
    </Stack.Navigator>
  );
}

// Stack for Installments to allow pushing Details & Payment
function InstallmentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="InstallmentsList" component={InstallmentsScreen} />
      <Stack.Screen name="NewAgreement" component={AgreementFormScreen} />
      <Stack.Screen name="InstallmentDetailScreen" component={InstallmentDetailScreen} />
      <Stack.Screen name="RecordPaymentScreen" component={RecordPaymentScreen} />
    </Stack.Navigator>
  );
}

// Stack for Settings
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
      <Stack.Screen name="EditForms" component={EditTermsScreen} />
    </Stack.Navigator>
  );
}

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home';
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'ClientsTab') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'InstallmentsTab') {
            iconName = focused ? 'file-document' : 'file-document-outline';
          } else if (route.name === 'ReportsTab') {
            iconName = focused ? 'chart-bar' : 'chart-bar';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={28} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 8,
          shadowColor: Colors.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: 11,
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen 
        name="ClientsTab" 
        component={ClientsStack} 
        options={{ tabBarLabel: 'Clients' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('ClientsTab', { screen: 'ClientsList' });
          },
        })}
      />
      <Tab.Screen 
        name="InstallmentsTab" 
        component={InstallmentsStack} 
        options={{ tabBarLabel: 'Installments' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('InstallmentsTab', { screen: 'InstallmentsList' });
          },
        })}
      />
      <Tab.Screen name="ReportsTab" component={ReportsScreen} options={{ tabBarLabel: 'Reports' }} />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsStack} 
        options={{ tabBarLabel: 'Settings' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('SettingsTab', { screen: 'SettingsMain' });
          },
        })}
      />
    </Tab.Navigator>
  );
}

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: Colors.primary + '15',
        drawerActiveTintColor: Colors.primary,
        drawerInactiveTintColor: Colors.textPrimary,
        drawerLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: 15,
          marginLeft: -10,
        },
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={BottomTabs} 
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard" size={24} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}



