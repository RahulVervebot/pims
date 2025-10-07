import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Text,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import TulsiLogo from '../assets/images/Tulsi.svg'
// 👉 Replace with your logo asset
// import logo from '../assets/logo.png';

export default function LoginScreen({ navigation }) {
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '220923059339-t1uv4ukr78vdb49m8u0j7qa7it4qo6vq.apps.googleusercontent.com',
    });
  }, []);

  const handleManualLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      setSigningIn(true);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem('userId', data.user._id);
        await AsyncStorage.setItem('userName', data.user.name);
        await AsyncStorage.setItem('userEmail', data.user.email);
        await AsyncStorage.setItem('userRole', data.user.role);
        navigation.navigate('MainDrawer', { userInfo: data.user });
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices();
      const { user } = await GoogleSignin.signIn();
      console.log('user:', user);
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.photo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        navigation.navigate('MainDrawer', { userInfo: data.user });
      } else {
        Alert.alert('Error', data.error || 'Google login failed');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={GREEN} />
      {/* Top 30% green area with logo */}
      <View style={styles.headerArea}>
        {/* If you have a logo image, uncomment below and remove the circle */}
        {/* <Image source={logo} style={styles.logo} resizeMode="contain" /> */}
        <View style={styles.logoCircle}>
          <TulsiLogo/>
        </View>
        <Text style={styles.appTitle}>Welcome to TULSI</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      {/* Bottom white rounded panel */}
      <View style={styles.panel}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.panelContent}
          >
            <Text style={styles.heading}>Login</Text>
            <Text style={styles.subtext}>Enter your credentials below.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9AA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9AA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleManualLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.googleBtnText}>Sign in with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('SignupScreen')}
              style={{ marginTop: 14 }}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account? <Text style={styles.linkStrong}>Sign up</Text>
              </Text>
            </TouchableOpacity>

            {signingIn && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Footer */}
  
    </SafeAreaView>
  );
}

const GREEN = '#E6FAE6';
const PANEL_RADIUS = 28;
const PRIMARY = '#2ECC71';
const TEXT = '#1C2833';
const MUTED = '#5D6D7E';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GREEN,
  },

  /** Header (top 30%) */
  headerArea: {
    height: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 44,
    backgroundColor: '#F5FFF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#BDE6BD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#2E7D32',
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 2,
  },

  /** Panel (bottom 70%) */
  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    paddingTop: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  panelContent: {
    paddingHorizontal: 22,
    paddingBottom: 30,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    marginTop: 6,
  },
  subtext: {
    color: MUTED,
    marginTop: 6,
    marginBottom: 18,
  },

  /** Fields & buttons */
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    backgroundColor: '#FBFBFB',
    borderRadius: 12,
    color: TEXT,
  },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  googleBtn: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  googleBtnText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
  },

  /** Overlay while signing in */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: PANEL_RADIUS,
    borderTopRightRadius: PANEL_RADIUS,
    zIndex: 2,
  },

  /** Footer */

});
