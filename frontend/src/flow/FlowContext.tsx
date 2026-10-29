import React, { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { FlowAnswers, FlowStep } from './types';

type Direction = 1 | -1;

interface FlowContextValue {
  steps: FlowStep[];
  index: number;
  total: number;
  direction: Direction;
  currentStep: FlowStep;
  next: () => void;
  back: () => void;
  goTo: (stepId: string) => void;
  restart: () => void;
  answers: FlowAnswers;
  setAnswer: <T>(key: string, value: T | ((prev: T | undefined) => T)) => void;
  registerBackHandler: (fn: (() => boolean) | null) => void;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export const FlowProvider: React.FC<{ steps: FlowStep[]; children: ReactNode }> = ({
  steps,
  children,
}) => {
  const [nav, setNav] = useState<{ index: number; direction: Direction }>({
    index: 0,
    direction: 1,
  });
  const [answers, setAnswers] = useState<FlowAnswers>({});
  const backHandlerRef = useRef<(() => boolean) | null>(null);

  const registerBackHandler = useCallback((fn: (() => boolean) | null) => {
    backHandlerRef.current = fn;
  }, []);

  const next = useCallback(() => {
    backHandlerRef.current = null;
    setNav((n) => ({ index: Math.min(n.index + 1, steps.length - 1), direction: 1 }));
  }, [steps.length]);

  const back = useCallback(() => {
    if (backHandlerRef.current && backHandlerRef.current()) {
      return;
    }
    setNav((n) => ({ index: Math.max(n.index - 1, 0), direction: -1 }));
  }, []);

  const goTo = useCallback(
    (stepId: string) => {
      const target = steps.findIndex((s) => s.id === stepId);
      if (target < 0) return;
      backHandlerRef.current = null;
      setNav((n) => ({ index: target, direction: target >= n.index ? 1 : -1 }));
    },
    [steps]
  );

  const restart = useCallback(() => {
    backHandlerRef.current = null;
    setAnswers({});
    setNav({ index: 0, direction: -1 });
  }, []);

  const setAnswer = useCallback(<T,>(key: string, value: T | ((prev: T | undefined) => T)) => {
    setAnswers((prev) => ({
      ...prev,
      [key]:
        typeof value === 'function'
          ? (value as (p: T | undefined) => T)(prev[key] as T | undefined)
          : value,
    }));
  }, []);

  const value = useMemo<FlowContextValue>(
    () => ({
      steps,
      index: nav.index,
      total: steps.length,
      direction: nav.direction,
      currentStep: steps[nav.index],
      next,
      back,
      goTo,
      restart,
      answers,
      setAnswer,
      registerBackHandler,
    }),
    [steps, nav, next, back, goTo, restart, answers, setAnswer, registerBackHandler]
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
};

export const useFlow = (): FlowContextValue => {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be used inside <FlowProvider>');
  return ctx;
};

/** Convenience reader for a typed answer. */
export const useAnswer = <T,>(key: string): T | undefined => {
  const { answers } = useFlow();
  return answers[key] as T | undefined;
};
