import React, { useEffect, useState, useContext } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listFiles } from '../utils/fileOperations';
import { calculateStorageStats } from '../utils/storageStats';
import { COLORS, SHADOWS } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import { showNotification } from '../utils/notifications';
import * as ScreenCapture from 'expo-screen-capture';

const SettingSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

export default function SettingsScreen() {
  const { useDeviceAuth, setUseDeviceAuth } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalFiles: 0,
    usedStorage: '0 B',
    allocatedStorage: '0 GB',
  });
  const [appProtectionEnabled, setAppProtectionEnabled] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const savedAppProtection = await AsyncStorage.getItem('appProtectionEnabled');
        setAppProtectionEnabled(savedAppProtection === 'true');
      } catch (error) {
        console.error('Failed to load app protection setting:', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { files, folders } = await listFiles();
        const allItems = [...files, ...folders];
        const currentStats = calculateStorageStats(allItems);
        setStats(currentStats);
      } catch (error) {
        console.error('Failed to fetch storage stats:', error);
      }
    };

    fetchStats();
  }, []);

  // New effect to disable/enable screen capture based on appProtectionEnabled
  useEffect(() => {
    if (appProtectionEnabled) {
      ScreenCapture.preventScreenCaptureAsync();
    } else {
      ScreenCapture.allowScreenCaptureAsync();
    }
  }, [appProtectionEnabled]);

  const toggleDeviceAuth = async () => {
    try {
      const newValue = !useDeviceAuth;
      setUseDeviceAuth(newValue);
      await AsyncStorage.setItem('useDeviceAuth', String(newValue));
      await showNotification(
        'Security Setting Updated',
        `Device authentication has been ${newValue ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.error('Failed to save device auth setting:', error);
    }
  };

  const toggleAppProtection = async () => {
    try {
      const newValue = !appProtectionEnabled;
      setAppProtectionEnabled(newValue);
      await AsyncStorage.setItem('appProtectionEnabled', String(newValue));
      await showNotification(
        'Security Setting Updated',
        `App Protection has been ${newValue ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.error('Failed to save app protection setting:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <SettingSection title="Security">
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Use Device Authentication</Text>
          <Switch
            value={useDeviceAuth}
            onValueChange={toggleDeviceAuth}
            thumbColor={useDeviceAuth ? COLORS.primary : COLORS.border}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>App Protection</Text>
          <Switch
            value={appProtectionEnabled}
            onValueChange={toggleAppProtection}
            thumbColor={appProtectionEnabled ? COLORS.primary : COLORS.border}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
          />
        </View>
      </SettingSection>

      <SettingSection title="Statistics">
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Used Storage</Text>
            <Text style={styles.statValue}>{stats.usedStorage} of {stats.allocatedStorage}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Files</Text>
            <Text style={styles.statValue}>{stats.totalFiles}</Text>
          </View>
        </View>
      </SettingSection>

      <SettingSection title="About">
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>NXT Cloud v1.0.0</Text>
          <Text style={styles.aboutDescription}>
            A personal cloud storage solution for managing your files securely.
          </Text>
        </View>
      </SettingSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text,
  },
  statsContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  statItem: {
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  aboutContainer: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  aboutText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  aboutDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
