import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlowPager } from './FlowPager';
import { useFlow } from './FlowContext';

export const FlowShell: React.FC = () => {
  const { index, total, back } = useFlow();
  const progress = total > 1 ? index / (total - 1) : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {/* Institutional INE / GobMx Header */}
      <View style={styles.instHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={back}
            disabled={index === 0}
            style={[styles.backBtn, index === 0 && styles.hidden]}
            accessibilityLabel="Volver al paso anterior"
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.titleColumn}>
            <Text style={styles.instTitle}>INSTITUTO NACIONAL ELECTORAL</Text>
            <Text style={styles.appTitle}>Match Cívico · Elecciones 2024</Text>
          </View>
          <View style={styles.stepCounterBadge}>
            <Text style={styles.stepCounterText}>
              {index + 1}/{total}
            </Text>
          </View>
        </View>

        {/* Golden Institutional Accent Strip */}
        <View style={styles.goldStrip} />

        {/* Progress Bar */}
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      <FlowPager />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  instHeader: {
    backgroundColor: '#691C32', // Guinda institucional profundo
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    marginRight: 10,
  },
  hidden: {
    opacity: 0,
  },
  backText: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: '700',
    marginTop: -2,
  },
  titleColumn: {
    flex: 1,
  },
  instTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#BC955C', // Dorado oficial GobMx / INE
    textTransform: 'uppercase',
  },
  appTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepCounterBadge: {
    backgroundColor: 'rgba(188, 149, 92, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BC955C',
  },
  stepCounterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  goldStrip: {
    height: 2,
    backgroundColor: '#BC955C', // Acento Dorado
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bar: {
    height: 4,
    backgroundColor: '#D5006D', // Rosa / Magenta INE distintivo
  },
});
