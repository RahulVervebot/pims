import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const pad2 = n => String(n).padStart(2, '0');

function formatDate(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTime(date) {
  if (!date) return '';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatDateTime(date) {
  if (!date) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
}

export default function DateRangeSelector({
  start,
  end,
  onChange,
  includeTime = true,
  label = 'Select Date Range',
}) {
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  const startLabel = useMemo(
    () => (includeTime ? formatDateTime(start) : formatDate(start)),
    [start, includeTime],
  );
  const endLabel = useMemo(
    () => (includeTime ? formatDateTime(end) : formatDate(end)),
    [end, includeTime],
  );

  const handleChange = (key, date) => {
    if (!date) return;
    const nextStart = key === 'startDate' ? date : start;
    const nextEnd = key === 'endDate' ? date : end;
    const nextStartTime = key === 'startTime' ? date : start;
    const nextEndTime = key === 'endTime' ? date : end;
    const mergedStart = includeTime ? nextStartTime : nextStart;
    const mergedEnd = includeTime ? nextEndTime : nextEnd;
    const next = {
      start: new Date(mergedStart),
      end: new Date(mergedEnd),
      startText: formatDate(nextStart),
      endText: formatDate(nextEnd),
      startDateTimeText: formatDateTime(mergedStart),
      endDateTimeText: formatDateTime(mergedEnd),
    };
    onChange?.(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.block}>
          <Text style={styles.blockLabel}>From</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => (Platform.OS === 'android' ? setShowStartDate(true) : null)}
          >
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={start}
                mode="date"
                display="compact"
                onChange={(_e, d) => d && handleChange('startDate', d)}
              />
            ) : (
              <Text style={styles.value}>{startLabel}</Text>
            )}
          </TouchableOpacity>
          {includeTime && (
            <TouchableOpacity
              style={styles.selector}
              onPress={() => (Platform.OS === 'android' ? setShowStartTime(true) : null)}
            >
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={start}
                  mode="time"
                  display="compact"
                  onChange={(_e, d) => d && handleChange('startTime', d)}
                />
              ) : (
                <Text style={styles.value}>{formatTime(start)}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>To</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => (Platform.OS === 'android' ? setShowEndDate(true) : null)}
          >
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={end}
                mode="date"
                display="compact"
                onChange={(_e, d) => d && handleChange('endDate', d)}
              />
            ) : (
              <Text style={styles.value}>{endLabel}</Text>
            )}
          </TouchableOpacity>
          {includeTime && (
            <TouchableOpacity
              style={styles.selector}
              onPress={() => (Platform.OS === 'android' ? setShowEndTime(true) : null)}
            >
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={end}
                  mode="time"
                  display="compact"
                  onChange={(_e, d) => d && handleChange('endTime', d)}
                />
              ) : (
                <Text style={styles.value}>{formatTime(end)}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {Platform.OS === 'android' && showStartDate && (
        <DateTimePicker
          value={start}
          mode="date"
          display="default"
          onChange={(_e, d) => {
            setShowStartDate(false);
            if (d) handleChange('startDate', d);
          }}
        />
      )}
      {Platform.OS === 'android' && showEndDate && (
        <DateTimePicker
          value={end}
          mode="date"
          display="default"
          onChange={(_e, d) => {
            setShowEndDate(false);
            if (d) handleChange('endDate', d);
          }}
        />
      )}
      {Platform.OS === 'android' && includeTime && showStartTime && (
        <DateTimePicker
          value={start}
          mode="time"
          display="default"
          onChange={(_e, d) => {
            setShowStartTime(false);
            if (d) handleChange('startTime', d);
          }}
        />
      )}
      {Platform.OS === 'android' && includeTime && showEndTime && (
        <DateTimePicker
          value={end}
          mode="time"
          display="default"
          onChange={(_e, d) => {
            setShowEndTime(false);
            if (d) handleChange('endTime', d);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e3e6ef',
    marginTop: 10
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  block: {
    flex: 1,
  },
  blockLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#d6defc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1b1b1b',
  },
});
