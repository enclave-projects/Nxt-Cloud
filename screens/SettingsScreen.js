import React, { useEffect, useState, useContext } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listFiles } from '../utils/fileOperations';
import { calculateStorageStats } from '../utils/storageStats';
import { COLORS, SHADOWS } from '../constants/theme';
import { AuthContext } from '../context/AuthContext';
import { showNotification } from '../utils/notifications';
import * as ScreenCapture from 'expo-screen-capture';
import { testNetworkSpeed } from '../utils/networkSpeed';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const [networkResults, setNetworkResults] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [liveGraphData, setLiveGraphData] = useState({ labels: [], datasets: [{ data: [] }] });
  const [testResults, setTestResults] = useState(null);

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

  const handleTestNetwork = async () => {
    setIsTesting(true);
    setLiveGraphData({ labels: [], datasets: [{ data: [] }] }); // Reset graph data
    setTestResults(null); // Clear previous results

    try {
      await testNetworkSpeed((progress) => {
        setLiveGraphData((prevData) => {
          const newLabels = [...prevData.labels, progress.type];
          const newData = [...prevData.datasets[0].data, progress.speed || progress.value];
          return { labels: newLabels, datasets: [{ data: newData }] };
        });
      }).then((results) => {
        setTestResults(results); // Save final results for the table
      });
    } catch (error) {
      console.error('Network test failed:', error);
      alert('Failed to test network speed.');
    } finally {
      setIsTesting(false);
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

      <SettingSection title="Test Network">
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Network Speed Test</Text>
          <TouchableOpacity style={styles.button} onPress={handleTestNetwork} disabled={isTesting}>
            <Text style={styles.buttonText}>{isTesting ? 'Testing...' : 'Start Test'}</Text>
          </TouchableOpacity>
        </View>
        {liveGraphData.labels.length > 0 && (
          <>
            <Text style={styles.graphTitle}>Live Network Test</Text>
            <LineChart
              data={liveGraphData}
              width={SCREEN_WIDTH - 32}
              height={220}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: COLORS.primary,
                },
              }}
              style={{
                marginVertical: 16,
                borderRadius: 16,
              }}
            />
          </>
        )}
        {testResults && (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeader}>Metric</Text>
              <Text style={styles.tableHeader}>Value</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Server</Text>
              <Text style={styles.tableCell}>{testResults.serverName}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Download Speed</Text>
              <Text style={styles.tableCell}>{testResults.downloadSpeed.toFixed(2)} Mbps</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Upload Speed</Text>
              <Text style={styles.tableCell}>{testResults.uploadSpeed.toFixed(2)} Mbps</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Latency</Text>
              <Text style={styles.tableCell}>{testResults.latency} ms</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Jitter</Text>
              <Text style={styles.tableCell}>{testResults.jitter} ms</Text>
            </View>
          </View>
        )}
      </SettingSection>

      <SettingSection title="About">
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>NXT Cloud v1.1.0</Text>
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
  button: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  table: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeader: {
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  tableCell: {
    color: COLORS.textSecondary,
    flex: 1,
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
