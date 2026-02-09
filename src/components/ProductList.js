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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getCategoryProducts, getLatestProducts } from '../functions/product-function';
import fallbackBg from '../assets/images/green-bg.jpg';
import ProductBottomSheet from './ProductBottomSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrinterIcon from '../assets/icons/Printericon.svg'; 
import CartIcon from "../assets/icons/Carticon.svg"
import FastImage from 'react-native-fast-image';
export default function ProductList({id, category, backgroundUri, showFloatingCart = false }) {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userrole, setUserRole] = useState('');
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const { print, addToPrint, increasePrintQty, decreasePrintQty, removeFromprint } = useContext(PrintContext);
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

const isGifBanner = useMemo(() => {
  if (!backgroundUri) return false;
  if (typeof backgroundUri === 'string') {
    const s = backgroundUri.trim();
    console.log("backgroundUri:",backgroundUri);
    // .gif in path or query, or base64 gif
    return /\.gif(\?|$)/i.test(s) || /^data:image\/gif;base64,/i.test(s);
  }
    console.log("not backgroundUri:",backgroundUri);
  return false;
}, [backgroundUri]);

  useEffect(() => {
    fetchProducts();
    console.log("category:",id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProducts = async () => {
    try {
  const userRole =    await AsyncStorage.getItem('userRole');
  setUserRole(userRole);
      setRefreshing(true);
      const data = category === 'latest' ? await getLatestProducts() : await getCategoryProducts(id);
      setProducts(Array.isArray(data) ? data : []);
      console.log("data:",data);
    } catch (err) {
      console.log(`Failed to fetch products for ${category}:`, err?.message);
      
      setProducts([]);
    } finally {
      setRefreshing(false);
    }
  };

  const openDetails = (item) => sheetRef.current?.open(item);
  const goToCategory = (cat) => {
    navigation.navigate("CategoryProducts", {
      id: id,
      category: category,
      backgroundUri: backgroundUri || null,
    });
  };

  const renderProduct = ({ item }) => {
    const inCart = cart.find((p) => p.product_id === item.product_id);
    const inPrint = print.find((p) => p.product_id === item.product_id);

    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openDetails(item)} style={{ width: CARD_WIDTH }}>
        <View style={styles.productCard}>
          {/* Top info */}
          <View>
        
            {item.productImage && 
            <Image source={{ uri: `data:image/webp;base64,${item.productImage}` }} style={[styles.productImage, { height: IMAGE_HEIGHT }]} />
            }
          
             {/* Bottom actions pinned */}
          <View>
          <View style={styles.row}>
  {!!item.productSize && <Text style={styles.metaText}>{item.productSize}</Text>}

  <View style={styles.right}>
    {userrole === 'customer'
      ? (inCart ? (
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(item.product_id)}>
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{inCart.qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(item.product_id)}>
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => addToCart(item)}>
            <CartIcon width={30} height={30} fill="#16A34A" />
          </TouchableOpacity>
        ))
      : (inPrint ? (
          <TouchableOpacity style={styles.removePrintBtn} onPress={() => removeFromprint(item.product_id)}>
            <Icon name="delete" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cartprint} onPress={() => addToPrint(item)}>
            <PrinterIcon width={30} height={30} fill="#16A34A" />
          </TouchableOpacity>
        ))
    }
  </View>
</View>

          </View>
         <Text style={[styles.productName, { textTransform: 'capitalize' }]} numberOfLines={1}>{item.productName}</Text>
        <View style={{flexDirection: "row"}}>
            <Text style={styles.price}>₹{Number(item.salePrice || 0).toFixed(2)}</Text>
            </View>
            {/* {!!item.category && <Text style={styles.metaText} numberOfLines={1}>{item.category}</Text>} */}
          </View>
        

        </View>
      </TouchableOpacity>
    );
  };

  const bgSource = backgroundUri ? { uri: backgroundUri } : fallbackBg;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Banner BEFORE list */}
        <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => goToCategory(id)}
    >
   {isGifBanner ? (
    <FastImage
      source={{ uri: backgroundUri }}
      style={styles.banner(bannerHeight)}
      resizeMode={FastImage.resizeMode.cover}
      priority={FastImage.priority.high}
    />
  ) :
   <Image source={bgSource} style={styles.banner(bannerHeight)} resizeMode="cover" />
}
</TouchableOpacity>
      {/* Grid list */}
      <FlatList
        key={COLS}                                 // force layout recalculation when COLS changes
        data={products}
         horizontal
        keyExtractor={(item) => String(item.product_id)}
        renderItem={renderProduct}
        //numColumns={COLS}
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
    // minHeight: 220,
  },
  productImage: {
    width: '100%',
    resizeMode: 'cover',
    borderRadius: 8,
  },
  productName: { fontWeight: 'bold', fontSize: 14, marginTop: 2, color: '#000' },
  metaText: { color: '#555',fontSize: 12, textAlign:"left", fontWeight:'bold' },
  price: { color: 'green', fontSize: 14, fontWeight: '600', marginTop: 4 },
  cartBtn: {
    backgroundColor: 'rgba(245, 114, 0, 1)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  cartBtnText: { color: '#fff', fontWeight: 'bold' },
 row: {
    flexDirection: 'row',
    alignItems: 'center',
    // either of these works; you can keep both:
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    flexShrink: 1,
    marginRight: 8,
  },
  right: {
    marginLeft: 'auto',           // pushes this container to the far right
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',                     // RN 0.71+; otherwise use margins
  },
  cartprint: {
    borderRadius: 8,
    // alignItems here affects children layout inside the button, not row placement.
    // Keep it centered for better touch target:
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  removePrintBtn: {
    backgroundColor: '#D9534F',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },

  qtyBtn: { backgroundColor: '#2c1e70', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  qtyText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 5, fontSize: 16, fontWeight: 'bold', color: '#000' },

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
