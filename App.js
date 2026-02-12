import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import Dashboard from './src/screens/Dashboard';
import CategoryProductsScreen from './src/screens/CategoryProductsScreen';
import SignupScreen from './src/screens/SignupScreen';
import ReportScreen from './src/screens/ReportScreen';
import UserScreen from './src/screens/UserScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import Chat from './src/components/Chat';
import CategoryListScreen from './src/components/CategoryListScreen';
import SaleSummaryReport from './src/screens/SalesSummaryReport';
import PrintScreen from './src/screens/PrintScreen';
import AppProviders from './src/context/AppProviders';
import OcrScreen from './src/components/icms/OcrCameraScreen';
import SettingScreen from './src/screens/SettingScreen';
import POSScreen from './src/screens/POSScreen';
import ICMSScreen from './src/screens/ICMSScreen';
import ICMS_invoice from './src/screens/icms/ICMS_invoice.js';
import ICMS_VendorList from './src/screens/icms/ICMS_VendorList.js';
import InvoiceDetails from './src/screens/icms/InvoiceDetails.js';
import RedProductsScreen from './src/screens/icms/RedProductsScreen';
import PendingInvoices from './src/components/icms/PendingInvoices';
import ReportsByHours from './src/screens/HourlyReport.js';
import TopSellingCategoriesReport from './src/screens/TopSellingCategoriesReport.js';
import TopSellingProductsReportScreen from './src/screens/TopSellingProductsReport.js';
import TopSellingCustomerReport from './src/screens/TopSellingCustomerReport.js';
import SessionReports from './src/components/reports/SessionReports.js';
import OrdersScreen from './src/components/orders/order.js';
import MixMatchScreen from './src/screens/promotions/mixmatch.js';
import QuantityDiscountScreen from './src/screens/promotions/QuantityDiscount';
import SalePrintScreen from './src/screens/SalePrintScreen';
import HomeIcon from './src/assets/icons/HomeIcon.svg';
import ProductIcon from './src/assets/icons/Icon-Product.svg';
import ProductScreen from './src/screens/ProductScreen.js';
import CartIcon from './src/assets/icons/inventory_1.svg';
import POSIcon from './src/assets/icons/payment_2.svg';
import ReportIcon from './src/assets/icons/Reportsicon.svg'; 
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// ---------- Custom Drawer with Logout ----------
function CustomDrawerContent(props) {
  const { navigation } = props;
  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.log('Google signout error:', e);
    }
    await AsyncStorage.removeItem('userId');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  ); 
}

// ---------- Bottom Tabs ----------
function BottomTabs() {
  const insets = useSafeAreaInsets();

  const BAR_PAD_BOTTOM = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const BAR_HEIGHT = 60 + BAR_PAD_BOTTOM;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
         headerShown: false,
         tabBarShowLabel: false,
   
        // Center the icon in each tab item
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },

        // Render icon + internal top strip
        tabBarIcon: ({ focused, size }) => {
          let IconComp;
          switch (route.name) {
            case 'Dashboard':   IconComp = HomeIcon; break;
            case 'ProductScreen':   IconComp = ProductIcon; break;
            case 'Report': IconComp = ReportIcon; break;
            case 'ICMSScreen':   IconComp = CartIcon; break;
            case 'POSScreen':  IconComp = POSIcon; break;
            default: return null;
          }

          return (
            <View
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden', 
              }}
            >
              <View
                // style={{
                //   position: 'absolute',
                //   top: 0, left: 0, right: 0,            // ensures consistent bar height
                //   height: 2,
                //   backgroundColor: focused ? '#319241' : 'transparent',
                // }}
              />
              <IconComp
                width={size ?? 24}
                height={size ?? 24}
                fill={focused ? '#319241' : 'gray'}
              />
            </View>
          );
        },
      })}
    >

      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="ProductScreen" component={ProductScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="POSScreen" component={POSScreen} />
       <Tab.Screen name="ICMSScreen" component={ICMSScreen} />
    </Tab.Navigator>
  );
}


// ---------- Drawer (kept same, Tabs inside) ----------
function MainDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Tabs"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="Profile" component={UserScreen} />
     <Drawer.Screen name="Tabs" component={BottomTabs} />
    </Drawer.Navigator>
  );
}
function ChatOverlay() {
  const insets = useSafeAreaInsets();
  return <Chat style={{ bottom: 70 + insets.bottom, right: 16 }} />;
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const access_token = await AsyncStorage.getItem('access_token');
        setInitialRoute(access_token ? 'MainDrawer' : 'Login');
      } catch (e) {
        setInitialRoute('Login');
      }
    };
    checkLogin();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AppProviders>
      <SafeAreaProvider>
        <NavigationContainer>
        <View style={{ flex: 1 }}>
          <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
       <Stack.Screen name="Checkout" component={CheckoutScreen} />    
      <Stack.Screen name="SaleSummaryReport" component={SaleSummaryReport} />     
      <Stack.Screen name="ReportsByHours" component={ReportsByHours} />   
   <Stack.Screen name="TopSellingCategoriesReport" component={TopSellingCategoriesReport} /> 
<Stack.Screen name="TopSellingProductsReportScreen" component={TopSellingProductsReportScreen} /> 
<Stack.Screen name="TopSellingCustomerReport" component={TopSellingCustomerReport} /> 
<Stack.Screen name="SessionReports" component={SessionReports} /> 
<Stack.Screen name="OrdersScreen" component={OrdersScreen} /> 


      <Stack.Screen name="OcrScreen" component={OcrScreen} />     
       <Stack.Screen name="SettingScreen" component={SettingScreen} />    
            <Stack.Screen name="CategoryListScreen" component={CategoryListScreen} />  
     <Stack.Screen name="PrintScreen" component={PrintScreen} /> 
     <Stack.Screen name="SalePrintScreen" component={SalePrintScreen} />
    <Stack.Screen name="MixMatchScreen" component={MixMatchScreen} /> 
    <Stack.Screen name="QuantityDiscountScreen" component={QuantityDiscountScreen} />

     
      <Stack.Screen name="SignupScreen" component={SignupScreen} />


      
          <Stack.Screen name="MainDrawer" component={MainDrawer} />
      <Stack.Screen
        name="CategoryProducts"
        component={CategoryProductsScreen}
        options={({ route }) => ({
          title: route?.params?.category || "Category",
        })}
      />
     <Stack.Screen
            name="InvoiceDetails"
            component={InvoiceDetails}
            options={{ title: 'InvoiceDetails' }}
          />
          <Stack.Screen
            name="VendorList"
            component={ICMS_VendorList}
            options={{ title: 'Vendorlist' }}
          />
          <Stack.Screen
            name="InvoiceList"
            component={ICMS_invoice}
            options={{
              title: 'Product Information',
              headerStyle: {
                backgroundColor: '#3478F5',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          />
          <Stack.Screen
            name="RedProducts"
            component={RedProductsScreen}
            options={{ title: 'Red Products' }}
          />
          <Stack.Screen
            name="PedingInvoices"
            component={PendingInvoices}
            options={{ title: 'Pending Invoices' }}
          />
          </Stack.Navigator>
          <ChatOverlay />
        </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProviders>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Header
  headerWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2c1e70' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  // Category pills
  catPill: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  catText: { color: '#2c1e70', fontWeight: '500' },
  // Drawer logout
  logoutBtn: {
    padding: 15,
    backgroundColor: '#f44',
    margin: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
