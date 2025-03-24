import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

export const ProgressBar = ({ progress, fileName }) => {
  return (
    <View style={styles.overlay}>
      <View style={styles.backdrop} />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Uploading Files</Text>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <View style={styles.progressBackground}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { width: `${progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  fileName: {
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
  },
  progressBackground: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
