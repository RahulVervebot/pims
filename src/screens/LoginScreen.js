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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

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
        navigation.replace('MainDrawer', { userInfo: data.user });
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
        navigation.replace('MainDrawer', { userInfo: data.user });
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
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header / Logo Area */}
        <View style={styles.header}>
          {/* If you have a logo image, uncomment below and remove the text */}
          {/* <Image source={logo} style={styles.logo} resizeMode="contain" /> */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>V</Text>
          </View>
          <Text style={styles.appTitle}>Welcome to TULSI</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {signingIn && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" />
            </View>
          )}

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

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9AA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleManualLogin} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8}>
            {/* You can add a small Google icon at left if you have one */}
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ marginTop: 14 }}>
            <Text style={styles.linkText}>
              Don&apos;t have an account? <Text style={styles.linkStrong}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer / Legal */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} VerveBot</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const CARD_BG = '#FFFFFF';
const BG = '#F5F7FB';
const PRIMARY = '#3478F5';
const TEXT = '#111827';
const MUTED = '#6B7280';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: PRIMARY,
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

  card: {
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    zIndex: 2,
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
    borderColor: '#E5E7EB',
    backgroundColor: '#FBFBFD',
    borderRadius: 10,
    color: TEXT,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  googleBtn: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleBtnText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  linkText: {
    color: MUTED,
    fontSize: 13,
    textAlign: 'center',
  },
  linkStrong: {
    color: PRIMARY,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  footerText: {
    color: MUTED,
    fontSize: 12,
  },
});
