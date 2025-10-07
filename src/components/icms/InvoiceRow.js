import React, {memo} from 'react';
import {View, Text, TouchableOpacity, Button, StyleSheet} from 'react-native';

const InvoiceRow = memo(
({item, index, isExpanded, onToggle, onLongPress, selectedIds, onEdit, onLinkProduct}) => {

    if (!item) return null;
    let Invqty;
    if (item.qty == '0' && item.extendedPrice === '0.00') {
      return null;
    }

    if (!item.qty) {
      Invqty = (Number(item.extendedPrice) / Number(item.unitPrice)).toFixed(0);
    }
        return (
      <TouchableOpacity
        onPress={onToggle}
        onLongPress={() => onLongPress(item.ProductId)}
        style={[
          styles.card,
          selectedIds.has(item.ProductId) && styles.selectedRow,
        ]}
        activeOpacity={0.7}>
        {/* Row cells */}
        <View
          style={[
            styles.row,
            {
              backgroundColor: selectedIds.has(item.ProductId)
                ? '#d1f7d6'
                : !item.barcode
                ? '#ffe5e5' // light red if no barcode
                : index % 2 === 0
                ? '#fafafa'
                : '#fff',
            },
          ]}>
          <Text style={[styles.cell, {flex: 2}]}>{item.barcode}</Text>
          <Text
            style={[styles.cell, {flex: 2.5}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {item.description}
          </Text>
          <Text style={[styles.cell, {flex: 0.7, textAlign: 'center'}]}>
            {item.pieces}
          </Text>
          <Text style={[styles.cell, {flex: 1, textAlign: 'center'}]}>
            {item.extendedPrice}
          </Text>
          <Text style={[styles.cell, {flex: 0.8, textAlign: 'center'}]}>
            {item.unitPrice}
          </Text>
        </View>

        {/* Expanded section */}
        {isExpanded && (
          <View style={styles.expanded}>
            {[
              ['POS Description', item.description],
              ['Qty Shipped', item.pieces],
              ['U. Cost', `$${item.unitPrice}`],
              ['Description', item.description],
              ['Inv Quntity', Invqty],
              ['Units in Case', item.pieces],
              [
                'Case Cost',
                `$${(Number(item.unitPrice) * Number(item.pieces)).toFixed(2)}`,
              ],
              ['Extended Price', `${item.extendedPrice}`],
              ['Unit Price', `$${item.unitPrice}`],
            ].map(([label, value], idx) => (
              <View key={idx} style={styles.expandedRow}>
                <Text style={styles.expandedLabel}>{label}:</Text>
                <Text
                  style={[styles.expandedValue]}
                  numberOfLines={label === 'Description' ? 0 : 1}>
                  {value}
                </Text>
              </View>
            ))}
            <View style={styles.buttonContainer}>
              {/* Action buttons */}
              <Button
                title="Edit"
                onPress={() => onEdit(item)}
                color="#007BFF"
              />

              <Button
                title="Link Product"
                onPress={() =>  onLinkProduct(item)&&console.log("linked click")}
                color="#28A745"
              />
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
    marginVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    padding: 10,
  },
  cell: {
    fontSize: 12.6,
  },
  expanded: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  expandedRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
    alignItems: 'flex-start',
  },
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
  rowContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
  },
  selectedRow: {
    backgroundColor: '#d0f0c0', // light green highlight
  },
});
