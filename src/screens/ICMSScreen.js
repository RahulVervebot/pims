import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, useWindowDimensions, Platform,TouchableOpacity } from 'react-native';
import CustomHeader from '../components/CustomHeader';
import reportbg from '../assets/images/report-bg.png';
import HourlyReport from '../assets/icons/Hourly-Reports.png';
import SaleSummaryReport from '../assets/icons/Sales-Summary-Report.png';
import TopCustumerList from '../assets/icons/Top-Customers-List.png';
import TopSellingProducts from '../assets/icons/Top-Selling-Products.png'
import TopSellingCategories from '../assets/icons/Top-Selling-Categories.png'
import { useNavigation } from '@react-navigation/native';

const PANEL_RADIUS = 28;

export default function ICMSScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const styles = getStyles(isTablet);
 const navigation = useNavigation();
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
      <CustomHeader Title="TULSI AI"
      backgroundType="image" backgroundValue={reportbg}>
      </CustomHeader>  
        <View style={styles.panelInner}>
           <TouchableOpacity
                      style={styles.checkoutBtn}
                      onPress={() => navigation.navigate('OcrScreen')}
                    >
                  <Row icon={SaleSummaryReport} label="Create New Invoice" isFirst />
                    </TouchableOpacity>
               <TouchableOpacity
                    onPress={()=> navigation.navigate('InvoiceList')}
                  >
                  <Row icon={TopCustumerList} label="Invoice List" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('RedProducts')}>
                    <Row icon={TopSellingProducts} label="Red Products" isLast />
                  </TouchableOpacity>
        </View>
        </ImageBackground>
  );
  
}


const getStyles = (isTablet) => StyleSheet.create({
  screen: {
    flex: 1,
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
