import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAnswer, useFlow } from '../../../flow';
import { fetchEntidadByID } from '../api/votantes.api';
import { PerfilAnswer } from '../types';

export const ParticipacionStep: React.FC = () => {
  const { next } = useFlow();
  const perfil = useAnswer<PerfilAnswer>('votantes.perfil');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    entidadNombre: string;
    participacionGeneral: number;
    abstencionismoGeneral: number;
    participacionJoven: number;
    abstencionismoJoven: number;
    esJoven: boolean;
  }>({
    entidadNombre: perfil?.entidad || 'Nacional',
    participacionGeneral: 60.9,
    abstencionismoGeneral: 39.1,
    participacionJoven: 51.3,
    abstencionismoJoven: 48.7,
    esJoven: (perfil?.edad ?? 21) <= 29,
  });

  // Lazy loading: fetch ONLY the metrics for this specific entity on demand
  useEffect(() => {
    let cancelled = false;

    const lazyLoadEntidad = async () => {
      const entidadId = perfil?.entidad_id || 9; // Default to 9 (CDMX) if not selected
      const esJoven = (perfil?.edad ?? 21) <= 29;

      try {
        const data = await fetchEntidadByID(entidadId);
        if (!cancelled && data?.entidad) {
          setStats({
            entidadNombre: data.entidad.entidad,
            participacionGeneral: data.entidad.participacion_general_pct || 60.9,
            abstencionismoGeneral: data.entidad.abstencionismo_general_pct || 39.1,
            participacionJoven: data.entidad.participacion_joven_pct || 51.3,
            abstencionismoJoven: data.entidad.abstencionismo_joven_pct || 48.7,
            esJoven,
          });
        }
      } catch {
        // Graceful offline fallback with INE national figures (never block the user)
        if (!cancelled) {
          setStats((prev) => ({
            ...prev,
            entidadNombre: perfil?.entidad || 'Tu Estado',
            esJoven,
          }));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    lazyLoadEntidad();
    return () => {
      cancelled = true;
    };
  }, [perfil?.entidad_id, perfil?.edad, perfil?.entidad]);

  const participacionEsperada = stats.esJoven ? stats.participacionJoven : stats.participacionGeneral;
  const abstencionismoEsperado = stats.esJoven ? stats.abstencionismoJoven : stats.abstencionismoGeneral;

  return (
    <StepContainer
      title="Tu Impacto Electoral"
      subtitle={`Estadísticas oficiales INE para ${stats.entidadNombre}`}
    >
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#9F2241" />
          <Text style={styles.loadingText}>Consultando estadísticas censales...</Text>
        </View>
      ) : (
        <Card style={styles.resultCard}>
          <View style={styles.badgeRow}>
            <Badge label={stats.esJoven ? 'Segmento Joven (18-29 años)' : 'Segmento General'} variant="info" />
            <Badge label={stats.entidadNombre} variant="warning" />
          </View>

          <Text style={styles.bigPct}>{participacionEsperada.toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>Participación ciudadana estimada</Text>

          <View style={styles.divider} />

          <Text style={styles.explanationText}>
            {stats.esJoven
              ? `En las elecciones federales en ${stats.entidadNombre}, el segmento joven tuvo una participación del ${stats.participacionJoven.toFixed(1)}% y un abstencionismo del ${stats.abstencionismoJoven.toFixed(1)}%.`
              : `En ${stats.entidadNombre}, el promedio general de votación fue del ${stats.participacionGeneral.toFixed(1)}% con un abstencionismo del ${stats.abstencionismoGeneral.toFixed(1)}%.`}
          </Text>

          <View style={styles.comparisonBox}>
            <View style={styles.comparisonItem}>
              <Text style={styles.compLabel}>Votación</Text>
              <Text style={[styles.compValue, { color: '#10312B' }]}>{participacionEsperada.toFixed(1)}%</Text>
            </View>
            <View style={styles.comparisonItem}>
              <Text style={styles.compLabel}>Abstención</Text>
              <Text style={[styles.compValue, { color: '#691C32' }]}>{abstencionismoEsperado.toFixed(1)}%</Text>
            </View>
          </View>
        </Card>
      )}

      <Button
        title="Conocer Candidatos y Propuestas ›"
        onPress={next}
        variant="primary"
        style={styles.continueBtn}
      />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  resultCard: {
    padding: 20,
    borderTopWidth: 4,
    borderTopColor: '#9F2241', // Guinda institucional
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  bigPct: {
    fontSize: 48,
    fontWeight: '900',
    color: '#9F2241',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  explanationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    textAlign: 'center',
  },
  comparisonBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  compLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  compValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  continueBtn: {
    marginTop: 20,
  },
});
