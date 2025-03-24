import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export const FileActionMenu = ({ 
  isVisible, 
  onClose, 
  onDelete, 
  onDownload, 
  onPreview, 
  onMove,
  fileName 
}) => {
  const canPreview = fileName && /\.(jpg|jpeg|png|gif|mp4|webm|mov)$/i.test(fileName);

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.menu}>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          {canPreview && (
            <TouchableOpacity style={styles.menuItem} onPress={onPreview}>
              <Text style={styles.menuText}>Preview</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem} onPress={onMove}>
            <Text style={styles.menuText}>Move</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onDownload}>
            <Text style={styles.menuText}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, styles.deleteButton]} onPress={onDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  menu: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.medium,
  },
  fileName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 16,
  },
  menuItem: {
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  menuText: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteText: {
    color: COLORS.surface,
    fontSize: 16,
    textAlign: 'center',
  },
});
