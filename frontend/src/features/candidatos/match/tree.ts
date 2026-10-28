import { MatchCandidato } from '../api/candidatos.api';

export const MAX_PREGUNTAS = 6;

const UMBRAL = 0.45;

export const EJE_LABEL: Record<string, string> = {
  eje_seguridad: 'Seguridad',
  eje_salud: 'Salud',
  eje_educacion: 'Educación',
  eje_economia: 'Empleo y economía',
  eje_ambiente: 'Agua y medio ambiente',
  eje_mujeres: 'Mujeres e igualdad de género',
  eje_juventud: 'Juventud',
  eje_infancia: 'Niñas, niños y adolescentes',
  eje_adultos_mayores: 'Personas adultas mayores',
  eje_discapacidad: 'Discapacidad',
  eje_indigenas: 'Pueblos indígenas y afromexicanos',
  eje_campo: 'Campo y pesca',
  eje_anticorrupcion: 'Anticorrupción y transparencia',
  eje_derechos_humanos: 'Derechos humanos y diversidad',
  eje_movilidad: 'Movilidad e infraestructura',
  eje_vivienda: 'Vivienda',
  eje_energia: 'Energía',
  eje_tecnologia: 'Tecnología y conectividad',
  eje_cultura_deporte: 'Cultura y deporte',
  eje_migracion: 'Migración',
  eje_animales: 'Bienestar animal',
};

export interface Pregunta {
  etiqueta: string;
  tema: string;
  texto: string;
}

/** Palabras del inicio del texto. El eje se etiquetó por candidato, y una propuesta mezcla varios temas. */
const CLAVES: Record<string, string[]> = {
  eje_seguridad: ['seguridad', 'delito', 'violencia', 'policia', 'paz', 'crimen', 'guardia nacional'],
  eje_salud: ['salud', 'hospital', 'medic', 'clinic', 'imss', 'enfermedad'],
  eje_educacion: ['educacion', 'escuela', 'beca', 'maestro', 'docente', 'universidad'],
  eje_economia: ['empleo', 'economia', 'salario', 'trabajo', 'empresa', 'impuesto', 'pyme', 'negocio'],
  eje_ambiente: ['agua', 'ambiente', 'sustentab', 'clima', 'contamin', 'bosque'],
  eje_mujeres: ['mujer', 'genero', 'feminicidio'],
  eje_juventud: ['joven', 'juventud'],
  eje_infancia: ['nina', 'nino', 'ninez', 'infancia', 'adolescente'],
  eje_adultos_mayores: ['adulto mayor', 'adultos mayores', 'pension', 'tercera edad'],
  eje_discapacidad: ['discapacidad', 'accesibilidad'],
  eje_indigenas: ['indigena', 'afromexican', 'lengua'],
  eje_campo: ['campo', 'agric', 'campesin', 'ganad', 'pesca', 'pescador', 'siembra'],
  eje_anticorrupcion: ['corrup', 'transparencia', 'rendicion de cuentas'],
  eje_derechos_humanos: ['derechos humanos', 'desaparec', 'victima', 'diversidad sexual'],
  eje_movilidad: ['transporte', 'carretera', 'movilidad', 'obra publica'],
  eje_vivienda: ['vivienda'],
  eje_energia: ['energia', 'electric', 'petroleo'],
  eje_tecnologia: ['internet', 'tecnolog', 'digital', 'ciencia'],
  eje_cultura_deporte: ['cultura', 'deporte', 'arte'],
  eje_migracion: ['migrant', 'migracion', 'extranjero'],
  eje_animales: ['animal'],
};

const sinAcentos = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const menciona = (texto: string, etiqueta: string): number => {
  const inicio = sinAcentos(texto).slice(0, 400);
  return (CLAVES[etiqueta] ?? []).filter((clave) => inicio.includes(sinAcentos(clave))).length;
};

const legible = (texto: string): string => {
  const plano = texto.replace(/\s+/g, ' ').trim();
  const letras = plano.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').length;
  let out = plano;
  if (letras.length > 20 && mayusculas / letras.length > 0.7) {
    out = plano
      .toLowerCase()
      .replace(/(^|[.!?]\s+)([a-záéíóúüñ])/g, (_, corte: string, letra: string) => corte + letra.toUpperCase());
  }
  if (out.length > 520) out = out.slice(0, 517).replace(/\s+\S*$/, '') + '…';
  return out;
};

const textoDelTema = (candidatos: MatchCandidato[], etiqueta: string): string => {
  let mejor = '';
  let mejorClave: [number, number] = [-1, -1];
  for (const c of candidatos) {
    const peso = c.etiquetas[etiqueta] ?? 0;
    if (peso < UMBRAL) continue;
    for (const propuesta of [c.propuesta_1, c.propuesta_2]) {
      const texto = (propuesta || '').trim();
      if (!texto) continue;
      const coincidencias = menciona(texto, etiqueta);
      if (coincidencias === 0) continue;
      const clave: [number, number] = [coincidencias, peso];
      if (clave[0] > mejorClave[0] || (clave[0] === mejorClave[0] && clave[1] > mejorClave[1])) {
        mejorClave = clave;
        mejor = texto;
      }
    }
  }
  return mejor ? legible(mejor) : '';
};

/** Etiqueta que mejor parte a la mitad a quienes siguen en juego. */
export function siguientePregunta(
  candidatos: MatchCandidato[],
  preguntadas: string[]
): Pregunta | null {
  if (candidatos.length === 0) return null;
  const asked = new Set(preguntadas);
  const tags = new Set<string>();
  for (const c of candidatos) {
    for (const tag of Object.keys(c.etiquetas)) {
      if (tag.startsWith('eje_')) tags.add(tag);
    }
  }

  const ordenadas = [...tags]
    .filter((tag) => !asked.has(tag))
    .map((tag) => {
      let n = 0;
      for (const c of candidatos) {
        if ((c.etiquetas[tag] ?? 0) >= UMBRAL) n += 1;
      }
      const p = n / candidatos.length;
      return { tag, split: p * (1 - p) };
    })
    .filter((item) => item.split >= 0.08)
    .sort((a, b) => b.split - a.split);

  for (const { tag } of ordenadas) {
    const texto = textoDelTema(candidatos, tag);
    if (texto) return { etiqueta: tag, tema: EJE_LABEL[tag] ?? tag, texto };
  }
  return null;
}

export function aplicarRespuesta(
  puntajes: Record<number, number>,
  candidatos: MatchCandidato[],
  etiqueta: string,
  aFavor: boolean
): Record<number, number> {
  const signo = aFavor ? 1 : -1;
  const next = { ...puntajes };
  for (const c of candidatos) {
    next[c.id_anonimo] = (next[c.id_anonimo] ?? 0) + signo * (c.etiquetas[etiqueta] ?? 0);
  }
  return next;
}

export function mejores(
  candidatos: MatchCandidato[],
  puntajes: Record<number, number>,
  n = 3
): { id: number; nombre: string; partido: string }[] {
  return [...candidatos]
    .sort((a, b) => (puntajes[b.id_anonimo] ?? 0) - (puntajes[a.id_anonimo] ?? 0))
    .slice(0, n)
    .map((c) => ({
      id: c.id_anonimo,
      nombre: c.nombre_candidato,
      partido: c.partido_coalicion,
    }));
}
