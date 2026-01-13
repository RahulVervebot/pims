// src/context/printContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
export const PrintContext = createContext();

export const PrintProvider = ({ children }) => {
  const [print, setPrint] = useState([]);

  useEffect(() => {
    loadprint();
  }, []);

  const loadprint = async () => {
    const storedprint = await AsyncStorage.getItem('print');
    setPrint(storedprint ? JSON.parse(storedprint) : []);
  };

  const saveprint = async (newprint) => {
    setPrint(newprint); // 👈 update immediately
    await AsyncStorage.setItem('print', JSON.stringify(newprint));
  };

  const addToPrint = (product) => {
    let newprint = [...print];
    const index = newprint.findIndex((item) => item.product_id === product.product_id);

    if (index >= 0) {
      newprint[index].qty += 1;
    } else {
      newprint.push({ ...product, qty: 1 }); // 👈 use `qty` consistently
    }
    saveprint(newprint);
  };

  const increasePrintQty = (productId) => {
    let newprint = [...print];
    const index = newprint.findIndex((item) => item.product_id === productId);

    if (index >= 0) {
      newprint[index].qty += 1;
      saveprint(newprint);
    }
  };

  const decreasePrintQty = (productId) => {
    let newprint = [...print];
    const index = newprint.findIndex((item) => item.product_id === productId);

    if (index >= 0) {
      if (newprint[index].qty > 1) {
        newprint[index].qty -= 1;
      } else {
        newprint.splice(index, 1);
      }
      saveprint(newprint);
    }
  };

  const removeFromprint = (productId) => {
    let newprint = print.filter((item) => item.product_id !== productId);
    saveprint(newprint);
  };

  const clearPrint = () => {
    saveprint([]);
  };

  return (
    <PrintContext.Provider
      value={{ print, addToPrint, increasePrintQty, decreasePrintQty, removeFromprint, clearPrint }}
    >
      {children}
    </PrintContext.Provider>
  );
};
