import React, { useEffect, useState, useContext } from 'react';
import { FlatList, View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { API_URL } from '@env';
import { CartContext } from '../context/CartContext'; // 👈 import context
import { useNavigation } from '@react-navigation/native';

export default function CategoryList() {
    const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Failed to fetch products:', err));
  }, []);

  const renderProduct = ({ item }) => {
const inCart = cart.find(p => p._id === item._id);

    return (
      <>
      <View style={styles.productCard}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <Text style={styles.productName}>{item.name}</Text>
      </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1,backgroundColor:"#ff9a9e" }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderProduct}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    width: 150,
    height: 150,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
    borderRadius: 6,
  },
  productName: {
    textAlign:"center",
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 8,
  },
  price: {
    color: 'green',
    fontSize: 15,
    fontWeight: '600',
  },
});
