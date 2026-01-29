// src/screens/SearchORCTable.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, TextInput, StyleSheet, ScrollView, Text, TouchableOpacity,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';

const COLORS = {
  bg: '#ffffff',
  card: '#f7f9fc',
  border: '#e6e8ef',
  primary: '#319241',
  danger: '#D9534F',
  text: '#111',
  sub: '#666',
};
const GREEN_LIGHT = '#e6f6ec';
const GREEN_DARK = '#256f3a';

const SearchTableComponent = ({ tableData, setTableData, onRemoveRow, onAddManual }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState(tableData);

  // Bottom sheets
  const listSheetRef = useRef(null);
  const editSheetRef = useRef(null);

  // Row editor state
  const [editIndex, setEditIndex] = useState(null);
  const [draft, setDraft] = useState({ itemNo: '', description: '', qty: '', unitPrice: '' });

  useEffect(() => {
    setFilteredData(tableData);
  }, [tableData]);

  const onSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredData(tableData);
      return;
    }
    const q = query.toLowerCase();
    const filtered = tableData.filter((item) =>
      (item.itemNo || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.barcode || '').toLowerCase().includes(q)
    );
    setFilteredData(filtered);
  };

  const openEditorForIndex = (idx) => {
    setEditIndex(idx);
    const row = tableData[idx] || {};
    setDraft({
      itemNo: row.itemNo || '',
      description: row.description || '',
      qty: String(row.qty ?? ''),
      unitPrice: String(row.unitPrice ?? ''),
    });
    editSheetRef.current?.open();
  };

  const openEditorForNew = () => {
    setEditIndex(tableData.length); // new index (to be appended)
    setDraft({ itemNo: '', description: '', qty: '', unitPrice: '' });
    editSheetRef.current?.open();
  };

  const saveDraft = () => {
    const qtyNum = draft.qty === '' ? '' : Number(draft.qty);
    const priceNum = draft.unitPrice === '' ? '' : Number(draft.unitPrice);

    const newRow = {
      itemNo: draft.itemNo,
      description: draft.description,
      qty: qtyNum,
      unitPrice: priceNum,
      extendedPrice: qtyNum !== '' && priceNum !== '' ? (Number(qtyNum) * Number(priceNum)).toFixed(2) : '',
      manuallyAdded: true,
      condition: 'normal',
    };

    setTableData(prev => {
      const next = [...prev];
      if (editIndex != null && editIndex < prev.length) {
        next[editIndex] = { ...prev[editIndex], ...newRow, manuallyAdded: true };
      } else {
        next.push(newRow);
      }
      return next;
    });
    editSheetRef.current?.close();
  };

  const removeRow = (idx) => onRemoveRow ? onRemoveRow(idx) : setTableData(prev => prev.filter((_, i) => i !== idx));

  // Header tap: open list sheet
  const onHeaderTap = () => {
    listSheetRef.current?.open();
  };

  // From list picker: choose a row to edit
  const pickRowFromList = (idx) => {
    listSheetRef.current?.close();
    setTimeout(() => openEditorForIndex(idx), 120);
  };

  return (
    <View style={styles.container}>
      {/* Search + Add Manual */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchBox}
          placeholder="Search by ItemNo, Barcode, or Description..."
          value={searchQuery}
          onChangeText={onSearch}
          placeholderTextColor={COLORS.sub}
        />
        <TouchableOpacity style={[styles.btn, styles.btnLight]} onPress={openEditorForNew}>
          <Text style={[styles.btnText, styles.btnLightText]}>Add Manually</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.tableHeader}>
        <TouchableOpacity style={[styles.tableHeaderCell, { flex: 1 }]} onPress={onHeaderTap}>
          <Text style={styles.headerText}>ItemNo ⌄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tableHeaderCell, { flex: 2 }]} onPress={onHeaderTap}>
          <Text style={styles.headerText}>Desc ⌄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tableHeaderCell, { flex: 1 }]} onPress={onHeaderTap}>
          <Text style={styles.headerText}>Qty ⌄</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tableHeaderCell, { flex: 1 }]} onPress={onHeaderTap}>
          <Text style={styles.headerText}>UnitPrice ⌄</Text>
        </TouchableOpacity>
        <View style={[styles.tableHeaderCell, { width: 44 }]}>
          <Text style={styles.headerText}>❌</Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        {filteredData.length === 0 ? (
          <Text style={styles.infoText}>No data available.</Text>
        ) : (
          filteredData.map((item, idx) => {
            // Map filtered idx back to actual idx so edits remove correct row
            const realIndex = tableData.indexOf(item);
            return (
              <View key={`${item.itemNo}-${idx}`} style={styles.tableRow}>
                <TouchableOpacity style={[styles.tableCell, { flex: 1 }]} onPress={() => openEditorForIndex(realIndex)}>
                  <Text numberOfLines={1} style={styles.cellText}>{item.itemNo}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tableCell, { flex: 2 }]} onPress={() => openEditorForIndex(realIndex)}>
                  <Text numberOfLines={1} style={styles.cellText}>{item.description}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tableCell, { flex: 1 }]} onPress={() => openEditorForIndex(realIndex)}>
                  <Text numberOfLines={1} style={styles.cellText}>{String(item.qty ?? '')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tableCell, { flex: 1 }]} onPress={() => openEditorForIndex(realIndex)}>
                  <Text numberOfLines={1} style={styles.cellText}>{String(item.unitPrice ?? '')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tableCell, { width: 44 }]} onPress={() => removeRow(realIndex)}>
                  <Text style={[styles.cellText, { color: COLORS.danger }]}>❌</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* === Bottom Sheet: Full List Picker === */}
      <RBSheet
        ref={listSheetRef}
        height={520}
        openDuration={180}
        closeOnDragDown
        customStyles={{
          container: styles.sheetContainer,
          draggableIcon: { backgroundColor: '#ccc' },
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>All Items</Text>
        </View>
        <ScrollView style={{ maxHeight: 440 }}>
          {tableData.map((row, i) => (
            <TouchableOpacity key={`pick-${i}`} style={styles.pickRow} onPress={() => pickRowFromList(i)}>
              <Text style={styles.pickMain} numberOfLines={1}>{row.itemNo} — {row.description}</Text>
              <Text style={styles.pickSub}>Qty: {row.qty ?? ''} | Unit: {row.unitPrice ?? ''}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </RBSheet>

      {/* === Bottom Sheet: Row Editor === */}
      <RBSheet
        ref={editSheetRef}
        height={460}
        openDuration={180}
        closeOnDragDown
        customStyles={{
          container: styles.sheetContainer,
          draggableIcon: { backgroundColor: '#ccc' },
        }}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{editIndex != null && editIndex < tableData.length ? 'Edit Row' : 'Add Row'}</Text>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>ItemNo</Text>
          <TextInput
            style={styles.input}
            value={draft.itemNo}
            onChangeText={(t) => setDraft(prev => ({ ...prev, itemNo: t }))}
            placeholder="Enter item no"
            placeholderTextColor={COLORS.sub}
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.label}>Desc</Text>
          <TextInput
            style={[styles.input, { height: 72 }]}
            value={draft.description}
            onChangeText={(t) => setDraft(prev => ({ ...prev, description: t }))}
            placeholder="Enter description"
            placeholderTextColor={COLORS.sub}
            multiline
          />
        </View>

        <View style={[styles.formRow, { flexDirection: 'row', gap: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Qty</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(draft.qty ?? '')}
              onChangeText={(t) => setDraft(prev => ({ ...prev, qty: t }))}
              placeholder="0"
              placeholderTextColor={COLORS.sub}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Unit Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={String(draft.unitPrice ?? '')}
              onChangeText={(t) => setDraft(prev => ({ ...prev, unitPrice: t }))}
              placeholder="0.00"
              placeholderTextColor={COLORS.sub}
            />
          </View>
        </View>

        <View style={styles.sheetActions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={saveDraft}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => editSheetRef.current?.close()}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </RBSheet>
    </View>
  );
};

export default SearchTableComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderColor: COLORS.border,
    marginTop: 10
  },
  topBar: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  searchBox: {
    flex: 1,
    height: 40,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: COLORS.text,
  },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnLight: { backgroundColor: GREEN_LIGHT },
  btnLightText: { color: GREEN_DARK },
  btnDanger: { backgroundColor: COLORS.danger },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eef8f2',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginTop: 4,
  },
  tableHeaderCell: { alignItems: 'center', justifyContent: 'center' },
  headerText: { fontWeight: '700', color: COLORS.text, fontSize: 13 },

  scroll: { marginTop: 6, flex: 1 },
  scrollContent: { flexGrow: 1 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tableCell: { paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 13, color: COLORS.text },

  infoText: { padding: 10, fontStyle: 'italic', color: COLORS.sub },

  // Sheets
  sheetContainer: {
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    backgroundColor: COLORS.bg,
  },
  sheetHeader: { padding: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  pickRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  pickMain: { fontSize: 14, color: COLORS.text },
  pickSub: { fontSize: 12, color: COLORS.sub, marginTop: 4 },

  formRow: { paddingHorizontal: 12, paddingVertical: 8 },
  label: { fontSize: 12, color: COLORS.sub, marginBottom: 6 },
  input: {
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    color: COLORS.text,
  },
  sheetActions: {
    padding: 12, flexDirection: 'row', gap: 12, justifyContent: 'flex-end',
  },
});
