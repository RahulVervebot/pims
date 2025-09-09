import React, { useMemo, useState,useEffect,useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import { API_URL } from '@env';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from "react-native-vector-icons/MaterialIcons";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { Camera, CameraType } from "react-native-camera-kit";
import { getTopCategories } from '../functions/function';
import { Picker } from '@react-native-picker/picker';

export default function CreateProductModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [sale, setSale] = useState(''); // keep as string unless you prefer boolean/number
  const [category, setCategory] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const cameraRef = useRef(null);
  const isHandlingScanRef = useRef(false);
  const [imgBase64, setImgBase64] = useState('');
  const [imgMime, setImgMime] = useState('image/jpeg');
  const [allCats, setAllCats] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      let result;
      if (Platform.OS === "ios") {
        result = await request(PERMISSIONS.IOS.CAMERA);
      } else {
        result = await request(PERMISSIONS.ANDROID.CAMERA);
      }
      setHasCameraPermission(result === RESULTS.GRANTED);
    })();
  }, []);

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

  const priceNumber = useMemo(() => {
    const n = parseFloat(price);
    return Number.isFinite(n) ? n : NaN;
  }, [price]);
   const saleNumber = useMemo(() => {
    const n = parseFloat(sale);
    return Number.isFinite(n) ? n : NaN;
  }, [sale]);

    const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (value) setBarcode(value);
      setScannerVisible(false);
  };

  const imageDataUri = useMemo(() => {
    return imgBase64 ? `data:${imgMime};base64,${imgBase64}` : '';
  }, [imgBase64, imgMime]);

  const validate = () => {
    if (!name.trim()) return 'Please enter product name.';
    if (!price.trim()) return 'Please enter price.';
    if (!Number.isFinite(priceNumber) || priceNumber < 0) return 'Price must be a non-negative number.';
    // image optional—uncomment to enforce:
    // if (!imgBase64) return 'Please add an image.';
    return null;
  };

  const resetForm = () => {
    setName(''); setSize(''); setPrice(''); setSale(''); setCategory('');
    setImgBase64(''); setImgMime('image/jpeg');
  };

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

  const handleSubmit = async () => {
    try {
      const msg = validate();
      if (msg) {
        Alert.alert('Missing info', msg);
        return;
      }
      setSubmitting(true);
      // If your backend wants RAW base64 (no data URI), use imgBase64 instead of imageDataUri.
      const body = {
        name: name.trim(),
        barcode: barcode,
        size: size.trim() || undefined,
        image: imageDataUri,           // <-- base64 as data URI string
        price: priceNumber,
        sale: saleNumber || undefined,
        category: category.trim() || undefined,
      };
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
console.log("body:",body);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to create product');

      Alert.alert('Success', 'Product created successfully');
      resetForm();
      onCreated?.(data?.product || body);
      onClose?.();
    } catch (e) {
      console.log("error",e);
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }

  };

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.centered}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Create Product</Text>

          <TextInput
            style={styles.input}
            placeholder="Name *"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Size (e.g., 200 ml)"
            value={size}
            onChangeText={setSize}
          />
{/* Barcode with right icon inside the field */}

<View style={styles.inputWrapper}>
  <TextInput
    style={styles.inputWithRightIcon}
    placeholder="Barcode"
    value={barcode}
    onChangeText={setBarcode}
    keyboardType="default"   // or 'numeric' if you only scan digits
    returnKeyType="done"
  />
  <TouchableOpacity
    style={styles.inputRightIcon}
    onPress={() => {
      if (hasCameraPermission) {
        setScannerVisible(true);
      } else {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to scan barcodes. Please enable it in settings.'
        );
      }
    }}
    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
  >
    <Icon name="camera" size={22} color="#333" />
  </TouchableOpacity>
</View>
  {/* Image actions */}
 <View style={styles.row}>
    <TouchableOpacity style={[styles.smallBtn, styles.ghost]} onPress={pickFromGallery}>
        <Text style={styles.ghostText}>Pick from Gallery</Text>
        </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={takePhoto}>
              <Text style={styles.smallBtnText}>Take Photo</Text>
            </TouchableOpacity>
    </View>

{!!imageDataUri && (
            <Image
              source={{ uri: imageDataUri }}
              style={styles.preview}
              resizeMode="cover"
              onError={() => Alert.alert('Image', 'Failed to preview image.')}
            />
)}
<TextInput
            style={styles.input}
            placeholder="Price *"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
/>

<TextInput
            style={styles.input}
            placeholder="Sale Price (optional: 0.2 )"
            value={sale}
            onChangeText={setSale}
            autoCapitalize="none"
/>
          {/* <TextInput
            style={styles.input}
            placeholder="Category (e.g., Hair Care)"
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
          <View style={styles.rowRight}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={submitting}>
              <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >

              {submitting ? <ActivityIndicator /> : <Text style={styles.btnText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </Modal>
       <Modal visible={scannerVisible} animationType="slide">
            {hasCameraPermission ? (
              <View style={{ flex: 1 }}>
                <Camera
                  ref={cameraRef}
                  style={styles.camera}
                  cameraType={CameraType.Back}
                  scanBarcode
                  onReadCode={onReadCode}
                />
    
                {/* Controls */}
                <View style={styles.controls}>
    
                  <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => setScannerVisible(false)}
                  >
                    <Text style={styles.controlText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.permissionDenied}>
                <Text style={{ color: "red" }}>
                  Camera permission denied. Please allow access in settings.
                </Text>
                <TouchableOpacity
                  style={[styles.controlBtn, { marginTop: 16 }]}
                  onPress={() => setScannerVisible(false)}
                >
                  <Text style={styles.controlText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </Modal>
          </>
  );
}

const THEME = { primary: '#2C1E70', secondary: '#F57200' };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000077' },
  centered: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'flex-end'
  },
  sheet: {
    width: '100%', backgroundColor: '#fff',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16
  },
  title: { fontSize: 18, fontWeight: '700', color: THEME.primary, marginBottom: 10 },
  subTitle: { marginTop: 12, marginBottom: 6, fontWeight: '700', color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, color: '#333', marginTop: 10
  },
  preview: { width: '100%', height: 150, borderRadius: 8, marginTop: 10, backgroundColor: '#f4f4f4' },
  row: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
  rowRight: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  smallBtn: {
    backgroundColor: THEME.secondary,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10
  },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  ghostText: { color: '#333', fontWeight: '700' },
  btn: {
    backgroundColor: THEME.secondary,
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center'
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  btnGhostText: { color: '#333' },
  barcodefield:{
 flexDirection: "row",
  },

    camera: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  inputWrapper: {
  position: 'relative',
  marginTop: 10,
},

inputWithRightIcon: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  paddingVertical: 10,
  paddingLeft: 12,
  paddingRight: 44,   // 👈 reserve space for the icon
  color: '#333',
  backgroundColor: '#fff',
},

inputRightIcon: {
  position: 'absolute',
  right: 12,
  top: '50%',
  marginTop: -14,     // roughly half of (icon size + padding) to vertically center
  justifyContent: 'center',
  alignItems: 'center',
  height: 28,
  width: 28,
},
pickerWrapper: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  marginTop: 10,
  overflow: 'hidden',
}
});