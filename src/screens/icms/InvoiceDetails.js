//invoxie deatail.js
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Button,
  StyleSheet,
  TextInput,
  
  ImageBackground
} from 'react-native';
import AppHeader from '../../components/AppHeader.js';
import EditProduct from '../../components/icms/EditProduct.js';
import reportbg from '../../assets/images/report-bg.png';
import InvoiceRow from '../../components/icms/InvoiceRow.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinkProductModal from '../../components/icms/LinkProduct.js';
import { transparent } from 'react-native-paper/lib/typescript/styles/themes/v2/colors.js';

// Enable Layout Animation for Android

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
 const getImageSource = val => (typeof val === 'number' ? val : { uri: val });
 
export default function InvoiceDetails() {
  const itemsRef = useRef([]);

  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkingItem, setLinkingItem] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [InvoiceDetails, setInvoiceDetails] = useState(null);
  const [query, setQuery] = useState('');
  const navigation = useNavigation();
  const route = useRoute();
  const { Invoice } = route.params;

  useEffect(() => {
    setInvoiceDetails(Invoice);
    itemsRef.current = Array.isArray(Invoice?.InvoiceData)
      ? Invoice.InvoiceData
      : [];
  }, [Invoice]);
  const day = Invoice?.SavedDate;
  const InvNumber = Invoice?.SavedInvoiceNo;
  const vendorName = Invoice?.InvoiceName;
  const items = itemsRef.current;
  const totalExtendedPrice = items.reduce(
    (sum, item) => sum + Number(item.extendedPrice),
    0,
  );
  const totalUnitPrice = items.reduce(
    (sum, item) => sum + Number(item.unitPrice),
    0,
  );
  const totalPieces = items.reduce(
    (sum, item) => sum + Number(item.pieces),
    0,
  );
  const filteredItems = items.filter(item => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      item?.description,
      item?.barcode,
      item?.itemNo,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
  // console.log('Invoice Details:', Invoice);
  const openModal = useCallback(item => {
    setSelectedItem(item);
    console.log("check all item fileds:",item);
    setModalVisible(true);
  }, []);
  const openLinkProduct = item => {
    setLinkingItem(item);
    setLinkModalVisible(true);
  };

  const handleProductSelect = product => {
    console.log(
      `Link ${product.name} to invoice item ${linkingItem.ProductId}`,
    );
    // TODO: Save linking to DB
  };

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedItem(null);
  }, []);

  const handleLongPress = id => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  const handleBulkUpdate = () => {
    const selectedItems = itemsRef.current.filter(item =>
      selectedIds.has(item.ProductId),
    );

    if (selectedItems.length === 0) {
      alert('Please select at least one row.');
      return;
    }

    // Example: increase cost by 10%
    const updatedItems = itemsRef.current.map(item => {
      if (selectedIds.has(item.ProductId)) {
        return {
          ...item,
          unitPrice: (Number(item.unitPrice) * 1.1).toFixed(2), // increase cost
          extendedPrice: (Number(item.extendedPrice) * 1.1).toFixed(2),
        };
      }
      return item;
    });

    itemsRef.current = updatedItems;
    setSelectedIds(new Set()); // clear selection
    alert(`Updated ${selectedItems.length} items successfully ✅`);
  };
  const fetchInvoice = (invoice)=>{
    
  }

  const handleSave = useCallback(
    (updatedItem, commit = true) => {
      if (commit) {
        itemsRef.current = itemsRef.current.map(it => {
          if (it.ProductId && updatedItem.ProductId) {
            return it.ProductId === updatedItem.ProductId ? updatedItem : it;
          }
          if (it.itemNo && updatedItem.itemNo) {
            return it.itemNo === updatedItem.itemNo ? updatedItem : it;
          }
          return it;
        });
        closeModal();
      } else {
        setSelectedItem(updatedItem);
      }
    },
    [closeModal],
  );

  const toggleExpand = useCallback(id => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prevId => (prevId === id ? null : id));
  }, []);

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerRow}>
        {['Barcode', 'P. Info', 'QTY', 'Case Cost', 'Ext. Price'].map(
          (title, idx) => (
            <Text
              key={idx}
              style={[
                styles.headerText,
                idx === 0
                  ? { flex: 2 }
                  : idx === 1
                  ? { flex: 2.5 }
                  : idx === 2
                  ? { flex: 0.7 }
                  : idx === 3
                  ? { flex: 1 }
                  : { flex: 0.8 },
              ]}
            >
              {title}
            </Text>
          ),
        )}
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <InvoiceRow
        item={item}
        index={index}
        isExpanded={expandedId === item.ProductId}
        onToggle={() => toggleExpand(item.ProductId)}
        onLongPress={handleLongPress}
        selectedIds={selectedIds}
        onEdit={openModal}
        onLinkProduct={openLinkProduct} 
      />
    ),
    [expandedId, toggleExpand, handleLongPress, selectedIds],
  );

  // const FloatingButton = ({ onPress, title }) => (
  //   <TouchableOpacity style={styles.fab} onPress={onPress}>
  //     <Text style={styles.fabText}>{title}</Text>
  //   </TouchableOpacity>
  // );

  return (
    <ImageBackground
      source={getImageSource(reportbg)}
      style={styles.screen}
      resizeMode="cover"
    >
      <AppHeader
        Title="Invoice"
        backgroundType="image"
        backgroundValue={reportbg}
      ></AppHeader> 
    <View style={{ flex: 1, backgroundColor: '#F5F6FA'}}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryText}>
            INV No
          </Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {InvNumber}
          </Text>
          <Text style={styles.summaryText}>
            V. Name
          </Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {vendorName}
          </Text>
          <Text style={styles.summaryText}>
            S. Date
          </Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {day}
          </Text>
        </View>
        <View
          style={[styles.summaryCol, styles.summaryColRight]}
        >
          <Text style={styles.summaryText}>
            No. Units
          </Text>
          <Text style={styles.summaryValue}>{totalPieces}</Text>
          <Text style={styles.summaryText}>
            E. Price
          </Text>
          <Text style={styles.summaryValue}>
            ${totalExtendedPrice.toFixed(2)}
          </Text>
          <Text style={styles.summaryText}>
            C. Cost
          </Text>
          <Text style={styles.summaryValue}>
            ${totalUnitPrice.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by description, barcode, item no"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#6b7280"
          selectionColor="#1f1f1f"
        />
      </View>

      {/* List */}
      {filteredItems.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={styles.emptyText}>
            {query ? 'No matching items.' : 'No items found in this invoice.'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8 }}>
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.ProductId.toString()}
            ListHeaderComponent={renderHeader}
            stickyHeaderIndices={[0]}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            initialNumToRender={6}
            windowSize={5}
            removeClippedSubviews
          />

          <EditProduct
            visible={isModalVisible}
            item={selectedItem}
            InvoiceDate={day}
            InvNumber={InvNumber}
            vendorName={vendorName}
            onClose={closeModal}
            onSave={handleSave}
          />

          {linkModalVisible && (
            <LinkProductModal
              visible={linkModalVisible}
              onClose={() => setLinkModalVisible(false)}
              onSelect={handleProductSelect}
              linkingItem={linkingItem}
              invoice={Invoice}
              // ✅ Pass the item being linked
            />
          )}

          {/* <FloatingButton
            onPress={() => alert('Floating button pressed!')}
            title="+"
          /> */}
        </View>
      )}
    </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
   screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 10,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 12.6,
    textAlign: 'center',
    color: '#1f1f1f',
  },
  card: {
    marginVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    padding: 10,
  },
    panelInner: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.85)', // helps separate items from bg image
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingVertical:  10,
        paddingHorizontal: 12,
  
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
  cell: {
    fontSize: 12.6,
  },
  expandedSection: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  expandedRow: border => ({
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: border ? 0.5 : 0,
    borderColor: '#ccc',
    alignItems: 'flex-start',
  }),
  expandedLabel: {
    flex: 1,
    fontSize: 12.6,
    fontWeight: '600',
  },
  expandedValue: {
    flex: 2,
    fontSize: 12.6,
    color: '#000',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 30,
    bottom: 30,
    backgroundColor: '#007bff',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabText: {
    color: 'white',
    fontSize: 24,
  },
  summaryBar: {
    margin: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e7ef',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryColRight: {
    alignItems: 'flex-end',
  },
  summaryText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  searchWrap: {
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cfd6ea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 13,
    color: '#1f1f1f',
  },
  emptyText: { fontSize: 16, color: '#666' },
});
