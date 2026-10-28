import React from 'react';
import { StepContainer } from '../../../components/ui/StepContainer';
import { ChoiceList } from '../../../components/ui/ChoiceList';
import { useFlow } from '../../../flow';
import { PerfilAnswer } from '../types';
import { ESTADOS_MEXICO, EstadoCatalogo } from '../constants/estados';

// Ezequiel — step 2: Pick the voter's state immediately without blocking on heavy network dumps.
// Stores both canonical uppercase INE entidad (for backend & Luis's candidatos) and friendly display name.
export const EntidadStep: React.FC = () => {
  const { next, setAnswer } = useFlow();

  const options = ESTADOS_MEXICO.map((e) => ({
    label: e.nombre,
    value: e,
  }));

  return (
    <StepContainer
      title="¿En qué estado votas?"
      subtitle="Selecciona tu entidad federativa para contrastar tu participación"
    >
      <ChoiceList<EstadoCatalogo>
        options={options}
        onSelect={(estado) => {
          setAnswer<PerfilAnswer>('votantes.perfil', (prev) => ({
            ...prev,
            entidad_id: estado.id,
            entidad: estado.entidad, // Canonical UPPERCASE name e.g. "CIUDAD DE MEXICO"
            entidad_display: estado.nombre, // Display name e.g. "Ciudad de México"
          }));
          next();
        }}
      />
    </StepContainer>
  );
};
