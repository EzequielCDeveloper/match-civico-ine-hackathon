import { useState, useEffect, useCallback } from 'react';
import {
  EntidadVotante,
  PerfilVotantePayload,
  PerfilVotanteResponse,
  fetchEntidades,
  submitPerfilVotante,
} from '../api/votantes.api';

export const useVoterStats = () => {
  const [entidades, setEntidades] = useState<EntidadVotante[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [calculating, setCalculating] = useState<boolean>(false);
  const [perfilResultado, setPerfilResultado] = useState<PerfilVotanteResponse | null>(null);

  const loadEntidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEntidades();
      setEntidades(res.items || []);
    } catch (err: any) {
      setError(err?.message || 'Error cargando estadísticas electorales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntidades();
  }, [loadEntidades]);

  const calcularPerfil = async (payload: PerfilVotantePayload) => {
    setCalculating(true);
    setError(null);
    try {
      const res = await submitPerfilVotante(payload);
      setPerfilResultado(res);
      return res;
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Error calculando perfil');
      throw err;
    } finally {
      setCalculating(false);
    }
  };

  return {
    entidades,
    loading,
    error,
    calculating,
    perfilResultado,
    calcularPerfil,
    refresh: loadEntidades,
  };
};
