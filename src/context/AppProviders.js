// src/context/AppProviders.js
import React from 'react';
import { CartProvider } from './CartContext';
import { AuthProvider } from './AuthContext';
import { WishlistProvider } from './WishlistContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
