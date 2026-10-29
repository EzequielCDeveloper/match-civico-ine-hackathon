import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useAnswer, useFlow } from '../../../flow';
import { fetchEntidadByID, DistritoVotante } from '../api/votantes.api';
import { PerfilAnswer } from '../types';

export const DistritoStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const perfil = useAnswer<PerfilAnswer>('votantes.perfil');
  const [distritos, setDistritos] = useState<DistritoVotante[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!perfil?.entidad_id) {
      setCargando(false);
      return;
    }
    fetchEntidadByID(perfil.entidad_id)
      .then((res) => setDistritos(res.distritos || []))
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
      subtitle={`${perfil.entidad_display || perfil.entidad}. Así calculamos las métricas y candidatos de tu boleta local`}
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
            setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({
              ...prev,
              distrito_id: distrito.distrito_id,
              distrito_nombre: distrito.distrito_nombre,
            }));
            setAnswer('candidatos.eleccion', {
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
