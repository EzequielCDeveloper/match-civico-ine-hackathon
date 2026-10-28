import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { SwipeDeck } from '../../../components/ui/SwipeDeck';
import { useFlow } from '../../../flow';
import { PerfilAnswer } from '../types';

// Aligned with Luis's taxonomy (backend/scripts/etiquetado/taxonomia.json)
// so the user's priority topics correspond 1:1 to candidates' tagged proposals.
interface TemaItem {
  id: string;
  label: string;
  descripcion: string;
}

const TEMAS_TAXONOMIA: TemaItem[] = [
  { id: 'eje_seguridad', label: 'Seguridad', descripcion: 'Paz pública, prevención del delito y policía' },
  { id: 'eje_salud', label: 'Salud', descripcion: 'Hospitales, clínicas y medicamentos' },
  { id: 'eje_educacion', label: 'Educación', descripcion: 'Escuelas, maestros y becas estudiantiles' },
  { id: 'eje_economia', label: 'Empleo y Economía', descripcion: 'Salarios dignos, inversión y emprendimiento' },
  { id: 'eje_ambiente', label: 'Agua y Medio Ambiente', descripcion: 'Cuidado del agua, energías limpias y sustentabilidad' },
  { id: 'eje_mujeres', label: 'Mujeres e Igualdad', descripcion: 'Equidad de género y erradicación de violencia' },
  { id: 'eje_anticorrupcion', label: 'Anticorrupción', descripcion: 'Transparencia y rendición de cuentas' },
  { id: 'eje_juventud', label: 'Juventud', descripcion: 'Primer empleo y desarrollo juvenil' },
];

// Ezequiel — step 3: Tinder-style swipe on topics (right = me importa).
export const TemasStep: React.FC = () => {
  const { next, setAnswer } = useFlow();

  return (
    <StepContainer
      title="¿Qué te importa?"
      subtitle="Desliza a la derecha los temas prioritarios para tu comunidad"
    >
      <SwipeDeck<TemaItem>
        items={TEMAS_TAXONOMIA}
        keyExtractor={(t) => t.id}
        leftLabel="No prioritario"
        rightLabel="Me importa"
        renderCard={(tema) => (
          <View style={styles.card}>
            <Text style={styles.tagLabel}>Eje Prioritario</Text>
            <Text style={styles.title}>{tema.label}</Text>
            <Text style={styles.description}>{tema.descripcion}</Text>
          </View>
        )}
        onFinish={(results) => {
          const selected = results.filter((r) => r.direction === 'right').map((r) => r.item);
          const temasIds = selected.map((s) => s.id);
          const temasLabels = selected.map((s) => s.label);

          setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({
            ...prev,
            temas: temasIds,
            temas_labels: temasLabels,
            prioridad_tema: temasIds.length > 0 ? temasIds[0] : 'eje_educacion',
          }));
          next();
        }}
      />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderTopWidth: 5,
    borderTopColor: '#9F2241', // Guinda institucional
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9F2241',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
