import { apiClient } from '../../../api/client';

export interface EntidadVotante {
  entidad_id: number;
  entidad: string;
  total_distritos: number;
  lista_nominal: number;
  votos_totales: number;
  participacion_general_pct: number;
  abstencionismo_general_pct: number;
  participacion_joven_pct: number;
  abstencionismo_joven_pct: number;
  brecha_abstencionismo_joven_vs_general_pts: number;
}

export interface DistritoVotante {
  id: number;
  entidad_id: number;
  entidad: string;
  distrito_id: number;
  distrito_nombre: string;
  lista_nominal: number;
  votos_totales: number;
  participacion_general_pct: number;
  abstencionismo_general_pct: number;
  participacion_joven_pct: number;
  abstencionismo_joven_pct: number;
  desglose_sexo_joven_json?: string;
}

export interface EntidadesResponse {
  total: number;
  items: EntidadVotante[];
}

export interface EntidadDetalleResponse {
  entidad: EntidadVotante;
  distritos: DistritoVotante[];
}

export interface PerfilVotantePayload {
  nombre_alias?: string;
  edad: number;
  sexo?: string;
  entidad_id: number;
  distrito_id?: number;
  escolaridad?: string;
  prioridad_tema?: string;
  temas?: string[];
}

export interface PerfilVotanteResponse {
  perfil_id: number;
  nombre_alias: string;
  edad: number;
  sexo?: string;
  es_joven: boolean;
  entidad_id: number;
  entidad: string;
  distrito_id?: number;
  distrito_nombre?: string;
  participacion_esperada_pct: number;
  abstencionismo_esperado_pct: number;
  participacion_joven_pct: number;
  abstencionismo_joven_pct: number;
  brecha_abstencionismo_joven_pts: number;
  participacion_genero_pct?: number;
  mensaje_participacion: string;
  temas_prioritarios?: string[];
}

export const fetchEntidades = async (): Promise<EntidadesResponse> => {
  const { data } = await apiClient.get<EntidadesResponse>('/api/v1/votantes/entidades');
  return data;
};

export const fetchEntidadByID = async (id: number): Promise<EntidadDetalleResponse> => {
  const { data } = await apiClient.get<EntidadDetalleResponse>(`/api/v1/votantes/entidades/${id}`);
  return data;
};

export const submitPerfilVotante = async (
  payload: PerfilVotantePayload
): Promise<PerfilVotanteResponse> => {
  const { data } = await apiClient.post<PerfilVotanteResponse>(
    '/api/v1/votantes/perfil',
    payload
  );
  return data;
};
