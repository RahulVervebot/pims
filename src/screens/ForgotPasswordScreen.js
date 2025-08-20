import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { API_URL } from '@env';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', data.message);
        navigation.goBack();
      } else {
        Alert.alert('Error', data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network request failed');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Enter your email" value={email} onChangeText={setEmail} />
      <Button title="Reset Password" onPress={handleForgotPassword} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
});
