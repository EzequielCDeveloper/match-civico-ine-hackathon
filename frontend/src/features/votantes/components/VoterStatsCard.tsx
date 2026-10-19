import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EntidadVotante } from '../api/votantes.api';
import { Card } from '../../../components/ui/Card';

interface VoterStatsCardProps {
  entidad: EntidadVotante;
}

export const VoterStatsCard: React.FC<VoterStatsCardProps> = ({ entidad }) => {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.stateName}>{entidad.entidad}</Text>
        <Text style={styles.districtsCount}>{entidad.total_distritos} Distritos</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Participación Gral.</Text>
          <Text style={[styles.metricValue, styles.primaryColor]}>
            {entidad.participacion_general_pct.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Abstencionismo</Text>
          <Text style={[styles.metricValue, styles.warningColor]}>
            {entidad.abstencionismo_general_pct.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Voto Joven (18-29)</Text>
          <Text style={[styles.metricValue, styles.accentColor]}>
            {entidad.participacion_joven_pct.toFixed(1)}%
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stateName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryColor: {
    color: '#0284c7',
  },
  warningColor: {
    color: '#e11d48',
  },
  accentColor: {
    color: '#059669',
  },
});
