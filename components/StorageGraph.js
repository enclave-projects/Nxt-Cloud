import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';

const GRAPH_HEIGHT = 150;
const GRAPH_WIDTH = Dimensions.get('window').width - 64; // Accounting for padding
const Y_AXIS_WIDTH = 50;
const X_AXIS_HEIGHT = 30;

export const StorageGraph = ({ percentage }) => {
  const barHeightUsed = (GRAPH_HEIGHT * percentage) / 100;
  const barHeightFree = GRAPH_HEIGHT - barHeightUsed;
  const yAxisLabels = ['10GB', '7.5GB', '5GB', '2.5GB', '0GB'];
  const xAxisLabels = ['Used', 'free'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Usage</Text>
      <View style={styles.graphContainer}>
        {/* Y Axis */}
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, index) => (
            <Text key={index} style={styles.axisLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* Graph Area */}
        <View style={styles.graphArea}>
          <View style={styles.gridLines}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={styles.gridLine} />
            ))}
          </View>
          
          {/* Bars */}
          <View style={styles.barsContainer}>
            <View style={styles.barWrapper}>
              <View style={[styles.bar, { height: barHeightUsed }]} />
              <Text style={styles.barLabel}>{percentage.toFixed(1)}%</Text>
            </View>
            <View style={styles.barWrapper}>
              <View style={[styles.bar, styles.barSecondary, { height: barHeightFree }]} />
              <Text style={styles.barLabel}>{(100 - percentage).toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* X Axis */}
      <View style={styles.xAxis}>
        {xAxisLabels.map((label, index) => (
          <Text key={index} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  graphContainer: {
    flexDirection: 'row',
    height: GRAPH_HEIGHT,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  graphArea: {
    width: GRAPH_WIDTH - Y_AXIS_WIDTH,
    height: GRAPH_HEIGHT,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: COLORS.border,
    width: '100%',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: '100%',
    paddingHorizontal: 20,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 40,
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barSecondary: {
    backgroundColor: COLORS.border,
  },
  barLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  xAxis: {
    height: X_AXIS_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingLeft: Y_AXIS_WIDTH,
  },
  axisLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
