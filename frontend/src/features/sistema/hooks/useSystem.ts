import { useState, useEffect, useCallback } from 'react';
import {
  SystemStatus,
  ExportarPDFResponse,
  ResumenVotante,
  fetchSystemStatus,
  exportarPDF,
} from '../api/sistema.api';
import { descargarArchivoPDF } from '../utils/descargarPdf';

export const useSystem = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

      // Descargar de forma transparente en el dispositivo
      if (res.ruta_o_url) {
        await descargarArchivoPDF(res.ruta_o_url, `reporte_match_civico_${modulo}.pdf`);
      }

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
    exportLoading,
    lastExport,
    handleExportPDF,
    refresh: loadStatus,
  };
};
