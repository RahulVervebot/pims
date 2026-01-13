// src/screens/OcrScreen.js
import React, { useRef, useState, useEffect } from 'react';
// import API_ENDPOINTS from '../../../icms_config/api';
import API_ENDPOINTS, { initICMSBase, setICMSBase } from '../../../icms_config/api';
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
  TextInput,
  Platform,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'react-native-camera-kit';
import { launchImageLibrary } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import SearchTableComponent from './SearchORCTable'; // renamed below file to same name you used
import SaveInvoiceModal from './SaveInvoiceModal';
import OCRPreviewComponent from './OCRPreviewComponent';
import reportbg from '../../assets/images/report-bg.png';
import AppHeader from '../AppHeader';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
const COLORS = {
  bg: '#ffffff',
  card: '#f7f9fc',
  border: '#e6e8ef',
  primary: '#2C62FF',
  success: '#2e8b57',
  danger: '#D9534F',
  accent: '#319241',
  text: '#111',
  sub: '#777',
};

const OcrScreen = () => {
  const insets = useSafeAreaInsets();
  const getImageSource = val => (typeof val === 'number' ? val : { uri: val });
  const wasCameraOpenRef = React.useRef(false);
  const cameraRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saveInvoiceVisible, setSaveInvoiceVisible] = useState(false);
  const [invoiceList, setInvoiceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerate, setIsGenerate] = useState(false);
  const [isResponseImg, setIsResponseImg] = useState(false);
  const [vendorModalVisible, setVendorModalVisible] = useState(false);
  // Vendor dropdown related
  const [selectedValue, setSelectedValue] = useState('');
  const [selectedDatabaseName, setSelectedDatabaseName] = useState('');
  const [selectedVendorSlug, setSelectedVendorSlug] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
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
  // Dedup vendors by "value" and keep first occuitemrrence
  const uniqueVendors = React.useMemo(() => {
    const map = new Map();
    (invoiceList || []).forEach(it => {
      if (it && typeof it.value === 'string' && !map.has(it.value)) {
        map.set(it.value, it);
      }
    });
    // Optional: keep alphabetical
    return Array.from(map.values()).sort((a, b) =>
      a.value.localeCompare(b.value),
    );
  }, [invoiceList]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [access_token, setAccessToken] = useState('');
  const [buttonLoading, setButtonLoading] = useState({
    selectInvoice: false,
    generate: false,
    clear: false,
    snap: false,
    gallery: false,
  });

  useEffect(() => {
    (async () => {
    const getAllAsynce = async () => {
      initICMSBase();
 const token = await   AsyncStorage.getItem('access_token');
  setAccessToken(token);
    }
  getAllAsynce();
    })();
  
  }, [])

  const handleSearchVendor = debounce(async query => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('Api callled', query);
      console.log("API_ENDPOINTS.SEARCHVENDOR",API_ENDPOINTS.SEARCHVENDOR);

       const token = await   AsyncStorage.getItem('access_token');
           const icms_store = await   AsyncStorage.getItem('icms_store');
       console.log("AsyncStorage:",token);
      const body = {
        "q" : query
      }
        const res = await fetch(API_ENDPOINTS.SEARCHVENDOR, {
        method: 'POST',   
        headers: {
          'Content-Type': 'application/json',
          'access_token': token,
          'mode': 'MOBILE',
          'store': icms_store
        },
        body: JSON.stringify(body),
      });

      console.log('Vendor search result:', res)   
      const data = await res.json().catch(() => ({}));
      console.log("vendor data:",data);;

      if (Array.isArray(data.results)) {
        console.log('Vendor search results:', data.results);
        setSearchResults(data.results);
      } else {
        console.warn('Unexpected vendor data format:', data);
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Vendor search error:', err);
    }
  }, );

  const debouncedSearch = React.useMemo(
    () => debounce(handleSearchVendor, 300),
    [],
  );

  const handleSelectVendor = vendor => {
    setSelectedValue(vendor.value);
    setSelectedDatabaseName(vendor.databaseName);
    setSelectedVendorSlug(vendor.slug);
    setSelectedVendor(vendor);
    console.log("vendor details: ",vendor);
    setSearchQuery(vendor.value);
    setSearchResults([]);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedValue('');
    setSelectedDatabaseName('');
    setSelectedVendorSlug('');
    setSelectedVendor(null);
  };

  const handleValueChange = itemValue => {
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

  const setBtnLoading = (key, value) => {
    setButtonLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleOpenCamera = async () => {
    setBtnLoading('selectInvoice', true);
    try {
      const ok = await requestCameraPerm();
      if (!ok) {
        Alert.alert('Permission needed', 'Camera permission is required.');
        return;
      }
      setShowCamera(true);
      setIsResponseImg(true);
    } catch (error) {
      console.warn('Camera permission error:', error);
    } finally {
      setBtnLoading('selectInvoice', false);
    }
  };

  const handleCloseCamera = () => setShowCamera(false);

  const snapPhoto = async () => {
    if (!cameraRef.current) return;
    setBtnLoading('snap', true);
    try {
      const photo = await cameraRef.current.capture();
      // CameraKit returns { uri: 'file://...' }
      // If you also need base64, you can read file via RNFS (optional). For now store uri.
      setSnappedImages(prev => [...prev, { uri: photo?.uri, base64: null }]);
    } catch (e) {
      console.warn('Error snapping photo:', e);
    } finally {
      setBtnLoading('snap', false);
    }
  };

  // ====== Image Picker (gallery) ======
  const pickFromGallery = async () => {
    const perm = Platform.select({
      ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
      android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
    });
    setBtnLoading('gallery', true);
    try {
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

      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
        selectionLimit: 0,
      });
      if (res?.assets?.length) {
        const add = res.assets.map(a => ({
          uri: a.uri,
          base64: a.base64 || null,
        }));
        setSnappedImages(prev => [...prev, ...add]);
        setIsResponseImg(true);
         setShowCamera(false);
      }
    } catch (error) {
      console.warn('Gallery picker error:', error);
    } finally {
      setBtnLoading('gallery', false);
    }
  };

  // vendor sarrch
  function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  }

  // ====== Upload & Generate ======

  const handleGenerate = async () => {
    if (!selectedValue) {
      Alert.alert(
        'Select Vendor',
        'Please select a vendor before generating an invoice.',
      );
      return;
    }
    if (!selectedDatabaseName) {
      Alert.alert('Vendor missing', 'Please pick a vendor before generating.');
      return;
    }
    if (!snappedImages.length) {
      Alert.alert('No images', 'Please capture or select at least one image.');
      return;
    }

    setIsGenerate(true);
    setBtnLoading('generate', true);
    try {
      setUploadedFilenames([]);
      setUploadedImageURLs([]);
      setOcrJsons([]);

      const newFilenames = [];
      const newImageURLs = [];
        const token = await   AsyncStorage.getItem('access_token');
          const icms_store = await   AsyncStorage.getItem('icms_store');
      // Upload each image
      for (let i = 0; i < snappedImages.length; i++) {
        const img = snappedImages[i];
        console.log('image uri', img.uri);
        const fileOriginalName = `${selectedDatabaseName},jpg`;
        const formData = new FormData();
        formData.append('file', {
          uri: img.uri,
          type: 'image/jpeg',
          name: fileOriginalName,
        });
        console.log('SelectedDatabaseName', fileOriginalName);
        const uploadResponse = await fetch(API_ENDPOINTS.UPLOAD_IMAGE, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            store: `${icms_store}`,
            mode: 'MOBILE',
          'access_token': token,
          }, // user-id is missing in the headers
          body: formData,
        });
        console.log("upload responnes", uploadResponse)
        if (!uploadResponse.ok) {
          const t = await uploadResponse.text();
          throw new Error(`Upload failed (${uploadResponse.status}): ${t}`);
        }

        const uploadJson = await uploadResponse.json();
        console.log('uploadJson:', uploadJson);
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

    
      const tempOcrs = [];
      for (let i = 0; i < newFilenames.length; i++) {
        const fname = newFilenames[i];
        const ocrResponse = await fetch(API_ENDPOINTS.OCR_RESPONSE, {
          method: 'POST',
           headers: {
          'Content-Type': 'application/json',
          'access_token': token,
          'mode': 'MOBILE',
          'store': icms_store
        },
          
          body: JSON.stringify({
            data: { filename: fname, vendorName: selectedDatabaseName },
          }),
        });

        if (!ocrResponse.ok) {
          const t = await ocrResponse.text();
          throw new Error(`OCR API failed (${ocrResponse.status}): ${t}`);
        }
        const ocrJson = await ocrResponse.json();
        tempOcrs.push(ocrJson);
      }
      console.log("tempOcrs:",tempOcrs);
      setOcrJsons(tempOcrs);

      await generateInvoice(tempOcrs);
    } catch (e) {
      console.error('Upload/OCR failed:', e);
      Alert.alert('Error', e.message);
      setIsResponseImg(false);
      return;
    } finally {
      setBtnLoading('generate', false);
      setIsGenerate(false);
    }
  };

  const generateInvoice = async allOcrJson => {
    const combinedBodies = allOcrJson.map(o => o.body);
    const bodyPayload = {
      InvoiceName: selectedVendorSlug,
      ocrdata: combinedBodies,
    };
    const token = await AsyncStorage.getItem('access_token');
           const icms_store = await   AsyncStorage.getItem('icms_store');
    const response = await fetch(API_ENDPOINTS.SETPRODUCTINTABLEFROMOCR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        store: `${icms_store}`,
        'access_token': token,
        'mode': 'MOBILE',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const t = await response.text();
      throw new Error(`Request failed: ${response.status} - ${t}`);
    }
    const responseData = await response.json();
    console.log("responseData vendor:",responseData);
    setTableData(responseData);
    setIsResponseImg(false);
  };

  const handleRemoveItem = index => {
    const updated = [...tableData];
    updated.splice(index, 1);
    setTableData(updated);
  };

  const removeSnappedImage = index => {
    setSnappedImages(prev => {
      const next = prev.filter((_, idx) => idx !== index);
      if (!next.length) {
        setIsResponseImg(false);
      }
      return next;
    });
  };

  const clearAll = () => {
    setShowCamera(false);
    setSnappedImages([]);
    setOcrJsons([]);
    setTableData([]);
    setUploadedFilenames([]);
    setUploadedImageURLs([]);
    handleClearSearch();
    setIsGenerate(false);
    setIsResponseImg(false);
  };

  const handleClearAll = () => {
    setBtnLoading('clear', true);
    clearAll();
    setBtnLoading('clear', false);
  };

  const hasTableData = tableData.length > 0;

  const ButtonWithLoader = ({
    label,
    onPress,
    loading = false,
    style,
    disabled = false,
  }) => (
    <TouchableOpacity
      style={[
        styles.btn,
        style,
        (disabled || loading) && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  const openModal = image => {
    setSelectedImage(image);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  return (
    <ImageBackground
      source={getImageSource(reportbg)}
      style={styles.screen}
      resizeMode="cover"
    >
      <AppHeader
        Title="CREATE NEW INVOICE"
        backgroundType="image"
        backgroundValue={reportbg}
      ></AppHeader>
      {/* Controls Card */}

    <View style={styles.controlCard}>
  {/* Vendor Selector */}
  <View style={styles.searchWrap}>
    <View style={styles.searchInputWrapper}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search Vendor..."
        placeholderTextColor="#aaa"
        value={searchQuery}
        onChangeText={text => {
          setSearchQuery(text);
          debouncedSearch(text);
        }}
      />
      {!!searchQuery && (
        <TouchableOpacity
          style={styles.clearSearchBtn}
          onPress={handleClearSearch}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearSearchText}>×</Text>
        </TouchableOpacity>
      )}
    </View>

    {searchResults.length > 0 && (
      <View style={styles.dropdownContainer}>
        <ScrollView
          style={styles.dropdown}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {searchResults.map((vendor, index) => (
            <TouchableOpacity
              key={vendor.slug || index}
              style={[
                styles.dropdownItem,
                index % 2 === 0
                  ? styles.dropdownItemEven
                  : styles.dropdownItemOdd,
              ]}
              onPress={() => handleSelectVendor(vendor)}
            >
              <Text style={styles.dropdownText}>{vendor.value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}

  </View>

  {/* Button Row */}
  <View style={styles.btnRowInline}>
    <ButtonWithLoader
      label={showCamera ? 'Camera Active' : 'Select Invoice'}
      onPress={handleOpenCamera}
      loading={buttonLoading.selectInvoice}
      style={styles.btnPrimary}
    />

    <ButtonWithLoader
      label="Generate"
      onPress={handleGenerate}
      loading={isGenerate || buttonLoading.generate}
      style={styles.btnSuccess}
      // disabled={!snappedImages.length || !selectedValue}
    />
    {hasTableData && (
      <>
        <ButtonWithLoader
          label="Save"
          onPress={() => setSaveInvoiceVisible(s => !s)}
          style={styles.btnAccent}
          loading={false}
        />
        <ButtonWithLoader
          label="Clear"
          onPress={handleClearAll}
          loading={buttonLoading.clear}
          style={styles.btnDanger}
        />
      </>
    )}
  </View>
</View>


      {/* Snapped / Selected Images Row OR OCR Preview */}

      {isResponseImg && snappedImages.length > 0 ? (
        <ScrollView
          horizontal
          style={styles.imageRow}
          showsHorizontalScrollIndicator={false}
        >
          {snappedImages.map((item, index) => (
            <View key={`${item.uri}-${index}`} style={styles.thumbWrap}>
              <View style={styles.thumbActions}>
                <TouchableOpacity
                  style={styles.thumbClose}
                  onPress={() => removeSnappedImage(index)}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Text style={styles.thumbCloseText}>×</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => openModal(item.uri)}>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : hasTableData && uploadedFilenames.length > 0 && uploadedImageURLs.length > 0 ? (
        <ScrollView
          horizontal
          style={styles.imageRow}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.previewScroll}
        >
          <OCRPreviewComponent
            filenames={uploadedFilenames}
            vendorName={selectedDatabaseName}
            imageURIs={uploadedImageURLs}
            tableData={tableData}
            ocrurl={ocrurl}
          />
        </ScrollView>
      ) : null}

      {/* Full Image View */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.modalCloseArea}
            onPress={closeModal}
          />
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
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
            <ButtonWithLoader
              label="Snap Photo"
              onPress={snapPhoto}
              loading={buttonLoading.snap}
              style={styles.btnPrimary}
            />
            <ButtonWithLoader
              label="From Gallery"
              onPress={pickFromGallery}
              loading={buttonLoading.gallery}
              style={styles.btnPrimary}
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={handleCloseCamera}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Save modal */}
      {tableData.length > 0 && (
        <SaveInvoiceModal
          isVisible={saveInvoiceVisible}
          onClose={() => {setSaveInvoiceVisible(false);}}
          ImageURL= {uploadedImageURLs}
          vendorName={selectedVendorSlug}
          tableData={tableData}
          cleardata={clearAll}
         selectedVendor={selectedVendor}
        />
      )}
    </ImageBackground>
  );
};

export default OcrScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  controlCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
 btn: {
    flexGrow: 1,
    minWidth: "22%", // keeps uniform sizing in row
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
 btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  btnPrimary: {
    backgroundColor: "#007bff",
  },
  btnAccent: {
    backgroundColor:COLORS.accent,
  },
  btnSuccess: {
    backgroundColor: "#28a745",
  },
  btnDanger: {
    backgroundColor: "#dc3545",
  },


  imageRow: {
    minHeight: 120,
    maxHeight: 200,
    marginHorizontal: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  previewScroll: {
    alignItems: 'center',
  },
  thumbWrap: {
    marginHorizontal: 6,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingBottom: 6,
    width: 110,
  },
  thumbActions: {
    alignItems: 'flex-end',
    padding: 6,
  },
  thumbClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCloseText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
  },
  thumb: {
    width: 96,
    height: 96,
    backgroundColor: '#f1f1f1',
  },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
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
  fakeInput: {
    flexDirection: 'row',
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

  pickerWrap: {
    margin: 10,
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

  btnRowInline: {
    flexDirection: "row",
    flexWrap: "wrap", // allows wrapping if small screen
    justifyContent: "space-between",
    gap: 10, // spacing between buttons
    marginTop: 10,
  },
  searchWrap: {
    position: 'relative',
    width: '100%',
    padding: 10,
  },
  searchInputWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: COLORS.text,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: -2,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 55,
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 220,
    zIndex: 100,
   marginLeft:10,
   borderRadius:10
  },
  dropdown: {
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dropdownItemEven: {
    backgroundColor: '#ffffff', // white
  },
  dropdownItemOdd: {
    backgroundColor: '#f5f7fa', // light gray/blue shade
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
  },
});
