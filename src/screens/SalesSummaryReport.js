// src/screens/SaleSummaryReport.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import reportbg from '../assets/images/report-bg.png';
import DateRangePickerModal from '../components/DateRangePickerModal';

// Reports container + tabs
import ReportTabs from '../components/reports/ReportTabs';
import PosPaymentCollectionTab from '../components/reports/tabs/PosPaymentCollectionTab';
import CashInOutTab from '../components/reports/tabs/CashInOutTab';
import RefundReportTab from '../components/reports/tabs/RefundReportTab';
import TaxReportTab from '../components/reports/tabs/TaxReportTab';
import DepartmentWiseReportTab from '../components/reports/tabs/DepartmentWiseReportTab';
import TaxSVG from '../assets/icons/Tax.svg'
import DepartmentSVG from '../assets/icons/Department-wise-report.svg';
import CashinoutSVG from '../assets/icons/cash-In-out.svg';
import PosPaymentCollectionSVG from '../assets/icons/Pos-Payment-Collection.svg';
import RefundReportSVG from '../assets/icons/RefundReport.svg';

// API functions
import {
  SaleSummaryPaymentType,
  SaleSummaryCashReport,
  SaleSummaryRefundReport,
  SaleSummaryTaxReport,
  SaleSummaryDepartmentAllianceReport,
} from '../functions/reports/pos_reports';

const PANEL_RADIUS = 28;

export default function SaleSummaryReport() {
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

  const [pickerVisible, setPickerVisible] = useState(false);

  // ✅ Stable initial shapes (avoid `false`)
  const [paymentTypeReport, setPaymentTypeReport] = useState([]);
  const [cashInOutReport, setCashInOutReport] = useState({});
  const [refundReport, setRefundReport] = useState({
    total_refunds: 0,
    total_refunds_count: 0,
    refund_data: [],
  });
  const [taxReport, setTaxReport] = useState({});
  const [departmentReport, setDepartmentReport] = useState({});

  // Date range (defaults to today)
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { start, end };
  });

  // UI sizing
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const styles = getStyles(isTablet);

  // Prevent race conditions (ignore late responses)
  const reqIdRef = useRef(0);

  // ✅ Fetcher uses explicit dates + runs all calls in parallel
  const handleSaleSummaryReport = useCallback(async (startDate, endDate) => {
    const id = ++reqIdRef.current;
    const s = fmtLocal(startDate);
    const e = fmtLocal(endDate);

    try {
      const [
        paymentreport,
        cashreport,
        refundreport,
        gettaxreport,
        getDepartmentreport,
      ] = await Promise.all([
        SaleSummaryPaymentType(s, e),
        SaleSummaryCashReport(s, e),
        SaleSummaryRefundReport(s, e),
        SaleSummaryTaxReport(s, e),
        SaleSummaryDepartmentAllianceReport(s, e),
      ]);

      if (id !== reqIdRef.current) return; // newer request already in flight/completed

      setPaymentTypeReport(paymentreport || []);
      setCashInOutReport(cashreport || {});
      setRefundReport(
        refundreport || { total_refunds: 0, total_refunds_count: 0, refund_data: [] }
      );
      setTaxReport(gettaxreport || {});
      setDepartmentReport(getDepartmentreport || {});
    } catch (e) {
      if (id !== reqIdRef.current) return;
      console.log('error:', e?.message || e);

      // keep UI stable
      setPaymentTypeReport([]);
      setCashInOutReport({});
      setRefundReport({ total_refunds: 0, total_refunds_count: 0, refund_data: [] });
      setTaxReport({});
      setDepartmentReport({});
    }
  }, []);

  // ✅ Run fetcher whenever range changes
  useEffect(() => {
    handleSaleSummaryReport(range.start, range.end);
  }, [range.start, range.end, handleSaleSummaryReport]);

  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

  const Row = ({ icon, label, isFirst, isLast }) => (
    <View
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        !isLast && styles.rowDivider,
      ]}
    >
      <Image source={icon} style={styles.rowIcon} resizeMode="contain" />
      <Text style={styles.rowTitle}>{label}</Text>
    </View>
  );

  return (
    <ImageBackground
      source={getImageSource(reportbg)}
      style={styles.screen}
      resizeMode="cover"
    >
      <AppHeader Title="SALES SUMMARY REPORT" backgroundType="image" backgroundValue={reportbg} />

      {/* Date Selector Card */}
      <View style={{ margin: 20, backgroundColor: '#fff', borderRadius: 8 }}>
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            padding: 12,
            alignItems: 'center',
            borderBottomColor: '#D9D9D9',
            borderBottomWidth: 2,
          }}
        >
          <Text style={{ color: '#e38500', fontWeight: '700' }}>
            Select Date & Time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setPickerVisible(true)}>
          <View style={styles.datetimeselector}>
            <View style={styles.dateshow}>
              <Text>From</Text>
              <Text
                style={{
                  padding: 10,
                  alignItems: 'center',
                  borderColor: '#D9D9D9',
                  borderWidth: 2,
                  marginVertical: 10,
                  marginRight: 5,
                  borderRadius: 8,
                }}
              >
                {fmtLocal(range.start)}
              </Text>
            </View>

            <View style={styles.dateshow}>
              <Text>To</Text>
              <Text
                style={{
                  padding: 10,
                  alignItems: 'center',
                  borderColor: '#D9D9D9',
                  borderWidth: 2,
                  marginVertical: 10,
                  marginRight: 5,
                  borderRadius: 8,
                }}
              >
                {fmtLocal(range.end)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <DateRangePickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onApply={({ start, end }) => {
            // ✅ Only set state; useEffect will fetch with the latest dates
            setRange({ start, end });
            setPickerVisible(false);
          }}
          initialPreset="today"
        />
      </View>

      {/* Content Panel */}
      <View style={styles.panelInner}>
        <ReportTabs
          initialTab="POS Payment Collection"
          tabs={[
            { key: 'POS Payment Collection', component: PosPaymentCollectionTab,icon: PosPaymentCollectionSVG  },
            { key: 'Cash In & Out', component: CashInOutTab,icon: CashinoutSVG  },
            // { key: 'Cash Tender Details', component: CashTenderDetailsTab }, // later
            { key: 'Tax Report', component: TaxReportTab,icon: TaxSVG },
            { key: 'Refund Report', component: RefundReportTab,icon: RefundReportSVG  },
            { key: 'Department Wise Report', component: DepartmentWiseReportTab, icon: DepartmentSVG },
          ]}
          apiData={{
            'POS Payment Collection': paymentTypeReport || [],
            'Cash In & Out': cashInOutReport || {},
            'Refund Report': refundReport || {
              total_refunds: 0,
              total_refunds_count: 0,
              refund_data: [],
            },
            'Tax Report': taxReport || {},
            'Department Wise Report': departmentReport || {},
          }}
          onTabChange={(tab) => console.log('Active tab: ', tab)}
        />
      </View>
    </ImageBackground>
  );
}

