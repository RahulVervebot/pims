// src/screens/OcrScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Text,
  Platform,
  ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'react-native-camera-kit';
import { launchImageLibrary } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import SearchTableComponent from './SearchORCTable'; // renamed below file to same name you used
import SaveInvoiceModal from './SaveInvoiceModal';
import OCRPreviewComponent from './OCRPreviewComponent';
import reportbg from '../../assets/images/report-bg.png';
import AppHeader from '../AppHeader';
import { Picker } from '@react-native-picker/picker';

const COLORS = {
  bg: '#ffffff',
  card: '#f7f9fc',
  border: '#e6e8ef',
  primary: '#2C62FF',
  success: '#2e8b57',
  danger: '#D9534F',
  accent: '#F57200',
  text: '#111',
  sub: '#777',
};

const OcrScreen = () => {
  const insets = useSafeAreaInsets();
  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });
  const cameraRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [invoiceList, setInvoiceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerate, setIsGenerate] = useState(false);
  const [isResponseImg, setIsResponseImg] = useState(false);
const [vendorModalVisible, setVendorModalVisible] = useState(false);

  // Vendor dropdown related
  const [selectedValue, setSelectedValue] = useState('');
  const [selectedDatabaseName, setSelectedDatabaseName] = useState('');
  const [selectedVendorSlug, setSelectedVendorSlug] = useState('');

  // Captured/selected images
  const [snappedImages, setSnappedImages] = useState([]); // [{uri, base64}]
  const [uploadedFilenames, setUploadedFilenames] = useState([]);
  const [uploadedImageURLs, setUploadedImageURLs] = useState([]);

  // OCR + table
  const [allocrJsons, setOcrJsons] = useState([]);
  const [tableData, setTableData] = useState([]);

  // Camera visibility
  const [showCamera, setShowCamera] = useState(false);

  // URLs
  const [ocrurl, setOcrUrl] = useState(null);
  const [ocruploadstore, setOcrUploadStore] = useState(null);
