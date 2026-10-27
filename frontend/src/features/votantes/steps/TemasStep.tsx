import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { SwipeDeck } from '../../../components/ui/SwipeDeck';
import { useFlow } from '../../../flow';
import { PerfilAnswer } from '../types';

const TEMAS = ['Educación', 'Seguridad', 'Salud', 'Economía', 'Medio ambiente', 'Igualdad de género'];

// Ezequiel — step 3: Tinder-style swipe on topics (right = me importa).
export const TemasStep: React.FC = () => {
  const { next, setAnswer } = useFlow();

  return (
    <StepContainer title="¿Qué te importa?" subtitle="Desliza a la derecha los temas que te importan">
      <SwipeDeck
        items={TEMAS}
        keyExtractor={(t) => t}
        leftLabel="No"
        rightLabel="Me importa"
        renderCard={(tema) => (
          <View style={styles.card}>
            <Text selectable={false} style={styles.text}>{tema}</Text>
          </View>
        )}
        onFinish={(results) => {
          const temas = results.filter((r) => r.direction === 'right').map((r) => r.item);
          setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({ ...prev, temas }));
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
    borderTopColor: '#9F2241', // Guinda oficial
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  text: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    padding: 20,
    letterSpacing: -0.3,
    userSelect: 'none',
  } as const,
});
