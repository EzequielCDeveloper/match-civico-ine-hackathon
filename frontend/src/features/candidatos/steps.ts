import type { FlowStep } from '../../flow/types';
import { DistritoStep } from './steps/DistritoStep';
import { BoletaStep } from './steps/BoletaStep';
import { PrioridadesStep } from './steps/PrioridadesStep';
import { CandidatosSwipeStep } from './steps/CandidatosSwipeStep';
import { CandidatosResumenStep } from './steps/CandidatosResumenStep';

// Luis: distrito y boleta primero, para comparar solo a quienes compiten entre sí.
export const candidatosSteps: FlowStep[] = [
  { id: 'candidatos.distrito', Component: DistritoStep },
  { id: 'candidatos.boleta', Component: BoletaStep },
  { id: 'candidatos.prioridades', Component: PrioridadesStep },
  { id: 'candidatos.swipe', Component: CandidatosSwipeStep },
  { id: 'candidatos.resumen', Component: CandidatosResumenStep },
];
