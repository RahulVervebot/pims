// src/components/ProductList.js
import React, { useEffect, useState, useContext, useRef, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CartContext } from '../context/CartContext';
import { PrintContext } from '../context/PrintContext';
import { getCategoryProducts, getLatestProducts } from '../functions/function';
import fallbackBg from '../assets/images/green-bg.jpg';
import ProductBottomSheet from './ProductBottomSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function ProductList({ category, backgroundUri, showFloatingCart = false }) {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
    const [userrole, setUserRole] = useState('');
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const { print, addToPrint, increasePrintQty, decreasePrintQty } = useContext(PrintContext);
  const sheetRef = useRef(null);

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // --- Responsive layout math ---
  const COLS = isTablet ? 5 : 3;                   // <- requirement
  const GAP = isTablet ? 14 : 10;                  // space between cards
  const H_PADDING = 12;                            // list horizontal padding
  const bannerHeight = Math.min(isTablet ? 260 : 200, Math.round((width * 9) / 16));

  const CARD_WIDTH = useMemo(() => {
    const inner = width - H_PADDING * 2 - GAP * (COLS - 1);
    return Math.floor(inner / COLS);
  }, [width, COLS]);

  const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 0.55);    // keep a nice ratio
  const FLOATING_BOTTOM = isTablet ? 28 : 20;

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const fetchProducts = async () => {
    try {
  const userRole =    await AsyncStorage.getItem('userRole');
  setUserRole(userRole);
      setRefreshing(true);
      const data = category === 'all' ? await getLatestProducts() : await getCategoryProducts(category);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Failed to fetch products for ${category}:`, err?.message);
      setProducts([]);
    } finally {
      setRefreshing(false);
    }
  };

  const openDetails = (item) => sheetRef.current?.open(item);

  const renderProduct = ({ item }) => {
    const inCart = cart.find((p) => p._id === item._id);
    const inPrint = print.find((p) => p._id === item._id);

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openDetails(item)} style={{ width: CARD_WIDTH }}>
        <View style={styles.productCard}>
          {/* Top info */}
          <View>
            <Image source={{ uri: item.image }} style={[styles.productImage, { height: IMAGE_HEIGHT }]} />
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            {!!item.size && <Text style={styles.metaText}>{item.size}</Text>}
            <Text style={styles.price}>₹{Number(item.price || 0).toFixed(2)}</Text>
            {!!item.category && <Text style={styles.metaText} numberOfLines={1}>{item.category}</Text>}
          </View>

          {/* Bottom actions pinned */}
          <View>
            {inCart ? (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(item._id)}>
                  <Text style={styles.qtyText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{inCart.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(item._id)}>
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.cartBtn} onPress={() => addToCart(item)}>
                <Text style={styles.cartBtnText}>Add to Cart</Text>
              </TouchableOpacity>
            )}

            {inPrint ? (
              <View style={[styles.qtyRow, { marginTop: 8 }]}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => decreasePrintQty(item._id)}>
                  <Text style={styles.qtyText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{inPrint.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => increasePrintQty(item._id)}>
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.cartBtn, { marginTop: 8, backgroundColor: '#2c1e70' }]}
                onPress={() => addToPrint(item)}
              >
                <Text style={styles.cartBtnText}>Add to Print</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const bgSource = backgroundUri ? { uri: backgroundUri } : fallbackBg;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Banner BEFORE list */}
      <Image source={bgSource} style={styles.banner(bannerHeight)} resizeMode="cover" />

      {/* Grid list */}
      <FlatList
        key={COLS}                                 // force layout recalculation when COLS changes
        data={products}
        horizontal
        keyExtractor={(item) => String(item._id)}
        renderItem={renderProduct}
        // numColumns={COLS}
        // columnWrapperStyle={{ gap: GAP }}          // horizontal gap between items
        contentContainerStyle={{
          paddingHorizontal: H_PADDING,
          paddingTop: 10,
          paddingBottom: (showFloatingCart ? FLOATING_BOTTOM + 80 : 16),
          gap: GAP,                                // vertical gap between rows
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchProducts} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Cart */}
      {showFloatingCart && cart.length > 0 && (
        <TouchableOpacity
          style={[styles.floatingCart, { bottom: FLOATING_BOTTOM, right: isTablet ? 28 : 20 }]}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>🛒 {cart.length}</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Sheet */}
      <ProductBottomSheet
        ref={sheetRef}
        onAddToCart={(p) => addToCart(p)}
        onAddToPrint={(p) => addToPrint(p)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: (height) => ({
    width: '100%',
    height,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  }),

  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    justifyContent: 'space-between',
    minHeight: 220,
  },
  productImage: {
    width: '100%',
    resizeMode: 'cover',
    borderRadius: 8,
    marginBottom: 6,
  },
  productName: { fontWeight: 'bold', fontSize: 14, marginTop: 2, color: '#000' },
  metaText: { color: '#555', marginTop: 2, fontSize: 12 },
  price: { color: 'green', fontSize: 14, fontWeight: '600', marginTop: 4 },

  cartBtn: {
    backgroundColor: 'rgba(245, 114, 0, 1)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cartBtnText: { color: '#fff', fontWeight: 'bold' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  qtyBtn: { backgroundColor: '#2c1e70', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold', color: '#000' },

  floatingCart: {
    position: 'absolute',
    backgroundColor: '#2c1e70',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
