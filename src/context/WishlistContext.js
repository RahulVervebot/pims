// src/context/WishlistContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const storedWishlist = await AsyncStorage.getItem('wishlist');
        if (storedWishlist) setWishlist(JSON.parse(storedWishlist));
      } catch (err) {
        console.log('Wishlist restore error:', err);
      }
    };
    loadWishlist();
  }, []);

  const saveWishlist = async (items) => {
    setWishlist(items);
    await AsyncStorage.setItem('wishlist', JSON.stringify(items));
  };

  const addToWishlist = (product) => {
    if (!wishlist.find((item) => item._id === product._id)) {
      const updated = [...wishlist, product];
      saveWishlist(updated);
    }
  };

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter((item) => item._id !== id);
    saveWishlist(updated);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};
