// src/components/DrawerContent.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function DrawerContent({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text style={styles.item}>🏠 Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
        <Text style={styles.item}>📦 Orders</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
        <Text style={styles.item}>🛒 Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  item: { fontSize: 18, marginVertical: 15, color: '#2c1e70' },
});
