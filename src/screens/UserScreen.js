import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AppHeader from '../ProfileHeader';

export default function UserScreen({ navigation }) {
  const [user_id, setUserID] = useState('');
  const [user_name, setUserName] = useState('');
  const [user_email, setUserEmail] = useState('');
  const [user_role, setUserRole] = useState('');

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut(); // Google logout
    } catch (e) {
      console.log('Google signout error:', e);
    }
    await AsyncStorage.multiRemove(['userId', 'userRole', 'userEmail', 'userName']);

    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const userName = await AsyncStorage.getItem('userName');
        const userEmail = await AsyncStorage.getItem('userEmail');
        const userRole = await AsyncStorage.getItem('userRole');

        setUserID(userId);
        setUserEmail(userEmail);
        setUserName(userName);
        setUserRole(userRole);
      } catch (e) {
        navigation.replace('Login');
      }
    };
    checkLogin();
  }, []);

  return (
    <>
      <AppHeader title="Profile" backgroundColor="#fff" />

      <View style={styles.container}>
        {user_id ? (
          <View style={styles.profileBox}>
            <Text style={styles.name}>{user_name}</Text>
            <Text style={styles.email}>{user_email}</Text>

            {/* 🔹 Settings Button */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.btnText}>Go to Settings</Text>
            </TouchableOpacity>

            {/* 🔹 Show Signup only if not customer */}
            {user_role !== 'customer' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('SignupScreen')}
              >
                <Text style={styles.btnText}>Go to Signup</Text>
              </TouchableOpacity>
            )}

            {/* 🔹 Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ marginTop: 20 }}>No user data available.</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#fff',
  },
  profileBox: {
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  actionBtn: {
    width: '80%',
    paddingVertical: 12,
    marginVertical: 8,
    backgroundColor: '#007bff',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 30,
    width: '80%',
    paddingVertical: 12,
    backgroundColor: 'red',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
