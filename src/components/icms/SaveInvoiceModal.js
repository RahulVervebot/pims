import React, { useState, useCallback } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_ENDPOINTS, { initICMSBase } from '../../../icms_config/api';
import DateTimePicker from '@react-native-community/datetimepicker';
const SaveInvoiceModal = ({ isVisible, onClose,ImageURL, vendorName, tableData,cleardata,selectedVendor }) => {
  const [savedInvoiceNo, setSavedInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [showInvoiceDatePicker, setShowInvoiceDatePicker] = useState(false);
   const baseurl = "https://icmsfrontend.vervebot.io";
     const [ocrurl, setOcrUrl] = useState(null);
   
       const [user_email, setUserEmail] = useState('');
   useFocusEffect(
    useCallback(() => {
      initICMSBase();
      const fetchInitialData = async () => {
        try {
          // Retrieve any needed tokens/urls (if used by fetchManageOrderReport)
             const userEmail = await AsyncStorage.getItem('userEmail');
          const temocrurl = await AsyncStorage.getItem('ocrurl');
      
          setUserEmail(userEmail || '');

          setOcrUrl(temocrurl);
        } catch (error) {
          console.error('Error fetching initial data:', error);
        }
      };
      fetchInitialData();
    }, [])
  );
  const handleSubmit = async () => {
    if (!savedInvoiceNo.trim()) {
      Alert.alert('Missing Invoice Number', 'Please enter a valid invoice number.');
      return;
    }
     const invdata = tableData.map((row) => ({
        qty: row.qty || '',
        itemNo: row.itemNo || '',
        description: row.description || '',
        unitPrice: row.unitPrice || '',
        extendedPrice: row.extendedPrice || '',
        pieces: row.pieces || '',
        sku: row.sku || '',
        barcode: row.barcode || '',
        posName: row.posName || '',
        department: row.department || '',
        condition: row.condition || '',
      }))
    const selectedDate = invoiceDate.toISOString().split('T')[0];
    const bodyPayload = {
      InvoicesImgUrls: ImageURL,
      InvoiceName: vendorName,
      InvoiceDate: selectedDate,
      InvoicePage: '',
      UserDetailInfo: {
       InvoiceUpdatedby: user_email,
       date: selectedDate,
      
      },
      InvoiceData: invdata,
      SavedDate: selectedDate,
      SavedInvoiceNo: savedInvoiceNo,
      Exist: false,
    };

    try {
        console.log("bodyPayload",bodyPayload);
        const token = await   AsyncStorage.getItem('access_token');
          const icms_store = await   AsyncStorage.getItem('icms_store');
        
        const vendordetails = selectedVendor;
        console.log("vendordetails",vendordetails);
        // const vendordetails = '{"value":"Chetak","slug":"chetak","jsonName":"chetak-products.json","emptyColumn":true,"databaseName":"chetakproducts"}'
        const response = await fetch(API_ENDPOINTS.SAVE_INVOICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'store': icms_store,
         'access_token': token,
          'mode': 'MOBILE',
          vendordetails : JSON.stringify(vendordetails),
        },
        body: JSON.stringify(bodyPayload),
        });

      const data = await response.json();
      console.log('saved response', data);
      await handleCreateInvoice();
      onClose();
     } catch (error) {
      Alert.alert('Error', 'Failed to save invoice.');
      console.log('error', error);
    }

  };

const handleCreateInvoice = async () => {
  if (!savedInvoiceNo.trim()) {
    Alert.alert('Missing Invoice Number', 'Please enter a valid invoice number.');
    return;
  }

  const invoiceNo = savedInvoiceNo.trim();
  const invoiceSavedDate = invoiceDate.toISOString().split('T')[0];

  // keep as a JSON string if your backend expects it in a header
       const vendordetails = selectedVendor;
//  const vendordetails = '{"value":"Chetak","slug":"chetak","jsonName":"chetak-products.json","emptyColumn":true,"databaseName":"chetakproducts"}';

  // ✅ Correct payload shape for CREATE_INVOICE
  const bodyPayload = {
    InvoiceName: vendorName,
    invoiceSavedDate,
    invoiceNo,
    tableData: tableData.map((row, idx) => ({
      qty: row.qty || '',
      itemNo: row.itemNo || '',
      description: row.description || '',
      unitPrice: row.unitPrice || '',
      extendedPrice: row.extendedPrice || '',
      pieces: row.pieces || '',
      sku: row.sku || '',
      barcode: row.barcode || '',
      posName: row.posName || '',
      department: row.department || '',
      condition: row.condition || '',
      // New field:
      ProductId: `${invoiceNo}-${idx}-${invoiceSavedDate}`, // use idx+1 if you prefer 1-based
    })),
    email: 'tusharvervebot@gmail.com',
  };

  try {
    console.log('Create_bodyPayload', bodyPayload);
    const token = await AsyncStorage.getItem('access_token');
  const icms_store = await AsyncStorage.getItem('icms_store');
    
    const vendorlist =  JSON.stringify(vendordetails)
    const response = await fetch(API_ENDPOINTS.CREATE_INVOICE, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'store': icms_store,
        'access_token': token ?? '',
        'mode': 'MOBILE',
       vendordetails: JSON.stringify(vendordetails),
      },
      body: JSON.stringify(bodyPayload),
    });

    // Read the body ONCE as text
    const raw = await response.text();

    // If not ok, surface server message (often plain text like "Already exists")
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${raw || 'No response body'}`);
    }

    // Try to parse JSON (server might return plain text)
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      console.warn('Non-JSON response from CREATE_INVOICE:', raw);
      // optional: wrap plain text so you still have something structured
      data = { message: raw };
    }

    console.log('created response', data);
    Alert.alert('Success', 'Invoice created successfully.');
    // cleardata();
  } catch (error) {
    console.log('create error', error);
    Alert.alert('Error', error.message || 'Failed to create invoice.');
  }
};

    return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Enter Invoice Number</Text>
          <TextInput
            style={styles.input}
            value={savedInvoiceNo}
            onChangeText={setSavedInvoiceNo}
            placeholder="Enter invoice number"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.label}>Invoice Date</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowInvoiceDatePicker((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.dateText}>{invoiceDate.toISOString().split('T')[0]}</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && showInvoiceDatePicker && (
            <DateTimePicker
              value={invoiceDate}
              mode="date"
              display="spinner"
              onChange={(_e, d) => d && setInvoiceDate(d)}
            />
          )}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {Platform.OS === 'android' && showInvoiceDatePicker && (
        <DateTimePicker
          value={invoiceDate}
          mode="date"
          display="default"
          onChange={(_e, d) => {
            setShowInvoiceDatePicker(false);
            if (d) setInvoiceDate(d);
          }}
        />
      )}
    </Modal>
  );
};

export default SaveInvoiceModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF4D4D',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
