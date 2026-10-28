import { useState, useEffect, useCallback } from 'react';
import {
  EntidadVotante,
  DistritoVotante,
  PerfilVotantePayload,
  PerfilVotanteResponse,
  fetchEntidades,
  fetchEntidadByID,
  submitPerfilVotante,
} from '../api/votantes.api';

export const useVoterStats = (entidadId?: number) => {
  const [entidades, setEntidades] = useState<EntidadVotante[]>([]);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadVotante | null>(null);
  const [distritos, setDistritos] = useState<DistritoVotante[]>([]);
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

  const loadEntidadDetalle = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEntidadByID(id);
      setSelectedEntidad(res.entidad);
      setDistritos(res.distritos || []);
      return res;
    } catch (err: any) {
      setError(err?.message || 'Error cargando detalle distrital');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (entidadId) {
      loadEntidadDetalle(entidadId);
    } else {
      loadEntidades();
    }
  }, [entidadId, loadEntidadDetalle, loadEntidades]);

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
    selectedEntidad,
    distritos,
    loading,
    error,
    calculating,
    perfilResultado,
    calcularPerfil,
    loadEntidadDetalle,
    refresh: loadEntidades,
  };
};
