import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';

const buildAttachments = (assets = []) =>
  assets
    .filter((a) => !!a?.uri)
    .map((asset) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: {
        uri: asset.uri,
        name: asset.fileName || 'attachment.jpg',
        type: asset.type || 'image/jpeg',
        size: asset.fileSize || 0,
      },
      preview: asset.uri,
    }));

export default function AttachmentButton({ onFileSelect, disabled }) {
  const handlePick = async () => {
    if (disabled) return;
    const res = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 5,
    });
    if (res?.didCancel) return;
    const files = buildAttachments(res?.assets || []);
    if (files.length) onFileSelect(files);
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePick} disabled={disabled}>
      <Icon name="attach-file" size={18} color="#111" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#F3F4F6',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
