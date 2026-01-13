import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo, useEffect,useContext } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Modal } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { API_URL } from '@env';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Camera, CameraType } from 'react-native-camera-kit';
import { getTopCategories } from '../functions/product-function';
import { CartContext } from '../context/CartContext';
import { PrintContext } from '../context/PrintContext';
import { Picker } from '@react-native-picker/picker';
const THEME = {
  primary: '#2C1E70',
  secondary: '#319241',
  price: '#27ae60',
};

const ProductBottomSheet = forwardRef(({ onAddToCart, onAddToPrint }, ref) => {

  const sheetRef = useRef(null);
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const { print, addToPrint, increasePrintQty, decreasePrintQty } = useContext(PrintContext);
  const [product, setProduct] = useState(null);
  // Editable fields
  const [name, setName] = useState('');
    const [id, setID] = useState('');
  const [size, setSize] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');  // keep as string, convert on submit
  const [cost, setCost] = useState('');    // keep as string, convert on submit
  const [newBarcode, setNewBarcode] = useState(''); // new scanned/typed barcode
  // Image (base64)
  const [imgBase64, setImgBase64] = useState('');
  const [imgMime, setImgMime] = useState('image/jpeg');
  const [allCats, setAllCats] = useState([]);
  // Scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  // UI
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cats = await getTopCategories();
        setAllCats((cats));
      } catch (e) {
        console.error("Failed to fetch categories:", e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const perm = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        const result = await request(perm);
        setHasCameraPermission(result === RESULTS.GRANTED);
      } catch {
        setHasCameraPermission(false);
      }
    })();
  }, []);

  useImperativeHandle(ref, () => ({
    
    open: (p) => {
      setProduct(p || null);
      if (p) {
        setName(p.productName || '');
        setID(p.product_id || '');
        setSize(p.productSize || '');
        setCategory(p.categoryName || '');
        setPrice(String(p.salePrice ?? ''));
        setCost(p.costPrice != null ? String(p.costPrice) : '');
        setNewBarcode(''); // blank until user scans/types a replacement
        setImgBase64('');
        setImgMime('image/jpeg');
      }
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

  const imageDataUri = useMemo(
    () => (imgBase64 ? `data:${imgMime};base64,${imgBase64}` : ''),
    [imgBase64, imgMime]
  );

  const pickFromGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 1280,
      });
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        Alert.alert('Image', 'Could not read image data.');
        return;
      }
      setImgBase64(asset.base64);
      setImgMime(asset.type || 'image/jpeg');
    } catch (e) {
      Alert.alert('Image', e.message || 'Failed to pick image.');
    }
  };

  const takePhoto = async () => {
    try {
      const res = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 1280,
        saveToPhotos: false,
      });
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        Alert.alert('Camera', 'Could not read image data from camera.');
        return;
      }
      setImgBase64(asset.base64);
      setImgMime(asset.type || 'image/jpeg');
    } catch (e) {
      Alert.alert('Camera', e.message || 'Failed to take photo.');
    }
  };

  const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (value) setNewBarcode(value);
    setScannerVisible(false);
  };

  const handleUpdate = async () => {
    if (!product?.barcode) {
      Alert.alert('Error', 'Original product barcode is missing.');
      return;
    }
    // Build payload—only include fields user can update
    const payload = {
      name: name?.trim() || undefined,
      newBarcode: newBarcode?.trim() || undefined,
      size: size?.trim() || undefined,
      image: imageDataUri || undefined, // base64 data URI if user picked/took a new one
      price: price?.trim() !== '' ? Number(price) : undefined,
      cost: cost?.trim() !== '' ? Number(cost) : undefined,
      category: category?.trim() || undefined,
    };

    // Basic validation
    if (payload.price != null && !Number.isFinite(payload.price)) {
      Alert.alert('Validation', 'Price must be a valid number.');
      return;
    }
    if (payload.cost != null && !Number.isFinite(payload.cost)) {
      Alert.alert('Validation', 'Cost must be a valid number.');
      return;
    }

    try {
      setSubmitting(true);
      const url = `${API_URL}/api/products/by-barcode/${encodeURIComponent(product.barcode)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log("payload:", payload);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // show specific server message if present
        throw new Error(data?.error || data?.message || 'Failed to update product');
      }

      Alert.alert('Success', 'Product updated successfully.');

      // reflect local UI changes immediately
      const updated = {
        ...product,
        ...data?.product, // if backend returns updated product
        name: payload.name ?? product.productName,
        size: payload.size ?? product.size,
        category: payload.category ?? product.category,
        price: payload.price ?? product.price,
        cost: payload.cost ?? product.cost,
        barcode: payload.newBarcode ?? product.barcode,
        image: imageDataUri || product.productImage,
      };
      setProduct(updated);
      // reset transient image state (keep fields editable)
      setImgBase64('');
      setImgMime('image/jpeg');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };
      const inCart = cart.find((p) => p.product_id === id);
    const inPrint = print.find((p) => p.product_id === id);

  return (
    <>
      <RBSheet
        ref={sheetRef}
        height={560}
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
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Image / Preview */}
            {imageDataUri ? (
              <Image source={{ uri: imageDataUri }} style={styles.image} />
            ) : product.productImage ? (
              <Image source={{ uri: `data:image/webp;base64,${product.productImage}`}} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={{ color: '#aaa' }}>No Image</Text>
              </View>
            )}

            {/* Image actions */}
            <View style={[styles.row, { marginTop: 8 }]}>
              <TouchableOpacity style={[styles.smallBtn, styles.ghost]} onPress={pickFromGallery}>
                <Text style={styles.ghostText}>Pick from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={takePhoto}>
                <Text style={styles.smallBtnText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Editable fields */}
            <View style={{ marginTop: 12, gap: 10 }}>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Size (e.g., 200 ml)"
                value={size}
                onChangeText={setSize}
              />
              {/* <TextInput
                style={styles.input}
                placeholder="Category"
                value={category}
                onChangeText={setCategory}
              /> */}
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={category}
                  onValueChange={(itemValue) => setCategory(itemValue)}
                >
                  <Picker.Item label="Select Category" value="" />
                  {allCats.map(cat => (
                    <Picker.Item
                      key={cat._id}
                      label={cat.category}
                      value={cat.category}
                    />
                  ))}
                </Picker>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Price"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Cost (optional, e.g., 0.2)"
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                autoCapitalize="none"
              />

              {/* Original barcode (read-only) */}
              <View>
                <Text style={styles.metaLabel}>Original Barcode</Text>
                <Text style={styles.metaValue}>{product.barcode || '—'}</Text>
              </View>

              {/* New barcode with scanner icon */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputWithRightIcon}
                  placeholder="New Barcode (optional)"
                  value={newBarcode}
                  onChangeText={setNewBarcode}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.inputRightIcon}
                  onPress={() => {
                    if (hasCameraPermission) setScannerVisible(true);
                    else Alert.alert('Camera Permission', 'Please allow camera access in Settings.');
                  }}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Icon name="camera-alt" size={22} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.row, { marginTop: 16 }]}>
                {inCart ? (
                            <View style={styles.qtyRow}>
                              <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(product.product_id)}>
                                <Text style={styles.qtyText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.qtyValue}>{inCart.qty}</Text>
                              <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(product.product_id)}>
                                <Text style={styles.qtyText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: THEME.secondary }]}
                onPress={() => addToCart(product)}
              >
                <Text style={styles.btnText}>Add to Cart</Text>
              </TouchableOpacity>
                          )}
                          {inPrint ? (
                                        <View style={[styles.qtyRow, { marginTop: 8 }]}>
                                          <TouchableOpacity style={styles.qtyBtn} onPress={() => decreasePrintQty(product.product_id)}>
                                            <Text style={styles.qtyText}>-</Text>
                                          </TouchableOpacity>
                                          <Text style={styles.qtyValue}>{inPrint.qty}</Text>
                                          <TouchableOpacity style={styles.qtyBtn} onPress={() => increasePrintQty(product.product_id)}>
                                            <Text style={styles.qtyText}>+</Text>
                                          </TouchableOpacity>
                                        </View>
                                      ) : (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: THEME.primary }]}
                onPress={() => addToPrint(product)}
              >
                <Text style={styles.btnText}>Add to Print</Text>
              </TouchableOpacity>
                )}
            </View>
           
            <TouchableOpacity
              style={[styles.btn, { marginTop: 10, backgroundColor: '#1B9C85', opacity: submitting ? 0.6 : 1 }]}
              disabled={submitting}
              onPress={handleUpdate}
            >
              <Text style={styles.btnText}>{submitting ? 'Updating…' : 'Update Product'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </RBSheet>

      {/* Fullscreen Scanner */}
      <Modal visible={scannerVisible} animationType="slide">
        {hasCameraPermission ? (
          <View style={{ flex: 1 }}>
            <Camera
              style={styles.camera}
              cameraType={CameraType.Back}
              scanBarcode
              onReadCode={onReadCode}
            />
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setScannerVisible(false)}>
                <Text style={styles.controlText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={{ color: 'red' }}>
              Camera permission denied. Please allow access in settings.
            </Text>
            <TouchableOpacity style={[styles.controlBtn, { marginTop: 16 }]} onPress={() => setScannerVisible(false)}>
              <Text style={styles.controlText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </>
  );

});

export default ProductBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 12 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  image: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain' },
  imagePlaceholder: { backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },

  metaBox: { marginTop: 6, gap: 4 },
  meta: { color: '#555' },
  metaLabel: { color: '#666', fontSize: 12 },
  metaValue: { color: '#111', fontWeight: '600', marginTop: 2 },

  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },

  smallBtn: { backgroundColor: THEME.secondary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  ghostText: { color: '#333', fontWeight: '700' },

  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, color: '#333',
    textTransform: "capitalize"
  },
  inputWrapper: { position: 'relative', marginTop: 0 },
  inputWithRightIcon: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingLeft: 12, paddingRight: 44, color: '#333', backgroundColor: '#fff',
  },
  inputRightIcon: {
    position: 'absolute', right: 12, top: '50%', marginTop: -14,
    justifyContent: 'center', alignItems: 'center', height: 28, width: 28,
  },

  camera: { flex: 1 },
  controls: {
    position: 'absolute', bottom: 30, width: '100%',
    flexDirection: 'row', justifyContent: 'center', gap: 10,
  },
  controlBtn: {
    backgroundColor: '#000000AA', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8,
  },
  controlText: { color: '#fff', fontWeight: '700' },
  permissionDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 10,
    overflow: 'hidden',
  },
    cartBtnText: { color: '#fff', fontWeight: 'bold' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  qtyBtn: { backgroundColor: '#2c1e70', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold', color: '#000' },

});