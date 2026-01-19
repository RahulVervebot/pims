import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import CustomHeader from '../components/CustomHeader';
import reportbg from '../assets/images/report-bg.png';
import HourlyReport from '../assets/icons/Hourly-Reports.png';
import SaleSummaryReport from '../assets/icons/Sales-Summary-Report.png';
import TopCustumerList from '../assets/icons/Top-Customers-List.png';
import TopSellingProducts from '../assets/icons/Top-Selling-Products.png';
import TopSellingCategories from '../assets/icons/Top-Selling-Categories.png';
import CreateCategoryModal from '../components/CreateCategoryModal';
import { useNavigation } from '@react-navigation/native';
import CreateProductModal from '../components/CreateProductModal';
const PANEL_RADIUS = 28;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function POSScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const styles = getStyles(isTablet);
  const navigation = useNavigation();
  const [showProductCreate, setShowProductCreate] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const getImageSource = (val) => (typeof val === 'number' ? val : { uri: val });

  const [expanded, setExpanded] = useState({
    promo: true,
    print: false,
    category: false,
  });

  const toggle = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const Row = ({ icon, label, isFirst, isLast, onPress, right }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.row,
        isFirst && styles.rowFirst,
        !isLast && styles.rowDivider,
        { justifyContent: 'space-between' }, // inline only
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 14 : 10 }}>
        <Image source={icon} style={styles.rowIcon} resizeMode="contain" />
        <Text style={styles.rowTitle}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <ImageBackground source={getImageSource(reportbg)} style={styles.screen} resizeMode="cover">
      <CustomHeader Title="POS" backgroundType="image" backgroundValue={reportbg} />

      <View style={styles.panelInner}>
        {/* PROMOTIONS (Accordion) */}
        <Row
          icon={SaleSummaryReport}
          label="Promotions"
          isFirst
          onPress={() => toggle('promo')}
          right={<Text style={{ fontSize: 22,color:"#000" }}>{expanded.promo ? '−' : '+'}</Text>}
        />
        {expanded.promo && (
          <View>
            <Row
              icon={TopSellingProducts}
              label="Mix Match"
              onPress={() => navigation.navigate('MixMatchScreen')}
              right={null}
            />
            <Row
              icon={TopSellingCategories}
              label="Quantity Discount"
              isLast
              onPress={() => navigation.navigate('QuantityDiscountScreen')}
              right={null}
            />
          </View>
        )}

        {/* PRINT (Accordion) */}
        <Row
          icon={HourlyReport}
          label="Print"
          onPress={() => toggle('print')}
          right={<Text style={{fontSize: 22,color:"#000"  }}>{expanded.print ? '−' : '+'}</Text>}
        />
        {expanded.print && (
          <View>
            <Row
              icon={TopCustumerList}
              label="Product Print"
              onPress={() => navigation.navigate('PrintScreen')}
              right={null}
            />
            <Row
              icon={TopCustumerList}
              label="Sale Print"
              isLast
              onPress={() => navigation.navigate('SalePrintScreen')}
              right={null}
            />
          </View>
        )}

        {/* PRODUCT CATEGORIES (Accordion) */}
        <Row
          icon={TopCustumerList}
          label="Product Managment"
          onPress={() => toggle('category')}
          right={<Text style={{ fontSize: 22,color:"#000" }}>{expanded.category ? '−' : '+'}</Text>}
        />
        {expanded.category && (
          <View>
          <Row
              icon={TopSellingProducts}
              label="Create Product"
              right={null}
                onPress={() => setShowProductCreate(true)}
            />
            <Row
              icon={TopSellingProducts}
              label="Create Category"
              right={null}
                onPress={() => setShowCreate(true)}
            />
         
            <Row
              icon={TopSellingCategories}
              label="Category List"
              isLast
              onPress={() => navigation.navigate('CategoryListScreen')}
              right={null}
            />
          </View>
        )}
      </View>
 <CreateCategoryModal
  visible={showCreate}
  onClose={() => setShowCreate(false)}
  onCreated={() => {
   fetchCategories();
  }}
/>
  <CreateProductModal
        visible={showProductCreate}
        onClose={() => setShowProductCreate(false)}
        onCreated={() => {
          // If you want to refresh immediately after product creation:
          setListReloadKey((k) => k + 1);
          setShowProductCreate(false);
        }}
      />
    </ImageBackground>
  );
}

const getStyles = (isTablet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
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

    // Panel
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
