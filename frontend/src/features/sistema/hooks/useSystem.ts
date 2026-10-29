import { useState, useEffect, useCallback } from 'react';
import {
  SystemStatus,
  ResetResponse,
  ExportarPDFResponse,
  ResumenVotante,
  fetchSystemStatus,
  executeReset,
  exportarPDF,
} from '../api/sistema.api';

export const useSystem = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [lastReset, setLastReset] = useState<ResetResponse | null>(null);

  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [lastExport, setLastExport] = useState<ExportarPDFResponse | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err?.message || 'Error cargando estado del sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleReset = async (tipo: string = 'PERFILES', motivo: string = 'Usuario solicitó reset') => {
    setResetLoading(true);
    try {
      const res = await executeReset({ tipo_reset: tipo, motivo });
      setLastReset(res);
      await loadStatus();
      return res;
    } catch (err: any) {
      setError(err?.message || 'Error ejecutando reset');
      throw err;
    } finally {
      setResetLoading(false);
    }
  };

  const handleExportPDF = async (
    modulo: string = 'candidatos',
    referenciaId: number = 1,
    resumen?: ResumenVotante
  ) => {
    setExportLoading(true);
    try {
      const res = await exportarPDF({
        modulo,
        referencia_id: referenciaId,
        titulo: `Reporte de ${modulo.toUpperCase()}`,
        resumen,
      });
      setLastExport(res);
      return res;
    } catch (err: any) {
      setError(err?.message || 'Error generando exportación PDF');
      throw err;
    } finally {
      setExportLoading(false);
    }
  };

  return {
    status,
    loading,
    error,
    resetLoading,
    lastReset,
    exportLoading,
    lastExport,
    handleReset,
    handleExportPDF,
    refresh: loadStatus,
  };
};
