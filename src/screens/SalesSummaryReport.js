import React,{useState} from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, useWindowDimensions, Platform,TouchableOpacity } from 'react-native';
import CustomHeader from '../components/CustomHeader';
import AppHeader from '../components/AppHeader';
import ReportIcon from '../assets/icons/Reportsicon.svg';
import reportbg from '../assets/images/report-bg.png';
import HourlyReport from '../assets/icons/Hourly-Reports.png';
import SaleSummaryReportIcon from '../assets/icons/Sales-Summary-Report.png';
import TopCustumerList from '../assets/icons/Top-Customers-List.png';
import TopSellingProducts from '../assets/icons/Top-Selling-Products.png'
import TopSellingCategories from '../assets/icons/Top-Selling-Categories.png'
import DateRangePickerModal from '../components/DateRangePickerModal';
import ReportTabs from '../components/ReportTabs';
const PANEL_RADIUS = 28;

export default function SaleSummaryReport() {
    const [pickerVisible, setPickerVisible] = useState(false);
  const [range, setRange] = useState(() => {
    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);
    return { start, end };
  });

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const styles = getStyles(isTablet);

  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });
  
  const Row = ({ icon, label, isFirst, isLast }) => (
    <View style={[
      styles.row,
      isFirst && styles.rowFirst,
      !isLast && styles.rowDivider
    ]}>
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
      <AppHeader Title="SALES SUMMARY REPORT"
      backgroundType="image" backgroundValue={reportbg}>
      </AppHeader>
      <View style={{ margin: 20,  backgroundColor: '#fff',borderRadius: 8 }}>
      <TouchableOpacity
        onPress={() => setPickerVisible(true)}
        style={{ padding: 12, alignItems:"center", borderBottomColor: "#D9D9D9",borderBottomWidth:2}}
      >
        <Text style={{ color: '#e38500', fontWeight: '700' }}>Select Date & Time</Text>
      </TouchableOpacity>
        <TouchableOpacity
        onPress={() => setPickerVisible(true)}
      >

  <View style={styles.datetimeselector}>
    <View style={styles.dateshow}>
      <Text >
        From
      </Text>
      <Text style={{padding: 10, alignItems:"center", borderColor: "#D9D9D9",borderWidth:2,marginVertical:10,marginRight:5,borderRadius: 8}}>
      {range.start.toString()}
      </Text>
      </View>
      <View style={styles.dateshow}>
      <Text>
        To
      </Text>
      <Text style={{padding: 10, alignItems:"center", borderColor: "#D9D9D9",borderWidth:2,marginVertical:10,marginRight:5,borderRadius: 8}}>
       {range.end.toString()}
      </Text>
      </View>
</View>
</TouchableOpacity>
      <DateRangePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onApply={({ start, end }) => {
          setRange({ start, end });   // <-- saved in useState for this screen
          setPickerVisible(false);
          // You can also trigger your API call here using start/end.
        }}
        // optional:
        initialPreset="today"
        // initialStart / initialEnd if you want to preload a custom range
      />
    </View>
        <View style={styles.panelInner}>
      <ReportTabs
        initialTab="POS Payment Collection"
        onTabChange={(tab) => console.log("Active tab:", tab)}
      />
       </View>
        </ImageBackground>
  );
}

const getStyles = (isTablet) => StyleSheet.create({
  screen: {
    flex: 1,
  },

  datetimeselector:{
  flexDirection:"row",
  marginTop:12,
  alignSelf:"center"
  },

  // Header
  headerTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '700',
    color: '#000',
    paddingBottom:10
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

    // nice subtle card feel against the header background
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
    flex :1,
    backgroundColor: 'rgba(255,255,255,0.85)', // helps separate items from bg image
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

  // Rows
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
    borderBottomColor: 'rgba(0,0,0,0.12)', // elegant separator under image+title
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
