import type { FlowStep } from '../../flow/types';
import { PrioridadesStep } from './steps/PrioridadesStep';
import { CandidatosSwipeStep } from './steps/CandidatosSwipeStep';
import { CandidatosResumenStep } from './steps/CandidatosResumenStep';

// Luis: prioridades y las tres boletas seguidas. El resultado muestra las tres juntas.
export const candidatosSteps: FlowStep[] = [
  { id: 'candidatos.prioridades', Component: PrioridadesStep },
  { id: 'candidatos.swipe', Component: CandidatosSwipeStep },
  { id: 'candidatos.resumen', Component: CandidatosResumenStep },
];
