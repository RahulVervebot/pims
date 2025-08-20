import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Ionicons from 'react-native-vector-icons/Ionicons'; // back arrow
import AppHeader from '../ProfileHeader';

export default function UserScreen({ navigation }) {
  const [user_id, setUserID] = useState('');
  const [user_name, setUserName] = useState('');
  const [user_email, setUserEmail] = useState('');

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut(); // Google logout
    } catch (e) {
      console.log('Google signout error:', e);
    }
    await AsyncStorage.removeItem('userId');

    // Reset to Login screen
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
        setUserID(userId);
        setUserEmail(userEmail);
        setUserName(userName);
        console.log('userId:', userId);
      } catch (e) {
        navigation.replace('Login');
      }
    };
    checkLogin();
  }, []);

  return (
    <>
      <AppHeader
        title="Profile"
        backgroundColor="#fff"
      />
    <View style={styles.container}>
      {/* 🔹 Profile Info */}
      {user_id ? (
        <View style={styles.profileBox}>
          <Text style={styles.name}>{user_id}</Text>
          {/* <Image source={{ uri: userInfo.picture }} style={styles.image} /> */}
          <Text style={styles.name}>{user_name}</Text>
          <Text>{user_email}</Text>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  profileBox: {
    alignItems: 'center',
    marginTop: 20,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'red',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
