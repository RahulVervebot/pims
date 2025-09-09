// src/screens/CartScreen.js
import React, { useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet,ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { CartContext } from '../context/CartContext';
import AppHeader from '../components/AppHeader';
import reportbg from '../assets/images/report-bg.png';
const THEME = { primary: '#2C1E70', secondary: '#F57200', price: '#27ae60' };

export default function CartScreen() {
  const navigation = useNavigation();
  const { cart, increaseQty, decreaseQty, removeFromCart, setCart } = useContext(CartContext);
    const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });
  useEffect(() => {
    (async () => {
      const storedCart = await AsyncStorage.getItem('cart');
      setCart(storedCart ? JSON.parse(storedCart) : []);
    })();
  }, [setCart]);

  const getSubtotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0);

  const getTotal = () => (getSubtotal()).toFixed(2);

  const renderItem = ({ item }) => (
    <View style={styles.cartItem}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>

      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(item._id)}>
          <Text style={styles.qtyText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.qty}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(item._id)}>
          <Text style={styles.qtyText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromCart(item._id)}>
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
      <AppHeader  Title="CART"
      backgroundType="image" backgroundValue={reportbg}>

      </AppHeader>
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty</Text>}
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.total}>Total: ${getTotal()}</Text>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => navigation.navigate('Checkout', { cart })}
          >
            <Text style={styles.checkoutText}>Checkout</Text>
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
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
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
