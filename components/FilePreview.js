import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS, SHADOWS } from '../constants/theme';

export const FilePreview = ({ isVisible, onClose, fileUrl, fileName }) => {
  const getPreviewHtml = (url, type) => {
    if (type === 'image') {
      return `
        <html>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000">
            <img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain" />
          </body>
        </html>
      `;
    }
    if (type === 'video') {
      return `
        <html>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000">
            <video controls style="max-width:100%;max-height:100vh">
              <source src="${url}" type="video/mp4">
            </video>
          </body>
        </html>
      `;
    }
    return `<html><body>Preview not available</body></html>`;
  };

  const getFileType = (name) => {
    const ext = name.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
    return 'unsupported';
  };

  const fileType = getFileType(fileName);

  return (
    <Modal
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        {fileType !== 'unsupported' ? (
          <WebView
            source={{ html: getPreviewHtml(fileUrl, fileType) }}
            style={styles.webview}
          />
        ) : (
          <View style={styles.unsupported}>
            <Text style={styles.unsupportedText}>Preview not available for this file type</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  unsupported: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsupportedText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
