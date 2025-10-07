// src/screens/CategoryProductsScreen.js
// src/screens/CategoryProductsScreen.js
import React from "react";
import { View, StyleSheet,ImageBackground } from "react-native";
import CategoryProductList from "../components/CategoryProductList";
import ProductSearch from "../components/ProductSearch";
import reportbg from '../assets/images/report-bg.png';
import AppHeader from "../components/AppHeader"; 
import {capitalizeWords} from '../functions/product-function';
export default function CategoryProductsScreen({ route }) {
  const {id, category, backgroundUri } = route.params || {};
    const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });
  return (
<ImageBackground source={getImageSource(reportbg)} style={styles.screen} resizeMode="cover">
      <AppHeader
      Title={category == 'latest' ? 'Latest Products':  capitalizeWords(String(category || ""))}
      backgroundType="image" backgroundValue={reportbg}>
        <View style={styles.searchbar}>
        <ProductSearch/>
        </View>
        </AppHeader>
    <View style={styles.container}>
      <CategoryProductList id={id} category={category} backgroundUri={backgroundUri} />
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
    screen: {
    flex: 1,
  },
  container: { flex: 1},
  searchbar:{marginHorizontal: 25}
});
