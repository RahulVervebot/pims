import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_ENDPOINTS, { initICMSBase, setICMSBase } from '../../../icms_config/api';


const OCRPreviewComponent = ({
  filenames,
  vendorName,
  imageURIs,
  tableData,
  ocrurl,
}) => {

  const [highlightedImages, setHighlightedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  useEffect(() => {
    const generatePreview = async () => {
      initICMSBase();
      //   const imageURLs = imageURIs.map((uri) => uri);
 
      // const missingDataList = tableData.map((row) => row.description);
      const missingDataList = tableData.map(row =>
        `${row.itemNo || ''} ${row.description || ''} ${row.unitPrice || ''} ${
          row.extendedPrice || ''
        }`.trim(),
      );

      const payload = {
        data: {
          filename: filenames,
          vendorName: vendorName,
          imageURLs: imageURIs,
          missingDataList: missingDataList,
        },
      };
      console.log('payload', payload);
      try {
        setIsLoadingPreview(true);
        setPreviewError('');
            const token = await AsyncStorage.getItem('access_token');
                   const icms_store = await AsyncStorage.getItem('icms_store');
        const response = await fetch(API_ENDPOINTS.PREVIEW_OCR, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
         'store': icms_store,
        'access_token': token,
        'mode': 'MOBILE',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OCR Preview API Error:', errorText);
          Alert.alert('Error', 'Failed to fetch OCR preview.');
          return;
        }

        const previewResult = await response.json();
        setHighlightedImages(previewResult.highlightedImages || []);
        console.log('🟢 OCR Preview Response',previewResult);
      } catch (error) {
        console.error('OCR Preview Failed:', error);
        Alert.alert('Error', error.message);
        setPreviewError('Unable to prepare preview');
      }
      setIsLoadingPreview(false);
    };

    generatePreview();
  }, [filenames, vendorName, imageURIs, tableData, ocrurl]);
  const openModal = image => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const handleDismissPreview = index => {
    setHighlightedImages(prev => prev.filter((_, idx) => idx !== index));
  };
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>OCR Preview</Text>
        {isLoadingPreview && <ActivityIndicator size="small" color="#2C62FF" />}
      </View>
      <View style={styles.cardBody}>
        {isLoadingPreview ? (
          <Text style={styles.infoText}>Preparing highlighted areas...</Text>
        ) : highlightedImages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewRow}
          >
            {highlightedImages.map((img, index) => (
              <View key={index} style={styles.previewTile}>
                <View style={styles.previewTileHeader}>
                  <TouchableOpacity
                    style={styles.previewClose}
                    onPress={() => handleDismissPreview(index)}
                    hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
                  >
                    <Text style={styles.previewCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => openModal(img.base64Image)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: img.base64Image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.previewLabel}>Page {index + 1}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.infoText}>
            {previewError || 'Preview will appear once OCR is complete.'}
          </Text>
        )}
      </View>
      {/* Modal to preview selected image */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeArea} onPress={closeModal} />
          <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
};

export default OCRPreviewComponent;

const styles = StyleSheet.create({
  card: {
    flexGrow: 0,
    minWidth: 200,
    maxWidth: 260,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e4ef',
    alignSelf: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  cardBody: {
    minHeight: 90,
    justifyContent: 'center',
    paddingTop: 14,
  },
  infoText: {
    color: '#4c4c4c',
    fontSize: 13,
    fontStyle: 'italic',
  },
  previewRow: {
    alignItems: 'center',
    paddingRight: 8,
    paddingBottom: 6,
  },
  previewTile: {
    width: 82,
    marginRight: 10,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#f9fbff',
    borderWidth: 1,
    borderColor: '#dfe6fb',
    overflow: 'hidden',
    paddingBottom: 6,
  },
  previewTileHeader: {
    alignItems: 'flex-end',
    padding: 4,
  },
  previewImage: {
    width: '100%',
    height: 68,
  },
  previewLabel: {
    paddingTop: 4,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#2C62FF',
  },
  previewClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  fullImage: {
    width: '90%',
    height: '80%',
    borderRadius: 10,
  },
});
