import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Switch,
  ScrollView
} from 'react-native';
import { getUOMList, VendorList, TaxList, getTopCategories } from '../functions/product-function';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from "react-native-vector-icons/MaterialIcons";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { Camera, CameraType } from "react-native-camera-kit";
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CreateProductModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');                // list_price (sale price)
  const [cost, setCost] = useState('');                  // standard_price (unit cost)
  const [casecost, setCaseCost] = useState('');          // case_cost
  const [unitc, setUnitc] = useState('');                // unit_in_case
  const [qtyavailable, setQtyAvailable] = useState('');  // qty_available

  const [toWeight, setToWeight] = useState(false);
  const [availablePOS, setAvailablePOS] = useState(false);
  const [isEBT, setIsEBT] = useState(false);
  const [ewic, setEwic] = useState(false);
  const [otc, setOtc] = useState(false);

  const [category, setCategory] = useState(''); // categ_id
  const [selectedTaxId, setSelectedTaxId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState(''); // picked from search suggestions
  const [selectedUomId, setSelectedUomId] = useState('');

  // Vendor search
  const [searchText, setSearchText] = useState('');
  const searchDebounceRef = useRef(null);
  const [vendorList, setVendorList] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const cameraRef = useRef(null);

  const [imgBase64, setImgBase64] = useState('');
  const [imgMime, setImgMime] = useState('image/jpeg');

  const [allCats, setAllCats] = useState([]);
  const [taxList, setTaxList] = useState([]);
  const [uomList, setUomList] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([
          AsyncStorage.getItem('storeurl'),
          AsyncStorage.getItem('access_token'),
        ]);
        if (!s || !t) {
          Alert.alert('Missing config', 'store_url or access_token not found.');
          return;
        }
        setStoreUrl(s);
        setToken(t);
      } catch {
        Alert.alert('Error', 'Failed to load credentials.');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const perm = Platform.OS === "ios" ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
      const result = await request(perm);
      setHasCameraPermission(result === RESULTS.GRANTED);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [UOMLIST, cats, taxes] = await Promise.all([
          getUOMList(),
          getTopCategories(),
          TaxList(),
        ]);
        setAllCats(Array.isArray(cats) ? cats : []);
        setTaxList(Array.isArray(taxes) ? taxes : []);
        setUomList(Array.isArray(UOMLIST) ? UOMLIST : []);
      } catch (e) {
        console.log("Failed to fetch master lists:", e?.message);
      }
    })();
  }, []);

  // Debounced vendor search
  const handleVendorSearch = (text) => {
    setSearchText(text);
    setSelectedVendorId(''); // clear previously selected id when typing
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (text.trim().length < 3) {
      setVendorList([]);
      setShowVendorDropdown(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const vendors = await VendorList(text);
        const normalized = Array.isArray(vendors)
          ? vendors.map(v => ({
              id: String(v.id ?? v.vendorId ?? v._id ?? ''),
              name: String(v.name ?? v.vendorName ?? ''),
            }))
          : [];
        setVendorList(normalized);
        setShowVendorDropdown(true);
      } catch (err) {
        console.log('Vendor search failed:', err?.message);
        setVendorList([]);
        setShowVendorDropdown(false);
      }
    }, 300);
  };

  const pickVendor = (vendor) => {
    setSelectedVendorId(String(vendor.id));
    setSearchText(vendor.name);
    setShowVendorDropdown(false);
  };

  const imageDataUri = useMemo(
    () => (imgBase64 ? `data:${imgMime};base64,${imgBase64}` : ''),
    [imgBase64, imgMime]
  );

  const priceNumber = useMemo(() => {
    const n = parseFloat(price);
    return Number.isFinite(n) ? n : NaN;
  }, [price]);

  const costNumber = useMemo(() => {
    const n = parseFloat(cost);
    return Number.isFinite(n) ? n : NaN;
  }, [cost]);

  const unitcNumber = useMemo(() => {
    const n = parseInt(unitc, 10);
    return Number.isFinite(n) ? n : NaN;
  }, [unitc]);

  const caseCostNumber = useMemo(() => {
    const n = parseFloat(casecost);
    return Number.isFinite(n) ? n : NaN;
  }, [casecost]);

  const qtyAvailableNumber = useMemo(() => {
    const n = parseFloat(qtyavailable);
    return Number.isFinite(n) ? n : NaN;
  }, [qtyavailable]);

  const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (value) setBarcode(value);
    setScannerVisible(false);
  };

  const validate = () => {
    if (!name.trim()) return 'Please enter product name.';
    if (!price.trim()) return 'Please enter price.';
    if (!Number.isFinite(priceNumber) || priceNumber < 0) return 'Price must be a non-negative number.';
    if (casecost && (!Number.isFinite(caseCostNumber) || caseCostNumber < 0)) return 'Case cost must be a non-negative number.';
    if (unitc && (!Number.isFinite(unitcNumber) || unitcNumber <= 0)) return 'Units in case must be a positive integer.';
    if (qtyavailable && (!Number.isFinite(qtyAvailableNumber) || qtyAvailableNumber < 0)) return 'Qty available must be non-negative.';
    return null;
  };

  const resetForm = () => {
    setName(''); setSize(''); setPrice(''); setCost(''); setCategory('');
    setImgBase64(''); setImgMime('image/jpeg');
    setCaseCost(''); setUnitc(''); setQtyAvailable('');
    setToWeight(false); setAvailablePOS(false); setIsEBT(false); setEwic(false); setOtc(false);
    setSelectedTaxId(''); setSelectedVendorId(''); setSelectedUomId('');
    setBarcode(''); setSearchText(''); setVendorList([]); setShowVendorDropdown(false);
  };

  const pickFromGallery = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 1280,
      });
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        Alert.alert('Image', 'Could not read image data.');
        return;
      }
      setImgBase64(asset.base64);
      setImgMime(asset.type || 'image/jpeg');
    } catch (e) {
      Alert.alert('Image', e.message || 'Failed to pick image.');
    }
  };

  const takePhoto = async () => {
    try {
      const res = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
        maxWidth: 1280,
        maxHeight: 1280,
        saveToPhotos: false,
      });
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (!asset?.base64) {
        Alert.alert('Camera', 'Could not read image data from camera.');
        return;
      }
      setImgBase64(asset.base64);
      setImgMime(asset.type || 'image/jpeg');
    } catch (e) {
      Alert.alert('Camera', e.message || 'Failed to take photo.');
    }
  };

  // Calculate button: unit cost = casecost / unitc
  const calculateUnitCost = () => {
    // allow calc even if price missing
    if (!Number.isFinite(caseCostNumber) || !Number.isFinite(unitcNumber) || unitcNumber <= 0) {
      Alert.alert('Fix inputs', 'Enter valid Case Cost and Units in Case.');
      return;
    }
    const unitCost = caseCostNumber / unitcNumber;
    setCost(unitCost.toFixed(2));
  };

  const handleSubmit = async () => {
    try {
      const msg = validate();
      if (msg) {
        Alert.alert('Missing info', msg);
        return;
      }
      setSubmitting(true);

      // Build payload (list_price = price, standard_price = cost)
      const body = {
        name: name.trim(),
        barcode: barcode || undefined,
        list_price: Number.isFinite(costNumber) ? costNumber : undefined, // ✅ unit cost                               
        standard_price: priceNumber, // ✅ sale price
        detailed_type: 'product',
        categ_id: category ? Number(category) : undefined,
        uom_id: selectedUomId ? Number(selectedUomId) : undefined,
        vendorcode: selectedVendorId ? Number(selectedVendorId) : undefined, // from search selection
        size: size?.trim() || undefined,
        taxes_id: selectedTaxId ? [Number(selectedTaxId)] : [],
        is_ebt_product: !!isEBT,
        available_in_pos: !!availablePOS,
        to_weight: !!toWeight,
        case_cost: Number.isFinite(caseCostNumber) ? caseCostNumber : undefined,
        unit_in_case: Number.isFinite(unitcNumber) ? unitcNumber : undefined,
        qty_available: Number.isFinite(qtyAvailableNumber) ? qtyAvailableNumber : undefined,
        image: imgBase64 || '',           // raw base64
        ewic: !!ewic,
        otc: !!otc,
      };

      const res = await fetch(`${storeUrl}/pos/app/product/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': token,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to create product');

      Alert.alert('Success', 'Product created successfully');
      onCreated?.(data || body);
      resetForm();
      onClose?.();
    } catch (e) {
      console.log('Create product error:', e);
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.centered}
        >
          <View style={styles.sheet}>
            <Text style={styles.title}>Create Product</Text>

            {/* Image */}
            <View style={styles.rowBetween}>
              <TouchableOpacity style={[styles.smallBtn, styles.ghost]} onPress={pickFromGallery}>
                <Text style={styles.ghostText}>Pick from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={takePhoto}>
                <Text style={styles.smallBtnText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
            {!!imgBase64 && (
              <Image
                source={{ uri: `data:${imgMime};base64,${imgBase64}` }}
                style={styles.preview}
                resizeMode="cover"
              />
            )}

            {/* Row 1: Name | Size */}
            <View style={styles.rowGap}>
              <TextInput style={styles.inputCol} placeholder="Name *" placeholderTextColor={PLACEHOLDER} value={name} onChangeText={setName} />
              <TextInput style={styles.inputCol} placeholder="Size (e.g., 500ml)" placeholderTextColor={PLACEHOLDER} value={size} onChangeText={setSize} />
            </View>

            {/* Barcode (full width with scan) */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.inputWithRightIcon}
                placeholder="Barcode"
                placeholderTextColor={PLACEHOLDER}
                value={barcode}
                onChangeText={setBarcode}
              />
              <TouchableOpacity
                style={styles.inputRightIcon}
                onPress={() => hasCameraPermission ? setScannerVisible(true) :
                  Alert.alert('Camera Permission','Enable camera access in settings to scan.')}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Icon name="camera" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Row 2: Price | Unit Cost */}
            <View style={styles.rowGap}>
              <TextInput
                style={styles.inputCol}
                placeholder="Price*"
                placeholderTextColor={PLACEHOLDER}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.inputCol}
                placeholder="Unit Cost"
                placeholderTextColor={PLACEHOLDER}
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Row 3: Case Cost | Units in Case + Calculate */}
            <View style={styles.rowGap}>
              <TextInput
                style={styles.inputCol}
                placeholder="Case Cost"
                placeholderTextColor={PLACEHOLDER}
                value={casecost}
                keyboardType="decimal-pad"
                onChangeText={setCaseCost}
              />
      
                <TextInput
                  style={[styles.inputCol, { marginTop: 0 }]}
                  placeholder="Units in Case"
                  placeholderTextColor={PLACEHOLDER}
                  value={unitc}
                  keyboardType="number-pad"
                  onChangeText={setUnitc}
                />
                <TouchableOpacity style={styles.calcBtn} onPress={calculateUnitCost}>
                  <Text style={styles.calcBtnText}>Calculate</Text>
                </TouchableOpacity>
          
            </View>

            {/* Row 4: Qty Available (full) */}
      
            <TextInput
              style={styles.input}
              placeholder="Qty Available"
              placeholderTextColor={PLACEHOLDER}
              value={qtyavailable}
              onChangeText={setQtyAvailable}
              keyboardType="decimal-pad"
            />

            {/* Row 5: Category | Vendor Search | UoM */}
            <View style={styles.rowGap}>
              <View style={styles.pickerCol}>
                <Picker selectedValue={category} onValueChange={setCategory}>
                  <Picker.Item label="Select Category" value="" />
                  {allCats.map((cat) => (
                    <Picker.Item
                      key={String(cat.id ?? cat._id)}
                      label={String(cat.name ?? cat.category)}
                      value={String(cat.id ?? cat._id)}
                    />
                  ))}
                </Picker>
              </View>

              {/* Vendor search with suggestions */}
              <View style={[styles.vendorBox]}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="Search vendor (min 3 chars)"
                  placeholderTextColor={PLACEHOLDER}
                  value={searchText}
                  onChangeText={handleVendorSearch}
                  autoCapitalize="none"
                />
                {showVendorDropdown && vendorList.length > 0 && (
                  <View style={styles.vendorDropdown}>
                    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                      {vendorList.slice(0, 20).map(v => (
                        <TouchableOpacity key={v.id} style={styles.vendorItem} onPress={() => pickVendor(v)}>
                          <Text numberOfLines={1} style={styles.vendorText}>{v.name}</Text>
                          <Text style={styles.vendorSub}>ID: {v.id}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {!!selectedVendorId && (
                  <Text style={styles.selectedVendorNote}>Selected Vendor ID: {selectedVendorId}</Text>
                )}
              </View>


            </View>

            {/* Row 6: Tax */}
            <View style={styles.rowGap}>
              <View style={styles.pickerCol}>
                <Picker selectedValue={selectedTaxId} onValueChange={setSelectedTaxId}>
                  <Picker.Item label="Select Tax" value="" />
                  {taxList.map((tax) => (
                    <Picker.Item key={String(tax.id)} label={String(tax.name)} value={String(tax.id)} />
                  ))}
                </Picker>
              </View>
                           <View style={styles.pickerCol}>
                <Picker selectedValue={selectedUomId} onValueChange={setSelectedUomId}>
                  <Picker.Item label="Select UoM" value="" />
                  {uomList.map((u) => (
                    <Picker.Item key={String(u.id)} label={String(u.name)} value={String(u.id)} />
                  ))}
                </Picker>
              </View>

            </View>

            {/* Row 7: Switches */}
            <Text style={styles.subTitle}>Options</Text>
            <View style={styles.switchGrid}>
              <View style={styles.switchCell}>
                <Text style={styles.switchLabel}>POS</Text>
                <Switch value={availablePOS} onValueChange={setAvailablePOS} />
              </View>
              <View style={styles.switchCell}>
                <Text style={styles.switchLabel}>To Weight</Text>
                <Switch value={toWeight} onValueChange={setToWeight} />
              </View>
              <View style={styles.switchCell}>
                <Text style={styles.switchLabel}>EBT</Text>
                <Switch value={isEBT} onValueChange={setIsEBT} />
              </View>
            </View>
            <View style={styles.switchGrid}>
              <View style={styles.switchCell}>
                <Text style={styles.switchLabel}>EWIC</Text>
                <Switch value={ewic} onValueChange={setEwic} />
              </View>
              <View style={styles.switchCell}>
                <Text style={styles.switchLabel}>OTC</Text>
                <Switch value={otc} onValueChange={setOtc} />
              </View>
              <View style={[styles.switchCell, { opacity: 0 }]} />
            </View>

            {/* Actions */}
            <View style={styles.rowRight}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onClose} disabled={submitting}>
                <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator /> : <Text style={styles.btnText}>Create</Text>}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scanner */}
      <Modal visible={scannerVisible} animationType="slide">
        {hasCameraPermission ? (
          <View style={{ flex: 1 }}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              cameraType={CameraType.Back}
              scanBarcode
              onReadCode={onReadCode}
            />
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setScannerVisible(false)}>
                <Text style={styles.controlText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={{ color: "red" }}>
              Camera permission denied. Please allow access in settings.
            </Text>
            <TouchableOpacity style={[styles.controlBtn, { marginTop: 16 }]} onPress={() => setScannerVisible(false)}>
              <Text style={styles.controlText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </>
  );
}

const THEME = { primary: '#2C1E70', secondary: '#319241' };
const PLACEHOLDER = '#9AA3AF';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000077' },
  centered: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'flex-end'
  },
  sheet: {
    width: '100%', backgroundColor: '#fff',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16
  },
  title: { fontSize: 18, fontWeight: '700', color: THEME.primary, marginBottom: 10 },
  subTitle: { marginTop: 12, marginBottom: 6, fontWeight: '700', color: '#333' },

  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, color: '#333', marginTop: 10
  },
  inputFlex: {
    flex: 1,
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, color: '#333', backgroundColor: '#fff'
  },

  preview: { width: '100%', height: 150, borderRadius: 8, marginTop: 10, backgroundColor: '#f4f4f4' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'center' },
  rowRight: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },

  smallBtn: { backgroundColor: THEME.secondary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  ghostText: { color: '#333', fontWeight: '700' },

  calcBtn: { backgroundColor: THEME.secondary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  calcBtnText: { color: '#fff', fontWeight: '700' },

  btn: { backgroundColor: THEME.secondary, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  btnGhostText: { color: '#333' },

  camera: { flex: 1 },
  controls: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  inputWrapper: { position: 'relative', marginTop: 10 },
  inputWithRightIcon: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingLeft: 12, paddingRight: 44, color: '#333', backgroundColor: '#fff',
  },
  inputRightIcon: {
    position: 'absolute', right: 12, top: '50%', marginTop: -14,
    justifyContent: 'center', alignItems: 'center', height: 28, width: 28,
  },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 10, overflow: 'hidden',
  },
  permissionDenied: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  rowGap: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  inputCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#333',
    backgroundColor: '#fff'
  },
  pickerCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  colWithButton: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
  },
  switchGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  switchCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  // Vendor search UI
  vendorBox: { flex: 1, position: 'relative' },
  vendorDropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  vendorItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  vendorText: { color: '#111', fontWeight: '600' },
  vendorSub: { color: '#666', fontSize: 12, marginTop: 2 },
  selectedVendorNote: { fontSize: 12, color: '#2c1e70', marginTop: 6 },
});
