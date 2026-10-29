import React from 'react';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useFlow } from '../../../flow';
import { PerfilAnswer } from '../types';

const SEX_OPTIONS = [
  { label: 'Mujer', value: 'Mujer' },
  { label: 'Hombre', value: 'Hombre' },
  { label: 'Prefiero no especificar', value: 'No especificado' },
];

export const SexoStep: React.FC = () => {
  const { next, setAnswer } = useFlow();

  return (
    <StepContainer
      title="¿Cuál es tu sexo o género?"
      subtitle="Para contrastar tu participación con la de tu grupo demográfico"
    >
      <ChoiceList
        options={SEX_OPTIONS}
        onSelect={(sexo) => {
          setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({ ...prev, sexo }));
          next();
        }}
      />
    </StepContainer>
  );
};
