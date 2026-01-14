import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import reportbg from '../assets/images/report-bg.png';
import DateRangePickerModal from '../components/DateRangePickerModal';
import { SectionCard, currency, safeNumber, sumBy } from '../components/reports/shared/ReportUI';
import { TopSellingCatgegoriesReport } from '../functions/reports/pos_reports';

export default function TopSellingCategoriesReport() {
  const pad = (n) => String(n).padStart(2, '0');
  const fmtLocal = (d) => {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  };
  const fmtDateOnly = (d) => {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  };
  const formatNumber = (value, digits = 2) =>
    safeNumber(value).toLocaleString(undefined, { maximumFractionDigits: digits });

  const [pickerVisible, setPickerVisible] = useState(false);
  const [rows, setRows] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [numCategories, setNumCategories] = useState('10');
  const [hasSearched, setHasSearched] = useState(false);

  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  });

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const styles = getStyles(isTablet);

  const reqIdRef = useRef(0);

  const handleTopSellingReport = useCallback(async (startDate, endDate, numberOfCategories) => {
    const id = ++reqIdRef.current;
    setLoading(true);
    setErrorMsg('');
    try {
      const report = await TopSellingCatgegoriesReport(
        fmtLocal(startDate),
        fmtLocal(endDate),
        numberOfCategories
      );
      if (id !== reqIdRef.current) return;
      const list = Array.isArray(report) ? report : [];
      const sorted = [...list].sort(
        (a, b) => safeNumber(b?.sale_amount) - safeNumber(a?.sale_amount)
      );
      setRows(sorted);
      setLoading(false);
    } catch (e) {
      if (id !== reqIdRef.current) return;
      setRows([]);
      setLoading(false);
      setErrorMsg(e?.message || 'Failed to load report.');
      console.log('error:', e?.message || e);
    }
  }, []);

  const { totalSale, totalCost, totalQty, totalTax, totalPartners, avgGmp } = useMemo(() => {
    const totalSale = sumBy(rows, (x) => safeNumber(x?.sale_amount));
    const totalCost = sumBy(rows, (x) => safeNumber(x?.cost));
    const totalQty = sumBy(rows, (x) => safeNumber(x?.qty));
    const totalTax = sumBy(rows, (x) => safeNumber(x?.tax_amount));
    const totalPartners = sumBy(rows, (x) => safeNumber(x?.partner_count));
    const gmpSum = sumBy(rows, (x) => safeNumber(x?.gmp));
    const avgGmp = rows.length ? gmpSum / rows.length : 0;
    return { totalSale, totalCost, totalQty, totalTax, totalPartners, avgGmp };
  }, [rows]);

  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

  const renderHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.th, styles.colName]}>NAME</Text>
      <Text style={[styles.th, styles.colSale]}>SALE AMOUNT</Text>
      <Text style={[styles.th, styles.colQty]}>QTY</Text>
    </View>
  );

  const toggleExpand = (rowId) => {
    setExpandedId((prev) => (prev === rowId ? null : rowId));
  };

  const renderItem = ({ item, index }) => {
    const rowId = `${item?.name || 'cat'}-${index}`;
    const isExpanded = expandedId === rowId;
    return (
      <TouchableOpacity
        onPress={() => toggleExpand(rowId)}
        activeOpacity={0.8}
        style={[styles.tr, index % 2 === 1 && styles.trAlt]}
      >
        <View style={styles.rowMain}>
          <Text style={[styles.td, styles.colName]} numberOfLines={1}>
            {item?.name || '-'}
          </Text>
          <Text style={[styles.td, styles.colSale]} numberOfLines={1}>
            $ {currency(safeNumber(item?.sale_amount))}
          </Text>
          <Text style={[styles.td, styles.colQty]} numberOfLines={1}>
            {formatNumber(item?.qty)}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.expanded}>
            {[
              ['Cost', `$ ${currency(safeNumber(item?.cost))}`],
              ['Tax Amount', `$ ${currency(safeNumber(item?.tax_amount))}`],
              ['Partner Count', formatNumber(item?.partner_count, 0)],
              ['GMP %', `${formatNumber(item?.gmp)}%`],
            ].map(([label, value], idx) => (
              <View key={`${label}-${idx}`} style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>{label}:</Text>
                <Text style={styles.expandedValue}>{value || '-'}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground source={getImageSource(reportbg)} style={styles.screen} resizeMode="cover">
      <AppHeader Title="TOP SELLING CATEGORIES" backgroundType="image" backgroundValue={reportbg} />

      <View style={styles.dateCard}>
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={styles.dateCardHeader}
        >
          <Text style={styles.dateCardHeaderText}>Select Date & Time</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setPickerVisible(true)}>
          <View style={styles.datetimeselector}>
            <View style={styles.dateshow}>
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateBadge}>{fmtDateOnly(range.start)}</Text>
            </View>
            <View style={styles.dateshow}>
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateBadge}>{fmtDateOnly(range.end)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <DateRangePickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onApply={({ start, end }) => {
            setRange({ start, end });
            setPickerVisible(false);
          }}
          initialPreset="today"
        />
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Number of Categories</Text>
        <TextInput
          value={numCategories}
          onChangeText={setNumCategories}
          placeholder="10"
          keyboardType="numeric"
          style={styles.filterInput}
          placeholderTextColor="#6b7280"
        />
        <TouchableOpacity
          style={styles.getResultBtn}
          onPress={() => {
            setHasSearched(true);
            setExpandedId(null);
            handleTopSellingReport(range.start, range.end, numCategories);
          }}
        >
          <Text style={styles.getResultText}>Get Result</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panelInner}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" />
              <Text style={styles.centerText}>Loading…</Text>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.centerText}>
                {hasSearched ? (errorMsg || 'No category data for this range.') : 'Select filters and tap Get Result.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <SectionCard title="Overview">
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Sales</Text>
                    <Text style={styles.statValue}>$ {currency(totalSale)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Cost</Text>
                    <Text style={styles.statValue}>$ {currency(totalCost)}</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Qty</Text>
                    <Text style={styles.statValue}>{formatNumber(totalQty)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Avg GMP %</Text>
                    <Text style={styles.statValue}>{formatNumber(avgGmp)}%</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Tax</Text>
                    <Text style={styles.statValue}>$ {currency(totalTax)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Partners</Text>
                    <Text style={styles.statValue}>{formatNumber(totalPartners, 0)}</Text>
                  </View>
                </View>
              </SectionCard>

              <SectionCard title="Category Details">
                <View style={styles.tableWrap}>
                  <View style={styles.tableTitleRow}>
                    <Text style={styles.tableTitle}>Top Selling Categories</Text>
                    <Text style={styles.tableCount}>({rows.length})</Text>
                  </View>
                  {renderHeader()}
                  <FlatList
                    data={rows}
                    keyExtractor={(item, idx) => `${item?.name || 'cat'}-${idx}`}
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    scrollEnabled={false}
                  />
                </View>
              </SectionCard>
            </View>
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const getStyles = (isTablet) =>
  StyleSheet.create({
    screen: { flex: 1 },

    dateCard: {
      margin: 20,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#D9D9D9',
    },
    dateCardHeader: {
      padding: 12,
      alignItems: 'center',
      borderBottomColor: '#D9D9D9',
      borderBottomWidth: 2,
    },
    dateCardHeaderText: { color: '#2e7d32', fontWeight: '700' },
    datetimeselector: { flexDirection: 'row', marginTop: 12, alignSelf: 'center' },
    dateshow: { marginHorizontal: 6 },
    dateLabel: { color: '#1f1f1f', fontWeight: '600' },
    dateBadge: {
      padding: 10,
      alignItems: 'center',
      borderColor: '#D9D9D9',
      borderWidth: 2,
      marginVertical: 10,
      marginRight: 5,
      borderRadius: 8,
      color: '#1f1f1f',
    },

    filterCard: {
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: '#fff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#D9D9D9',
      padding: 12,
    },
    filterLabel: { color: '#1f1f1f', fontWeight: '600', marginBottom: 8 },
    filterInput: {
      borderWidth: 1,
      borderColor: '#D9D9D9',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      color: '#1f1f1f',
      backgroundColor: '#fff',
    },
    getResultBtn: {
      marginTop: 12,
      backgroundColor: '#2e7d32',
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    getResultText: { color: '#fff', fontWeight: '700' },

    panelInner: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.85)',
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingVertical: isTablet ? 14 : 10,
      paddingHorizontal: isTablet ? 16 : 12,
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

    centerState: { paddingVertical: 40, alignItems: 'center' },
    centerText: { marginTop: 8, color: '#666' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    statBox: {
      flex: 1,
      backgroundColor: '#FFF7E6',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    statLabel: { fontSize: 12, color: '#555', marginBottom: 4, fontWeight: '700' },
    statValue: { fontSize: 16, color: '#111', fontWeight: '800' },

    tableWrap: {
      backgroundColor: '#fff',
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#EEE',
    },
    tableTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: '#fff',
      gap: 6,
    },
    tableTitle: { fontSize: 14, fontWeight: '800', color: '#111' },
    tableCount: { fontSize: 12, color: '#666', fontWeight: '700' },

    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#FAFAFA',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: '#E6E6E6',
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    th: { fontSize: 12, fontWeight: '800', color: '#333' },

    tr: {
      flexDirection: 'column',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: '#FFF',
    },
    trAlt: { backgroundColor: '#FCFCFC' },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#EFEFEF' },
    td: { fontSize: 12, color: '#222' },

    rowMain: { flexDirection: 'row', alignItems: 'center', width: '100%' },
    expanded: {
      marginTop: 8,
      backgroundColor: '#F8F8F8',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    expandedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    expandedLabel: { fontSize: 12, fontWeight: '700', color: '#333', width: 120 },
    expandedValue: { fontSize: 12, color: '#222', flex: 1 },

    colName: { flex: 2, paddingRight: 8 },
    colSale: { flex: 1, textAlign: 'right', paddingRight: 8 },
    colQty: { flex: 1, textAlign: 'right' },
  });
