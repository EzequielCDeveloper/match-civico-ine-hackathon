/** Shape of the answer stored under flow key 'votantes.perfil'. */
export interface PerfilAnswer {
  nombre_alias?: string;
  edad?: number;
  sexo?: string;
  entidad_id?: number;
  entidad?: string; // Canonical UPPERCASE name e.g. 'CIUDAD DE MEXICO' (aligned with INE and candidatos)
  entidad_display?: string; // Friendly name e.g. 'Ciudad de México'
  distrito_id?: number;
  distrito_nombre?: string;
  escolaridad?: string;
  prioridad_tema?: string;
  temas?: string[]; // Axis IDs matching Luis's taxonomy: ['eje_seguridad', 'eje_educacion', ...]
  temas_labels?: string[]; // Display labels: ['Seguridad', 'Educación', ...]
  resultado_calculo?: {
    perfil_id?: number;
    participacion_esperada_pct: number;
    abstencionismo_esperado_pct: number;
    participacion_joven_pct: number;
    abstencionismo_joven_pct: number;
    brecha_abstencionismo_joven_pts: number;
    participacion_genero_pct?: number;
    mensaje_participacion: string;
    es_joven: boolean;
  };
}
