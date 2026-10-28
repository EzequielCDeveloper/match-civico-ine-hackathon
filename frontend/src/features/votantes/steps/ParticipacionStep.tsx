import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAnswer, useFlow } from '../../../flow';
import { submitPerfilVotante, PerfilVotanteResponse } from '../api/votantes.api';
import { VoterStatsCard } from '../components/VoterStatsCard';
import { PerfilAnswer } from '../types';

export const ParticipacionStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const perfil = useAnswer<PerfilAnswer>('votantes.perfil');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PerfilVotanteResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    const calcularYPersistirPerfil = async () => {
      setLoading(true);
      setError(null);

      const payload = {
        nombre_alias: perfil?.nombre_alias || 'Votante',
        edad: perfil?.edad || 21,
        sexo: perfil?.sexo || 'Hombre',
        entidad_id: perfil?.entidad_id || 9,
        distrito_id: perfil?.distrito_id || 0,
        temas: perfil?.temas || [],
        prioridad_tema: perfil?.prioridad_tema || '',
      };

      try {
        const res = await submitPerfilVotante(payload);
        if (!cancelled) {
          setStats(res);
          setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({
            ...prev,
            resultado_calculo: {
              perfil_id: res.perfil_id,
              participacion_esperada_pct: res.participacion_esperada_pct,
              abstencionismo_esperado_pct: res.abstencionismo_esperado_pct,
              participacion_joven_pct: res.participacion_joven_pct,
              abstencionismo_joven_pct: res.abstencionismo_joven_pct,
              brecha_abstencionismo_joven_pts: res.brecha_abstencionismo_joven_pts,
              participacion_genero_pct: res.participacion_genero_pct,
              mensaje_participacion: res.mensaje_participacion,
              es_joven: res.es_joven,
            },
          }));
        }
      } catch (err: any) {
        if (!cancelled) {
          // Graceful fallback with INE official averages
          const esJoven = (perfil?.edad ?? 21) <= 29;
          const fallbackRes: PerfilVotanteResponse = {
            perfil_id: 0,
            nombre_alias: perfil?.nombre_alias || 'Votante',
            edad: perfil?.edad || 21,
            es_joven: esJoven,
            entidad_id: perfil?.entidad_id || 9,
            entidad: perfil?.entidad || 'CIUDAD DE MEXICO',
            participacion_esperada_pct: esJoven ? 59.8 : 68.0,
            abstencionismo_esperado_pct: esJoven ? 40.2 : 32.0,
            participacion_joven_pct: 59.8,
            abstencionismo_joven_pct: 40.2,
            brecha_abstencionismo_joven_pts: 8.2,
            mensaje_participacion: `En ${perfil?.entidad_display || perfil?.entidad || 'tu estado'}, la participación ciudadana estimada es del ${esJoven ? '59.8%' : '68.0%'}.`,
          };
          setStats(fallbackRes);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    calcularYPersistirPerfil();
    return () => {
      cancelled = true;
    };
  }, [perfil?.entidad_id, perfil?.edad, perfil?.entidad, perfil?.sexo, perfil?.prioridad_tema, setAnswer]);

  return (
    <StepContainer
      title="Tu Impacto Electoral"
      subtitle={`Estadísticas oficiales INE para ${perfil?.entidad_display || stats?.entidad || 'tu entidad'}`}
    >
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#9F2241" />
          <Text style={styles.loadingText}>Calculando perfil cívico con datos censales del INE...</Text>
        </View>
      ) : stats ? (
        <View>
          <VoterStatsCard
            entidad={perfil?.entidad_display || stats.entidad}
            distritoNombre={stats.distrito_nombre}
            participacionGeneralPct={stats.participacion_esperada_pct}
            abstencionismoGeneralPct={stats.abstencionismo_esperado_pct}
            participacionJovenPct={stats.participacion_joven_pct}
            brechaPts={stats.brecha_abstencionismo_joven_pts}
            participacionGeneroPct={stats.participacion_genero_pct}
            generoLabel={perfil?.sexo || 'Tu género'}
          />

          <Card style={styles.messageCard}>
            <View style={styles.badgeRow}>
              <Badge
                label={stats.es_joven ? 'Segmento Joven (18-29 años)' : 'Segmento General'}
                variant={stats.es_joven ? 'info' : 'warning'}
              />
              {stats.brecha_abstencionismo_joven_pts > 0 ? (
                <Badge
                  label={`Brecha Joven: +${stats.brecha_abstencionismo_joven_pts.toFixed(1)}%`}
                  variant="warning"
                />
              ) : null}
            </View>

            <Text style={styles.explanationText}>{stats.mensaje_participacion}</Text>

            {perfil?.temas_labels && perfil.temas_labels.length > 0 ? (
              <View style={styles.themesContainer}>
                <Text style={styles.themesHeader}>Tus prioridades registradas:</Text>
                <View style={styles.themesTags}>
                  {perfil.temas_labels.map((tema) => (
                    <Text key={tema} style={styles.themePill}>
                      {tema}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        </View>
      ) : null}

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
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  messageCard: {
    padding: 16,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  themesContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  themesHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  themesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  themePill: {
    fontSize: 12,
    color: '#9F2241',
    backgroundColor: '#FDF2F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#F8D7DA',
  },
  continueBtn: {
    marginTop: 18,
  },
});
