import React from 'react';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useFlow } from '../../../flow';
import { PerfilAnswer } from '../types';

const RANGES = [
  { label: '18 a 24 años', value: 21 },
  { label: '25 a 29 años', value: 27 },
  { label: '30 a 44 años', value: 37 },
  { label: '45 años o más', value: 55 },
];

// Ezequiel — step 1: tap an answer, slide automatically to the next step.
export const EdadStep: React.FC = () => {
  const { next, setAnswer } = useFlow();

  return (
    <StepContainer title="¿Cuál es tu edad?" subtitle="Para comparar con la participación de tu grupo">
      <ChoiceList
        options={RANGES}
        onSelect={(edad) => {
          setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({ ...prev, edad }));
          next();
        }}
      />
    </StepContainer>
  );
};
