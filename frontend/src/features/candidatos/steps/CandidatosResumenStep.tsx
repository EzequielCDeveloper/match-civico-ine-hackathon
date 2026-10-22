import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';
import { CandidatosLikedAnswer } from '../types';

// Luis — step 2: summary of the candidates the user liked.
export const CandidatosResumenStep: React.FC = () => {
  const { next } = useFlow();
  const liked = useAnswer<CandidatosLikedAnswer>('candidatos.liked') ?? [];

  return (
    <StepContainer
      title="Quienes más coinciden"
      subtitle="Nombre y partido, después de comparar propuestas a ciegas"
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {liked.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.empty}>No hubo suficientes propuestas para comparar.</Text>
            <Text style={styles.emptySub}>
              Puedes continuar para ver el reporte general o reiniciar el proceso al final.
            </Text>
          </Card>
        ) : (
          liked.map((c) => (
            <Card key={c.id} style={styles.candidateCard}>
              <View style={styles.bullet} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.nombre}</Text>
                {c.partido ? <Text style={styles.party}>{c.partido}</Text> : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
      <Button title="Continuar al Cierre ›" onPress={next} style={styles.btn} />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  emptyCard: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: '#BC955C',
  },
  empty: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySub: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#9F2241', // Guinda oficial
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BC955C',
    marginRight: 12,
  },
  name: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  party: { fontSize: 13, color: '#691C32', marginTop: 2 },
  btn: { marginTop: 12 },
});
