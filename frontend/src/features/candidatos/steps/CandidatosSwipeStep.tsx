import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { SwipeDeck } from '../../../components/ui/SwipeDeck';
import { Button } from '../../../components/ui/Button';
import { useFlow } from '../../../flow';
import { useCandidates } from '../hooks/useCandidates';
import { CandidateCard } from '../components/CandidateCard';
import { CandidatosLikedAnswer } from '../types';

// Luis — step 1: Tinder-style swipe on candidates (right = me convence).
export const CandidatosSwipeStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  // Lazy loading: fetch only 5 candidates on demand
  const { candidates, loading, error, refresh } = useCandidates({ limit: 5 });

  return (
    <StepContainer
      title="Candidaturas 2024"
      subtitle="Desliza a la derecha si te convence · Izquierda para descartar"
    >
      {loading ? (
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
      ) : error ? (
        <>
          <Text style={{ textAlign: 'center', marginVertical: 16, color: '#6B7280' }}>
            {error}
          </Text>
          <Button title="Reintentar" onPress={refresh} />
        </>
      ) : (
        <SwipeDeck
          items={candidates}
          keyExtractor={(c) => c.id_anonimo}
          renderCard={(c) => <CandidateCard candidato={c} />}
          onFinish={(results) => {
            const liked: CandidatosLikedAnswer = results
              .filter((r) => r.direction === 'right')
              .map((r) => ({ id: r.item.id_anonimo, nombre: r.item.nombre_candidato }));
            setAnswer('candidatos.liked', liked);
            next();
          }}
        />
      )}
    </StepContainer>
  );
};
