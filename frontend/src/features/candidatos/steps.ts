import type { FlowStep } from '../../flow/types';
import { CandidatosSwipeStep } from './steps/CandidatosSwipeStep';
import { CandidatosResumenStep } from './steps/CandidatosResumenStep';

// Luis: order here = order of the slides of this module.
export const candidatosSteps: FlowStep[] = [
  { id: 'candidatos.swipe', Component: CandidatosSwipeStep },
  { id: 'candidatos.resumen', Component: CandidatosResumenStep },
];
