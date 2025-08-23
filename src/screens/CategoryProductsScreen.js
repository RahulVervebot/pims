// src/screens/CategoryProductsScreen.js
import React from "react";
import { View, StyleSheet } from "react-native";
import ProductList from "../components/ProductList";
import CustomHeader from "../components/CustomHeader";
import ProductSearch from "../components/ProductSearch";
import AppHeader from "../ProfileHeader"; 
export default function CategoryProductsScreen({ route }) {
  const { category, backgroundUri } = route.params || {};
  return (
    <>
        <AppHeader
        title={category}
        />
        <ProductSearch/>
      
    <View style={styles.container}>
      
      <ProductList category={category} backgroundUri={backgroundUri} />
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
