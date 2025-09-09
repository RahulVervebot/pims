// src/screens/printScreen.js
import React, { useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet,ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { PrintContext } from '../context/PrintContext';
import AppHeader from '../components/AppHeader';
import reportbg from '../assets/images/report-bg.png';
const THEME = { primary: '#2C1E70', secondary: '#F57200', price: '#27ae60' };

export default function PrintScreen() {
  const navigation = useNavigation();
  const { print, increasePrintQty, decreasePrintQty, removeFromprint, setPrint } = useContext(PrintContext);
  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });
  useEffect(() => {
    (async () => {
      const storedprint = await AsyncStorage.getItem('print');
      setPrint(storedprint ? JSON.parse(storedprint) : []);
    })();
  }, [setPrint]);

  const getSubtotal = () =>
    print.reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0);

  const getTotal = () => (getSubtotal()).toFixed(2);

  const renderItem = ({ item }) => (
    <View style={styles.printItem}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>

      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => decreasePrintQty(item._id)}>
          <Text style={styles.qtyText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.qty}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => increasePrintQty(item._id)}>
          <Text style={styles.qtyText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromprint(item._id)}>
        <Text style={{ color: '#fff' }}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
     <ImageBackground
              source={getImageSource(reportbg)}
              style={styles.screen}
              resizeMode="cover"
            >
      <AppHeader Title="PRINT"
      backgroundType="image" backgroundValue={reportbg}>

      </AppHeader>
    <View style={styles.container}>
      <FlatList
        data={print}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Your print is empty</Text>}
      />

      {print.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Print', { print })}
          >
            <Text style={styles.checkoutText}>Print</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen:{
flex: 1
  },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  printItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontWeight: '600', fontSize: 15, color: THEME.primary },
  price: { fontWeight: 'bold', color: THEME.price },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  total: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: THEME.primary },
  checkoutBtn: { backgroundColor: THEME.secondary, padding: 12, borderRadius: 8, alignItems: 'center' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  qtyBtn: { backgroundColor: '#2c1e70', padding: 6, borderRadius: 5 },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold' },
  removeBtn: { backgroundColor: '#F57200', padding: 6, borderRadius: 5, marginTop: 5, alignSelf: 'flex-start' },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
