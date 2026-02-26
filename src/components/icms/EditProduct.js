import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  TextInput,
  Easing,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_ENDPOINTS from '../../../icms_config/api';

function EditProduct({ visible, item, InvoiceDate, InvNumber, vendorName, onClose, onSave }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const anim = Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 300 : 250,
      easing: visible ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, slideAnim]);

  if (!item) return null;

  const handleUpdateInvoice = async () => {
    setLoading(true);
    const bodydata = {
    InvoiceName: vendorName,
    InvoiceDate,
    InvoiceNo: InvNumber,
    ItemNo: item.itemNo,
    InvoiceQty: item.pieces,
    InvoiceCaseCost: item.unitPrice,
    InvoiceExtendedPrice: item.extendedPrice,
    InvoiceDescription: item.description,
    InvoiceItemNo: item.itemNo,
    ProductId: item.ProductId,
    };

    try {
      const token = await AsyncStorage.getItem('access_token');
      const icms_store = await AsyncStorage.getItem('icms_store');
      console.log("store token",token,"store name",icms_store)
console.log("check body:",bodydata);
      const res = await fetch(API_ENDPOINTS.UPDATE_INVOICE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'access_token': token ?? '',
          'mode': 'MOBILE',
          'store': icms_store ?? '',
        },
        body: JSON.stringify(bodydata),
      });

      const data = await res.json().catch(() => ({}));
      console.log('API response:', data);
      if (!res.ok) {
        console.warn('Update failed:', data);
        Alert.alert('Save Failed', data?.message || 'Unable to update item.');
        return false;
      }
      Alert.alert('Item Saved Successfully');
      return true;
    } catch (err) {
      console.error('Error updating invoice:', err);
      Alert.alert('Save Failed', 'Unable to update item.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const onPressSave = async () => {
    // If you also want to persist local edits upstream:
    const ok = await handleUpdateInvoice();
    if (!ok) return;
    onSave?.(item, true);
    onClose?.();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.titleText}>
                Edit Product
              </Text>

              <Text style={styles.labelText}>Description:</Text>
              <TextInput
                value={item.description}
                onChangeText={(text) => onSave({ ...item, description: text }, false)}
                placeholder="Description"
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.labelText}>Unit In Case:</Text>
              <TextInput
                value={String(item.pieces)}
                keyboardType="numeric"
                onChangeText={(text) => onSave({ ...item, pieces: parseFloat(text) || 0 }, false)}
                placeholder="QTY"
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.labelText}>Case Cost:</Text>
              <TextInput
                value={String(item.unitPrice)}
                keyboardType="numeric"
                onChangeText={(text) => onSave({ ...item, unitPrice: parseFloat(text) || 0 }, false)}
                placeholder="Unit Price"
                style={styles.input}
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.labelText}>Extended Price:</Text>
              <TextInput
                value={String(item.extendedPrice)}
                keyboardType="numeric"
                onChangeText={(text) => onSave({ ...item, extendedPrice: parseFloat(text) || 0 }, false)}
                placeholder="Extended Price"
                style={styles.inputLast}
                placeholderTextColor="#6b7280"
              />

              {/* Save button with loading indicator */}
              <TouchableOpacity
                onPress={onPressSave}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  loading && styles.primaryButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </TouchableOpacity>

              <View style={styles.buttonSpacer} />

              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                style={[styles.cancelButton, loading && styles.cancelButtonDisabled]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = {
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe3ea',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    color: '#111',
  },
  labelText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 5,
    color: '#1f1f1f',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    color: '#1f1f1f',
  },
  inputLast: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#1f1f1f',
  },
  primaryButton: {
    backgroundColor: '#319241',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonSpacer: { height: 8 },
  cancelButton: {
    backgroundColor: '#e53935',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
};

export default React.memo(EditProduct);
