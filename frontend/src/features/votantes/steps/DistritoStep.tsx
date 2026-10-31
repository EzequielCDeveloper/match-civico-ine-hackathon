import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useAnswer, useFlow } from '../../../flow';
import { fetchEntidadByID, DistritoVotante } from '../api/votantes.api';
import { PerfilAnswer } from '../types';

function cabeceraLegible(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

function etiquetaDistrito(distrito: DistritoVotante): string {
  return `${cabeceraLegible(distrito.distrito_nombre)} · Distrito ${distrito.distrito_id}`;
}

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
      subtitle={`${perfil.entidad_display || perfil.entidad}. El número es tu distrito federal: una ciudad grande tiene varios`}
    >
      {cargando ? (
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
      ) : (
        <ChoiceList
          options={[...distritos]
            .sort((a, b) => a.distrito_nombre.localeCompare(b.distrito_nombre, 'es') || a.distrito_id - b.distrito_id)
            .map((d) => ({
              label: etiquetaDistrito(d),
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
