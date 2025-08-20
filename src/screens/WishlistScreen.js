// src/screens/WishlistScreen.js
import React, { useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { WishlistContext } from '../context/WishlistContext';

export default function WishlistScreen() {
  const { wishlist, removeFromWishlist } = useContext(WishlistContext);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price}</Text>
      </View>
      <TouchableOpacity onPress={() => removeFromWishlist(item._id)} style={styles.removeBtn}>
        <Text style={styles.removeText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {wishlist.length === 0 ? (
        <Text style={styles.empty}>Your wishlist is empty</Text>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  image: { width: 60, height: 60, borderRadius: 6, marginRight: 12 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#2c1e70' },
  price: { color: 'green', marginTop: 4 },
  removeBtn: {
    backgroundColor: '#F57200',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
});
