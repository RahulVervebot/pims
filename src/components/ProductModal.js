import React, {
  forwardRef, useImperativeHandle, useRef, useState,
  useMemo, useEffect, useContext
} from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Platform, Modal, Switch, useColorScheme
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Camera, CameraType } from 'react-native-camera-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTopCategories, VendorList, TaxList, getUOMList, createCustomVariantProduct, updateCustomVariantProduct, archiveProduct } from '../functions/product-function';
import { CartContext } from '../context/CartContext';
import { PrintContext } from '../context/PrintContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createQuantityDiscountPromotion } from '../screens/promotions/function';

const THEME = { primary: '#2C1E70', secondary: '#319241', price: '#27ae60' };

const ProductModal = forwardRef(({ onAddToCart, onAddToPrint }, ref) => {
  const [visible, setVisible] = useState(false);
  const { cart, addToCart, increaseQty, decreaseQty } = useContext(CartContext);
  const { print, addToPrint, increasePrintQty, decreasePrintQty, removeFromprint } = useContext(PrintContext);
  const _isDark = useColorScheme() === 'dark';
  const inputTextColor = '#111';
  const placeholderColor = '#6B7280';
  const inputBg = '#fff';
  const inputBorder = '#ddd';
  const iconColor = '#333';

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
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const searchDebounceRef = useRef(null);
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
  const [uomList, setUomList] = useState([]);

  // Image (raw base64; send "" if unchanged)
  const [imgBase64, setImgBase64] = useState('');
  const [imgMime, setImgMime] = useState('image/jpeg');

  // Scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  // Multi-select modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [taxModalVisible, setTaxModalVisible] = useState(false);
  const [uomModalVisible, setUomModalVisible] = useState(false);
  const [selectedUomId, setSelectedUomId] = useState('');
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [variantName, setVariantName] = useState('');
  const [variantCode, setVariantCode] = useState('');
  const [variantBarcode, setVariantBarcode] = useState('');
  const [variantPrice, setVariantPrice] = useState('');
  const [variantSubmitting, setVariantSubmitting] = useState(false);
  const [variantsModalVisible, setVariantsModalVisible] = useState(false);
  const [variantsList, setVariantsList] = useState([]);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [editingVariantName, setEditingVariantName] = useState('');
  const [editingVariantPrice, setEditingVariantPrice] = useState('');
  const [qdModalVisible, setQdModalVisible] = useState(false);
  const [qdSubmitting, setQdSubmitting] = useState(false);
  const [qdBuyQty, setQdBuyQty] = useState('1');
  const [qdDiscount, setQdDiscount] = useState('1');
  const [qdStartDate, setQdStartDate] = useState('');
  const [qdEndDate, setQdEndDate] = useState('');
  const [qdShowStartPicker, setQdShowStartPicker] = useState(false);
  const [qdShowEndPicker, setQdShowEndPicker] = useState(false);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);

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
        const [cats, taxes, uoms] = await Promise.all([
          getTopCategories(),
          TaxList(),
          getUOMList(),
        ]);
        const normCats = Array.isArray(cats) ? cats.map(c => ({
          id: String(c.id ?? c._id ?? ''),
          name: String(c.name ?? c.category ?? ''),
        })) : [];
        const normTaxes = Array.isArray(taxes) ? taxes.map(t => ({
          id: String(t.id ?? t.taxId ?? t._id ?? ''),
          name: String(t.name ?? t.taxName ?? ''),
        })) : [];
        const normUom = Array.isArray(uoms) ? uoms.map(u => ({
          id: String(u.id ?? u.uomId ?? u._id ?? ''),
          name: String(u.name ?? u.uomName ?? ''),
        })) : [];
        setAllCats(normCats);
        setVendorList([]);
        setTaxList(normTaxes);
        setUomList(normUom);
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
        setBarcodeOriginal(p.barcode || '');
        setNewBarcode(''); // new scan/type

        setPrice(p.salePrice != null ? String(p.salePrice) : '');   // new_price
        setCost(p.costPrice != null ? String(p.costPrice) : '');    // new_std_price
        setQtyAvailable(''); // not provided in GET; user can set

        setUnitc(p.unit_in_case != null ? String(p.unit_in_case) : '');
        setCaseCost(p.case_cost != null ? String(p.case_cost) : '');

        setCategoryId(p.categoryId != null ? String(p.categoryId) : '');
        setSelectedUomId(p.uom_id != null ? String(p.uom_id) : (p.uomId != null ? String(p.uomId) : ''));

        // taxes -> ids
        const tIds = Array.isArray(p.productTaxes) ? p.productTaxes.map(t => String(t.taxId)) : [];
        setSelectedTaxIds(tIds);

        const vendorId = Array.isArray(p.vendorcode) ? p.vendorcode[0] : p.vendorcode;
        setSelectedVendorId(vendorId != null ? String(vendorId) : '');
        setSearchText('');
        setShowVendorDropdown(false);

        setAvailablePOS(!!p.availableInPos);
        setIsEBT(!!p.isEbtProduct);
        setEwic(!!p.ewic);
        setOtc(!!p.otc);
        setToWeight(!!p.to_weight);

        setImgBase64('');
        setImgMime('image/jpeg');
        setVariantsList(Array.isArray(p.variants) ? p.variants : []);
        setEditingVariantId(null);
        setQdModalVisible(false);
      }
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const openVariantModal = () => {
    setVariantName('');
    setVariantCode('');
    setVariantBarcode(barcodeOriginal || '');
    setVariantPrice('');
    setVariantModalVisible(true);
  };

  const handleCreateVariant = async () => {
    const baseId = Number(id || product?.product_id || product?.id);
    if (!Number.isFinite(baseId)) {
      Alert.alert('Error', 'Missing product id.');
      return;
    }
    if (!variantName.trim()) {
      Alert.alert('Missing Name', 'Please enter a variant name.');
      return;
    }
    if (!variantCode.trim()) {
      Alert.alert('Missing Code', 'Please enter a default code.');
      return;
    }
    const priceValue = parseFloat(variantPrice);
    if (!Number.isFinite(priceValue)) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    try {
      setVariantSubmitting(true);
   const variantrespnse =   await createCustomVariantProduct({
        name: variantName,
        default_code: variantCode.trim(),
        barcode: (variantBarcode.trim() || barcodeOriginal || ''),
        list_price: priceValue,
        parent_id: baseId,
      });
      console.log("variantrespnse:",variantrespnse.result);
      if(variantrespnse.result.error){
      Alert.alert("Error:",variantrespnse.result.error);
      }
     else if(variantrespnse.result.message){
      Alert.alert(variantrespnse.result.message);
      }
      setVariantModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create variant product.');
    } finally {
      setVariantSubmitting(false);
    }
  };

  const openVariantsModal = () => {
    setVariantsModalVisible(true);
    setEditingVariantId(null);
  };

  const formatDateOnly = (value) => {
    if (!value) return '';
    const datePart = String(value).split(' ')[0];
    return datePart || '';
  };

  const toDate = (value) => {
    const datePart = formatDateOnly(value);
    if (!datePart) return new Date();
    const [y, m, d] = datePart.split('-').map((n) => Number(n));
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const handleQdStartDateChange = (_, date) => {
    if (Platform.OS === 'android') setQdShowStartPicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setQdStartDate(`${yyyy}-${mm}-${dd} 00:00:00`);
  };

  const handleQdEndDateChange = (_, date) => {
    if (Platform.OS === 'android') setQdShowEndPicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setQdEndDate(`${yyyy}-${mm}-${dd} 23:59:59`);
  };

  const openQdModal = () => {
    setQdBuyQty('1');
    setQdDiscount('1');
    setQdStartDate('');
    setQdEndDate('');
    setQdModalVisible(true);
  };

  const handleCreateQuantityDiscount = async () => {
    if (!product?.product_id && !id) {
      Alert.alert('Missing product', 'Product ID not found.');
      return;
    }
    const payload = {
      product_id: Number(product?.product_id ?? id),
      no_of_product_to_buy: Number(qdBuyQty || 0),
      discount_amount: Number(qdDiscount || 0),
      start_date: qdStartDate || null,
      end_date: qdEndDate || null,
    };
    try {
      setQdSubmitting(true);
      const res = await createQuantityDiscountPromotion(payload);
      const message = res?.message || res?.result?.message || 'Quantity discount created successfully';
      Alert.alert('Success', message);
      setQdModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to create quantity discount.');
    } finally {
      setQdSubmitting(false);
    }
  };

  const formatVariantName = (value) => {
    const raw = String(value || '');
    return raw.replace(/^\s*\[[^\]]+\]\s*/, '').trim();
  };

  const startEditVariant = (variant) => {
    setEditingVariantId(variant.product_id);
    setEditingVariantName(formatVariantName(variant.productName || ''));
    setEditingVariantPrice(
      variant.salePrice != null ? String(variant.salePrice) : ''
    );
  };

  const handleUpdateVariantLocal = async (variantId) => {
    const priceValue = parseFloat(editingVariantPrice);
    if (!editingVariantName.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }
    if (!Number.isFinite(priceValue)) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    try {
      setVariantSubmitting(true);
      const updateresponsevariant = await updateCustomVariantProduct(variantId, {
        name: editingVariantName.trim(),
        list_price: priceValue,
      });
      setVariantsList((prev) =>
        prev.map((v) =>
          v.product_id === variantId 
            ? { ...v, productName: editingVariantName.trim(), salePrice: priceValue }
            : v
        )
      );
      console.log("updateresponsevariant:",updateresponsevariant);
      if(updateresponsevariant.result.message){
        Alert.alert(updateresponsevariant.result.message);
      }
      else if(updateresponsevariant.result.error){
      Alert.alert("Error:",updateresponsevariant.result.message);
      }
      setEditingVariantId(null);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update variant product.');
    } finally {
      setVariantSubmitting(false);
    }
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

  const sortedCategories = useMemo(() => (
    (Array.isArray(allCats) ? allCats : [])
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  ), [allCats]);

  const sortedTaxes = useMemo(() => (
    (Array.isArray(taxList) ? taxList : [])
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  ), [taxList]);

  const sortedUom = useMemo(() => (
    (Array.isArray(uomList) ? uomList : [])
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
  ), [uomList]);

  const noTaxId = useMemo(() => {
    const noTax = sortedTaxes.find((t) => String(t.name || '').trim().toLowerCase() === 'no tax');
    return noTax?.id || '';
  }, [sortedTaxes]);

  useEffect(() => {
    if (!noTaxId) return;
    if (selectedTaxIds.includes(noTaxId) && selectedTaxIds.length > 1) {
      setSelectedTaxIds([noTaxId]);
    }
  }, [noTaxId, selectedTaxIds]);

  const categorySummary = useMemo(() => {
    if (!categoryId) return 'Select Category';
    return sortedCategories.find((c) => String(c.id) === String(categoryId))?.name || 'Select Category';
  }, [categoryId, sortedCategories]);

  const taxSummary = useMemo(() => {
    if (!selectedTaxIds.length) return 'Select Tax';
    return sortedTaxes
      .filter((t) => selectedTaxIds.includes(String(t.id)))
      .map((t) => t.name)
      .join(', ');
  }, [selectedTaxIds, sortedTaxes]);

  const uomSummary = useMemo(() => {
    if (!selectedUomId) return 'Select UoM';
    return sortedUom.find((u) => String(u.id) === String(selectedUomId))?.name || 'Select UoM';
  }, [selectedUomId, sortedUom]);

  const toggleTax = (taxId) => {
    const id = String(taxId);
    setSelectedTaxIds((prev) => {
      const isSelected = prev.includes(id);
      if (id === noTaxId) return isSelected ? [] : [id];
      if (isSelected) return prev.filter((x) => x !== id);
      const withoutNoTax = noTaxId ? prev.filter((x) => x !== noTaxId) : prev;
      return [...withoutNoTax, id];
    });
  };

  const toggleUom = (uomId) => {
    const id = String(uomId);
    setSelectedUomId((prev) => (String(prev) === id ? '' : id));
  };

  const handleVendorSearch = (text) => {
    setSearchText(text);
    setSelectedVendorId('');
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

  const handleUpdate = async () => {
    if (!id) {
      Alert.alert('Error', 'Missing product id.');
      return;
    }
    const body = {
      id: Number(id),
      new_price: (price ?? '').trim(),          // strings to mirror your API
      new_std_price: (cost ?? '').trim(),
      new_qty: (qtyavailable ?? '').trim(),
      new_name: (name ?? '').trim(),
      size: (size ?? '').trim(),
      unit_in_case: (unitc ?? '').trim(),
      case_cost: (casecost ?? '').trim(),
      categ_id: categoryId ? Number(categoryId) : undefined,
      uom_id: selectedUomId ? Number(selectedUomId) : undefined,
      vendorcode: selectedVendorId ? Number(selectedVendorId) : undefined,
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
        headers: {'access_token': token },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      console.log("update res:",res);
        console.log("update data:",data);
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
        vendorcode: body.vendorcode ?? product.vendorcode,
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

  const doArchiveProduct = async () => {
    const baseId = Number(id || product?.product_id || product?.id);
    if (!Number.isFinite(baseId) || baseId <= 0) {
      Alert.alert('Error', 'Missing product id.');
      return;
    }
    try {
      setArchiving(true);
      await archiveProduct(baseId);
      Alert.alert('Success', 'Product archived successfully.');
      setVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to archive product.');
    } finally {
      setArchiving(false);
    }
  };

  const handleArchiveProduct = () => {
    Alert.alert(
      'Archive Product',
      'Are you sure you want to archive this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: doArchiveProduct },
      ]
    );
  };

  const inCart = cart.find((p) => String(p.product_id) === String(id));
  const inPrint = print.find((p) => String(p.product_id) === String(id));

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.mainModalRoot}>
          <TouchableOpacity style={styles.mainModalBackdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.mainModalCard}>
            <TouchableOpacity style={styles.mainModalCloseBtn} onPress={() => setVisible(false)}>
              <Icon name="close" size={24} color="#111" />
            </TouchableOpacity>
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
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Name"
                    placeholderTextColor={placeholderColor}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Size</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Size"
                    placeholderTextColor={placeholderColor}
                    value={size}
                    onChangeText={setSize}
                  />
                </View>
              </View>

              {/* Barcode display (read-only) */}
              <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                <Text style={[styles.inlineHint, { color: inputTextColor }]}>Barcode</Text>
                <View style={[styles.readonlyField, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                  <Text style={[styles.readonlyText, { color: inputTextColor }]}>
                    {barcodeOriginal || '-'}
                  </Text>
                </View>
              </View>

              {/* Row 2: Price | Unit Cost */}
              <View style={[styles.rowGap, { marginTop: 10 }]}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Price</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Price"
                    placeholderTextColor={placeholderColor}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Cost</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Cost"
                    placeholderTextColor={placeholderColor}
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Row 3: Case Cost | Units in Case + Calculate */}
            <View style={[styles.rowGap, { marginTop: 10 }]}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Case Cost</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Case Cost"
                    placeholderTextColor={placeholderColor}
                    value={casecost}
                    onChangeText={setCaseCost}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Units in Case</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Units in Case"
                    placeholderTextColor={placeholderColor}
                    value={unitc}
                    onChangeText={setUnitc}
                    keyboardType="number-pad"
                  />
                </View>
                  <TouchableOpacity style={styles.calcBtn} onPress={calculateUnitCost}>
                    <Text style={styles.calcBtnText}>Calculate</Text>
                  </TouchableOpacity>
              </View>

              {/* Row 4: Qty | Category */}
              <View style={[styles.rowGap, { marginTop: 10 }]}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Net QTY</Text>
                  <TextInput
                    style={[styles.inputCol, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Net QTY"
                    placeholderTextColor={placeholderColor}
                    value={qtyavailable}
                    onChangeText={setQtyAvailable}
                    keyboardType="decimal-pad"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.selectBox, { borderColor: inputBorder, backgroundColor: inputBg }]}
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <Text style={styles.selectLabel}>Category</Text>
                  <Text style={[styles.selectValue, { color: inputTextColor }]} numberOfLines={2}>{categorySummary}</Text>
                </TouchableOpacity>
              </View>
              {/* Row 5: Vendors (search) | Taxes (multi) */}
              <View style={styles.rowGap}>
                {/* Vendors */}
                <View style={styles.vendorBox}>
                  <Text style={styles.fieldLabel}>Vendor</Text>
                  <TextInput
                    style={[styles.inputFlex, { color: inputTextColor, backgroundColor: inputBg, borderColor: inputBorder }]}
                    placeholder="Search vendor (min 3 chars)"
                    placeholderTextColor={placeholderColor}
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

                {/* Taxes */}
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Tax</Text>
                  <TouchableOpacity
                    style={[styles.pickerCol, styles.fakePicker, { borderColor: inputBorder, backgroundColor: inputBg, marginTop: 0 }]}
                    onPress={() => setTaxModalVisible(true)}
                  >
                    <Text style={[styles.fakePickerText, { color: inputTextColor }]}>
                      {taxSummary}
                    </Text>
                    <Icon name="arrow-drop-down" size={24} color={iconColor} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.rowGap, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.selectBox, { borderColor: inputBorder, backgroundColor: inputBg }]}
                  onPress={() => setUomModalVisible(true)}
                >
                  <Text style={styles.selectLabel}>UoM</Text>
                  <Text style={[styles.selectValue, { color: inputTextColor }]} numberOfLines={2}>{uomSummary}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
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
                <View style={styles.switchCell}>
                  {variantsList.length > 0 ? (
                    <TouchableOpacity style={styles.variantToggleBtn} onPress={openVariantsModal}>
                      <Text style={styles.variantToggleText}>Variants</Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}
                </View>
              </View>
            </View>

            {/* Cart / Print buttons (unchanged) */}
            {userrole !== 'customer' && (
              <View style={[styles.row, { marginTop: 16 }]}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={openVariantModal}
                >
                  <Text style={styles.btnText}>Create Variant Product</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAccent]}
                  onPress={openQdModal}
                >
                  <Text style={styles.btnText}>Create Qty Discount</Text>
                </TouchableOpacity>
              </View>
            )}
            {userrole === 'customer' ? (
              <View style={[styles.row, { marginTop: 12 }]}>
                {inCart ? (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQty(product.product_id)}><Text style={styles.qtyText}>-</Text></TouchableOpacity>
                    <Text style={styles.qtyValue}>{inCart.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQty(product.product_id)}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.btn, { backgroundColor: THEME.secondary }]} onPress={() => addToCart(product)}>
                    <Text style={styles.btnText}>Add to Cart</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.row, { marginTop: 12 }]}>
                {inPrint ? (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnDanger]}
                    onPress={() => removeFromprint(product.product_id)}
                  >
                    <Text style={styles.btnText}>Remove from Print</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSuccess]}
                    onPress={() => addToPrint(product)}
                  >
                    <Text style={styles.btnText}>Add to Print</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btn, styles.btnArchive, { opacity: archiving ? 0.6 : 1 }]}
                  disabled={archiving}
                  onPress={handleArchiveProduct}
                >
                  <Text style={styles.btnText}>{archiving ? 'Archiving…' : 'Archive Product'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnTeal, { opacity: submitting ? 0.6 : 1 }]}
                  disabled={submitting}
                  onPress={handleUpdate}
                >
                  <Text style={styles.btnText}>{submitting ? 'Updating…' : 'Update Product'}</Text>
                </TouchableOpacity>
              </View>
            )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={styles.optionModalRoot}>
          <TouchableOpacity style={styles.optionModalBackdrop} activeOpacity={1} onPress={() => setCategoryModalVisible(false)} />
          <View style={styles.optionModalCard}>
            <Text style={styles.optionModalTitle}>Select Category</Text>
            <ScrollView style={styles.optionList}>
              {sortedCategories.map((item) => (
                <TouchableOpacity key={item.id} style={styles.optionRow} onPress={() => setCategoryId(String(item.id))}>
                  <Text style={styles.optionLabel}>{item.name}</Text>
                  <Switch value={String(categoryId) === String(item.id)} onValueChange={() => setCategoryId(String(item.id))} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btn} onPress={() => setCategoryModalVisible(false)}>
              <Text style={styles.btnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={taxModalVisible} transparent animationType="fade" onRequestClose={() => setTaxModalVisible(false)}>
        <View style={styles.optionModalRoot}>
          <TouchableOpacity style={styles.optionModalBackdrop} activeOpacity={1} onPress={() => setTaxModalVisible(false)} />
          <View style={styles.optionModalCard}>
            <Text style={styles.optionModalTitle}>Select Tax</Text>
            <ScrollView style={styles.optionList}>
              {sortedTaxes.map((item) => (
                <TouchableOpacity key={item.id} style={styles.optionRow} onPress={() => toggleTax(item.id)}>
                  <Text style={styles.optionLabel}>{item.name}</Text>
                  <Switch value={selectedTaxIds.includes(String(item.id))} onValueChange={() => toggleTax(item.id)} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btn} onPress={() => setTaxModalVisible(false)}>
              <Text style={styles.btnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={uomModalVisible} transparent animationType="fade" onRequestClose={() => setUomModalVisible(false)}>
        <View style={styles.optionModalRoot}>
          <TouchableOpacity style={styles.optionModalBackdrop} activeOpacity={1} onPress={() => setUomModalVisible(false)} />
          <View style={styles.optionModalCard}>
            <Text style={styles.optionModalTitle}>Select UoM</Text>
            <ScrollView style={styles.optionList}>
              {sortedUom.map((item) => (
                <TouchableOpacity key={item.id} style={styles.optionRow} onPress={() => toggleUom(item.id)}>
                  <Text style={styles.optionLabel}>{item.name}</Text>
                  <Switch value={String(selectedUomId) === String(item.id)} onValueChange={() => toggleUom(item.id)} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.btn} onPress={() => setUomModalVisible(false)}>
              <Text style={styles.btnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={variantModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Variant Product</Text>
            <TextInput
              style={styles.modalInput}
              value={variantName}
              onChangeText={setVariantName}
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.modalInput}
              value={variantCode}
              onChangeText={setVariantCode}
              placeholder="Default Code"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.modalInput}
              value={variantBarcode}
              onChangeText={setVariantBarcode}
              placeholder="Barcode"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.modalInput}
              value={variantPrice}
              onChangeText={setVariantPrice}
              placeholder="Price"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.variantBtn]}
                onPress={handleCreateVariant}
                disabled={variantSubmitting}
              >
                <Text style={styles.btnText}>
                  {variantSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.modalCancelBtn]}
                onPress={() => setVariantModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={qdModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Quantity Discount</Text>

            <TextInput
              style={styles.modalInput}
              value={qdBuyQty}
              onChangeText={setQdBuyQty}
              placeholder="No. of products to buy"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.modalInput}
              value={qdDiscount}
              onChangeText={setQdDiscount}
              placeholder="Discount amount"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />

            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setQdShowStartPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dateInputLabel}>Start Date</Text>
              <Text style={qdStartDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                {qdStartDate ? formatDateOnly(qdStartDate) : 'Select date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setQdShowEndPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dateInputLabel}>End Date</Text>
              <Text style={qdEndDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                {qdEndDate ? formatDateOnly(qdEndDate) : 'Select date'}
              </Text>
            </TouchableOpacity>

            {qdShowStartPicker && (
              <DateTimePicker
                value={toDate(qdStartDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleQdStartDateChange}
              />
            )}
            {qdShowEndPicker && (
              <DateTimePicker
                value={toDate(qdEndDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleQdEndDateChange}
              />
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.modalCancelBtn]}
                onPress={() => setQdModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSuccess, qdSubmitting && { opacity: 0.6 }]}
                onPress={handleCreateQuantityDiscount}
                disabled={qdSubmitting}
              >
                <Text style={styles.btnText}>{qdSubmitting ? 'Saving…' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={variantsModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Variants</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {variantsList.map((variant) => {
                const isEditing = editingVariantId === variant.product_id;
                return (
                  <View key={variant.product_id} style={styles.variantCard}>
                    {isEditing ? (
                      <>
                        <TextInput
                          style={styles.modalInput}
                          value={editingVariantName}
                          onChangeText={setEditingVariantName}
                          placeholder="Product Name"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                          style={styles.modalInput}
                          value={editingVariantPrice}
                          onChangeText={setEditingVariantPrice}
                          placeholder="Sale Price"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                        />
                        <TouchableOpacity
                          style={[styles.btn, styles.variantBtn]}
                          onPress={() => handleUpdateVariantLocal(variant.product_id)}
                          disabled={variantSubmitting}
                        >
                          <Text style={styles.btnText}>Update</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={styles.variantRow}>
                        <View style={styles.variantInfo}>
                          <Text style={styles.variantName}>
                            {formatVariantName(variant.productName)}
                          </Text>
                          <Text style={styles.variantPrice}>
                            ${Number(variant.salePrice || 0).toFixed(2)}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => startEditVariant(variant)}>
                          <Icon name="edit" size={20} color="#333" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
              {variantsList.length === 0 && (
                <Text style={styles.emptyVariantsText}>No variants available.</Text>
              )}
            </ScrollView>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.btn, styles.modalCancelBtn]}
                onPress={() => setVariantsModalVisible(false)}
              >
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

export default ProductModal;

const styles = StyleSheet.create({
  mainModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  mainModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mainModalCard: {
    width: '92%',
    maxWidth: 560,
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
  },
  mainModalCloseBtn: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  image: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain' },
  imagePlaceholder: { backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' },

  metaLabel: { color: '#666', fontSize: 12, marginTop: 6 },
  metaValue: { color: '#111', fontWeight: '600', marginTop: 2 },

  row: { flexDirection: 'row', gap: 12 },
  rowGap: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnPrimary: { backgroundColor: THEME.primary },
  btnAccent: { backgroundColor: THEME.secondary },
  btnSuccess: { backgroundColor: '#16A34A' },
  btnArchive: { backgroundColor: '#F59E0B' },
  btnTeal: { backgroundColor: '#1B9C85' },
  btnDanger: { backgroundColor: '#D9534F' },

  smallBtn: { backgroundColor: THEME.secondary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  ghostText: { color: '#333', fontWeight: '700' },

  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, color: '#333', marginTop: 10 },
  inputFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputCol: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, color: '#333' },
  fieldCol: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6 },
  inputWrapper: { position: 'relative' },
  inlineHint: { fontSize: 11, marginBottom: 6, fontWeight: '600' },
  readonlyField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  readonlyText: { fontSize: 14, fontWeight: '600' },
  inputWithRightIcon: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 10, paddingLeft: 12, paddingRight: 44, color: '#333', backgroundColor: '#fff',
  },
  inputRightIcon: { position: 'absolute', right: 12, top: '50%', marginTop: -14, justifyContent: 'center', alignItems: 'center', height: 28, width: 28 },

  pickerCol: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden', marginTop: 10 },

  fakePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  fakePickerText: { color: '#333' },
  selectBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  selectValue: {
    color: '#111',
    fontSize: 14,
  },
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
  optionModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  optionModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000077',
  },
  optionModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '75%',
    padding: 14,
  },
  optionModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  optionList: {
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  optionLabel: {
    flex: 1,
    color: '#111',
    fontWeight: '600',
    paddingRight: 10,
  },

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

  subTitle: { marginTop: 12, marginBottom: 6, fontWeight: '700', color: '#111' },
  switchGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  variantBtn: { backgroundColor: THEME.secondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#111',
    marginBottom: 10,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dateInputLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  dateInputText: { marginTop: 4, fontSize: 13, color: '#111', fontWeight: '600' },
  dateInputPlaceholder: { marginTop: 4, fontSize: 13, color: '#9CA3AF' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: { backgroundColor: '#D9534F' },
  variantToggleBtn: {
    backgroundColor: '#1B9C85',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  variantToggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  variantCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  variantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  variantInfo: { flex: 1, paddingRight: 10 },
  variantName: { fontSize: 14, fontWeight: '700', color: '#111' },
  variantPrice: { marginTop: 4, fontSize: 12, color: '#319241', fontWeight: '700' },
  emptyVariantsText: { color: '#6B7280', textAlign: 'center', paddingVertical: 8 },
  removePrintBtn: { backgroundColor: '#D9534F' },
  switchCell: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12,
  },
  switchLabel: { color: '#111', fontWeight: '600' },
});
