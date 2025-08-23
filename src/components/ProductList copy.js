// src/components/ProductList.js
import React, { useEffect, useState, useContext,useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CartContext } from '../context/CartContext';
import { PrintContext } from '../context/PrintContext';
import { getCategoryProducts,getProducts } from '../functions/function';
import fallbackBg from '../assets/images/green-bg.jpg';
import ProductBottomSheet from './ProductBottomSheet';
const { width } = Dimensions.get("window");
// 16:9 banner height capped so it looks good on small phones
const BANNER_HEIGHT = Math.min(220, Math.round((width * 9) / 16));
export default function ProductList({ category, backgroundUri }) {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const { print, addToPrint, increasePrintQty, decreasePrintQty } = useContext(PrintContext);
  const sheetRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const fetchProducts = async () => {
    try {

      setRefreshing(true);
      if(category == 'all'){
   const data = await getProducts();
    setProducts(data);
      }
      else{  
      const data = await getCategoryProducts(category);
      setProducts(data);
      }
    } catch (err) {
      console.error(`Failed to fetch products for ${category}:`, err?.message);
      setProducts([]);
    } finally {
      setRefreshing(false);
    }
  };
 const openDetails = (item) => {
    sheetRef.current?.open(item);
  };

  const renderProduct = ({ item }) => {
    const inCart = cart.find(p => p._id === item._id);
    const inPrint = print.find(p => p._id === item._id);

    return (
       <TouchableOpacity activeOpacity={0.8} onPress={() => openDetails(item)}>
      <View style={styles.productCard}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        {!!item.size && <Text>{item.size}</Text>}
        <Text style={styles.price}>₹{Number(item.price || 0).toFixed(2)}</Text>
        {!!item.category && <Text numberOfLines={1}>{item.category}</Text>}

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
          <View style={styles.qtyRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => decreasePrintQty(item._id)}>
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{inPrint.qty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => increasePrintQty(item._id)}>
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cartBtn} onPress={() => addToPrint(item)}>
            <Text style={styles.cartBtnText}>Add to Print</Text>
          </TouchableOpacity>
        )}

      </View>
      </TouchableOpacity>
    );
  };

  // Choose background source: API-provided topbannerbottom or fallback image
  const bgSource = backgroundUri ? { uri: backgroundUri } : fallbackBg;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
       {backgroundUri ? (
    <ImageBackground
      source={{ uri: backgroundUri }}
      style={styles.banner}
      imageStyle={styles.bannerImage}
      resizeMode="cover"
    >
      {/* Optional overlay content/title can go here */}
    </ImageBackground>
  ) : null}
  
      <FlatList
        data={products}
        keyExtractor={(item) => String(item._id)}
        renderItem={renderProduct}
        horizontal
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchProducts} />
        }
      />
        
      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={{ color: '#fff' }}>🛒 {cart.length}</Text>
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
  productCard: {
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 180,
    height: 300,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
    borderRadius: 6,
  },
  productName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
    color: '#000'
  },
  price: {
    color: 'green',
    fontSize: 15,
    fontWeight: '600',
  },
  cartBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(245, 114, 0, 1)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cartBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  qtyBtn: {
    backgroundColor: '#2c1e70',
    padding: 6,
    borderRadius: 5,
  },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold', color: "#000" },
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2c1e70',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
    banner: {
    height: BANNER_HEIGHT,       // 👈 fixed height (or use a number like 160)
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "flex-end",  // if you add overlay content
  },
  bannerImage: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});
