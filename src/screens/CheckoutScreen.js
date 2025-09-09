// src/screens/CheckoutScreen.js
import React, { useMemo, useState, useContext, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView,ImageBackground } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { CartContext } from '../context/CartContext';
import reportbg from '../assets/images/report-bg.png';
import AppHeader from '../components/AppHeader';

const TAX_RATE = 0.18; // UI-only. Server computes actual tax.

export default function CheckoutScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { clearCart } = useContext(CartContext) || { clearCart: async () => {} };
  const cart = route.params?.cart ?? [];
    const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });
  // Payment: 'cash' | 'card' | 'upi'
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Address fields
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Autofill from AsyncStorage if available
  useEffect(() => {
    (async () => {
      try {
        const [storedName, storedEmail, storedPhone] = await Promise.all([
          AsyncStorage.getItem('userName'),
          AsyncStorage.getItem('userEmail'),
           AsyncStorage.getItem('userPhone'),
        ]);
        if (storedName && !customerName) setCustomerName(storedName);
        if (storedEmail && !email) setEmail(storedEmail);
        if (storedPhone && !phone) setEmail(storedPhone);
      } catch (e) {
        // non-fatal
        console.log('Prefill error:', e?.message);
      }
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { subtotal, tax, total } = useMemo(() => {
    const sub = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty || 1), 0);
    const t = +(sub * TAX_RATE).toFixed(2);
    const tot = +(sub + t).toFixed(2);
    return { subtotal: +sub.toFixed(2), tax: t, total: tot };
  }, [cart]);

  const keyExtractor = useCallback((it, idx) => String(it._id ?? it.productId ?? idx), []);

  const validate = () => {
    if (!cart.length) return 'Cart is empty.';
    if (!customerName?.trim()) return 'Please enter customer name.';
    if (!phone?.trim()) return 'Please enter phone.';
    if (email?.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email.';
    if (!street?.trim() || !city?.trim() || !state?.trim() || !postalCode?.trim() || !country?.trim()) {
      return 'Please complete the shipping address.';
    }
    return null;
  };

 const onConfirm = async () => {
  try {
    const msg = validate();
    if (msg) {
      Alert.alert('Missing Info', msg);
      return;
    }

    setSubmitting(true);

    const storedUserId = await AsyncStorage.getItem('userId');
    if (!storedUserId) throw new Error('User not found. Please login again.');

    const items = cart.map((it, idx) => {
      const productId = String(it.productId || it._id || '');
      if (!productId) throw new Error(`Cart item ${idx + 1} is missing productId/_id`);

      const price = Number(it.price);
      const quantity = Number(it.qty ?? it.quantity ?? 1);
      if (!Number.isFinite(price) || price < 0) throw new Error(`Item ${idx + 1}: invalid price`);
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Item ${idx + 1}: invalid quantity`);

      return {
        productId,
        name: String(it.name || ''),
        size: it.size ?? undefined,
        // image: it.image ?? undefined,
        price,
        quantity,
      };
    });

    const allowedMethods = new Set(['cash', 'card', 'upi', 'wallet']);
    if (!allowedMethods.has(paymentMethod)) throw new Error('Invalid payment method');

    const safe = v => (typeof v === 'string' ? v.trim() : '');
    const normalizedPhone = safe(phone).replace(/\D/g, '');

    const body = {
      userId: storedUserId,
      contact: {
        userId: storedUserId,
        customerName: safe(customerName),
        phone: normalizedPhone,
        ...(safe(email) ? { email: safe(email) } : {}),
      },
      paymentMethod,
      shippingAddress: {
        street: safe(street),
        city: safe(city),
        state: safe(state),
        postalCode: safe(postalCode),
        country: safe(country),
      },
      items,
    };

    console.log('body:', body);

    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = {}; }
    if (!res.ok) throw new Error(data?.error || data?.message || text || 'Order failed');

    await AsyncStorage.setItem('cart', JSON.stringify([]));
    if (clearCart) await clearCart();
    Alert.alert('Success', 'Order placed successfully', [
      { text: 'OK', onPress: () => navigation.navigate('MainDrawer') },
    ]);
  } catch (e) {
    Alert.alert('Error', e.message);
    console.log('error:', e);
  } finally {
    setSubmitting(false);
  }
};


  const renderItem = ({ item }) => {
    const qty = Number(item.qty || 1);
    const lineTotal = (Number(item.price) * qty).toFixed(2);
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          {item.size ? <Text style={styles.meta}>Size: {item.size}</Text> : null}
          {item.category ? <Text style={styles.meta}>Cat: {item.category}</Text> : null}
        </View>
        <Text style={styles.qty}>x{qty}</Text>
        <Text style={styles.price}>${lineTotal}</Text>
      </View>
    );
  };

  return (
   <>
      <AppHeader  Title="CHECKOUT"
      backgroundType="image" backgroundValue={reportbg}>
      </AppHeader>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>Review & Pay</Text>

          <FlatList
            data={cart}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            scrollEnabled={false}
          />
          {/* Summary (UI only) */}
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
          {/* Customer Details */}
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer Name"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          {/* Address */}
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} />
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="State" value={state} onChangeText={setState} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Postal Code"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="number-pad"
            />
          </View>
          <TextInput style={styles.input} placeholder="Country" value={country} onChangeText={setCountry} />
          {/* Payment */}
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
                style={[styles.payBtn, paymentMethod === 'card' && styles.payBtnActive]}
                onPress={() => setPaymentMethod('card')}
              >
                <Text style={[styles.payText, paymentMethod === 'card' && styles.payTextActive]}>Card</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payBtn, paymentMethod === 'upi' && styles.payBtnActive]}
                onPress={() => setPaymentMethod('upi')}
              >
                <Text style={[styles.payText, paymentMethod === 'upi' && styles.payTextActive]}>UPI</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Confirm */}
          <TouchableOpacity
            disabled={submitting}
            style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{submitting ? 'Placing Order…' : 'Confirm & Pay'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const THEME = { primary: '#2C1E70', secondary: '#F57200', price: '#27ae60' };

const styles = StyleSheet.create({
    screen:{
    flex: 1
  },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', color: THEME.primary, marginBottom: 12 },
  sectionTitle: { marginTop: 18, fontSize: 16, fontWeight: '700', color: '#333' },

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

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    color: '#333',
  },

  confirmBtn: { marginTop: 18, backgroundColor: THEME.secondary, padding: 14, borderRadius: 10, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});