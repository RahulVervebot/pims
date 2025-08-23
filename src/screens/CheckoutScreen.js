// src/screens/CheckoutScreen.js
import React, { useMemo, useState, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { CartContext } from '../context/CartContext';
import AppHeader from '../ProfileHeader';
const TAX_RATE = 0.18;

export default function CheckoutScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { clearCart } = useContext(CartContext) || { clearCart: async () => {} };
  const cart = route.params?.cart ?? [];

  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'online'
  const [submitting, setSubmitting] = useState(false);

  const { subtotal, tax, total } = useMemo(() => {
    const sub = cart.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty || 1),
      0
    );
    const t = +(sub * TAX_RATE).toFixed(2);
    const tot = +(sub + t).toFixed(2);
    return { subtotal: +sub.toFixed(2), tax: t, total: tot };
  }, [cart]);

  const onConfirm = async () => {
    try {
      if (cart.length === 0) {
        Alert.alert('Cart is empty');
        return;
      }
      setSubmitting(true);

      // Build payload your backend can accept
      // You said: name, size, image, price, sale, category, subtotal, tax, total = req.body
      // We'll send one order containing items[] + summary + paymentMethod.
      // If your backend needs single item fields, handle array server-side (example below).
      const items = cart.map((it) => ({
        _id: it._id,
        name: it.name,
        size: it.size ?? null,
        image: it.image ?? null,
        price: Number(it.price),
        sale: it.sale ?? null,
        category: it.category ?? null,
        qty: Number(it.qty || 1),
      }));

      const body = {
        items,              // full cart
        // paymentMethod,      // 'cash' | 'online' (default cash)
        subtotal,           // number
        tax,                // number (18% of subtotal)
        total,              // number
      };

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || data || 'Order failed');
      }

      // Clear persisted cart (if you persist it)
      await AsyncStorage.setItem('cart', JSON.stringify([]));
      if (clearCart) await clearCart();

      Alert.alert('Success', 'Order placed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {item.size ? <Text style={styles.meta}>Size: {item.size}</Text> : null}
        {item.category ? <Text style={styles.meta}>Cat: {item.category}</Text> : null}
      </View>
      <Text style={styles.qty}>x{item.qty}</Text>
      <Text style={styles.price}>${(Number(item.price) * Number(item.qty || 1)).toFixed(2)}</Text>
    </View>
  );

  return (
    <>
        <AppHeader/>
    <View style={styles.container}>
      <Text style={styles.title}>Review & Pay</Text>

      <FlatList
        data={cart}
        keyExtractor={(it) => String(it._id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />

      <View style={styles.summary}>
        <View style={styles.rowJustify}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>${subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.rowJustify}>
          <Text style={styles.label}>Tax (18%)</Text>
          <Text style={styles.value}>${tax.toFixed(2)}</Text>
        </View>
        <View style={styles.rowJustify}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.payment}>
        <Text style={styles.payTitle}>Payment Method</Text>
        <View style={styles.payRow}>
          <TouchableOpacity
            style={[styles.payBtn, paymentMethod === 'cash' && styles.payBtnActive]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text style={[styles.payText, paymentMethod === 'cash' && styles.payTextActive]}>Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payBtn, paymentMethod === 'online' && styles.payBtnActive]}
            onPress={() => setPaymentMethod('online')}
          >
            <Text style={[styles.payText, paymentMethod === 'online' && styles.payTextActive]}>Online</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        disabled={submitting}
        style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
        onPress={onConfirm}
      >
        <Text style={styles.confirmText}>{submitting ? 'Placing Order…' : 'Confirm & Pay'}</Text>
      </TouchableOpacity>
    </View>
    </>
  );
}

const THEME = { primary: '#2C1E70', secondary: '#F57200', price: '#27ae60' };

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: THEME.primary, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowJustify: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sep: { height: 1, backgroundColor: '#eee' },
  name: { fontSize: 15, fontWeight: '600', color: '#333' },
  meta: { fontSize: 12, color: '#777' },
  qty: { width: 40, textAlign: 'center', color: '#333' },
  price: { width: 80, textAlign: 'right', fontWeight: '600', color: THEME.price },
  summary: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  label: { color: '#444' },
  value: { color: '#444', fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: THEME.primary },
  totalValue: { fontSize: 16, fontWeight: '700', color: THEME.primary },
  payment: { marginTop: 16 },
  payTitle: { fontWeight: '700', color: '#333', marginBottom: 8 },
  payRow: { flexDirection: 'row', gap: 10 },
  payBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  payBtnActive: { borderColor: THEME.secondary, backgroundColor: '#fff2e8' },
  payText: { color: '#333', fontWeight: '600' },
  payTextActive: { color: THEME.secondary },
  confirmBtn: { marginTop: 16, backgroundColor: THEME.secondary, padding: 14, borderRadius: 10, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
