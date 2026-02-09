import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import AppHeader from '../AppHeader';
import reportbg from '../../assets/images/report-bg.png';
import DateRangePickerModal from '../DateRangePickerModal';
import { Picker } from '@react-native-picker/picker';
import { getPosOrders, getOrderPreview, printOrderReport } from './function';
import { getRegisterList } from '../../functions/reports/pos_reports';

export default function OrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filters, setFilters] = useState({
    min_amount: '',
    max_amount: '',
    start_date: '',
    end_date: '',
    auth_code: '',
    card_number: '',
    page: '1',
    limit: '10',
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [printMessage, setPrintMessage] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  });

  const fetchOrders = useCallback(async (nextFilters, options) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getPosOrders(nextFilters || filters, options);
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (err) {
      setOrders([]);
      setErrorMsg(err?.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders(filters);
  }, []);

  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const formatDate = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hasActiveFilters = !!(
    (filters.min_amount && String(filters.min_amount).trim().length > 0) ||
    (filters.max_amount && String(filters.max_amount).trim().length > 0) ||
    (filters.start_date && String(filters.start_date).trim().length > 0) ||
    (filters.end_date && String(filters.end_date).trim().length > 0) ||
    (filters.auth_code && String(filters.auth_code).trim().length > 0) ||
    (filters.card_number && String(filters.card_number).trim().length > 0)
  );

  const renderCard = ({ item }) => {
    const order = item?.order || {};
    const amount = item?.amounts || {};
    const fields = [
      ['ID', order.id],
      ['Order Date', order.order_date],
      ['Session', order.session],
      ['Cashier', order.cashier],
      ['Customer', order.customer || '-'],
      ['POS Reference', order.pos_reference],
    ];

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => handlePreview(order.id)}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {order.name || 'Order'}
          </Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>Total </Text>
            <Text style={styles.totalBadgeValue}>${amount.total ?? 0}</Text>
          </View>
        </View>

        <View style={styles.cardChips}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{order.state || 'unknown'}</Text>
          </View>
          <View style={styles.chipMuted}>
            <Text style={styles.chipTextMuted}>{order.pos_config || '-'}</Text>
          </View>
        </View>

        <View style={styles.cardGrid}>
          {fields.map(([label, value]) => (
            <View key={label} style={styles.cardCell}>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {value ?? '-'}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const handlePreview = async (orderId) => {
    if (!orderId) return;
    try {
      setPreviewVisible(true);
      setPreviewLoading(true);
      setPreviewError('');
      setPreviewData(null);
      setSelectedOrderId(orderId);
      setSelectedRegisterId('');
      setPrintMessage('');
      const data = await getOrderPreview(orderId);
      setPreviewData(data?.receipt || null);
    } catch (err) {
      setPreviewError(err?.message || 'Failed to load order preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const loadRegisters = async () => {
      if (!previewVisible) return;
      try {
        setRegisterLoading(true);
        const data = await getRegisterList();
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        list.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
        setRegisters(list);
      } catch {
        if (!active) return;
        setRegisters([]);
      } finally {
        if (active) setRegisterLoading(false);
      }
    };
    loadRegisters();
    return () => {
      active = false;
    };
  }, [previewVisible]);

  const handlePrint = async () => {
    if (!selectedOrderId || !selectedRegisterId || printLoading) return;
    try {
      setPrintLoading(true);
      setPrintMessage('');
      const res = await printOrderReport([selectedOrderId], selectedRegisterId);
      const msg =
        res?.message ||
        res?.result?.message ||
        res?.error?.message ||
        res?.error ||
        'Print request sent';
      setPrintMessage(msg);
    } catch (err) {
      setPrintMessage(err?.message || 'Print failed');
    } finally {
      setPrintLoading(false);
    }
  };

  const money = (v) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <View style={styles.screen}>
      <AppHeader Title="ORDERS" backgroundType="image" backgroundValue={reportbg} />

      <View style={styles.content}>
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <TextInput
              value={filters.min_amount}
              onChangeText={(v) => updateFilter('min_amount', v)}
              placeholder="Min Amount"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
              keyboardType="numeric"
            />
            <TextInput
              value={filters.max_amount}
              onChangeText={(v) => updateFilter('max_amount', v)}
              placeholder="Max Amount"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setPickerVisible(true)}>
              <Text style={styles.datePickerLabel}>Start Date</Text>
              <Text style={styles.datePickerValue}>{filters.start_date || 'Select date'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setPickerVisible(true)}>
              <Text style={styles.datePickerLabel}>End Date</Text>
              <Text style={styles.datePickerValue}>{filters.end_date || 'Select date'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterRow}>
            <TextInput
              value={filters.auth_code}
              onChangeText={(v) => updateFilter('auth_code', v)}
              placeholder="Auth Code"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
              autoCapitalize="none"
            />
            <TextInput
              value={filters.card_number}
              onChangeText={(v) => updateFilter('card_number', v)}
              placeholder="Card Number"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.filterRow}>
            <TextInput
              value={filters.page}
              onChangeText={(v) => updateFilter('page', v)}
              placeholder="Page"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
              keyboardType="numeric"
            />
            <TextInput
              value={filters.limit}
              onChangeText={(v) => updateFilter('limit', v)}
              placeholder="Limit"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.searchBtn} onPress={() => fetchOrders(filters, { useFilter: true })}>
              <Text style={styles.searchBtnText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.clearBtn, !hasActiveFilters && styles.clearBtnDisabled]}
              onPress={() => {
                if (!hasActiveFilters) return;
                setFilters((prev) => ({
                  ...prev,
                  min_amount: '',
                  max_amount: '',
                  start_date: '',
                  end_date: '',
                  auth_code: '',
                  card_number: '',
                  page: '1',
                  limit: '10',
                }));
                fetchOrders({ page: '1', limit: '10' });
              }}
              disabled={!hasActiveFilters}
            >
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No orders found.</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item, idx) => `${item?.order?.id || 'order'}-${idx}`}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <DateRangePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onApply={({ start, end }) => {
          setRange({ start, end });
          const startDate = formatDate(start);
          const endDate = formatDate(end);
          updateFilter('start_date', startDate);
          updateFilter('end_date', endDate);
          setPickerVisible(false);
        }}
        initialPreset="custom"
        initialStart={range.start}
        initialEnd={range.end}
      />

      <Modal visible={previewVisible} transparent animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Receipt</Text>
              <TouchableOpacity onPress={() => setPreviewVisible(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {previewLoading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.loadingText}>Loading receipt…</Text>
                </View>
              ) : previewError ? (
                <Text style={styles.errorText}>{previewError}</Text>
              ) : previewData ? (
                <View style={styles.receiptWrap}>
                  <View style={styles.receiptHeader}>
                    <Text style={styles.receiptTitle}>{previewData?.company?.name || '-'}</Text>
                    <Text style={styles.receiptText}>{previewData?.company?.phone || '-'}</Text>
                    <Text style={styles.receiptText}>{previewData?.company?.email || '-'}</Text>
                    <Text style={styles.receiptText}>{previewData?.header || 'Sales Receipt'}</Text>
                  </View>

                  <Text style={styles.receiptLine}>------------------------------------------</Text>

                  <View style={styles.receiptSection}>
                    {[
                      ['Register', previewData?.register],
                      ['Order No', previewData?.order_no],
                      ['Date', previewData?.formatted_validation_date],
                      ['Cashier', previewData?.cashier || '-'],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.receiptRow}>
                        <Text style={styles.receiptText}>{label}</Text>
                        <Text style={styles.receiptText}>{value || '-'}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.receiptLine}>------------------------------------------</Text>

                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>ITEMS</Text>
                    {(previewData?.orderlines || []).map((line, idx) => (
                      <View key={`${line?.product_name || 'item'}-${idx}`} style={styles.receiptItem}>
                        <Text style={styles.receiptText} numberOfLines={2}>
                          {line?.product_name || '-'}
                        </Text>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptText}>
                            {line?.quantity} {line?.unit_name || ''} @ {money(line?.price_display ?? line?.price)}
                          </Text>
                          <Text style={styles.receiptText}>$ {money(line?.price_subtotal_incl)}</Text>
                        </View>
                        {line?.discount ? (
                          <Text style={styles.receiptText}>Discount: {line?.discount}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  <Text style={styles.receiptLine}>------------------------------------------</Text>

                  <View style={styles.receiptSection}>
                    {[
                      ['Subtotal', previewData?.subtotal],
                      ['Total Tax', previewData?.total_tax],
                      ['Total Items', previewData?.total_item],
                      ['Total With Tax', previewData?.total_with_tax],
                      ['Total Discount', previewData?.total_discount],
                      ['Change', previewData?.change],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.receiptRow}>
                        <Text style={styles.receiptText}>{label}</Text>
                        <Text style={styles.receiptText}>
                          {label === 'Total Items' ? value ?? 0 : `$ ${money(value)}`}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {Array.isArray(previewData?.tax_details) && previewData.tax_details.length > 0 && (
                    <>
                      <Text style={styles.receiptLine}>------------------------------------------</Text>
                      <View style={styles.receiptSection}>
                        <Text style={styles.receiptLabel}>TAX DETAILS</Text>
                        {previewData.tax_details.map((t, idx) => (
                          <View key={`${t?.tax?.name || 'tax'}-${idx}`} style={styles.receiptRow}>
                            <Text style={styles.receiptText}>
                              {t?.tax?.name || 'Tax'} ({t?.tax?.rate ?? 0}%)
                            </Text>
                            <Text style={styles.receiptText}>$ {money(t?.amount)}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {Array.isArray(previewData?.paymentlines) && previewData.paymentlines.length > 0 && (
                    <>
                      <Text style={styles.receiptLine}>------------------------------------------</Text>
                      <View style={styles.receiptSection}>
                        <Text style={styles.receiptLabel}>PAYMENTS</Text>
                        {previewData.paymentlines.map((p, idx) => (
                          <View key={`${p?.journal || 'pay'}-${idx}`} style={styles.receiptRow}>
                            <Text style={styles.receiptText}>{p?.journal || '-'}</Text>
                            <Text style={styles.receiptText}>$ {money(p?.amount)}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {previewData?.loyalty && (
                    <>
                      <Text style={styles.receiptLine}>------------------------------------------</Text>
                      <View style={styles.receiptSection}>
                        <Text style={styles.receiptLabel}>LOYALTY</Text>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptText}>Earned Points</Text>
                          <Text style={styles.receiptText}>
                            {money(previewData?.loyalty?.earned_loyalty_points)}
                          </Text>
                        </View>
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptText}>Total Points</Text>
                          <Text style={styles.receiptText}>
                            {money(previewData?.loyalty?.total_loyalty_points)}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {previewData?.footer_text ? (
                    <>
                      <Text style={styles.receiptLine}>------------------------------------------</Text>
                      <Text style={styles.receiptFooter}>{previewData.footer_text}</Text>
                    </>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.printSection}>
                <Text style={styles.printLabel}>Select Register</Text>
                <View style={styles.printRow}>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={selectedRegisterId}
                      onValueChange={(val) => setSelectedRegisterId(val)}
                      dropdownIconColor="#333"
                      style={styles.picker}
                    >
                      <Picker.Item label={registerLoading ? 'Loading...' : 'Select Register'} value="" />
                      {registers.map((r) => (
                        <Picker.Item key={String(r.id)} label={String(r.name)} value={String(r.id)} />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity
                    style={[styles.printBtn, (!selectedRegisterId || printLoading) && styles.printBtnDisabled]}
                    onPress={handlePrint}
                    disabled={!selectedRegisterId || printLoading}
                  >
                    <Text style={styles.printBtnText}>
                      {printLoading ? 'Printing...' : 'Print Receipt'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!!printMessage && (
                  <Text style={styles.printMessage}>{printMessage}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F7F8' },
  content: { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16 },

  filterCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111',
  },
  datePickerBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  datePickerLabel: { fontSize: 10, fontWeight: '800', color: '#111', marginBottom: 4 },
  datePickerValue: { fontSize: 12, color: '#333' },
  searchBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  filterActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  clearBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  clearBtnDisabled: { opacity: 0.5 },
  clearBtnText: { color: '#111', fontWeight: '800', fontSize: 12 },

  centered: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 8, color: '#666' },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#666', fontSize: 13, fontStyle: 'italic' },

  grid: { paddingBottom: 12 },
  gridRow: { gap: 10 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#111', flex: 1 },
  totalBadge: { backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'flex-end',flexDirection:"row" },
  totalBadgeLabel: { fontSize: 12, fontWeight: '800', color: '#15803D' },
  totalBadgeValue: { fontSize: 12, fontWeight: '800', color: '#166534' },
  cardChips: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 6 },
  chip: { backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 10, fontWeight: '700', color: '#0369A1' },
  chipMuted: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  chipTextMuted: { fontSize: 10, fontWeight: '700', color: '#475569' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 8 },
  cardCell: { width: '48%' },
  cardLabel: { fontSize: 9, fontWeight: '800', color: '#111' },
  cardValue: { fontSize: 11, color: '#333', marginTop: 2 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 14, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#EEE' },
  modalTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  modalClose: { fontSize: 12, fontWeight: '700', color: '#111' },
  modalBody: { padding: 14 },

  receiptWrap: { gap: 12 },
  receiptHeader: { alignItems: 'center', gap: 4 },
  receiptTitle: { fontSize: 16, fontWeight: '800', color: '#111', textAlign: 'center' },
  receiptText: {
    fontSize: 12,
    color: '#111',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  receiptSection: { gap: 4 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  receiptItem: { gap: 4 },
  receiptLine: {
    fontSize: 12,
    color: '#111',
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  receiptFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#111',
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  printSection: { marginTop: 16, gap: 10 },
  printLabel: { fontSize: 12, fontWeight: '800', color: '#111' },
  printRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  pickerWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: { height: 44, width: '100%', color: '#111' },
  printBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  printBtnDisabled: { opacity: 0.5 },
  printBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  printMessage: { fontSize: 12, color: '#111', textAlign: 'center' },
});