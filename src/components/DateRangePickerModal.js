import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

// --- Helpers ---
function atStartOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function atEndOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeek(d) {
  // Treat Monday as first day of week; change to 0 for Sunday
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const mondayOffset = (day + 6) % 7; // days since Monday
  const x = new Date(d);
  x.setDate(d.getDate() - mondayOffset);
  return atStartOfDay(x);
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return atEndOfDay(e);
}
function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return atStartOfDay(x);
}
function endOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return atEndOfDay(x);
}
function lastMonthRange(d) {
  const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  const last = new Date(d.getFullYear(), d.getMonth(), 0);
  return { start: atStartOfDay(first), end: atEndOfDay(last) };
}
function presetToRange(presetKey) {
  const now = new Date();
  switch (presetKey) {
    case 'today':
      return { start: atStartOfDay(now), end: atEndOfDay(now) };
    case 'this_week':
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case 'last_week': {
      const s = startOfWeek(now);
      s.setDate(s.getDate() - 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { start: atStartOfDay(s), end: atEndOfDay(e) };
    }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month':
      return lastMonthRange(now);
    default:
      return { start: atStartOfDay(now), end: atEndOfDay(now) };
  }
}
function mergeDateAndTime(datePart, timePart) {
  const d = new Date(datePart);
  const t = new Date(timePart);
  d.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds());
  return d;
}
function fmt(d) {
  // Handy label for preview; you can adjust format as needed
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function DateRangePickerModal({
  visible,
  onClose,
  onApply,
  initialPreset = 'today',
  initialStart, // optional Date
  initialEnd,   // optional Date
}) {
  const [preset, setPreset] = useState(initialPreset);
  const initial = useMemo(() => {
    if (initialStart && initialEnd) return { start: new Date(initialStart), end: new Date(initialEnd) };
    return presetToRange(initialPreset);
  }, [initialPreset, initialStart, initialEnd]);

  const [customStartDate, setCustomStartDate] = useState(atStartOfDay(initial.start));
  const [customEndDate, setCustomEndDate] = useState(atEndOfDay(initial.end));
  const [customStartTime, setCustomStartTime] = useState(atStartOfDay(initial.start));
  const [customEndTime, setCustomEndTime] = useState(atEndOfDay(initial.end));

  // For Android (modal pickers), we need flags
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Reset when opened
    const base = initial;
    setPreset(initialPreset);
    setCustomStartDate(atStartOfDay(base.start));
    setCustomEndDate(atEndOfDay(base.end));
    setCustomStartTime(atStartOfDay(base.start));
    setCustomEndTime(atEndOfDay(base.end));
  }, [visible]);

  const selectedRange = useMemo(() => {
    if (preset === 'custom') {
      const s = mergeDateAndTime(customStartDate, customStartTime);
      const e = mergeDateAndTime(customEndDate, customEndTime);
      return { start: s, end: e };
    }
    return presetToRange(preset);
  }, [preset, customStartDate, customEndDate, customStartTime, customEndTime]);

  function handleApply() {
    // Guard: ensure end >= start
    if (selectedRange.end < selectedRange.start) {
      // Swap if user picked reversed order
      return onApply({ start: selectedRange.end, end: selectedRange.start });
    }
    onApply(selectedRange);
  }

  // Android picker handlers
  function onChangeFactory(kind) {
    return (_e, date) => {
      if (Platform.OS === 'android') {
        // close the respective modal
        if (kind === 'sd') setShowStartDatePicker(false);
        if (kind === 'ed') setShowEndDatePicker(false);
        if (kind === 'st') setShowStartTimePicker(false);
        if (kind === 'et') setShowEndTimePicker(false);
      }
      if (!date) return;
      if (kind === 'sd') setCustomStartDate(atStartOfDay(date));
      if (kind === 'ed') setCustomEndDate(atStartOfDay(date));
      if (kind === 'st') setCustomStartTime(date);
      if (kind === 'et') setCustomEndTime(date);
    };
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Select Date & Time</Text>

          <View style={styles.presetRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.pill, preset === p.key && styles.pillActive]}
                  onPress={() => setPreset(p.key)}
                >
                  <Text style={[styles.pillText, preset === p.key && styles.pillTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {preset === 'custom' ? (
            <View style={styles.customBlock}>
              <Text style={styles.sectionLabel}>Start</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => Platform.OS === 'android' ? setShowStartDatePicker(true) : null}
                >
                  <Text style={styles.selectorLabel}>Date</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={customStartDate}
                      mode="date"
                      display="compact"
                      onChange={(_e, d) => d && setCustomStartDate(atStartOfDay(d))}
                      style={styles.iosPicker}
                    />
                  ) : (
                    <Text style={styles.selectorValue}>{fmt(customStartDate).split(' ')[0]}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => Platform.OS === 'android' ? setShowStartTimePicker(true) : null}
                >
                  <Text style={styles.selectorLabel}>Time</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={customStartTime}
                      mode="time"
                      display="compact"
                      onChange={(_e, d) => d && setCustomStartTime(d)}
                      style={styles.iosPicker}
                    />
                  ) : (
                    <Text style={styles.selectorValue}>{fmt(customStartTime).split(' ')[1]}</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { marginTop: 12 }]}>End</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => Platform.OS === 'android' ? setShowEndDatePicker(true) : null}
                >
                  <Text style={styles.selectorLabel}>Date</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={customEndDate}
                      mode="date"
                      display="compact"
                      onChange={(_e, d) => d && setCustomEndDate(atStartOfDay(d))}
                      style={styles.iosPicker}
                    />
                  ) : (
                    <Text style={styles.selectorValue}>{fmt(customEndDate).split(' ')[0]}</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => Platform.OS === 'android' ? setShowEndTimePicker(true) : null}
                >
                  <Text style={styles.selectorLabel}>Time</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={customEndTime}
                      mode="time"
                      display="compact"
                      onChange={(_e, d) => d && setCustomEndTime(d)}
                      style={styles.iosPicker}
                    />
                  ) : (
                    <Text style={styles.selectorValue}>{fmt(customEndTime).split(' ')[1]}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.preview}>
              <Text style={styles.previewText}>Start: {fmt(selectedRange.start)}</Text>
              <Text style={styles.previewText}>End:   {fmt(selectedRange.end)}</Text>
            </View>
          )}

          {/* ANDROID PICKERS (modal style) */}
          {Platform.OS === 'android' && showStartDatePicker && (
            <DateTimePicker
              value={customStartDate}
              mode="date"
              display="calendar"
              onChange={onChangeFactory('sd')}
            />
          )}
          {Platform.OS === 'android' && showEndDatePicker && (
            <DateTimePicker
              value={customEndDate}
              mode="date"
              display="calendar"
              onChange={onChangeFactory('ed')}
            />
          )}
          {Platform.OS === 'android' && showStartTimePicker && (
            <DateTimePicker
              value={customStartTime}
              mode="time"
              is24Hour={true}
              onChange={onChangeFactory('st')}
            />
          )}
          {Platform.OS === 'android' && showEndTimePicker && (
            <DateTimePicker
              value={customEndTime}
              mode="time"
              is24Hour={true}
              onChange={onChangeFactory('et')}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, styles.btnGhostText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={[styles.btn, styles.btnPrimary]}>
              <Text style={[styles.btnText, styles.btnPrimaryText]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  presetRow: { marginBottom: 12 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
    backgroundColor: '#151515',
  },
  pillActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  pillText: { color: '#ddd' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  customBlock: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#0b0b0b',
  },
  sectionLabel: { color: '#8f8f8f', marginBottom: 8, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  selector: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#141414',
  },
  selectorLabel: { color: '#9a9a9a', marginBottom: 6 },
  selectorValue: { color: '#fff', fontSize: 16 },
  iosPicker: { alignSelf: 'flex-start' },
  preview: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#0b0b0b',
  },
  previewText: { color: '#eaeaea', marginBottom: 6 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: '#444',
  },
  btnGhostText: { color: '#ddd' },
  btnPrimary: { backgroundColor: '#2e7d32' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});
