import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Camera, CameraType } from 'react-native-camera-kit';
import API_ENDPOINTS, { initICMSBase } from '../../../icms_config/api';

const LinkProductModal =  ({
  visible,
  onClose,
  onSelect,
  linkingItem,
  invoice,
}) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  // const vender = await AsyncStorage.getItem('vendor');
  const day = invoice?.SavedDate;
  const InvNumber = invoice?.SavedInvoiceNo;
  const vendorName = invoice?.InvoiceName;
  const [storedVendor, setStoredVendor] = useState(null);

  useEffect(() => {
    const loadVendor = async () => {
      try {
        const value = await AsyncStorage.getItem('vendor');


        if (value) {
          setStoredVendor(JSON.parse(value));
        }
      } catch (err) {
        console.error('Error loading vendor:', err);
      }
    };
    loadVendor();
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

  useEffect(() => {
    if (searchTerm.length < 2) {
      setProducts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
       const token = await   AsyncStorage.getItem('access_token');
       const icms_store = await AsyncStorage.getItem('icms_store');
       console.log("AsyncStorage:",token);
        const queryValue = String(searchTerm ?? '').trim();
        const bodyPayload = {
          query: [queryValue],
        };
        console.log("queryValue:",bodyPayload);
        const res = await fetch(API_ENDPOINTS.FINDPRODUCTFROMHICKSVILL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
                'access_token': token,
          'mode': 'MOBILE',
          'store': icms_store
          },
          body: JSON.stringify(bodyPayload),
        });

        const data = await res.json();
        console.log('API response:', data);
        const matchedProducts =
          data?.matchedProducts ||
          data?.products ||
          data?.results ||
          [];
        setProducts(Array.isArray(matchedProducts) ? matchedProducts : []);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

const linkProduct = async (item, qty) => {
  const safeString = (val, fallback = '') =>
    val === undefined || val === null ? fallback : String(val);
  const safeBoolString = (val, fallback = 'false') =>
    val === undefined || val === null ? fallback : String(!!val);

  const data = {
    invoiceName: safeString(vendorName),
    value: {
      Item: safeString(linkingItem?.itemNo),
      POS: safeString(item?.name),
      Barcode: safeString(item?.upc),
      PosSKU: safeString(item?.sku, '0'),
      isReviewed: safeBoolString(linkingItem?.isReviewed, 'true'),
      Description: safeString(linkingItem?.description),
      Size: safeString(linkingItem?.size),
      Department: safeString(item?.department),
      SellerCost: safeString(item?.cost),
      SellingPrice: safeString(item?.price),
      Quantity: safeString(qty, '0'),
      Price: safeString(item?.salePrice),
      LinkingCorrect: safeBoolString(linkingItem?.LinkingCorrect, 'true'),
      LinkByBarcode: safeBoolString(linkingItem?.LinkByBarcode, 'false'),
      LinkByName: safeBoolString(linkingItem?.LinkByName, 'false'),
      InvoiceName: safeString(vendorName),
      InvoiceDate: safeString(day),
      InvoiceNo: safeString(InvNumber),
      ProductId: safeString(linkingItem?.ProductId),
      DefaultLinking: Boolean(linkingItem?.DefaultLinking ?? true),
      StockSpliting: Boolean(linkingItem?.StockSpliting ?? true),
    },
  };

  console.log("Sending data:", data);

  try {
      const icms_store = await AsyncStorage.getItem('icms_store');
    await initICMSBase();
    const token = await AsyncStorage.getItem('access_token');
    const res = await fetch(API_ENDPOINTS.PRODUCTLINKING, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'access_token': token ?? '',
        'mode': 'MOBILE',
        store: icms_store,
        vendordetails: storedVendor ? JSON.stringify(storedVendor) : '',
      },
      body: JSON.stringify(data) // ✅ Must be stringified
    });

    const result = await res.json(); // ✅ Read API response
    console.log("API Response:", result);
      console.log("res",res)

    if (!res.ok) {
      throw new Error(result.error || 'Failed to link product');
    }
  
    // Maybe close modal or show success
    alert('Product linked successfully!');
  } catch (err) {
    console.error("Error linking product:", err);
    alert(`Error: ${err.message}`);
  }
};

  const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (value) {
      setSearchTerm(String(value));
      setSelectedProduct(null);
    }
    setScannerVisible(false);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
          <View style={styles.modalCard}>
        <View style={styles.modalHeaderRow}>
          <Text style={styles.header}>Link Product</Text>
          <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
            <Text style={styles.closeIconText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linkingSummaryCard}>
          <Text style={styles.summaryTitle}>Invoice Row Details</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Description</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {linkingItem?.description || '-'}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Item No</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {linkingItem?.itemNo || '-'}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>CP</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {linkingItem?.cp ?? '-'}
              </Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Unit Price</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {linkingItem?.unitPrice ?? '-'}
              </Text>
            </View>
          </View>
        </View>

        {!selectedProduct ? (
          // 🔍 Search & list view
          <>
            <Text style={styles.sectionHeader}>Search Product</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, styles.searchInputFlex]}
                placeholder="Type product name or barcode"
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#6b7280"
              />
              <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
                <Icon name="camera-alt" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {loading && <ActivityIndicator size="small" color="#000" />}
            <FlatList
              data={products}
              style={styles.resultsList}
              keyExtractor={(item, idx) =>
                (item.upc || item.sku || idx).toString()
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => setSelectedProduct(item)}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productBarcode}>{item.upc}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !loading && searchTerm.length >= 2 ? (
                  <Text style={styles.noResult}>No products found</Text>
                ) : null
              }
            />
          </>
        ) : (
          // 📦 Product detail + quantity view
          <>
            <Text style={styles.sectionHeader}>Product Details</Text>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{selectedProduct.name}</Text>

              <Text style={styles.detailLabel}>UPC:</Text>
              <Text style={styles.detailValue}>{selectedProduct.upc}</Text>

              <Text style={styles.detailLabel}>SKU:</Text>
              <Text style={styles.detailValue}>{selectedProduct.sku}</Text>

              <Text style={styles.detailLabel}>Department:</Text>
              <Text style={styles.detailValue}>
                {selectedProduct.department}
              </Text>

              <Text style={styles.detailLabel}>Size:</Text>
              <Text style={styles.detailValue}>{selectedProduct.size}</Text>

              <Text style={styles.detailLabel}>Cost:</Text>
              <Text style={styles.detailValue}>${selectedProduct.cost}</Text>

              <Text style={styles.detailLabel}>Price:</Text>
              <Text style={styles.detailValue}>${selectedProduct.price}</Text>
            </View>

            <Text style={[styles.detailLabel, {marginTop: 20}]}>
              Enter Unit in Case
            </Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Unit in case"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                linkProduct(selectedProduct, quantity || '0');
                onSelect(selectedProduct);
                setSelectedProduct(null);
                setQuantity('');
                onClose();
              }}>
              <Text style={styles.confirmText}>Confirm Link</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedProduct(null)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
          </View>
        </View>
      </Modal>

      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        {hasCameraPermission ? (
          <View style={{ flex: 1 }}>
            <Camera style={styles.camera} cameraType={CameraType.Back} scanBarcode onReadCode={onReadCode} />
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setScannerVisible(false)}>
                <Text style={styles.controlText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={{ color: 'red' }}>Camera permission denied. Please allow access in settings.</Text>
            <TouchableOpacity style={styles.controlBtn} onPress={() => setScannerVisible(false)}>
              <Text style={styles.controlText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </>
  );
};

export default LinkProductModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    padding: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  header: {fontSize: 18, fontWeight: '800', color: '#111'},
  closeIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d6dee8',
  },
  closeIconText: { color: '#475569', fontSize: 14, fontWeight: '800' },
  linkingSummaryCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryCell: {
    width: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  sectionHeader: {fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111'},
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#1f1f1f',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  searchInputFlex: { flex: 1, marginBottom: 0 },
  scanBtn: {
    backgroundColor: '#319241',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsList: {
    maxHeight: 300,
  },
  detailCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
},
detailLabel: {
  fontWeight: 'bold',
  fontSize: 14,
  marginTop: 6,
  color: '#1f1f1f',
},
detailValue: {
  fontSize: 14,
  marginBottom: 4,
  color: '#1f1f1f',
},

  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productName: {fontSize: 16, color: '#1f1f1f'},
  productBarcode: {fontSize: 12, color: '#666'},
  noResult: {textAlign: 'center', color: '#666', marginTop: 20},
  confirmBtn: {
    backgroundColor: '#5cb85c',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  confirmText: {textAlign: 'center', color: '#fff', fontWeight: 'bold'},
  closeBtn: {
    backgroundColor: '#d9534f',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  closeText: {textAlign: 'center', color: '#fff', fontWeight: 'bold'},
  camera: { flex: 1 },
  controls: { position: 'absolute', bottom: 30, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  controlBtn: { backgroundColor: '#000000AA', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  controlText: { color: '#fff', fontWeight: '700' },
  permissionDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
});
