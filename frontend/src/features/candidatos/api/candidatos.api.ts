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

export const fetchParaMatch = async (entidad: string): Promise<MatchCandidato[]> => {
  const { data } = await apiClient.get<{ items: MatchCandidato[] }>(
    '/api/v1/candidatos/para-match',
    { params: { entidad } }
  );
  return data.items ?? [];
};
