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
} from 'react-native';
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
        const res = await fetch(API_ENDPOINTS.FINDPRODUCTFROMHICKSVILL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
                'access_token': token,
          'mode': 'MOBILE',
          'store': icms_store
          },
          body: JSON.stringify({barcodes: [searchTerm]}),
        });

        const data = await res.json();
        console.log('API response:', data);

        const {matchedProducts} = data;
        setProducts(matchedProducts || []);
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!selectedProduct ? (
          // 🔍 Search & list view
          <>
            <Text style={styles.header}>Search Product</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Type product name or barcode"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#6b7280"
            />
            {loading && <ActivityIndicator size="small" color="#000" />}
            <FlatList
              data={products}
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
            <Text style={styles.header}>Product Details</Text>
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
    </Modal>
  );
};

export default LinkProductModal;

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#fff'},
  header: {fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#111'},
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#1f1f1f',
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
});
