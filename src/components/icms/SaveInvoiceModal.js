import React, { useState,useCallback } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_ENDPOINTS from '../../../config/api';
const SaveInvoiceModal = ({ isVisible, onClose, vendorName, tableData,cleardata }) => {
  const [savedInvoiceNo, setSavedInvoiceNo] = useState('');
   const baseurl = "https://icmsfrontend.vervebot.io";
     const [ocrurl, setOcrUrl] = useState(null);
     const [ocrsavestore, setOcrSaveStore] = useState(null);
   useFocusEffect(
    useCallback(() => {
      const fetchInitialData = async () => {
        try {
          // Retrieve any needed tokens/urls (if used by fetchManageOrderReport)
          const temocrurl = await AsyncStorage.getItem('ocrurl');
          const temocruploadstore = await AsyncStorage.getItem('ocruploadstore');
          setOcrSaveStore(temocruploadstore);
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
    

    const bodyPayload = {
      InvoiceName: vendorName,
      InvoiceDate: new Date().toISOString().split('T')[0],
      InvoiceNumber: '',
      InvoicePage: '',
      InvoiceData: tableData.map((row) => ({
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
      })),
      SavedDate: new Date().toISOString().split('T')[0],
      SavedInvoiceNo: savedInvoiceNo,
      Exist: false,
    };

    try {
      console.log("bodyPayload",bodyPayload);
      const response = await fetch(API_ENDPOINTS.SAVE_INVOICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          store: `${ocrsavestore}`,
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

    const bodyPayload = {
      InvoiceName: vendorName,
      invoiceSavedDate: new Date().toISOString().split('T')[0],
      invoiceNo: savedInvoiceNo,
      tableData: tableData.map((row) => ({
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
      })),
    };

    try {
      const response = await fetch(`${ocrurl}/api/invoice/create_data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          store: `${ocrsavestore}`,
        },
        body: JSON.stringify(bodyPayload),
      });
      
      const data = await response.json();
      Alert.alert('Success', 'Invoice Create successfully.');
      console.log('created response', data);
      cleardata();
    } catch (error) {
      Alert.alert('Error', 'Failed to save invoice.');
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
    marginBottom: 20,
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
