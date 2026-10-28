import { apiClient } from '../../../api/client';

export interface Candidato {
  id_anonimo: number;
  nombre_candidato: string;
  partido_coalicion: string;
  cargo: string;
  entidad: string;
  distrito_id: number;
  distrito_nombre: string;
  distrito_federal: string;
  circunscripcion: string;
  municipio: string;
  tipo_candidato: string;
  estatus: string;
  edad: number;
  sexo: string;
  escolaridad: string;
  estatus_escolaridad: string;
  tiene_titulo: boolean;
  estudios: string;
  cursos: string;
  historia_profesional: string;
  trayectoria_politica: string;
  motivo_cargo_publico: string;
  propuesta_1: string;
  propuesta_2: string;
  propuesta_genero: string;
  tiene_propuestas: boolean;
}

export interface CandidatosResponse {
  total: number;
  items: Candidato[];
}

export interface CandidatosFilters {
  cargo?: string;
  entidad?: string;
  escolaridad?: string;
  tiene_titulo?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export const fetchCandidatos = async (
  filters?: CandidatosFilters
): Promise<CandidatosResponse> => {
  const { data } = await apiClient.get<CandidatosResponse>('/api/v1/candidatos', {
    params: filters,
  });
  return data;
};

export const fetchCandidatoByID = async (id: number): Promise<Candidato> => {
  const { data } = await apiClient.get<Candidato>(`/api/v1/candidatos/${id}`);
  return data;
};

export interface MatchCandidato {
  id_anonimo: number;
  nombre_candidato: string;
  partido_coalicion: string;
  cargo: string;
  propuesta_1: string;
  propuesta_2: string;
  etiquetas: Record<string, number>;
}

export interface PropuestaBoleta {
  id: string;
  id_anonimo: number;
  texto: string;
  etiquetas: Record<string, number>;
}

export interface CandidatoBoleta {
  id_anonimo: number;
  nombre_candidato: string;
  partido_coalicion: string;
  escolaridad: string;
  trayectoria_politica: string;
  concrecion: number;
  competencia_cargo: number;
}

export interface BoletaResponse {
  cargo: string;
  candidatos: CandidatoBoleta[];
  propuestas: PropuestaBoleta[];
  similitud: Record<string, Record<string, number>>;
  sin_propuestas: { nombre_candidato: string; partido_coalicion: string }[];
}

export const fetchBoleta = async (
  entidad: string,
  distrito: number,
  cargo: 'DIPUTACION_MR' | 'SENADO_MR' | 'PRESIDENCIA'
): Promise<BoletaResponse> => {
  const { data } = await apiClient.get<BoletaResponse>('/api/v1/candidatos/boleta', {
    params: { entidad, distrito, cargo },
  });
  return data;
};

export const fetchDistritos = async (
  entidadId: number
): Promise<{ distrito_id: number; distrito_nombre: string }[]> => {
  const { data } = await apiClient.get<{ distritos: { distrito_id: number; distrito_nombre: string }[] }>(
    `/api/v1/votantes/entidades/${entidadId}`
  );
  return data.distritos ?? [];
};

export const fetchParaMatch = async (entidad: string): Promise<MatchCandidato[]> => {
  const { data } = await apiClient.get<{ items: MatchCandidato[] }>(
    '/api/v1/candidatos/para-match',
    { params: { entidad } }
  );
  return data.items ?? [];
};
