import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

export default function AppHeader({ title, backgroundColor = '#fff', rightIcon, onRightPress }) {
  const navigation = useNavigation();

  return (
    <View style={[styles.header, { backgroundColor }]}>
      {/* Back Button */}
      <TouchableOpacity  onPress={() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Tabs'); // fallback screen
    }
  }} style={styles.leftIcon}>
        <Ionicons name="arrow-back-outline" size={24} color="#000" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'left',
    justifyContent: 'space-between',
    paddingTop: 25,
    paddingHorizontal: 15,
    elevation: 4, // shadow on Android
  },
  leftIcon: {
    width: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
    flex: 1,
  },
  rightIcon: {
    width: 30,
    alignItems: 'flex-end',
  },
});