// Dedup vendors by "value" and keep first occurrence
const uniqueVendors = React.useMemo(() => {
  const map = new Map();
  (invoiceList || []).forEach((it) => {
    if (it && typeof it.value === 'string' && !map.has(it.value)) {
      map.set(it.value, it);
    }
  });
  // Optional: keep alphabetical
  return Array.from(map.values()).sort((a, b) => a.value.localeCompare(b.value));
}, [invoiceList]);
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // const temocrurl = await AsyncStorage.getItem('ocrurl');
         const temocrurl = 'https://icmsfrontend.vervebot.io'
        // const temocruploadstore = await AsyncStorage.getItem('ocruploadstore');
        const temocruploadstore = 'deepanshu_test';
        setOcrUploadStore(temocruploadstore);
        setOcrUrl(temocrurl);
        const res = await fetch(`${temocrurl}/api/getinvoicelist`);
        const data = await res.json();
        const cleaned = (data || []).filter(item => item && typeof item.value === 'string');
        const sorted = cleaned.sort((a, b) => a.value.localeCompare(b.value));
        setInvoiceList(sorted);
        console.log("sorted:",sorted);
      } catch (e) {
        console.error('Error fetching invoice list:', e?.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // ====== Vendor picker change (simple, themed) ======
  const handleValueChange = (itemValue) => {
    setSelectedValue(itemValue);
    const found = invoiceList.find(i => i.value === itemValue);
    if (found) {
      setSelectedDatabaseName(found.databaseName);
      setSelectedVendorSlug(found.slug);
    } else {
      setSelectedDatabaseName('');
      setSelectedVendorSlug('');
    }
  };

  // ====== Camera handlers (CameraKit) ======
  const requestCameraPerm = async () => {
    const perm = Platform.select({
      ios: PERMISSIONS.IOS.CAMERA,
      android: PERMISSIONS.ANDROID.CAMERA,
    });
    if (!perm) return true;
    const result = await request(perm);
    return result === RESULTS.GRANTED;
  };

  const handleOpenCamera = async () => {
    const ok = await requestCameraPerm();
    if (!ok) {
      Alert.alert('Permission needed', 'Camera permission is required.');
      return;
    }
    setShowCamera(true);
    setIsResponseImg(true);
  };

  const handleCloseCamera = () => setShowCamera(false);

  const snapPhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.capture();
      // CameraKit returns { uri: 'file://...' }
      // If you also need base64, you can read file via RNFS (optional). For now store uri.
      setSnappedImages(prev => [...prev, { uri: photo?.uri, base64: null }]);
    } catch (e) {
      console.warn('Error snapping photo:', e);
    }
  };

  // ====== Image Picker (gallery) ======
  const pickFromGallery = async () => {
    const perm = Platform.select({
      ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
    });
    if (perm) {
      const r = await request(perm);
      if (r !== RESULTS.GRANTED && Platform.OS === 'android') {
        // Older androids
        const r2 = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
        if (r2 !== RESULTS.GRANTED) {
          Alert.alert('Permission needed', 'Photos permission is required.');
          return;
        }
      } else if (r !== RESULTS.GRANTED && Platform.OS === 'ios') {
        Alert.alert('Permission needed', 'Photos permission is required.');
        return;
      }
    }

    const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, includeBase64: true, selectionLimit: 0 });
    if (res?.assets?.length) {
      const add = res.assets.map(a => ({ uri: a.uri, base64: a.base64 || null }));
      setSnappedImages(prev => [...prev, ...add]);
      setIsResponseImg(true);
    }
  };

  // ====== Upload & Generate ======
  const handleSave = async () => {
    if (!selectedValue) {
      Alert.alert('Select Vendor', 'Please select a vendor before generating an invoice.');
      return;
    }
    if (!snappedImages.length) {
      Alert.alert('No images', 'Please capture or select at least one image.');
      return;
    }

    try {
      setIsGenerate(true);
      setUploadedFilenames([]);
      setUploadedImageURLs([]);
      setOcrJsons([]);

      const newFilenames = [];
      const newImageURLs = [];
      // Upload each image
      for (let i = 0; i < snappedImages.length; i++) {
        const img = snappedImages[i];
        const formData = new FormData();
        formData.append('file', {
          uri: img.uri,
          type: 'image/jpeg',
           name: `${selectedDatabaseName},jpg`,
        });

        const uploadResponse = await fetch(`${ocrurl}/api/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data', store: `${ocruploadstore}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const t = await uploadResponse.text();
          throw new Error(`Upload failed (${uploadResponse.status}): ${t}`);
        }
    
        const uploadJson = await uploadResponse.json();
            console.log("uploadJson:",uploadJson);
        const filename = uploadJson?.filename;
        const imageURL = uploadJson?.message?.imageURL?.Location;
        if (filename && imageURL) {
          newFilenames.push(filename);
          newImageURLs.push(imageURL);
        } else {
          throw new Error(`Missing filename or imageURL in upload index ${i}`);
        }
      }

      setUploadedFilenames(newFilenames);
      setUploadedImageURLs(newImageURLs);

      // OCR each file
      const tempOcrs = [];
      for (let i = 0; i < newFilenames.length; i++) {
        const fname = newFilenames[i];
        const ocrResponse = await fetch(`${ocrurl}/api/ocr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', store: `${ocruploadstore}` },
          body: JSON.stringify({ data: { filename: fname, vendorName: selectedDatabaseName } }),
        });

        if (!ocrResponse.ok) {
          const t = await ocrResponse.text();
          throw new Error(`OCR API failed (${ocrResponse.status}): ${t}`);
        }
        const ocrJson = await ocrResponse.json();
        tempOcrs.push(ocrJson);
      }
      setOcrJsons(tempOcrs);

      await generateInvoice(tempOcrs);
    } catch (e) {
      console.error('Upload/OCR failed:', e);
      Alert.alert('Error', e.message);
      setIsGenerate(false);
      setIsResponseImg(false);
    }
  };

  const generateInvoice = async (allOcrJson) => {
    try {
      const combinedBodies = allOcrJson.map(o => o.body);
      const bodyPayload = {
        InvoiceName: selectedVendorSlug,
        ocrdata: combinedBodies,
      };

      const response = await fetch(`${ocrurl}/api/setproductintable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', store: `${ocruploadstore}` },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const t = await response.text();
        throw new Error(`Request failed: ${response.status} - ${t}`);
      }

      const responseData = await response.json();
      setTableData(responseData);
      setIsGenerate(false);
      setIsResponseImg(false);
    } catch (e) {
      setIsGenerate(false);
      setIsResponseImg(false);
      console.error('Error generating invoice:', e);
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveItem = (index) => {
    const updated = [...tableData];
    updated.splice(index, 1);
    setTableData(updated);
  };

  const clearAll = () => {
    setShowCamera(false);
    setSnappedImages([]);
    setOcrJsons([]);
    setTableData([]);
    setUploadedFilenames([]);
    setUploadedImageURLs([]);
    setSelectedValue('');
    setSelectedDatabaseName('');
    setSelectedVendorSlug('');
    setIsGenerate(false);
    setIsResponseImg(false);
  };

  const openModal = (image) => { setSelectedImage(image); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedImage(null); };

  return (
    <ImageBackground
              source={getImageSource(reportbg)}
              style={styles.screen}
              resizeMode="cover"
            >
      <AppHeader Title="CREATE NEW INVOICE"
      backgroundType="image" backgroundValue={reportbg}>
      </AppHeader>
      {/* Controls Card */}

  <View style={styles.row}>
       <ScrollView horizontal showsHorizontalScrollIndicator={false} >
  {/* Vendor selector (fake input) */}
  <View style={styles.pickerWrap}>
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.fakeInput}
      onPress={() => setVendorModalVisible(true)}
    >
      <Text style={selectedValue ? styles.inputText : styles.inputPlaceholder}>
        {selectedValue || 'Select Vendor'}
      </Text>
      <Text style={styles.caret}> ▾</Text>
    </TouchableOpacity>
  </View>

  {/* Buttons (unchanged) */}
  <View style={styles.btnRowInline}>
    <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleOpenCamera}>
      <Text style={styles.btnText}>Scan Invoice</Text>
    </TouchableOpacity>

    <TouchableOpacity style={[styles.btn, styles.btnAccent]} onPress={pickFromGallery}>
      <Text style={styles.btnText}>Pick Images</Text>
    </TouchableOpacity>

    {isGenerate ? (
      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginHorizontal: 6 }} />
    ) : (
      <TouchableOpacity style={[styles.btn, styles.btnSuccess]} onPress={handleSave}>
        <Text style={styles.btnText}>Generate</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={clearAll}>
      <Text style={styles.btnText}>Clear</Text>
    </TouchableOpacity>
  </View>
  </ScrollView>
</View>


      {/* Snapped / Selected Images Row OR OCR Preview */}
     
        {isResponseImg ? (
          
          snappedImages.map((item, index) => (
             <ScrollView horizontal style={styles.imageRow} showsHorizontalScrollIndicator={false}>
            <TouchableOpacity key={index} onPress={() => openModal(item.uri)}>
              <Image source={{ uri: item.uri }} style={styles.thumb} />
            </TouchableOpacity>
              </ScrollView>
          ))
        ) : (
          
          tableData.length > 0 && uploadedFilenames.length > 0 && uploadedImageURLs.length > 0 && (
             <ScrollView horizontal style={styles.imageRow} showsHorizontalScrollIndicator={false}>
            <OCRPreviewComponent
              filenames={uploadedFilenames}
              vendorName={selectedDatabaseName}
              imageURIs={uploadedImageURLs}
              tableData={tableData}
              ocrurl={ocrurl}
            />
             </ScrollView>
          )
           
        )}
    

      {/* Full Image View */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={closeModal} />
          <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>

      {/* Table */}
      <SearchTableComponent
        tableData={tableData}
        setTableData={setTableData}
        onRemoveRow={handleRemoveItem}
        onAddManual={() =>
          setTableData(prev => [
            ...prev,
            {
              itemNo: '',
              description: '',
              qty: '',
              unitPrice: '',
              extendedPrice: '',
              barcode: '',
              manuallyAdded: true,
              condition: 'normal',
            },
          ])
        }
      />

      {/* Camera Fullscreen */}
      {showCamera && (
        <View style={styles.cameraSheet}>
          <Camera
            ref={cameraRef}
            style={styles.cameraPreview}
            cameraType={CameraType.Back}
            zoomMode="on"
          />
          <View style={styles.cameraControls}>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={snapPhoto}>
              <Text style={styles.btnText}>Snap Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleCloseCamera}>
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Save modal */}
      {tableData.length > 0 && (
        <SaveInvoiceModal
          isVisible={false /* open via your own trigger if needed */}
          onClose={() => {}}
          vendorName={selectedVendorSlug}
          tableData={tableData}
          cleardata={clearAll}
        />
      )}
      <Modal
  visible={vendorModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setVendorModalVisible(false)}
>
  <View style={styles.modalBackdrop}>
    <TouchableOpacity style={styles.modalBackdropTouch} onPress={() => setVendorModalVisible(false)} />
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Vendor</Text>
        <TouchableOpacity onPress={() => { handleValueChange(''); setVendorModalVisible(false); }}>
          <Text style={styles.clearLink}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 380 }}>
        {uniqueVendors.map((item) => (
          <TouchableOpacity
            key={item.databaseName || item.value}
            style={[
              styles.optionRow,
              selectedValue === item.value && styles.optionRowActive,
            ]}
            onPress={() => {
              handleValueChange(item.value);
              setVendorModalVisible(false);
            }}
          >
            <Text
              style={[
                styles.optionText,
                selectedValue === item.value && styles.optionTextActive,
              ]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
            {selectedValue === item.value ? <Text style={styles.tick}>✓</Text> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </View>
</Modal>

    </ImageBackground>
  );
};

export default OcrScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  controlCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },


  btnRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  btn: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: 'transparent',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSuccess: { backgroundColor: COLORS.success },
  btnDanger: { backgroundColor: COLORS.danger },
  btnAccent: { backgroundColor: COLORS.accent },

  imageRow: {
    minHeight: 88, maxHeight: 88, margin: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingVertical: 6,
  },
  thumb: { width: 80, height: 80, marginHorizontal: 6, borderRadius: 6, backgroundColor: '#ddd' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalCloseArea: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  fullImage: { width: '90%', height: '80%', borderRadius: 10 },

  cameraSheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
  },
  cameraPreview: {
    flex: 1,
  },
  cameraControls: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
    screen: {
    flex: 1,
  },
  row: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
flexWrap: 'wrap', // wraps on small screens
 margin: 10,
},

fakeInput:{
flexDirection: 'row'
},
label: {
  fontSize: 12,
  color: COLORS.sub,
  marginBottom: 6,
  fontWeight: '600',
},

pickerContainer: {
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 8,
  backgroundColor: '#fff',
  justifyContent: 'center',
  overflow: 'hidden',
},

picker: {
  width: '100%',
},

btnRowInline: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0, // keep buttons compact, don’t stretch
},
pickerWrap: {
  margin: 10
},
label: {
  fontSize: 12,
  color: COLORS.sub,
  marginBottom: 6,
  fontWeight: '600',
},
fakeInput: {
  height: 44,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: 8,
  backgroundColor: '#fff',
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
inputText: {
  color: COLORS.text,
  fontWeight: '600',
},
inputPlaceholder: {
  color: '#9aa0a6',
  fontWeight: '500',
},
caret: {
  fontSize: 16,
  color: COLORS.sub,
},

// Modal
modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.35)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
},
modalBackdropTouch: {
  ...StyleSheet.absoluteFillObject,
},
modalCard: {
  width: '100%',
  maxWidth: 520,
  backgroundColor: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: COLORS.border,
},
modalHeader: {
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
modalTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: COLORS.text,
},
clearLink: {
  color: COLORS.danger,
  fontWeight: '700',
},
optionRow: {
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f1f2f6',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
optionRowActive: {
  backgroundColor: '#f0f5ff',
},
optionText: {
  color: COLORS.text,
  fontSize: 14,
  flexShrink: 1,
  paddingRight: 10,
},
optionTextActive: {
  color: COLORS.primary,
  fontWeight: '700',
},
tick: { fontSize: 16, color: COLORS.primary },

// Keep your existing row + button styles
row: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
},
btnRowInline: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
},


});
