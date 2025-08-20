import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomHeader from '../components/CustomHeader';
import CategoriesTabs from '../components/CategoriesTabs';
export default function ReportScreen() {
  return (
    <>
     <CustomHeader
        address="123, MG Road"
        backgroundType="image"
        backgroundValue="https://picsum.photos/800/200"
        onProfilePress={() => console.log("Profile clicked")}
        onAddressPress={() => console.log("Address clicked")}
      />
    <View style={styles.container}>
      <Text style={styles.title}>📊 Demo Report</Text>
      <Text style={styles.text}>This is where report data will appear.</Text>
    </View>
    </>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  text: { fontSize: 16, color: '#555' },
});
