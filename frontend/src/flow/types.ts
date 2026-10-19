import type { ComponentType } from 'react';

/**
 * A single "slide" of the app. Each module exports an array of these from
 * `features/<module>/steps.ts`. A step renders itself, collects an answer and
 * calls `useFlow().next()` to slide to the following step.
 */
export interface FlowStep {
  /** Unique id, prefix it with the module name (e.g. 'votantes.edad'). */
  id: string;
  Component: ComponentType;
}

/**
 * Answers shared across the whole flow (key -> value). Keys are prefixed by the
 * module that WRITES them (e.g. 'votantes.perfil'). Other modules may only READ
 * keys, never import code from another feature. Document new keys in docs/.
 */
export type FlowAnswers = Record<string, unknown>;
