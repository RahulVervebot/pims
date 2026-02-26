import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';

const InvoiceRow = ({ item, index, categoryMetaByDept = {}, isExpanded, onToggle, onLongPress, selectedIds, onToggleSelect, onEdit, onLinkProduct, onRemoveLinkedItem }) => {
    const { width, fontScale } = useWindowDimensions();
    const isTablet = width >= 768;
    if (!item) return null;
    let Invqty;
    if (item.qty == '0' && item.extendedPrice === '0.00') {
      return null;
    }
    if (!item.qty) {
      Invqty = (Number(item.extendedPrice) / Number(item.unitPrice)).toFixed(0);
    }
// console.log("items for row invoice:",item);
    // responsive sizes
    const base = isTablet ? 14 : 12.6;
    const labelSize = Math.max(11, base - 1 / fontScale);
    const valueSize = Math.max(12, base / fontScale);
    const cellSize = Math.max(12, base / fontScale);

    const isSelected = selectedIds.has(item.ProductId);
    const barcodeValue = String(item.barcode ?? '').trim();
    const hasBarcode = barcodeValue.length > 0;
    const sourceValue = String(item.source ?? '').trim().toLowerCase();
    const isCentral = sourceValue === 'centralizeddb';
    const isEven = typeof index === 'number' ? index % 2 === 0 : true;
    const baseBg = !hasBarcode
      ? '#ff0000'
      : isCentral
      ? '#FFECEC'
      : isEven
      ? '#FAFAFA'
      : '#FFFFFF';
    const rowBg = isSelected ? '#DFF7E0' : baseBg;
    const textColor = '#21262E';
    const isBaseUnlinked = baseBg.toLowerCase() === '#ff0000';
    const isBaseCentral = baseBg.toLowerCase() === '#ffecec';
    const isStockUpdated = item?.isStockUpdated === true || item?.isStockUpdated === 'true';
    const hideUnlinkButton = isBaseUnlinked || isBaseCentral || isStockUpdated;
    const deptKey = String(item?.department ?? '').trim().toLowerCase();
    const pricingMeta = categoryMetaByDept?.[deptKey] || { margin: 0, markup: 0 };
    const margin = Number(pricingMeta?.margin ?? 0);
    const markup = Number(pricingMeta?.markup ?? 0);
    const cpNum = Number(item?.cp ?? 0);
    const appliedRate = margin !== 0 ? margin : (markup !== 0 ? markup : 0);
    const newSellingPrice =
      Number.isFinite(cpNum) && appliedRate !== 0
        ? (cpNum + (cpNum * appliedRate) / 100).toFixed(2)
        : (item?.sellingPrice != null ? String(item.sellingPrice) : '-');

    return (
      <TouchableOpacity
        onPress={onToggle}
        onLongPress={() => onLongPress(item.ProductId)}
        style={[
          styles.card,
          { backgroundColor: rowBg },
      
          Platform.select({
          ios: styles.shadowIOS,
          android: styles.shadowAndroid,
          }),
        ]}
        activeOpacity={0.75}
      >
        {/* Row cells */}
        <View
          style={[styles.row]}
        >
          <TouchableOpacity
            style={styles.checkboxWrap}
            onPress={() => onToggleSelect && onToggleSelect(item.ProductId)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
          </TouchableOpacity>

          <Text style={[styles.cell, { flex: 2, fontSize: cellSize, color: textColor }]} numberOfLines={1}>
            {item.barcode}
          </Text>

          <Text
            style={[styles.cell, { flex: 2.5, fontSize: cellSize, color: textColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.description}
          </Text>

          <Text style={[styles.cell, { flex: 0.7, textAlign: 'left', fontSize: cellSize, color: textColor }]}>
            {item.pieces}
          </Text>

          <Text style={[styles.cell, { flex: 0.8, textAlign: 'left', fontSize: cellSize, color: textColor }]}>
            {item.unitPrice}
          </Text>
        </View>

        {/* Expanded section */}
        {isExpanded && (
          <View style={styles.expanded}>
            {[
              ['POS Description', item.posName],
              ['(Inv) itemNo', item.itemNo], 
              ['(Inv) Description', item.description],
              ['(Inv) Qty Shipped', item.qty],
              ['POS Department', item.department],
              ['Unit in Case', item.pieces],
              ['Unit Cost', `$${(Number(item.cp))}`],
              ['Unit Price', `$${item.sellingPrice}`],
              ...(margin !== 0 ? [['Category Margin', `${margin}%`]] : []),
              ...(margin === 0 && markup !== 0 ? [['Category Markup', `${markup}%`]] : []),
              ['New Unit Price', `$${newSellingPrice}`],
              ['(Inv) Case Cost', `$${item.unitPrice}`],
              ['(Inv) Extended Price', `${item.extendedPrice}`],
            ].map(([label, value], idx, arr) => (
              <View key={idx} style={[styles.expandedRow, idx === arr.length - 1 && { borderBottomWidth: 0 }]}>
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
              {!isStockUpdated && (
                <TouchableOpacity
                  onPress={() => onEdit(item)}
                  activeOpacity={0.9}
                  style={[styles.actionBtn, styles.editBtn]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.actionText}>✎ Edit</Text>
                </TouchableOpacity>
              )}

              {!isStockUpdated && (
                <TouchableOpacity
                  onPress={() => onLinkProduct(item)}
                  activeOpacity={0.9}
                  style={[styles.actionBtn, styles.linkBtn]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.actionText}>🔗 Link Product</Text>
                </TouchableOpacity>
              )}

              {!hideUnlinkButton && (
                <TouchableOpacity
                  onPress={() => onRemoveLinkedItem && onRemoveLinkedItem(item)}
                  activeOpacity={0.9}
                  style={[styles.actionBtn, styles.removeLinkBtn]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.actionText}>Unlink</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
};

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
    alignItems: 'center',
  },
  checkboxWrap: { marginRight: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '800' },
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
  removeLinkBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
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
