import { apiClient } from '../../../api/client';

export interface SystemStatus {
  status: string;
  total_candidatos: number;
  total_entidades: number;
  total_perfiles: number;
}

export interface PersonaPDF {
  nombre: string;
  partido?: string;
  afinidad?: number;
}

export interface BoletaPDF {
  cargo: string;
  empate?: boolean;
  nota?: string;
  personas?: PersonaPDF[];
}

export interface ResumenVotante {
  entidad?: string;
  distrito?: string;
  top_diputacion?: string;
  top_senado?: string;
  top_presidencia?: string;
  boletas?: BoletaPDF[];
}

export interface ExportarPDFPayload {
  modulo: string;
  referencia_id: number;
  titulo?: string;
  resumen?: ResumenVotante;
}

export interface ExportarPDFResponse {
  ok: boolean;
  export_id: number;
  formato: string;
  titulo: string;
  ruta_o_url: string;
  tamano_bytes?: number;
  mensaje: string;
  generated_at: string;
}

export interface AuditoriaItem {
  id: number;
  tipo: 'RESET' | 'EXPORT';
  detalle: string;
  fecha: string;
}

export interface AuditoriaResponse {
  ok: boolean;
  total_resets: number;
  total_exportaciones: number;
  resets: Array<{
    id: number;
    tipo_reset: string;
    motivo: string;
    usuario_o_sesion: string;
    realizado_en: string;
  }>;
  exportaciones: Array<{
    id: number;
    formato: string;
    modulo_origen: string;
    titulo: string;
    ruta_archivo: string;
    created_at: string;
  }>;
  consultado_en: string;
}

export interface ConflictoCampo {
  campo: string;
  valor_base: any;
  valor_entrante: any;
  valor_resuelto: any;
  regla_aplicada: string;
}

export interface SolicitudFusion {
  entidad_id: string;
  tipo_entidad: string;
  estrategia: 'source_priority' | 'last_write_wins' | 'field_merge' | 'manual';
  registro_base: Record<string, any>;
  registro_entrante: Record<string, any>;
  seleccion_manual?: Record<string, any>;
}

export interface ResultadoFusion {
  ok: boolean;
  timestamp: string;
  entidad_id: string;
  tipo_entidad: string;
  estrategia: string;
  estado: string;
  total_conflictos: number;
  conflictos: ConflictoCampo[];
  registro_consolidado: Record<string, any>;
  mensaje: string;
}

export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  const { data } = await apiClient.get<SystemStatus>('/api/v1/sistema/status');
  return data;
};

// 1. Exportar a PDF
export const exportarPDF = async (
  payload: ExportarPDFPayload
): Promise<ExportarPDFResponse> => {
  const { data } = await apiClient.post<ExportarPDFResponse>(
    '/api/v1/sistema/exportar-pdf',
    payload
  );
  return data;
};

// 3. Auditoría de base de datos
export const fetchAuditoria = async (): Promise<AuditoriaResponse> => {
  const { data } = await apiClient.get<AuditoriaResponse>('/api/v1/sistema/auditoria');
  return data;
};

// 4. Resolución de conflictos de fusión
export const resolverFusion = async (
  solicitud: SolicitudFusion
): Promise<ResultadoFusion> => {
  const { data } = await apiClient.post<ResultadoFusion>(
    '/api/v1/sistema/fusion/resolver',
    solicitud
  );
  return data;
};
