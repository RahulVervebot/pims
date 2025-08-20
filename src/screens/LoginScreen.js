import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, ActivityIndicator, TextInput, Alert, Text, TouchableOpacity } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '@env';

export default function LoginScreen({ navigation }) {
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '220923059339-t1uv4ukr78vdb49m8u0j7qa7it4qo6vq.apps.googleusercontent.com',
    });
  }, []);

  // Email/password login
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
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
  
       console.log("data first:",data);
      if (res.ok) {
        navigation.replace('MainDrawer', { userInfo: data.user });
         console.log("data:",data);
         await AsyncStorage.setItem('userId', data.user._id);
         await AsyncStorage.setItem('userName', data.user.name);
         await AsyncStorage.setItem('userEmail', data.user.email);
           
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

  // Google Sign-in
  const handleGoogleLogin = async () => {
    if (signingIn) return;
    setSigningIn(true);

    try {
      await GoogleSignin.hasPlayServices();
      const { user } = await GoogleSignin.signIn();

      // Send to your backend
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.photo
        })
      });
      const data = await res.json();
       console.log("data:",data);
      // save userId in async storage
      // await AsyncStorage.setItem('userId', data._id);
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
    <View style={styles.container}>
      {signingIn ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Login" onPress={handleManualLogin} />

          <View style={{ marginVertical: 10 }}>
            <Button title="Sign in with Google" onPress={handleGoogleLogin} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={{ color: 'blue', marginTop: 10 }}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    borderRadius: 5
  }
});
