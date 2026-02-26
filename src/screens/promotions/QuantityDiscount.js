import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera, CameraType } from 'react-native-camera-kit';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import {
  getQuantityDiscountPromotions,
  createQuantityDiscountPromotion,
  updateQuantityDiscountPromotion,
  deleteQuantityDiscountPromotion,
  searchProductsByBarcode,
} from './function';
import AppHeader from '../../components/AppHeader';
import reportbg from '../../assets/images/report-bg.png';

const DEFAULT_FORM = {
  product_id: null,
  no_of_product_to_buy: '1',
  discount_amount: '1',
  start_date: '',
  end_date: '',
};

export default function QuantityDiscountScreen() {
  const onEndReachedCalledDuringMomentum = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);

  const [query, setQuery] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [showFilterStartPicker, setShowFilterStartPicker] = useState(false);
  const [showFilterEndPicker, setShowFilterEndPicker] = useState(false);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDropdownVisible, setProductDropdownVisible] = useState(false);
  const productDebounceRef = useRef(null);

  const [scannerVisible, setScannerVisible] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);

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

  const handleStartDateChange = (_, date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    updateForm('start_date', `${yyyy}-${mm}-${dd} 00:00:00`);
  };

  const handleEndDateChange = (_, date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    updateForm('end_date', `${yyyy}-${mm}-${dd} 23:59:59`);
  };

  const handleFilterStartDateChange = (_, date) => {
    if (Platform.OS === 'android') setShowFilterStartPicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setFilterStart(`${yyyy}-${mm}-${dd}`);
  };

  const handleFilterEndDateChange = (_, date) => {
    if (Platform.OS === 'android') setShowFilterEndPicker(false);
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setFilterEnd(`${yyyy}-${mm}-${dd}`);
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const loadPromotions = async ({ nextPage = 1, append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const res = await getQuantityDiscountPromotions({
        page: nextPage,
        limit: 10,
        start_date: filterStart || undefined,
        end_date: filterEnd || undefined,
      });
      const nextRows = Array.isArray(res?.data) ? res.data : [];
      setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
      setPage(Number(res?.page ?? nextPage) || nextPage);
      setTotalPages(Number(res?.total_pages ?? 1) || 1);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load promotions.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadPromotions({ nextPage: 1, append: false });
  }, [filterStart, filterEnd]);

  useEffect(() => {
    (async () => {
      try {
        const perm = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
        const result = await request(perm);
        setHasCameraPermission(result === RESULTS.GRANTED);
      } catch {
        setHasCameraPermission(false);
      }
    })();
  }, []);

  const handleOpen = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setSelectedProduct(null);
    setProductQuery('');
    setProductResults([]);
    setProductDropdownVisible(false);
    setFormModalVisible(true);
  };

  const handleCreateOrUpdate = async () => {
    if (!selectedProduct?.id && !form.product_id) {
      return Alert.alert('Missing info', 'Please select a product.');
    }
    const payload = {
      product_id: Number(selectedProduct?.id ?? form.product_id),
      no_of_product_to_buy: Number(form.no_of_product_to_buy || 0),
      discount_amount: Number(form.discount_amount || 0),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    try {
      setSubmitting(true);
      const res = editingId
        ? await updateQuantityDiscountPromotion(payload)
        : await createQuantityDiscountPromotion(payload);
      const message = res?.message || res?.result?.message || 'Quantity discount saved successfully';
      Alert.alert('Success', message);
      setFormModalVisible(false);
      loadPromotions();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!productId) return;
    Alert.alert('Delete Promotion', 'Are you sure you want to delete this promotion?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmitting(true);
            const res = await deleteQuantityDiscountPromotion(productId);
            const message = res?.message || res?.result?.message || 'Promotion deleted successfully';
            Alert.alert('Success', message);
            loadPromotions();
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to delete promotion.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleSearchProducts = (text) => {
    setProductQuery(text);
    if (productDebounceRef.current) clearTimeout(productDebounceRef.current);
    if (text.trim().length < 3) {
      setProductResults([]);
      setProductDropdownVisible(false);
      return;
    }
    productDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchProductsByBarcode(text.trim());
        const normalized = Array.isArray(results)
          ? results.map((p) => ({
              id: Number(p.id ?? p.product_id ?? p._id),
              name: p.productName ?? p.name ?? p.product_name ?? 'Product',
              barcode: p.barcode,
            }))
          : [];
        setProductResults(normalized.filter((p) => Number.isFinite(p.id)));
        setProductDropdownVisible(true);
      } catch (e) {
        setProductResults([]);
        setProductDropdownVisible(false);
      }
    }, 300);
  };

  const handleScanBarcode = () => {
    if (!hasCameraPermission) {
      Alert.alert('Camera Permission', 'Enable camera access in settings to scan.');
      return;
    }
    setScannerVisible(true);
  };

  const onReadCode = (event) => {
    const value = event?.nativeEvent?.codeStringValue;
    if (!value) return;
    setScannerVisible(false);
    setProductQuery(value);
    handleSearchProducts(value);
  };

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const startFilter = filterStart.trim();
    const endFilter = filterEnd.trim();
    return rows.filter((item) => {
      const nameMatch = !q || String(item?.product_name || '').toLowerCase().includes(q);
      if (!nameMatch) return false;

      const startVal = formatDateOnly(item?.start_date || '');
      const endVal = formatDateOnly(item?.end_date || '');
      if (!startFilter && !endFilter) return true;
      if (startFilter && !endFilter) return startVal && startVal >= startFilter;
      if (!startFilter && endFilter) return endVal && endVal <= endFilter;
      // overlap between [startVal, endVal] and [startFilter, endFilter]
      return (
        startVal &&
        endVal &&
        startVal <= endFilter &&
        endVal >= startFilter
      );
    });
  }, [rows, query, filterStart, filterEnd]);

  const handleLoadMore = () => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    const next = page + 1;
    loadPromotions({ nextPage: next, append: true });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => {
        setEditingId(item?.id ?? null);
        setForm({
          product_id: item?.product_id ?? null,
          no_of_product_to_buy: String(item?.number_of_product_to_buy ?? 1),
          discount_amount: String(item?.discount_amount ?? 0),
          start_date: item?.start_date || '',
          end_date: item?.end_date || '',
        });
        setSelectedProduct({
          id: Number(item?.product_id),
          name: item?.product_name || 'Product',
          barcode: item?.barcode || '',
        });
        setProductQuery('');
        setProductResults([]);
        setProductDropdownVisible(false);
        setFormModalVisible(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item?.product_name || '-'}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item?.product_id)}>
          <Icon name="delete" size={16} color="#B91C1C" />
        </TouchableOpacity>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Barcode</Text>
        <Text style={styles.detailValue}>{item?.barcode || '-'}</Text>
      </View>
      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>{item?.actual_product_price ?? '-'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Buy Qty</Text>
          <Text style={styles.detailValue}>{item?.number_of_product_to_buy ?? '-'}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Discount</Text>
          <Text style={styles.detailValue}>{item?.discount_amount ?? '-'}</Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Start</Text>
        <Text style={styles.detailValue}>{item?.start_date || '-'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>End</Text>
        <Text style={styles.detailValue}>{item?.end_date || '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={reportbg} style={styles.screen} resizeMode="cover">
      <AppHeader Title="QUANTITY DISCOUNT" backgroundType="image" backgroundValue={reportbg} />

      <View style={styles.panelInner}>
        <View style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product name"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />
          <View style={styles.searchRow}>
            <View style={[styles.dateFilterWrap, styles.searchHalf]}>
              <TextInput
                style={[styles.searchInput, styles.dateFilterInput]}
                placeholder="Start Date (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF"
                value={filterStart}
                onChangeText={setFilterStart}
              />
              <TouchableOpacity
                style={styles.calendarBtn}
                onPress={() => setShowFilterStartPicker(true)}
              >
                <Icon name="calendar-today" size={18} color="#111" />
              </TouchableOpacity>
            </View>
            <View style={[styles.dateFilterWrap, styles.searchHalf]}>
              <TextInput
                style={[styles.searchInput, styles.dateFilterInput]}
                placeholder="End Date (YYYY-MM-DD)"
                placeholderTextColor="#9CA3AF"
                value={filterEnd}
                onChangeText={setFilterEnd}
              />
              <TouchableOpacity
                style={styles.calendarBtn}
                onPress={() => setShowFilterEndPicker(true)}
              >
                <Icon name="calendar-today" size={18} color="#111" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {showFilterStartPicker && (
          <DateTimePicker
            value={toDate(filterStart)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleFilterStartDateChange}
          />
        )}
        {showFilterEndPicker && (
          <DateTimePicker
            value={toDate(filterEnd)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleFilterEndDateChange}
          />
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={styles.centerText}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredRows}
            keyExtractor={(item) => String(item?.id ?? item?.product_id ?? Math.random())}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 90 }}
            onEndReached={() => {
              if (onEndReachedCalledDuringMomentum.current) return;
              onEndReachedCalledDuringMomentum.current = true;
              handleLoadMore();
            }}
            onEndReachedThreshold={0.4}
            onMomentumScrollBegin={() => {
              onEndReachedCalledDuringMomentum.current = false;
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.center}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.centerText}>Loading more…</Text>
                </View>
              ) : page < totalPages ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                  <Text style={styles.loadMoreText}>Load more</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.centerText}>
                  {query || filterStart || filterEnd ? 'No matching promotions.' : 'No promotions found.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={handleOpen}>
        <Text style={styles.createBtnText}>Create Quantity Discount</Text>
      </TouchableOpacity>

      <Modal
        visible={formModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.formModalRoot}>
          <TouchableOpacity
            style={styles.formModalOverlay}
            activeOpacity={1}
            onPress={() => setFormModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            style={styles.formModalCentered}
          >
            <View style={styles.formModalCard}>
            <TouchableOpacity style={styles.formModalCloseBtn} onPress={() => setFormModalVisible(false)}>
              <Icon name="close" size={20} color="#111" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{editingId ? 'Update Quantity Discount' : 'Create Quantity Discount'}</Text>

          <View style={styles.searchBox}>
            <View style={styles.searchRowInline}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="Search product by barcode (min 3 chars)"
                placeholderTextColor="#9CA3AF"
                value={productQuery}
                onChangeText={handleSearchProducts}
              />
              <TouchableOpacity style={styles.scanBtn} onPress={handleScanBarcode}>
                <Icon name="qr-code-scanner" size={20} color="#111" />
              </TouchableOpacity>
            </View>
            {productDropdownVisible && productResults.length > 0 && (
              <View style={styles.dropdown}>
                <ScrollView style={{ maxHeight: 180 }}>
                  {productResults.map((p) => (
                    <TouchableOpacity
                      key={String(p.id)}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedProduct(p);
                        updateForm('product_id', p.id);
                        setProductDropdownVisible(false);
                        setProductResults([]);
                        setProductQuery('');
                      }}
                    >
                      <Text style={styles.dropdownTitle}>{p.name}</Text>
                      <Text style={styles.dropdownMeta}>Barcode: {p.barcode || '-'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            {selectedProduct && (
              <View style={styles.selectedWrap}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{selectedProduct.name}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProduct(null);
                      updateForm('product_id', null);
                    }}
                  >
                    <Text style={styles.chipRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Buy Qty"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={form.no_of_product_to_buy}
              onChangeText={(v) => updateForm('no_of_product_to_buy', v)}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Discount Amount"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={form.discount_amount}
              onChangeText={(v) => updateForm('discount_amount', v)}
            />
          </View>

          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowStartPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dateInputLabel}>Start Date</Text>
            <Text style={form.start_date ? styles.dateInputText : styles.dateInputPlaceholder}>
              {form.start_date ? formatDateOnly(form.start_date) : 'Select date'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowEndPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dateInputLabel}>End Date</Text>
            <Text style={form.end_date ? styles.dateInputText : styles.dateInputPlaceholder}>
              {form.end_date ? formatDateOnly(form.end_date) : 'Select date'}
            </Text>
          </TouchableOpacity>

          {showStartPicker && (
            <DateTimePicker
              value={toDate(form.start_date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStartDateChange}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={toDate(form.end_date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
            />
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleCreateOrUpdate}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Saving…' : editingId ? 'Update Quantity Discount' : 'Create Quantity Discount'}
            </Text>
          </TouchableOpacity>
            </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={scannerVisible} animationType="slide">
        {hasCameraPermission ? (
          <View style={{ flex: 1 }}>
            <Camera style={{ flex: 1 }} cameraType={CameraType.Back} scanBarcode onReadCode={onReadCode} />
            <View style={styles.scannerControls}>
              <TouchableOpacity style={styles.scannerBtn} onPress={() => setScannerVisible(false)}>
                <Text style={styles.scannerBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.permissionDenied}>
            <Text style={{ color: 'red' }}>Camera permission denied. Please allow access in settings.</Text>
            <TouchableOpacity style={[styles.scannerBtn, { marginTop: 16 }]} onPress={() => setScannerVisible(false)}>
              <Text style={styles.scannerBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { paddingVertical: 40, alignItems: 'center' },
  centerText: { marginTop: 8, color: '#666' },
  panelInner: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    padding: 10,
    marginBottom: 12,
  },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  dateFilterWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111',
    backgroundColor: '#fff',
  },
  dateFilterInput: { flex: 1 },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  searchHalf: { flex: 1 },

  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    marginBottom: 12,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1, paddingRight: 8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  detailItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCFCE7',
    padding: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  detailLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  detailValue: { fontSize: 12, color: '#111827', fontWeight: '700' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  createBtnText: { color: '#fff', fontWeight: '700' },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: '#EAF7EF',
  },
  loadMoreText: { color: '#166534', fontWeight: '700' },

  formModalRoot: {
    flex: 1,
  },
  formModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000077',
  },
  formModalCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  formModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '86%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  formModalCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111',
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dateInputLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  dateInputText: { marginTop: 4, fontSize: 13, color: '#111', fontWeight: '600' },
  dateInputPlaceholder: { marginTop: 4, fontSize: 13, color: '#9CA3AF' },
  submitBtn: {
    backgroundColor: '#319241',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: { color: '#fff', fontWeight: '700' },

  searchBox: { position: 'relative', marginBottom: 10 },
  searchRowInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputFlex: { flex: 1 },
  scanBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    zIndex: 10,
    elevation: 4,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EFEFEF' },
  dropdownTitle: { fontSize: 13, fontWeight: '700', color: '#111' },
  dropdownMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#1E3A8A' },
  chipRemove: { fontSize: 12, fontWeight: '700', color: '#1E3A8A' },

  scannerControls: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
  },
  scannerBtn: {
    backgroundColor: '#000000AA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  scannerBtnText: { color: '#fff', fontWeight: '700' },
  permissionDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
});
