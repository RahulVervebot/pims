// src/components/ProductSearch.js
import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Camera, CameraType } from "react-native-camera-kit";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { CartContext } from "../context/CartContext";
import { PrintContext } from "../context/PrintContext";
import ProductModal from "./ProductModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
const PLACEHOLDER = "#9AA3AF";

export default function ProductSearch() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const typingTimeout = useRef(null);

  const { addToCart } = useContext(CartContext);
  const { addToPrint } = useContext(PrintContext);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const cameraRef = useRef(null);
  const isHandlingScanRef = useRef(false);
  const [torchOn, setTorchOn] = useState(false);
  const [access_token, setAccessToken] = useState('');
  const [storeURL, setStoreurl] = useState('');
  // floating results position
  const [searchRowH, setSearchRowH] = useState(0);

  // ✅ bottom sheet ref
  const sheetRef = useRef(null);

  useEffect(() => {
    (async () => {
      let result;
     const storeulr =    await AsyncStorage.getItem('storeurl');
     const access_token =    await AsyncStorage.getItem('access_token');
setAccessToken(access_token);
setStoreurl(storeulr)
      if (Platform.OS === "ios") {
        result = await request(PERMISSIONS.IOS.CAMERA);
      } else {
        result = await request(PERMISSIONS.ANDROID.CAMERA);
      }
      setHasCameraPermission(result === RESULTS.GRANTED);
    })();
  }, []);

  const handleSearch = (text) => {
    setSearchText(text);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    if (!text || text.trim().length === 0) {
      setResults([]);
      return;
    }
console.log("🔍 Searching for:", storeURL);
    typingTimeout.current = setTimeout(async () => {
      if (text.length >= 3) {
        try {
   const res = await fetch(`${storeURL}/pos/app/product/search?query=${encodeURIComponent(text)}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      access_token: access_token,
    },
  });
   if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch categories (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  const list = Array.isArray(json?.products) ? json.products : [];
          setResults(list || []);
        } catch (err) {
          console.error("❌ Search error:", err?.message);
          setResults([]);
        }
      } else {
        setResults([]);
      }
    }, 500);
  };

  const runQueryWithBarcode = async (barcode) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;

    setScannerVisible(false);
    try {
  const res = await fetch(`${storeURL}/pos/app/product/search?query=${encodeURIComponent(barcode)}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      access_token: access_token,
    },
  });
   if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch categories (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
      const list = Array.isArray(json?.products) ? json.products : [];

      if (list.length >= 1) {
        setResults([]);
        setSearchText(barcode);
        setTimeout(() => {
          sheetRef.current?.open(list[0]);
        }, 180);
      } else {
        Alert.alert("Not found", "No product matched this barcode.");
      }
    } catch (err) {
      console.error("❌ Barcode search error:", err?.message);
      Alert.alert("Error", "Could not fetch product for this barcode.");
    } finally {
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 600);
    }
  };

  const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (value) runQueryWithBarcode(value);
  };

  const takePicture = async () => {
    try {
      if (!cameraRef.current) return;
      const photo = await cameraRef.current.capture();
      Alert.alert("Photo captured", photo?.uri || "No URI");
    } catch (e) {
      console.error("❌ capture error:", e?.message);
    }
  };

  const onAddToCart = (product) => {
    if (!product) return;
    addToCart(product);
    Alert.alert("Added", "Item added to cart.");
  };

  const onAddToPrint = (product) => {
    if (!product) return;
    addToPrint(product);
    Alert.alert("Added", "Item added to print list.");
  };

  const showDropdown = results.length > 0 && searchText.trim().length >= 3;

  // ✅ open bottom sheet from list result
  const openSheetFor = (item) => {
    setResults([]); // hide dropdown
    sheetRef.current?.open(item);
  };

  return (
    <View style={[styles.container, { zIndex: 100 }]}>
      {/* Search Input */}
      <View
        style={styles.searchRow}
        onLayout={(e) => setSearchRowH(e.nativeEvent.layout.height)}
      >
        <TextInput
          style={styles.input}
          placeholder="Search by name, barcode, or category..."
          placeholderTextColor={PLACEHOLDER}
          value={searchText}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          onPress={() => {
            if (hasCameraPermission) {
              setScannerVisible(true);
            } else {
              Alert.alert(
                "Camera Permission",
                "Camera access is required to scan barcodes. Please enable it in settings."
              );
            }
          }}
        >
          <Icon name="camera-alt" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 🔽 Floating dropdown over tabs */}
      {showDropdown && (
        <>
          <Pressable
            style={styles.backdropTapCatcher}
            onPress={() => setResults([])}
          />
          <View style={[styles.resultsOverlay, { top: searchRowH + 6 }]}>
            <FlatList
              data={results}
              keyExtractor={(item, idx) => item?._id || String(idx)}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => openSheetFor(item)}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item?.productName}
                    </Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {item?.category} {item?.barcode ? `• ${item.barcode}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No products found.</Text>}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </>
      )}

      {/* Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide">
        {hasCameraPermission ? (
          <View style={{ flex: 1 }}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              cameraType={CameraType.Back}
              scanBarcode
              onReadCode={onReadCode}
              flashMode={torchOn ? "on" : "off"}
            />

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, { marginRight: 10 }]}
                onPress={() => setTorchOn((t) => !t)}
              >
                <Text style={styles.controlText}>
                  {torchOn ? "Torch Off" : "Torch On"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { marginRight: 10 }]}
                onPress={takePicture}
              >
                <Text style={styles.controlText}>Capture</Text>
              </TouchableOpacity>

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

      {/* ✅ Bottom Sheet for list item tap */}
      <ProductModal
        ref={sheetRef}
        onAddToCart={(p) => onAddToCart(p)}
        onAddToPrint={(p) => onAddToPrint(p)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 16,paddingBottom: 16, position: "relative" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    minHeight: 48,
  },
  input: { flex: 1, paddingVertical: 10, color: "#111" },

  // Floating dropdown
  resultsOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    maxHeight: 260,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 999,
  },
  backdropTapCatcher: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 900,
  },
  resultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  resultTitle: { fontWeight: "600", color: "#111" },
  resultMeta: { color: "#666", marginTop: 2 },

  empty: { textAlign: "center", color: "#888", paddingVertical: 12 },

  // Scanner
  camera: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  controlBtn: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  controlText: { color: "#fff", fontWeight: "600" },
  permissionDenied: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 24,
  },

});
