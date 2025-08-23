// src/context/AppProviders.js
import React from 'react';
import { CartProvider } from './CartContext';
import { AuthProvider } from './AuthContext';
import { PrintProvider } from './PrintContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <PrintProvider>
          {children}
        </PrintProvider>
      </CartProvider>
    </AuthProvider>
  );
}
