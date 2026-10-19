import type { FlowStep } from '../../flow/types';
import { CierreStep } from './steps/CierreStep';

// Juan: order here = order of the slides of this module.
export const sistemaSteps: FlowStep[] = [{ id: 'sistema.cierre', Component: CierreStep }];
