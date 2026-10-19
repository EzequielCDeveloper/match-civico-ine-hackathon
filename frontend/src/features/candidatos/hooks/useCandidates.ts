import { useState, useEffect, useCallback } from 'react';
import { Candidato, CandidatosFilters, fetchCandidatos } from '../api/candidatos.api';
import { CANDIDATOS_FALLBACK } from '../constants/fallback';

export const useCandidates = (initialFilters?: CandidatosFilters) => {
  const [candidates, setCandidates] = useState<Candidato[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Default to limit: 5 for lightweight lazy loading on demand
  const [filters, setFilters] = useState<CandidatosFilters>(initialFilters || { limit: 5 });

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCandidatos(filters);
      if (res.items && res.items.length > 0) {
        setCandidates(res.items);
        setTotal(res.total || res.items.length);
      } else {
        setCandidates(CANDIDATOS_FALLBACK);
        setTotal(CANDIDATOS_FALLBACK.length);
      }
    } catch {
      // Offline / Expo Go network fallback without blocking
      setCandidates(CANDIDATOS_FALLBACK);
      setTotal(CANDIDATOS_FALLBACK.length);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const updateFilters = (newFilters: Partial<CandidatosFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return {
    candidates,
    total,
    loading,
    error,
    filters,
    updateFilters,
    refresh: loadCandidates,
  };
};
