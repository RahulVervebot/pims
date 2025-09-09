// SignupScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  FlatList
} from 'react-native';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../components/AppHeader';
import TulsiLogo from '../assets/images/Tulsi.svg'
export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
   const [username, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // role that will be submitted
  const [role, setRole] = useState('customer');

  // role of the CURRENT user (from storage) to decide visibility/options
  const [userRole, setUserRole] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

useEffect(() => {
  let mounted = true;
  const normalizeRole = (v) => (v ? String(v).toLowerCase().trim() : 'customer');
  const loadRole = async () => {
    try {
      const stored = await AsyncStorage.getItem('userRole');
      const normalized = normalizeRole(stored);
      console.log('[SignupScreen] userRole from storage:', stored, '=>', normalized);
      if (mounted) setUserRole(normalized);
    } catch (e) {
      if (mounted) setUserRole('customer');
    }
  };
  loadRole();
  return () => { mounted = false; };
}, []);


  // show dropdown only if current user is admin/manager
  const showRolePicker = userRole === 'admin' || userRole === 'manager';

  // options depending on current user's role
  const roleOptions = userRole === 'admin'
    ? ['manager', 'cashier', 'customer']
    : ['cashier', 'customer'];

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // username: username,
          name: name.trim(),
          email: email.trim(),
          password,
          role
        }),
      });
      const data = await res.json();

      if (res.ok) {
        Alert.alert('Success', 'Account created');
        // navigation.replace('MainDrawer', { userInfo: data.user });
      } else {
        Alert.alert('Error', data.error || 'Signup failed');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  
  const openRoleModal = () => {
    setRoleModalVisible(true);
    console.log('roleModalVisible:',roleModalVisible);
  }

  const closeRoleModal = () => setRoleModalVisible(false);
  const onSelectRole = (value) => {
    setRole(value);
    closeRoleModal();
  };

  return (
    <>
    <AppHeader title={'Sing Up'}/>
    <View style={styles.screen}>
      {/* Top 30% - light green bg and logo spot */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.logoHolder}>
          {/* Replace with Image if you have a logo */}
          <TulsiLogo/>
        </View>
      </SafeAreaView>

      {/* Bottom 70% - white panel with rounded top corners */}
      <View style={styles.panel}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Create New Account</Text>
            <Text style={styles.subtext}>Enter the details below to get started.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#99A3A4"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              </View>
                <View style={styles.field}>
              <Text style={styles.label}>User Name</Text>
       <TextInput
                style={styles.input}
                placeholder="username"
                placeholderTextColor="#99A3A4"
                value={username}
                onChangeText={setUserName}
                autoCapitalize="words"
              />
        
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#99A3A4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#99A3A4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {showRolePicker && (
              <View style={styles.field}>
                <Text style={styles.label}>User role</Text>

                {/* Custom dropdown trigger */}
                <TouchableOpacity style={styles.dropdownTrigger} onPress={openRoleModal} activeOpacity={0.8}>
                  <Text style={styles.dropdownValue}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                  <Text style={styles.dropdownIcon}>▾</Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                  {userRole === 'admin'
                    ? 'As an admin, you can assign Manager, Cashier, or Customer.'
                    : 'As a manager, you can assign Cashier or Customer.'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSignup}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>{submitting ? 'Creating...' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              By continuing you agree to our Terms & Privacy Policy.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Role selection modal */}
     <Modal
  animationType="fade"
  transparent
  statusBarTranslucent
  presentationStyle="overFullScreen"
  visible={roleModalVisible}
  onRequestClose={closeRoleModal}
>
  <View style={styles.modalBackdrop} >
    <View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Select role</Text>

      <FlatList
        data={roleOptions}
        keyExtractor={(item) => String(item)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => onSelectRole(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.modalItemText}>
              {String(item).charAt(0).toUpperCase() + String(item).slice(1)}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity style={styles.modalCancel} onPress={closeRoleModal}>
        <Text style={styles.modalCancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

    </View>
    </>
  );
}

const GREEN = '#E6FAE6';
const PANEL_RADIUS = 28;
const PRIMARY = '#2ECC71';
const TEXT = '#1C2833';
const MUTED = '#5D6D7E';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GREEN,
  },
  headerArea: {
    height: '30%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoHolder: {
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
    color: '#2E7D32',
    fontWeight: '700',
  },
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
    color: '#1C2833',
    marginTop: 6,
  },
  subtext: {
    color: '#5D6D7E',
    marginTop: 6,
    marginBottom: 18,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: '#2C3E50',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FBFBFB',
  },
  // Dropdown trigger (fake input)
  dropdownTrigger: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    borderRadius: 12,
    backgroundColor: '#FBFBFB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    color: '#2C3E50',
  },
  dropdownIcon: {
    fontSize: 18,
    color: '#2C3E50',
  },
  hint: {
    marginTop: 6,
    color: '#7F8C8D',
    fontSize: 12,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: '#2ECC71',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2ECC71',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footerText: {
    textAlign: 'center',
    color: '#8796A1',
    marginTop: 14,
    fontSize: 12,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 10,
    color: '#1C2833',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modalItemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  separator: {
    height: 1,
    backgroundColor: '#ECECEC',
  },
  modalCancel: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCancelText: {
    color: '#2ECC71',
    fontWeight: '700',
  },
    /** Footer */
  footerbot: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerTextbot: {
    color: MUTED,
    fontSize: 12,
  },
});
