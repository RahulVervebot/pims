// src/components/ProductBottomSheet.js
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';

const THEME = {
  primary: '#2C1E70',
  secondary: '#F57200',
  price: '#27ae60',
};

const ProductBottomSheet = forwardRef(({ onAddToCart, onAddToPrint }, ref) => {
  const sheetRef = useRef(null);
  const [product, setProduct] = useState(null);

  useImperativeHandle(ref, () => ({
    open: (p) => {
      setProduct(p || null);
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

  return (
    <RBSheet
      ref={sheetRef}
      height={460}
      openDuration={220}
      closeOnDragDown
      customStyles={{
        container: styles.sheetContainer,
        draggableIcon: { backgroundColor: '#ccc', width: 60 },
      }}
    >
      {!product ? (
        <View style={styles.emptyBox}>
          <Text style={{ color: '#888' }}>No product selected.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Image */}
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={{ color: '#aaa' }}>No Image</Text>
            </View>
          )}

          {/* Title & price */}
          <View style={styles.headRow}>
            <Text style={styles.title} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.price}>₹{Number(product.price || 0).toFixed(2)}</Text>
          </View>

          {/* Meta */}
          <View style={styles.metaBox}>
            {!!product.size && <Text style={styles.meta}>Size: {product.size}</Text>}
            {!!product.category && <Text style={styles.meta}>Category: {product.category}</Text>}
            {!!product.barcode && <Text style={styles.meta}>Barcode: {product.barcode}</Text>}
          </View>

          {/* Actions */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: THEME.secondary }]}
              onPress={() => onAddToCart?.(product)}
            >
              <Text style={styles.btnText}>Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: THEME.primary }]}
              onPress={() => onAddToPrint?.(product)}
            >
              <Text style={styles.btnText}>Add to Print</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </RBSheet>
  );
});

export default ProductBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 12,
  },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { flex: 1, color: '#111', fontWeight: '700', fontSize: 18 },
  price: { color: '#27ae60', fontWeight: '800', fontSize: 16 },
  metaBox: { marginTop: 6, gap: 4 },
  meta: { color: '#555' },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
