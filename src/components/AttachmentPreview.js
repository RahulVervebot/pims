import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';

const isImageUrl = (url = '') => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
const normalizeUrl = (url = '', baseUrl = '') => {
  const raw = String(url || '');
  if (!raw) return '';
  if (raw.startsWith('http') || raw.startsWith('file:') || raw.startsWith('content:')) return raw;
  if (!baseUrl) return raw;
  return `${baseUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

export default function AttachmentPreview({ attachments = [], showActions = false, layout = 'list', baseUrl = '' }) {
  const isGrid = layout === 'grid';
  return (
    <View style={isGrid ? styles.grid : styles.list}>
      {attachments.map((att) => {
        const url = normalizeUrl(att.file_url || att.url || att.preview || '', baseUrl);
        const name = att.file_name || att.name || 'Attachment';
        const isImage = isImageUrl(url);
        return (
          <View key={att.id || `${name}-${url}`} style={styles.item}>
            {isImage ? (
              <Image source={{ uri: url }} style={styles.thumb} />
            ) : (
              <View style={styles.thumbFallback}>
                <Text style={styles.thumbText}>FILE</Text>
              </View>
            )}
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {!!att.mime_type && <Text style={styles.sub}>{att.mime_type}</Text>}
            </View>
            {showActions && url ? (
              <TouchableOpacity onPress={() => Linking.openURL(url)}>
                <Text style={styles.open}>Open</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  thumb: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#F3F4F6' },
  thumbFallback: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  meta: { flex: 1 },
  name: { fontSize: 12, color: '#111', fontWeight: '600' },
  sub: { fontSize: 10, color: '#6B7280' },
  open: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
});
