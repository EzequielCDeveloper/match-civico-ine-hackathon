import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useAnswer, useFlow } from '../../../flow';
import { fetchDistritos } from '../api/candidatos.api';

interface Eleccion {
  entidad: string;
  entidadId: number;
  distritoId?: number;
  distritoNombre?: string;
  cargo?: 'DIPUTACION_MR' | 'SENADO_MR' | 'PRESIDENCIA';
}

// Luis: el distrito acota la boleta a las personas que sí aparecen en ella.
export const DistritoStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const perfil = useAnswer<{ entidad?: string; entidad_id?: number }>('votantes.perfil');
  const [distritos, setDistritos] = useState<{ distrito_id: number; distrito_nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!perfil?.entidad_id) {
      setCargando(false);
      return;
    }
    fetchDistritos(perfil.entidad_id)
      .then(setDistritos)
      .catch(() => setDistritos([]))
      .finally(() => setCargando(false));
  }, [perfil?.entidad_id]);

  if (!perfil?.entidad) {
    return (
      <StepContainer title="¿En qué distrito votas?" subtitle="Primero elige tu estado">
        <Text style={{ color: '#6B7280' }}>Vuelve al paso del estado para continuar.</Text>
      </StepContainer>
    );
  }

  return (
    <StepContainer
      title="¿En qué distrito votas?"
      subtitle={`${perfil.entidad}. Así comparamos solo a quienes compiten en tu boleta`}
    >
      {cargando ? (
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
      ) : (
        <ChoiceList
          options={distritos.map((d) => ({
            label: `${d.distrito_id} · ${d.distrito_nombre}`,
            value: d,
          }))}
          onSelect={(distrito) => {
            setAnswer<Eleccion>('candidatos.eleccion', {
              entidad: perfil.entidad!,
              entidadId: perfil.entidad_id!,
              distritoId: distrito.distrito_id,
              distritoNombre: distrito.distrito_nombre,
            });
            next();
          }}
        />
      )}
    </StepContainer>
  );
};
