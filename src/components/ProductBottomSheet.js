import React, {
  forwardRef, useImperativeHandle, useRef, useState,
  useMemo, useEffect, useContext
} from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Platform, Modal, Switch
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Camera, CameraType } from 'react-native-camera-kit';
import { getTopCategories, VendorList, TaxList } from '../functions/product-function';
import { CartContext } from '../context/CartContext';
import { PrintContext } from '../context/PrintContext';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = { primary: '#2C1E70', secondary: '#319241', price: '#27ae60' };

/** Little modal for multi-select list with checkboxes */
const MultiSelectModal = ({ visible, title, options, selectedIds, onChange, onClose }) => {
  const toggle = (id) => {
    const idStr = String(id);
    if (selectedIds.includes(idStr)) {
      onChange(selectedIds.filter(x => x !== idStr));
    } else {
      onChange([...selectedIds, idStr]);
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={msStyles.container}>
        <Text style={msStyles.title}>{title}</Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {options.map(opt => {
            const idStr = String(opt.id);
            const checked = selectedIds.includes(idStr);
            return (
              <TouchableOpacity key={idStr} style={msStyles.row} onPress={() => toggle(idStr)}>
                <Text style={msStyles.label}>{opt.name}</Text>
                <Icon name={checked ? 'check-box' : 'check-box-outline-blank'} size={22} color="#333" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={msStyles.footer}>
          <TouchableOpacity style={[msStyles.btn, msStyles.clear]} onPress={() => onChange([])}>
            <Text style={msStyles.btnTextClear}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={msStyles.btn} onPress={onClose}>
            <Text style={msStyles.btnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ProductBottomSheet = forwardRef(({ onAddToCart, onAddToPrint }, ref) => {
  const sheetRef = useRef(null);
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const { print, addToPrint, increasePrintQty, decreasePrintQty } = useContext(PrintContext);

  const [storeUrl, setStoreUrl] = useState('');
  const [token, setToken] = useState('');

  const [product, setProduct] = useState(null);
  const [userrole, setUserRole] = useState('');
  // Editable fields (→ new update body)
  const [id, setID] = useState('');                 // id
  const [name, setName] = useState('');             // new_name
  const [size, setSize] = useState('');             // size
  const [barcodeOriginal, setBarcodeOriginal] = useState('');
  const [newBarcode, setNewBarcode] = useState(''); // barcode

  const [price, setPrice] = useState('');           // new_price
  const [cost, setCost] = useState('');             // new_std_price
  const [qtyavailable, setQtyAvailable] = useState('');   // new_qty
  const [unitc, setUnitc] = useState('');                 // unit_in_case
  const [casecost, setCaseCost] = useState('');           // case_cost

  const [categoryId, setCategoryId] = useState('');       // categ_id
  const [selectedVendorIds, setSelectedVendorIds] = useState([]); // vendorcode[]
  const [selectedTaxIds, setSelectedTaxIds] = useState([]);       // taxes_id[]

  const [availablePOS, setAvailablePOS] = useState(false);
  const [toWeight, setToWeight] = useState(false);
  const [isEBT, setIsEBT] = useState(false);
  const [ewic, setEwic] = useState(false);
  const [otc, setOtc] = useState(false);

  // Lists
  const [allCats, setAllCats] = useState([]);
  const [vendorList, setVendorList] = useState([]);
  const [taxList, setTaxList] = useState([]);

  // Image (raw base64; send "" if unchanged)
  const [imgBase64, setImgBase64] = useState('');
  const [imgMime, setImgMime] = useState('image/jpeg');

  // Scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  // Multi-select modals
  const [vendorModal, setVendorModal] = useState(false);
  const [taxModal, setTaxModal] = useState(false);

  // UI
  const [submitting, setSubmitting] = useState(false);

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
      try {
        const perm = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        const result = await request(perm);
          const userRole =    await AsyncStorage.getItem('userRole');
  setUserRole(userRole);
        setHasCameraPermission(result === RESULTS.GRANTED);
      } catch {
        setHasCameraPermission(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [cats, vendors, taxes] = await Promise.all([
          getTopCategories(),
          VendorList(),
          TaxList(),
        ]);
        const normCats = Array.isArray(cats) ? cats.map(c => ({
          id: String(c.id ?? c._id ?? ''),
          name: String(c.name ?? c.category ?? ''),
        })) : [];
        const normVendors = Array.isArray(vendors) ? vendors.map(v => ({
          id: String(v.id ?? v.vendorId ?? v._id ?? ''),
          name: String(v.name ?? v.vendorName ?? ''),
        })) : [];
        const normTaxes = Array.isArray(taxes) ? taxes.map(t => ({
          id: String(t.id ?? t.taxId ?? t._id ?? ''),
          name: String(t.name ?? t.taxName ?? ''),
        })) : [];
        setAllCats(normCats);
        setVendorList(normVendors);
        setTaxList(normTaxes);
      } catch (e) {
        console.log('Failed to fetch lists:', e?.message);
      }
    })();
  }, []);

  useImperativeHandle(ref, () => ({ 
    open: (p) => {
      setProduct(p || null);
      if (p) {
        // defaults from GET product payload
        setID(String(p.product_id ?? p.id ?? ''));
        setName(p.productName ?? p.name ?? '');         // new_name
        setSize(p.productSize ?? p.size ?? '');         // size
        setBarcodeOriginal(p.barcode ?? p.default_code ?? '');
        setNewBarcode(''); // new scan/type

        setPrice(p.salePrice != null ? String(p.salePrice) : '');   // new_price
        setCost(p.costPrice != null ? String(p.costPrice) : '');    // new_std_price
        setQtyAvailable(''); // not provided in GET; user can set

        setUnitc(p.unit_in_case != null ? String(p.unit_in_case) : '');
        setCaseCost(p.case_cost != null ? String(p.case_cost) : '');

        setCategoryId(p.categoryId != null ? String(p.categoryId) : '');

        // taxes -> ids
        const tIds = Array.isArray(p.productTaxes) ? p.productTaxes.map(t => String(t.taxId)) : [];
        setSelectedTaxIds(tIds);

        // vendors not in payload example; keep what product may carry
        const vIds = Array.isArray(p.vendorcode) ? p.vendorcode.map(v => String(v)) : [];
        setSelectedVendorIds(vIds);

        setAvailablePOS(!!p.availableInPos);
        setIsEBT(!!p.isEbtProduct);
        setEwic(!!p.ewic);
        setOtc(!!p.otc);
        setToWeight(!!p.to_weight);

        setImgBase64('');
        setImgMime('image/jpeg');
      }
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

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

  const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (value) setNewBarcode(value);
    setScannerVisible(false);
  };

  const calculateUnitCost = () => {
    const cc = parseFloat(casecost);
    const uc = parseInt(unitc, 10);
    if (!Number.isFinite(cc) || !Number.isFinite(uc) || uc <= 0) {
      Alert.alert('Fix inputs', 'Enter valid Case Cost and Units in Case.');
      return;
    }
    setCost((cc / uc).toFixed(2)); // sets new_std_price
  };

  const idsToLabelSummary = (ids, options) => {
    if (!ids?.length) return 'Select...';
    const names = ids
      .map(id => options.find(o => String(o.id) === String(id))?.name)
      .filter(Boolean);
    if (!names.length) return `${ids.length} selected`;
    return names.length > 2 ? `${names.slice(0,2).join(', ')} +${names.length-2}` : names.join(', ');
  };

  const handleUpdate = async () => {
    if (!id) {
      Alert.alert('Error', 'Missing product id.');
      return;
    }
    const body = {
      id: Number(id),
      new_price: (cost ?? '').trim(),          // strings to mirror your API
      new_std_price: (price ?? '').trim(),
      new_qty: (qtyavailable ?? '').trim(),
      new_name: (name ?? '').trim(),
      size: (size ?? '').trim(),
      unit_in_case: (unitc ?? '').trim(),
      case_cost: (casecost ?? '').trim(),
      categ_id: categoryId ? Number(categoryId) : undefined,
      vendorcode: selectedVendorIds.map(v => Number(v)),
      available_in_pos: String(!!availablePOS),
      taxes_id: selectedTaxIds.map(t => Number(t)),
      image: imgBase64 || '',
      is_ebt_product: String(!!isEBT),
      ewic: String(!!ewic),
      otc: String(!!otc),
      to_weight: String(!!toWeight),
      barcode: (newBarcode?.trim() || barcodeOriginal || ''),
    };
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);
console.log("access_token",token,"body",body);
    try {
      setSubmitting(true);
      const res = await fetch(`${storeUrl}/pos/app/product/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'access_token': token },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      console.log("data:",res);
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to update product');

      Alert.alert('Success', 'Product updated successfully.');

      const updated = {
        ...product,
        ...(data?.product || {}),
        product_id: Number(id),
        productName: body.new_name || product.productName,
        productSize: body.size || product.productSize,
        salePrice: body.new_price !== '' ? Number(body.new_price) : product.salePrice,
        costPrice: body.new_std_price !== '' ? Number(body.new_std_price) : product.costPrice,
        barcode: body.barcode || product.barcode,
        categoryId: body.categ_id ?? product.categoryId,
        productTaxes: body.taxes_id?.length
          ? body.taxes_id.map(tid => ({ taxId: tid, taxName: taxList.find(t => Number(t.id) === Number(tid))?.name || '' }))
          : product.productTaxes,
        availableInPos: body.available_in_pos === 'true',
        isEbtProduct: body.is_ebt_product === 'true',
        ewic: body.ewic === 'true',
        otc: body.otc === 'true',
        to_weight: body.to_weight === 'true',
        unit_in_case: body.unit_in_case !== '' ? Number(body.unit_in_case) : product.unit_in_case,
        case_cost: body.case_cost !== '' ? Number(body.case_cost) : product.case_cost,
        qty_available: body.new_qty !== '' ? Number(body.new_qty) : product.qty_available,
        productImage: imgBase64 ? imgBase64 : product.productImage,
        vendorcode: body.vendorcode?.length ? body.vendorcode : product.vendorcode,
      };
      setProduct(updated);
      setImgBase64('');
      setImgMime('image/jpeg');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inCart = cart.find((p) => p.product_id === id);
  const inPrint = print.find((p) => p.product_id === id);

  return (
    <>
      <RBSheet
        ref={sheetRef}
        height={700}
        openDuration={220}
        closeOnDragDown
        customStyles={{ container: styles.sheetContainer, draggableIcon: { backgroundColor: '#ccc', width: 60 } }}
      >
        {!product ? (
          <View style={styles.emptyBox}><Text style={{ color: '#888' }}>No product selected.</Text></View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Image / Preview */}
            {imgBase64 ? (
              <Image source={{ uri: `data:${imgMime};base64,${imgBase64}` }} style={styles.image} />
            ) : product.productImage ? (
              <Image source={{ uri: `data:image/webp;base64,${product.productImage}` }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={{ color: '#aaa' }}>No Image</Text>
              </View>
            )}

            {/* Image actions */}
            <View style={[styles.row, { marginTop: 8 }]}>
              <TouchableOpacity style={[styles.smallBtn, styles.ghost]} onPress={pickFromGallery}>
                <Text style={styles.ghostText}>Pick from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={takePhoto}>
                <Text style={styles.smallBtnText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Two-column compact form */}
            <View style={{ marginTop: 12 }}>
              {/* Row 1: Name | Size */}
              <View style={styles.rowGap}>
                <TextInput style={styles.inputCol} placeholder={`Name: ${name}`}  onChangeText={setName} />
                <TextInput style={styles.inputCol} placeholder={`Size: ${size}`}  onChangeText={setSize} />
              </View>

              {/* Barcode full width + scan */}
              <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                <TextInput
                  style={styles.inputWithRightIcon}
                  placeholder={`Barcode: ${barcodeOriginal}`}
                  onChangeText={setNewBarcode}
                />
                <TouchableOpacity
                  style={styles.inputRightIcon}
                  onPress={() => hasCameraPermission ? setScannerVisible(true) : Alert.alert('Camera Permission', 'Enable camera access in settings.')}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <Icon name="camera-alt" size={22} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Row 2: Price | Unit Cost */}
              <View style={[styles.rowGap, { marginTop: 10 }]}>
                <TextInput style={styles.inputCol} placeholder={`Price: ${price}`} onChangeText={setPrice} keyboardType="decimal-pad" />
                <TextInput style={styles.inputCol} placeholder={`Cost: ${cost}`} onChangeText={setCost} keyboardType="decimal-pad" />
              </View>

              {/* Row 3: Case Cost | Units in Case + Calculate */}
            <View style={[styles.rowGap, { marginTop: 10 }]}>
                <TextInput style={styles.inputCol} placeholder={`Case Cost: ${casecost}`} onChangeText={setCaseCost} keyboardType="decimal-pad" />
                  <TextInput style={styles.inputCol} placeholder={`Units in Case: ${unitc}`} onChangeText={setUnitc} keyboardType="number-pad" />
                  <TouchableOpacity style={styles.calcBtn} onPress={calculateUnitCost}>
                    <Text style={styles.calcBtnText}>Calculate</Text>
                  </TouchableOpacity>
              </View>

              {/* Row 4: Qty | Category */}
                   <View style={[styles.rowGap, { marginTop: 10 }]}>
                <TextInput style={styles.inputCol} placeholder={`Net QTY: ${qtyavailable}`} value={qtyavailable} onChangeText={setQtyAvailable} keyboardType="decimal-pad" />
                <View style={styles.pickerCol}>
                  <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
                    <Picker.Item label="Select Category" value="" />
                    {allCats.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
                  </Picker>
                </View>
              </View>
              {/* Row 5: Vendors (multi) | Taxes (multi) */}
              <View style={styles.rowGap}>
                {/* Vendors */}
                <TouchableOpacity style={[styles.pickerCol, styles.fakePicker]} onPress={() => setVendorModal(true)}>
                  <Text style={styles.fakePickerText}>
                    {idsToLabelSummary(selectedVendorIds, vendorList)}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color="#444" />
                </TouchableOpacity>

                {/* Taxes */}
                <TouchableOpacity style={[styles.pickerCol, styles.fakePicker]} onPress={() => setTaxModal(true)}>
                  <Text style={styles.fakePickerText}>
                    {idsToLabelSummary(selectedTaxIds, taxList)}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color="#444" />
                </TouchableOpacity>
              </View>

              {/* Switches */}
              <Text style={styles.subTitle}>Options</Text>
              <View style={styles.switchGrid}>
                <View style={styles.switchCell}><Text style={styles.switchLabel}>POS</Text><Switch value={availablePOS} onValueChange={setAvailablePOS} /></View>
                <View style={styles.switchCell}><Text style={styles.switchLabel}>To Weight</Text><Switch value={toWeight} onValueChange={setToWeight} /></View>
                <View style={styles.switchCell}><Text style={styles.switchLabel}>EBT</Text><Switch value={isEBT} onValueChange={setIsEBT} /></View>
              </View>
              <View style={styles.switchGrid}>
                <View style={styles.switchCell}><Text style={styles.switchLabel}>EWIC</Text><Switch value={ewic} onValueChange={setEwic} /></View>
                <View style={styles.switchCell}><Text style={styles.switchLabel}>OTC</Text><Switch value={otc} onValueChange={setOtc} /></View>
                <View style={[styles.switchCell, { opacity: 0 }]} />
              </View>
            </View>

            {/* Cart / Print buttons (unchanged) */}
            <View style={[styles.row, { marginTop: 16 }]}>
           {userrole === 'customer' ?
      
              inCart ? (
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(product.product_id)}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
                  <Text style={styles.qtyValue}>{inCart.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(product.product_id)}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.btn, { backgroundColor: THEME.secondary }]} onPress={() => addToCart(product)}>
                  <Text style={styles.btnText}>Add to Cart</Text>
                </TouchableOpacity>
              )
            
:
              inPrint ? (
                <View style={[styles.qtyRow, { marginTop: 8 }]}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => decreasePrintQty(product.product_id)}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
                  <Text style={styles.qtyValue}>{inPrint.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => increasePrintQty(product.product_id)}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={[styles.btn, { backgroundColor: THEME.primary }]} onPress={() => addToPrint(product)}>
                  <Text style={styles.btnText}>Add to Print</Text>
                </TouchableOpacity>
              )
            }
            </View>

            <TouchableOpacity
              style={[styles.btn, { marginTop: 10, backgroundColor: '#1B9C85', opacity: submitting ? 0.6 : 1 }]}
              disabled={submitting}
              onPress={handleUpdate}
            >
              <Text style={styles.btnText}>{submitting ? 'Updating…' : 'Update Product'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </RBSheet>

      {/* Vendor multi-select modal */}
      <MultiSelectModal
        visible={vendorModal}
        title="Select Vendors"
        options={vendorList}
        selectedIds={selectedVendorIds}
        onChange={setSelectedVendorIds}
        onClose={() => setVendorModal(false)}
      />

      {/* Tax multi-select modal */}
      <MultiSelectModal
        visible={taxModal}
        title="Select Taxes"
        options={taxList}
        selectedIds={selectedTaxIds}
        onChange={setSelectedTaxIds}
        onClose={() => setTaxModal(false)}
      />

      {/* Fullscreen Scanner */}
      <Modal visible={scannerVisible} animationType="slide">
        {hasCameraPermission ? (
          <View style={{ flex: 1 }}>
            <Camera style={styles.camera} cameraType={CameraType.Back} scanBarcode onReadCode={onReadCode} />
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setScannerVisible(false)}>
                <Text style={styles.controlText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={{ color: 'red' }}>Camera permission denied. Please allow access in settings.</Text>
            <TouchableOpacity style={[styles.controlBtn, { marginTop: 16 }]} onPress={() => setScannerVisible(false)}>
              <Text style={styles.controlText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </>
  );
});

export default ProductBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 12 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  image: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain' },
  imagePlaceholder: { backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },

  metaLabel: { color: '#666', fontSize: 12, marginTop: 6 },
  metaValue: { color: '#111', fontWeight: '600', marginTop: 2 },

  row: { flexDirection: 'row', gap: 12 },
  rowGap: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },

  smallBtn: { backgroundColor: THEME.secondary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  ghostText: { color: '#333', fontWeight: '700' },

  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, color: '#333', marginTop: 10 },
  inputCol: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, color: '#333' },
  inputWrapper: { position: 'relative' },
  inputWithRightIcon: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingLeft: 12, paddingRight: 44, color: '#333', backgroundColor: '#fff',
  },
  inputRightIcon: { position: 'absolute', right: 12, top: '50%', marginTop: -14, justifyContent: 'center', alignItems: 'center', height: 28, width: 28 },

  pickerCol: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginTop: 10 },

  fakePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  fakePickerText: { color: '#333' },

  colWithButton: { flex: 1, flexDirection: 'column', gap: 8 },
  calcBtn: { backgroundColor: THEME.secondary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 8, alignSelf: 'flex-end' },
  calcBtnText: { color: '#fff', fontWeight: '700' },

  camera: { flex: 1 },
  controls: { position: 'absolute', bottom: 30, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  controlBtn: { backgroundColor: '#000000AA', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  controlText: { color: '#fff', fontWeight: '700' },
  permissionDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  qtyBtn: { backgroundColor: '#2c1e70', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  qtyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  qtyValue: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold', color: '#000' },

  subTitle: { marginTop: 12, marginBottom: 6, fontWeight: '700', color: '#333' },
  switchGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  switchCell: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12,
  },
});

const msStyles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20, paddingHorizontal: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: THEME.primary, marginBottom: 12, textAlign: 'center' },
  row: {
    paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  label: { color: '#333', fontSize: 15, flex: 1, marginRight: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingVertical: 12 },
  btn: { backgroundColor: THEME.secondary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  clear: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  btnTextClear: { color: '#333', fontWeight: '700' },
});
