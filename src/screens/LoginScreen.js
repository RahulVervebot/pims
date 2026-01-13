import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import TulsiLogo from '../assets/images/Tulsi.svg';
import { dbPromise } from '../firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // fetched from Firestore: public Storage URL to JSON (e.g., https://.../storelist.json?...token=...)
  const [firebaseeurl, setFirebaseUrl] = useState('');
  const inFlightRef = useRef(false);

  // store picker state
  const [storeMap, setStoreMap] = useState(null); // { [domain]: [{ name, storeurl, dbname }] }
  const [storeOptions, setStoreOptions] = useState([]); // options for current email domain
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeModalVisible, setStoreModalVisible] = useState(false);

  // -----------------------------
  // 1) Get Firebase URL (your existing Firestore doc)
  // -----------------------------
  const fetchFirebaseDataLogin = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const db = await dbPromise;
      const docRef = db.collection('tulsi').doc('storelist');
      const docSnapshot = await docRef.get();
      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        // expects { url: 'https://firebasestorage.googleapis.com/.../storelist.json?...' }
        if (data?.url) {
          setFirebaseUrl(String(data.url));
        await AsyncStorage.setItem('bottombanner', data.bottombanner);
        await AsyncStorage.setItem('topabanner', data.topabanner);
        await AsyncStorage.setItem('icms_url', data.icmsurl);
          }
      } else {
        console.warn('Firestore: tulsi/storelist does not exist');
      }
    } catch (error) {
      console.error('Failed to retrieve Firebase data:', error);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFirebaseDataLogin();
      return () => {};
    }, [fetchFirebaseDataLogin])
  );

  // -----------------------------
  // 2) Fetch storelist.json from firebaseeurl
  //    Expected shape (simplified):
  //    [ { "delight.us": [ { "STORE NAME": { storeurl, dbname, password } }, ... ],
  //        "gmail.com":   [ { "STORE NAME": {...}}, ... ] } ]
  // -----------------------------
  const fetchStoreListFromFirebaseUrl = useCallback(async (url) => {
    try {
      if (!url) return;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // normalize -> { domain: [{name, storeurl, dbname}, ...], ... }
      const root = Array.isArray(json) ? json[0] : json;
      const map = {};
      if (root && typeof root === 'object') {
        for (const domain of Object.keys(root)) {
          const arr = Array.isArray(root[domain]) ? root[domain] : [];
          map[domain] = arr
            .map((o) => {
              const name = o && typeof o === 'object' ? Object.keys(o)[0] : null;
              if (!name) return null;
              const { storeurl, dbname, icms_store, chat_ai_api, chat_ai_baseurl } = o[name] || {};
              if (!storeurl || !dbname) return null;
              return { name, storeurl, dbname, icms_store, chat_ai_api, chat_ai_baseurl };
            })
            .filter(Boolean);
        }
      }
      setStoreMap(map);
    } catch (e) {
      console.error('Failed to fetch storelist.json:', e);
    }
  }, []);

  useEffect(() => {
    if (firebaseeurl) fetchStoreListFromFirebaseUrl(firebaseeurl);
  }, [firebaseeurl, fetchStoreListFromFirebaseUrl]);

  // -----------------------------
  // 3) Filter options by email domain as user types
  // -----------------------------
  useEffect(() => {
    if (!storeMap) return;
    const domain = email.includes('@') ? email.split('@')[1].toLowerCase().trim() : '';
    const options = (domain && storeMap[domain]) ? storeMap[domain] : [];
    setStoreOptions(options);
    // auto-clear selection if domain changes
    setSelectedStore((prev) => (prev && options.find(o => o.name === prev.name) ? prev : null));
  }, [email, storeMap]);

  // Save on select
  const handleSelectStore = async (store) => {
    try {
      setSelectedStore(store);
      await AsyncStorage.setItem('storeurl', store.storeurl);
      await AsyncStorage.setItem('dbname', store.dbname);
      await AsyncStorage.setItem('icms_store', store.icms_store);
      await AsyncStorage.setItem('chat_ai_api', store.chat_ai_api);
      await AsyncStorage.setItem('chat_ai_baseurl', store.chat_ai_baseurl);
    } catch (e) {
      console.error('AsyncStorage set error:', e);
    } finally {
      setStoreModalVisible(false);
    }
  };

  // small util to join base + path safely
  const joinUrl = (base, path) => {
    if (!base) return path;
    if (base.endsWith('/') && path.startsWith('/')) return base + path.slice(1);
    if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
    return base + path;
  };

  // -----------------------------
  // 4) One-click Odoo login using selected store
  // -----------------------------
  const handleManualLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter email and password.');
      return;
    }
    if (!selectedStore) {
      if (storeOptions.length) {
        Alert.alert('Select store', 'Please choose your store before logging in.');
      } else {
        Alert.alert('No store for this email', 'Your email domain does not match any store.');
      }
      return;
    }

    try {
      setSigningIn(true);
      const url = joinUrl(selectedStore.storeurl, '/pos/app/login');
      const body = {
        db: selectedStore.dbname,
        login: email,
        password,
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      console.log("login response:",data);
      if (!res.ok || !data?.result) {
        const msg = (data && data.error && (data.error.data?.message || data.error.message)) || 'Invalid credentials or server error';
        Alert.alert('Login Failed', msg);
        return;
      }
      const { pos_role, access_token, expiry,user_full_name,user_context } = data.result || {};
      await AsyncStorage.multiSet([
        ['userRole', String(pos_role || '')],
        ['access_token', String(access_token || '')],
        ['expiry', String(expiry || '')],
         ['userName', String(user_full_name || '')],
         ['userEmail',String(email || '')],
        ['userTimeZone',String(user_context.tz || '')],
        ['userLang',String(user_context.lang || '')],


      ]);
      // navigate forward
      navigation.navigate('MainDrawer');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong during login.');
    } finally {
      setSigningIn(false);
    }
  };
  // -----------------------------
  // UI
  // -----------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={GREEN} />

      <View style={styles.headerArea}>
        <View style={styles.logoCircle}>
          <TulsiLogo />
        </View>
        <Text style={styles.appTitle}>Welcome to TULSI</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>
      <View style={styles.panel}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.panelContent}>
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
            {/* NEW: Select Store field (below Email) */}
            <View style={styles.field}>
              <Text style={styles.label}>Select Store</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, !storeOptions.length && { opacity: 0.6 }]}
                onPress={() => storeOptions.length && setStoreModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={{ color: selectedStore ? TEXT : '#9AA3AF' }}>
                  {selectedStore?.name ||
                    (email
                      ? storeOptions.length
                        ? 'Tap to choose store'
                        : 'No stores for this email domain'
                      : 'Enter email to see stores')}
                </Text>
              </TouchableOpacity>
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
            <TouchableOpacity style={styles.primaryBtn} onPress={handleManualLogin} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Login</Text>
            </TouchableOpacity>
            {signingIn && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      {/* Store chooser modal */}
      <Modal visible={storeModalVisible} animationType="slide" transparent onRequestClose={() => setStoreModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose Store</Text>
            {storeOptions.map((opt) => (
              <TouchableOpacity key={opt.name} style={styles.modalItem} onPress={() => handleSelectStore(opt)}>
                <Text style={styles.modalItemText}>{opt.name}</Text>
                <Text style={styles.modalItemSub}>{opt.dbname}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalItem, { marginTop: 8 }]} onPress={() => setStoreModalVisible(false)}>
              <Text style={[styles.modalItemText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
// ---- your existing colors / styles ----
const GREEN = '#E6FAE6';
const PANEL_RADIUS = 28;
const PRIMARY = '#2ECC71';
const TEXT = '#1C2833';
const MUTED = '#5D6D7E';
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: GREEN },
  headerArea: { height: '30%', alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  logoCircle: {
    width: 120, height: 120, borderRadius: 44, backgroundColor: '#F5FFF5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, borderWidth: 2, borderColor: '#BDE6BD', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  appTitle: { fontSize: 20, fontWeight: '700', color: TEXT },
  subtitle: { fontSize: 14, color: MUTED, marginTop: 2 },
  panel: {
    flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: PANEL_RADIUS, borderTopRightRadius: PANEL_RADIUS,
    paddingTop: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  panelContent: { paddingHorizontal: 22, paddingBottom: 30 },
  heading: { fontSize: 24, fontWeight: '700', color: TEXT, marginTop: 6 },
  subtext: { color: MUTED, marginTop: 6, marginBottom: 18 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  input: {
    width: '100%', paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D5DBDB', backgroundColor: '#FBFBFB',
    borderRadius: 12, color: TEXT,
  },
  selectInput: { justifyContent: 'center' },

  primaryBtn: {
    marginTop: 10, backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center',
    borderTopLeftRadius: PANEL_RADIUS, borderTopRightRadius: PANEL_RADIUS, zIndex: 2,
  },

  // modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: TEXT },
  modalItem: {
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  modalItemText: { fontSize: 15, fontWeight: '600', color: TEXT },
  modalItemSub: { fontSize: 12, color: MUTED },
});
