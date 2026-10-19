import type { FlowStep } from '../../flow/types';
import { EdadStep } from './steps/EdadStep';
import { EntidadStep } from './steps/EntidadStep';
import { TemasStep } from './steps/TemasStep';
import { ParticipacionStep } from './steps/ParticipacionStep';

// Ezequiel: order here = order of the slides of this module.
export const votantesSteps: FlowStep[] = [
  { id: 'votantes.edad', Component: EdadStep },
  { id: 'votantes.entidad', Component: EntidadStep },
  { id: 'votantes.temas', Component: TemasStep },
  { id: 'votantes.participacion', Component: ParticipacionStep },
];
