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
  Image,
  Pressable,
} from "react-native";
import axios from "axios";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Camera, CameraType } from "react-native-camera-kit";
import { API_URL } from "@env";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { CartContext } from "../context/CartContext";
import { PrintContext } from "../context/PrintContext";
import ProductBottomSheet from "./ProductBottomSheet"; // ✅ ADD

const THEME = {
  primary: "#2C1E70",
  accent: "#F57200",
  text: "#222",
  muted: "#777",
  success: "#27ae60",
};

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

  // floating results position
  const [searchRowH, setSearchRowH] = useState(0);

  // barcode result modal
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);

  // ✅ bottom sheet ref
  const sheetRef = useRef(null);

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

  const handleSearch = (text) => {
    setSearchText(text);

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    if (!text || text.trim().length === 0) {
      setResults([]);
      return;
    }

    typingTimeout.current = setTimeout(async () => {
      if (text.length >= 3) {
        try {
          const res = await axios.get(
            `${API_URL}/api/products/search?query=${encodeURIComponent(text)}`
          );
          setResults(res.data || []);
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
      const res = await axios.get(
        `${API_URL}/api/products/search?query=${encodeURIComponent(barcode)}`
      );
      const list = Array.isArray(res.data) ? res.data : [];

      if (list.length >= 1) {
        setScannedProduct(list[0]);
        setResultModalVisible(true);
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
    const p = product || scannedProduct;
    if (!p) return;
    addToCart(p);
    setResultModalVisible(false);
    Alert.alert("Added", "Item added to cart.");
  };

  const onAddToPrint = (product) => {
    const p = product || scannedProduct;
    if (!p) return;
    addToPrint(p);
    setResultModalVisible(false);
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
          <Icon name="camera" size={28} color="#333" />
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
                      {item?.name}
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

      {/* Result Modal (after scan) */}
      <Modal
        visible={resultModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.resultCard}>
            {scannedProduct?.image ? (
              <Image source={{ uri: scannedProduct.image }} style={styles.resultImage} />
            ) : (
              <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                <Icon name="image" size={32} color="#bbb" />
              </View>
            )}

            <Text style={styles.title}>{scannedProduct?.name || "Product"}</Text>
            <Text style={styles.metaText}>
              {scannedProduct?.category || "Category"} {scannedProduct?.size ? `• ${scannedProduct.size}` : ""}
            </Text>
            <Text style={styles.priceText}>
              ₹{Number(scannedProduct?.price || 0).toFixed(2)}
            </Text>
            {scannedProduct?.barcode ? (
              <Text style={styles.codeText}>Barcode: {scannedProduct.barcode}</Text>
            ) : null}

            <View style={styles.rowButtons}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: THEME.accent }]} onPress={() => onAddToCart()}>
                <Text style={styles.actionText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: THEME.primary }]} onPress={() => onAddToPrint()}>
                <Text style={styles.actionText}>Add to Print</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ Bottom Sheet for list item tap */}
      <ProductBottomSheet
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
  input: { flex: 1, paddingVertical: 10 },

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

  // Barcode result modal
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 20,
  },
  resultCard: {
    width: "95%", maxWidth: 420,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    alignItems: "center", elevation: 6,
  },
  resultImage: {
    width: "100%", height: 180, borderRadius: 12, marginBottom: 12, resizeMode: "cover",
  },
  resultImagePlaceholder: { justifyContent: "center", alignItems: "center", backgroundColor: "#f2f2f2" },
  title: { fontSize: 18, fontWeight: "700", color: THEME.text, textAlign: "center" },
  metaText: { color: THEME.muted, marginTop: 4, textAlign: "center" },
  priceText: { color: THEME.success, fontWeight: "700", fontSize: 18, marginTop: 8 },
  codeText: { color: "#555", marginTop: 6 },

  rowButtons: {
    flexDirection: "row", gap: 12, marginTop: 16, width: "100%",
  },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "700" },

  closeBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16 },
  closeText: { color: THEME.primary, fontWeight: "700" },
});
