import type { FlowStep } from './types';

// RESTRICTED FILE: edited only once when the template is created.
// Order of this array = order of the user journey. To disable a module,
// comment its single line below (the app keeps compiling).
import { votantesSteps } from '../features/votantes/steps'; //   Ezequiel
import { candidatosSteps } from '../features/candidatos/steps'; // Luis
import { sistemaSteps } from '../features/sistema/steps'; //     Juan

export const FLOW_STEPS: FlowStep[] = [
  ...votantesSteps,
  ...candidatosSteps,
  ...sistemaSteps,
];
