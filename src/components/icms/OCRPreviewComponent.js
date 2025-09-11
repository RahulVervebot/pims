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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_ENDPOINTS from '../../../config/api';

const OCRPreviewComponent = ({
  filenames,
  vendorName,
  imageURIs,
  tableData,
  ocrurl,
}) => {
  const [ocruploadstore, setOcrUploadStore] = useState(null);
  const [highlightedImages, setHighlightedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  useEffect(() => {
    const generatePreview = async () => {
      //   const imageURLs = imageURIs.map((uri) => uri);
      const temocruploadstore = await AsyncStorage.getItem('ocruploadstore');
      setOcrUploadStore("deepanshu_test");
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
        const response = await fetch(API_ENDPOINTS.PREVIEW_OCR, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            store: "deepanshu_test",
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
        console.log('🟢 OCR Preview Response');
      } catch (error) {
        console.error('OCR Preview Failed:', error);
        Alert.alert('Error', error.message);
      }
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
  return (
    <View style={styles.container}>
      {highlightedImages.length > 0 ? (
        <ScrollView horizontal>
          {highlightedImages.map((img, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => openModal(img.base64Image)}
            >
              <Image
                source={{ uri: img.base64Image }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.text}>Wait for Inv Preview...</Text>
      )}
      {/* Modal to preview selected image */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeArea} onPress={closeModal} />
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
  text: {
    color: '#333',
    fontSize: 14,
    fontStyle: 'italic',
  },
  previewImage: {
    width: 80,
    height: 80,
    marginHorizontal: 5,
    borderWidth: 1,
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
  fullImage: {
    width: '90%',
    height: '80%',
    borderRadius: 10,
  },
});
