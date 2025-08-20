import React, { useEffect, useState, useContext } from 'react';
import { FlatList, View, Text, StyleSheet, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { API_URL } from '@env';
import { CartContext } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';

export default function ProductList() {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);

  // ✅ Fetch products only once on first mount
  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, []);

  const fetchProducts = () => {
    setRefreshing(true);
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to fetch products:', err))
      .finally(() => setRefreshing(false));
  };

  const renderProduct = ({ item }) => {
    const inCart = cart.find(p => p._id === item._id);

    return (
      <View style={styles.productCard}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <Text style={styles.productName}>{item.name}</Text>
        <Text>{item.size}</Text>
        <Text style={styles.price}>${item.price}</Text>
        <Text>{item.category}</Text>

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
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#4c669f" }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProduct}
        horizontal
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchProducts} />
        }
      />

      {/* Floating Cart Icon */}
      {cart.length > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={{ color: '#fff' }}>🛒 {cart.length}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    padding: 10,
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
  },
  price: {
    color: 'green',
    fontSize: 15,
    fontWeight: '600',
  },
  cartBtn: {
    marginTop: 10,
    backgroundColor: '#F57200',
    padding: 8,
    borderRadius: 6,
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
});
