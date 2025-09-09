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
import API_ENDPOINTS from '../../../config/api';

const LinkProductModal =  ({
  visible,
  onClose,
  onSelect,
  linkingItem,
  invoice,
}) => {
  const baseUrl = 'http://192.168.1.52:3006';

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
        const res = await fetch(API_ENDPOINTS.FINDPRODUCTFROMHICKSVILL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            store: 'deepanshu_test',
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
  const data = {
    invoiceName: vendorName,
    value: {
      Item: linkingItem.itemNo,
      POS: item.name,
      Barcode: item.upc,
      PosSKU: item.sku,
      isReviewed: 'true',
      Description: linkingItem.description,
      Size: linkingItem.size,
      Department: item.department,
      SellerCost: item.cost,
      SellingPrice: item.price,
      Quantity: qty,
      Price: item.salePrice,
      LinkingCorrect: 'true',
      LinkByBarcode: 'false',
      LinkByName: 'false',
      InvoiceName: vendorName,
      InvoiceDate: day,
      InvoiceNo: InvNumber,
      ProductId: linkingItem.ProductId,
      DefaultLinking: true,
      StockSpliting: true,
    },
  };

  console.log("Sending data:", data);

  try {
    const res = await fetch(`${baseUrl}/api/invoice/product/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        store: 'deepanshu_test',
        vendordetails: JSON.stringify(storedVendor)
      },
      body: JSON.stringify(data) // ✅ Must be stringified
    });

    const result = await res.json(); // ✅ Read API response
    console.log("API Response:", result);

    if (!res.ok) {
      throw new Error(result.error || 'Failed to link product');
    }
    console.log("res",res)
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
  header: {fontSize: 18, fontWeight: 'bold', marginBottom: 10},
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
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
},
detailValue: {
  fontSize: 14,
  marginBottom: 4,
},

  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productName: {fontSize: 16},
  productBarcode: {fontSize: 12, color: '#888'},
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
