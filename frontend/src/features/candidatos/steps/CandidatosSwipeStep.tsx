import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { SwipeDeck } from '../../../components/ui/SwipeDeck';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';
import { MatchCandidato, fetchParaMatch } from '../api/candidatos.api';
import { PropuestaCard } from '../components/PropuestaCard';
import {
  MAX_PREGUNTAS,
  Pregunta,
  aplicarRespuesta,
  mejores,
  siguientePregunta,
} from '../match/tree';

// Luis — una propuesta anónima por tema. La siguiente sale de las etiquetas.
export const CandidatosSwipeStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const perfil = useAnswer<{ entidad?: string }>('votantes.perfil');
  const entidad = perfil?.entidad;

  const [candidatos, setCandidatos] = useState<MatchCandidato[]>([]);
  const [puntajes, setPuntajes] = useState<Record<number, number>>({});
  const [preguntadas, setPreguntadas] = useState<string[]>([]);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancel = false;
    const cargar = async () => {
      if (!entidad) {
        setError('Primero elige el estado donde votas.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const items = await fetchParaMatch(entidad);
        if (cancel) return;
        if (items.length === 0) {
          setError('No hay candidaturas con propuestas en ese estado.');
          setLoading(false);
          return;
        }
        setCandidatos(items);
        setPregunta(siguientePregunta(items, []));
      } catch {
        if (!cancel) setError('No se pudieron cargar las candidaturas.');
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancel = true;
    };
  }, [entidad, intento]);

  const cerrar = (scores: Record<number, number>) => {
    setAnswer('candidatos.liked', mejores(candidatos, scores, 3));
    next();
  };

  return (
    <StepContainer
      title={pregunta ? pregunta.tema : 'Propuestas a ciegas'}
      subtitle={
        pregunta
          ? `Propuesta ${preguntadas.length + 1} de ${MAX_PREGUNTAS} · derecha si te convence`
          : 'Sin nombre ni partido'
      }
    >
      {loading ? (
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
      ) : error ? (
        <>
          <Text style={{ textAlign: 'center', marginVertical: 16, color: '#6B7280' }}>{error}</Text>
          <Button title="Reintentar" onPress={() => setIntento((n) => n + 1)} />
        </>
      ) : pregunta ? (
        <SwipeDeck
          key={pregunta.etiqueta}
          items={[pregunta]}
          keyExtractor={(p) => p.etiqueta}
          renderCard={(p) => <PropuestaCard tema={p.tema} texto={p.texto} />}
          onFinish={(results) => {
            const aFavor = results[0]?.direction === 'right';
            const scores = aplicarRespuesta(puntajes, candidatos, pregunta.etiqueta, aFavor);
            const asked = [...preguntadas, pregunta.etiqueta];
            const otra = asked.length >= MAX_PREGUNTAS ? null : siguientePregunta(candidatos, asked);
            if (!otra) {
              cerrar(scores);
              return;
            }
            setPuntajes(scores);
            setPreguntadas(asked);
            setPregunta(otra);
          }}
        />
      ) : (
        <Button title="Ver resultados" onPress={() => cerrar(puntajes)} />
      )}
    </StepContainer>
  );
};
