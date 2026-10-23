import React from 'react';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useAnswer, useFlow } from '../../../flow';

type Cargo = 'DIPUTACION_MR' | 'SENADO_MR' | 'PRESIDENCIA';

interface Eleccion {
  entidad: string;
  entidadId: number;
  distritoId?: number;
  distritoNombre?: string;
  cargo?: Cargo;
}

const OPCIONES: { label: string; hint: string; value: Cargo }[] = [
  { label: 'Diputación de mi distrito', hint: 'La boleta más corta: unas pocas personas', value: 'DIPUTACION_MR' },
  { label: 'Senaduría de mi estado', hint: 'Quienes compiten por el Senado en tu entidad', value: 'SENADO_MR' },
  { label: 'Presidencia', hint: 'Las tres candidaturas a la presidencia', value: 'PRESIDENCIA' },
];

export const BoletaStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const eleccion = useAnswer<Eleccion>('candidatos.eleccion');

  return (
    <StepContainer
      title="¿Qué boleta quieres comparar?"
      subtitle={eleccion?.distritoNombre ? `Distrito ${eleccion.distritoId} · ${eleccion.distritoNombre}` : 'Elige una'}
    >
      <ChoiceList
        options={OPCIONES}
        onSelect={(cargo) => {
          setAnswer<Eleccion>('candidatos.eleccion', { ...eleccion!, cargo });
          next();
        }}
      />
    </StepContainer>
  );
};