const getStyles = (isTablet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },

    datetimeselector: {
      flexDirection: 'row',
      marginTop: 12,
      alignSelf: 'center',
    },

    dateshow: {
      marginHorizontal: 6,
    },

    // Header
    headerTitle: {
      fontSize: isTablet ? 24 : 20,
      fontWeight: '700',
      color: '#000',
      paddingBottom: 10,
    },
    headerUnderline: {
      alignSelf: 'center',
      width: isTablet ? 160 : 120,
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: 2,
      marginTop: 2,
    },

    // Panel (the image background area)
    panel: {
      flex: 1,
      paddingTop: isTablet ? 24 : 16,
      paddingHorizontal: isTablet ? 28 : 16,
      backgroundColor: '#fff',
      borderTopLeftRadius: PANEL_RADIUS,
      borderTopRightRadius: PANEL_RADIUS,

      ...Platform.select({
        android: { elevation: 2 },
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: -2 },
        },
      }),
    },
    panelImage: {
      borderTopLeftRadius: PANEL_RADIUS,
      borderTopRightRadius: PANEL_RADIUS,
    },
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

    // Rows (not used right now, kept for parity)
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: isTablet ? 16 : 12,
      gap: isTablet ? 14 : 10,
    },
    rowFirst: {
      paddingTop: isTablet ? 16 : 8,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(0,0,0,0.12)',
    },
    rowIcon: {
      width: isTablet ? 36 : 28,
      height: isTablet ? 36 : 28,
    },
    rowTitle: {
      flexShrink: 1,
      fontSize: isTablet ? 20 : 16,
      fontWeight: '600',
      color: '#111',
      letterSpacing: 0.2,
    },
  });
