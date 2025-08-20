import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SignupScreen from './src/screens/SignupScreen';
import ReportScreen from './src/screens/ReportScreen';
import UserScreen from './src/screens/UserScreen';
import CartScreen from './src/screens/CartScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import AppProviders from './src/context/AppProviders';
//icons 
import HomeIcon from './src/assets/icons/HomeIcon.svg';
import CartIcon from './src/assets/icons/Carticon.svg';
import PromotionIcon from './src/assets/icons/Promotionicon.svg';
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
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
         tabBarShowLabel: false,   // 👈 hides the text labels
          headerShown: false,    // optional: hides header
        tabBarActiveTintColor: '#F57200',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#fff', height: 60 },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: <HomeIcon width={size} height={size} fill={color} />,
            Report: <ReportIcon width={size} height={size} fill={color} />,
            Cart: <CartIcon width={size} height={size} fill={color} />,
            Wishlist: <PromotionIcon width={size} height={size} fill={color} />,
          };
          return icons[route.name] || null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
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

export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        setInitialRoute(userId ? 'MainDrawer' : 'Login');
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
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignupScreen" component={SignupScreen} />
          <Stack.Screen name="MainDrawer" component={MainDrawer} />

    
        </Stack.Navigator>
      </NavigationContainer>
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
