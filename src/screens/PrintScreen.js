// src/screens/printScreen.js
import React, { useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PrintContext } from '../context/PrintContext';
import AppHeader from '../components/AppHeader';
import reportbg from '../assets/images/report-bg.png';
import PrintOptions from '../components/PrintOptions';

const THEME = { primary: '#2C1E70', secondary: '#319241', price: '#27ae60' };

export default function PrintScreen() {
  const navigation = useNavigation();
  const { print, removeFromprint, clearPrint } = useContext(PrintContext);

  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

  const renderItem = ({ item }) => (
    <View style={styles.printItem}>
      <View>
        <Text style={styles.name}>{item.productName}</Text>
        {item.barcode ? <Text style={styles.barcode}>{item.barcode}</Text> : null}
      </View>

      <Text style={styles.price}>${Number(item.price ?? item.salePrice ?? 0).toFixed(2)}</Text>

        <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromprint(item.product_id)}>
          <Text style={{ color: '#fff' }}>Remove</Text>
        </TouchableOpacity>

    </View>
  );

  return (
    <ImageBackground source={getImageSource(reportbg)} style={styles.screen} resizeMode="cover">
      <AppHeader Title="PRINT" backgroundType="image" backgroundValue={reportbg} />

      <View style={styles.container}>
        <FlatList
          data={print}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>Your print list is empty</Text>}
          contentContainerStyle={{ paddingBottom: 140 }}
        />

        {print.length > 0 && (
          <View style={styles.footer}>
            {/* New: Print options (USB / Bluetooth) */}
            <PrintOptions
              items={print}
              onClear={clearPrint}
              containerStyle={{ backgroundColor: '#fff' }}
            />
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  printItem: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: { fontWeight: '600', fontSize: 15, color: THEME.primary },
  barcode: { fontSize: 12, color: '#666', marginTop: 2 },
  price: { fontWeight: 'bold', color: THEME.price},
  qtyCol: { alignItems: 'flex-end',flexDirection:"row" },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  qtyBtn: { backgroundColor: '#2c1e70', padding: 6, borderRadius: 5 },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold' },
  removeBtn: { backgroundColor: '#319241', padding: 6, borderRadius: 5, marginTop: 8, alignSelf: 'flex-end' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#888' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
