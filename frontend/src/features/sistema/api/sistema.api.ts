import { apiClient } from '../../../api/client';

export interface SystemStatus {
  status: string;
  total_candidatos: number;
  total_entidades: number;
  total_perfiles: number;
}

export interface ResetPayload {
  tipo_reset?: string; // "PERFILES" | "FULL"
  motivo?: string;
}

export interface ResetResponse {
  ok: boolean;
  tipo_reset: string;
  mensaje: string;
  registros_afectados: number;
  timestamp: string;
}

export interface ExportarPDFPayload {
  modulo: string;
  referencia_id: number;
  titulo?: string;
}

export interface ExportarPDFResponse {
  ok: boolean;
  export_id: number;
  formato: string;
  titulo: string;
  ruta_o_url: string;
  mensaje: string;
  generated_at: string;
}

export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  const { data } = await apiClient.get<SystemStatus>('/api/v1/sistema/status');
  return data;
};

export const executeReset = async (payload?: ResetPayload): Promise<ResetResponse> => {
  const { data } = await apiClient.post<ResetResponse>('/api/v1/sistema/reset', payload || {});
  return data;
};

export const exportarPDF = async (
  payload: ExportarPDFPayload
): Promise<ExportarPDFResponse> => {
  const { data } = await apiClient.post<ExportarPDFResponse>(
    '/api/v1/sistema/exportar-pdf',
    payload
  );
  return data;
};
