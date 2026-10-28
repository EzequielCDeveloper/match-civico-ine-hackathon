import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../../components/ui/Card';

interface VoterStatsCardProps {
  entidad: string;
  totalDistritos?: number;
  distritoNombre?: string;
  participacionGeneralPct: number;
  abstencionismoGeneralPct: number;
  participacionJovenPct: number;
  brechaPts?: number;
  participacionGeneroPct?: number;
  generoLabel?: string;
}

export const VoterStatsCard: React.FC<VoterStatsCardProps> = ({
  entidad,
  totalDistritos,
  distritoNombre,
  participacionGeneralPct,
  abstencionismoGeneralPct,
  participacionJovenPct,
  brechaPts,
  participacionGeneroPct,
  generoLabel,
}) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.stateName}>{entidad}</Text>
          {distritoNombre ? (
            <Text style={styles.districtSubtitle}>{distritoNombre}</Text>
          ) : null}
        </View>
        {totalDistritos ? (
          <Text style={styles.districtsCount}>{totalDistritos} Distritos</Text>
        ) : null}
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Participación</Text>
          <Text style={[styles.metricValue, styles.primaryColor]}>
            {participacionGeneralPct.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Abstención</Text>
          <Text style={[styles.metricValue, styles.warningColor]}>
            {abstencionismoGeneralPct.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Jóvenes (18-29)</Text>
          <Text style={[styles.metricValue, styles.accentColor]}>
            {participacionJovenPct.toFixed(1)}%
          </Text>
        </View>
      </View>

      {participacionGeneroPct !== undefined || brechaPts !== undefined ? (
        <View style={styles.extraRow}>
          {brechaPts !== undefined ? (
            <Text style={styles.extraText}>
              Brecha joven: <Text style={styles.boldText}>{brechaPts > 0 ? `+${brechaPts.toFixed(1)}` : brechaPts.toFixed(1)} pts</Text>
            </Text>
          ) : null}
          {participacionGeneroPct !== undefined ? (
            <Text style={styles.extraText}>
              {generoLabel || 'Género'}: <Text style={styles.boldText}>{participacionGeneroPct.toFixed(1)}%</Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderTopWidth: 4,
    borderTopColor: '#9F2241',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stateName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  districtSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  districtsCount: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  primaryColor: {
    color: '#0284c7',
  },
  warningColor: {
    color: '#9F2241',
  },
  accentColor: {
    color: '#059669',
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  extraText: {
    fontSize: 12,
    color: '#475569',
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
});
