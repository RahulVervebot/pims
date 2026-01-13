import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';

const InvoiceRow = memo(
  ({ item, index, isExpanded, onToggle, onLongPress, selectedIds, onEdit, onLinkProduct }) => {
    const { width, fontScale } = useWindowDimensions();
    const isTablet = width >= 768;
console.log("item:",item);
    if (!item) return null;

    let Invqty;
    if (item.qty == '0' && item.extendedPrice === '0.00') {
      return null;
    }
    if (!item.qty) {
      Invqty = (Number(item.extendedPrice) / Number(item.unitPrice)).toFixed(0);
    }

    // responsive sizes
    const base = isTablet ? 14 : 12.6;
    const labelSize = Math.max(11, base - 1 / fontScale);
    const valueSize = Math.max(12, base / fontScale);
    const cellSize = Math.max(12, base / fontScale);

    return (
      <TouchableOpacity
        onPress={onToggle}
        onLongPress={() => onLongPress(item.ProductId)}
        style={[
          styles.card,
          selectedIds.has(item.ProductId) && styles.selectedRowOuter,
          Platform.select({
            ios: styles.shadowIOS,
            android: styles.shadowAndroid,
          }),
        ]}
        activeOpacity={0.75}
      >
        {/* Row cells */}
        <View
          style={[
            styles.row,
            {
              backgroundColor: selectedIds.has(item.ProductId)
                ? '#DFF7E0'
                : !item.barcode
                ? '#FFECEC' // light red if no barcode
                : index % 2 === 0
                ? '#FAFAFA'
                : '#FFFFFF',
            },
          ]}
        >
          <Text style={[styles.cell, { flex: 2, fontSize: cellSize }]} numberOfLines={1}>
            {item.barcode}
          </Text>

          <Text
            style={[styles.cell, { flex: 2.5, fontSize: cellSize }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.description}
          </Text>

          <Text style={[styles.cell, { flex: 0.7, textAlign: 'center', fontSize: cellSize }]}>
            {item.pieces}
          </Text>

          <Text style={[styles.cell, { flex: 0.8, textAlign: 'center', fontSize: cellSize }]}>
            {item.unitPrice}
          </Text>

          <Text style={[styles.cell, { flex: 1, textAlign: 'center', fontSize: cellSize }]}>
            {item.extendedPrice}
          </Text>
        </View>

        {/* Expanded section */}
        {isExpanded && (
          <View style={styles.expanded}>
            {[
              ['POS Description', item.description],
              ['itemNo', item.itemNo], 
               ['Product Id', item.ProductId], 
              ['Qty Shipped', item.pieces],
              ['U. Cost', `$${item.unitPrice}`],
              ['Description', item.description],
              ['Inv Quntity', Invqty],
              ['Units in Case', item.pieces],
              ['Case Cost', `$${(Number(item.unitPrice) * Number(item.pieces)).toFixed(2)}`],
              ['Extended Price', `${item.extendedPrice}`],
              ['Unit Price', `$${item.unitPrice}`],
            ].map(([label, value], idx) => (
              <View key={idx} style={[styles.expandedRow, idx === 8 && { borderBottomWidth: 0 }]}>
                <Text style={[styles.expandedLabel, { fontSize: labelSize }]}>{label}:</Text>
                <Text
                  style={[styles.expandedValue, { fontSize: valueSize }]}
                  numberOfLines={label === 'Description' || label === 'POS Description' ? 0 : 1}
                >
                  {value}
                </Text>
              </View>
            ))}

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => onEdit(item)}
                activeOpacity={0.9}
                style={[styles.actionBtn, styles.editBtn]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.actionText}>✎ Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onLinkProduct(item)}
                activeOpacity={0.9}
                style={[styles.actionBtn, styles.linkBtn]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.actionText}>🔗 Link Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

export default InvoiceRow;

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  shadowIOS: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  shadowAndroid: {
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  cell: {
    fontSize: 12.6,
    color: '#21262E',
  },
  expanded: {
    backgroundColor: '#F3F9FF',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  expandedRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderColor: '#D7DFEA',
    alignItems: 'flex-start',
  },
  expandedLabel: {
    flex: 1,
    fontWeight: '700',
    color: '#334155',
  },
  expandedValue: {
    flex: 2,
    color: '#0B1324',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#10B981', // teal
    borderColor: '#0EA371',
  },
  linkBtn: {
    backgroundColor: '#6366F1', // indigo
    borderColor: '#5457D6',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  selectedRowOuter: {
    // subtle outer highlight for selected rows
    borderColor: '#B7F0C0',
    borderWidth: 1,
  },

  // legacy (kept in case referenced elsewhere)
  selectedRow: {
    backgroundColor: '#d0f0c0',
  },
  rowContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
  },
});
