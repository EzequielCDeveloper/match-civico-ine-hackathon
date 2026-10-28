import { PropuestaBoleta } from '../api/candidatos.api';

export const MIN_TARJETAS = 5;
export const MAX_TARJETAS = 12;
const EPS = 0.05;
const UMBRAL = 0.7;
const MARGEN = 0.25;
const EMPATE = 0.1;
const FACTOR_PRIORIDAD = 1.7;

export type Respuesta = 'si' | 'no' | 'igual';
export type Creencia = Record<number, number>;

export interface TarjetaUna {
  tipo: 'una' | 'confirmacion';
  propuesta: PropuestaBoleta;
}
export interface TarjetaDilema {
  tipo: 'dilema';
  a: PropuestaBoleta;
  b: PropuestaBoleta;
  tema: string;
}
export type Tarjeta = TarjetaUna | TarjetaDilema;

const ejeDe = (etiquetas: Record<string, number>): string => {
  let mejor = '';
  let peso = 0;
  for (const [clave, valor] of Object.entries(etiquetas)) {
    if (clave.startsWith('eje_') && valor > peso) {
      mejor = clave;
      peso = valor;
    }
  }
  if (peso >= 0.35) return mejor;
  const genero = Object.entries(etiquetas).filter(([clave]) => clave.startsWith('enfoque_genero.'));
  if (genero.some(([, valor]) => valor >= 0.35)) return 'eje_mujeres';
  return '';
};

const enfoqueDe = (etiquetas: Record<string, number>, eje: string): string => {
  const prefijo =
    eje === 'eje_mujeres' && Object.keys(etiquetas).some((clave) => clave.startsWith('enfoque_genero.'))
      ? 'enfoque_genero.'
      : `enfoque_${eje.replace('eje_', '')}.`;
  let mejor = '';
  let peso = 0;
  for (const [clave, valor] of Object.entries(etiquetas)) {
    if (clave.startsWith(prefijo) && valor > peso) {
      mejor = clave;
      peso = valor;
    }
  }
  return mejor;
};

const similitudEtiquetas = (a: Record<string, number>, b: Record<string, number>): number => {
  const ejeA = ejeDe(a);
  const ejeB = ejeDe(b);
  if (!ejeA || !ejeB || ejeA !== ejeB) return 0.08;
  const focoA = enfoqueDe(a, ejeA);
  const focoB = enfoqueDe(b, ejeB);
  if (focoA && focoB && focoA === focoB) return 0.9;
  if (focoA && focoB) return 0.35;
  return 0.6;
};

const clavePar = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

const similitudPar = (
  origen: PropuestaBoleta,
  destino: PropuestaBoleta,
  embeddings: Record<string, number>
): number => {
  if (origen.id === destino.id) return 1;
  const porEtiqueta = similitudEtiquetas(origen.etiquetas, destino.etiquetas);
  const porTexto = embeddings[clavePar(origen.id, destino.id)];
  // El texto solo desempata cuando las etiquetas no alcanzan a separar.
  if (porTexto === undefined || porEtiqueta >= 0.85 || porEtiqueta <= 0.12) return porEtiqueta;
  return 0.75 * porEtiqueta + 0.25 * porTexto;
};

export const afinidadDe = (
  candidatura: number,
  propuesta: PropuestaBoleta,
  propuestasDe: Record<number, PropuestaBoleta[]>,
  embeddings: Record<string, number>
): number =>
  Math.max(...propuestasDe[candidatura].map((otra) => similitudPar(propuesta, otra, embeddings)));

const verosimilitud = (afinidad: number, respuesta: Respuesta): number => {
  const resto = 1 - 3 * EPS;
  if (respuesta === 'igual') return EPS;
  if (respuesta === 'si') return EPS + resto * afinidad;
  return EPS + resto * (1 - afinidad);
};

export const actualizar = (
  creencia: Creencia,
  afinidades: Record<number, number>,
  respuesta: Respuesta
): Creencia => {
  const pesos: Creencia = {};
  let total = 0;
  for (const candidatura of Object.keys(creencia)) {
    const id = Number(candidatura);
    pesos[id] = creencia[id] * verosimilitud(afinidades[id], respuesta);
    total += pesos[id];
  }
  const salida: Creencia = {};
  for (const candidatura of Object.keys(pesos)) {
    salida[Number(candidatura)] = pesos[Number(candidatura)] / (total || 1);
  }
  return salida;
};

const entropia = (creencia: Creencia): number =>
  -Object.values(creencia).reduce((suma, p) => (p > 0 ? suma + p * Math.log(p) : suma), 0);

const ganancia = (creencia: Creencia, afinidades: Record<number, number>): number => {
  const actual = entropia(creencia);
  let esperada = 0;
  for (const respuesta of ['si', 'no', 'igual'] as Respuesta[]) {
    let probabilidad = 0;
    for (const candidatura of Object.keys(creencia)) {
      const id = Number(candidatura);
      probabilidad += creencia[id] * verosimilitud(afinidades[id], respuesta);
    }
    if (probabilidad <= 0) continue;
    esperada += probabilidad * entropia(actualizar(creencia, afinidades, respuesta));
  }
  return actual - esperada;
};

export const ordenadas = (creencia: Creencia): number[] =>
  Object.keys(creencia)
    .map(Number)
    .sort((a, b) => creencia[b] - creencia[a]);

export const liderClaro = (creencia: Creencia, mostradas: number): boolean => {
  const ids = ordenadas(creencia);
  if (mostradas < MIN_TARJETAS || ids.length < 2) return false;
  return creencia[ids[0]] >= UMBRAL && creencia[ids[0]] - creencia[ids[1]] >= MARGEN;
};

export const hayEmpate = (creencia: Creencia): boolean => {
  const ids = ordenadas(creencia);
  if (ids.length < 2) return false;
  return creencia[ids[0]] - creencia[ids[1]] < EMPATE;
};

const soloGenero = (etiquetas: Record<string, number>): boolean => {
  const tieneGenero = Object.keys(etiquetas).some((clave) => clave.startsWith('enfoque_genero.'));
  const tieneEje = Object.entries(etiquetas).some(([clave, valor]) => clave.startsWith('eje_') && valor >= 0.35);
  return tieneGenero && !tieneEje;
};

const entra = (propuesta: PropuestaBoleta, prioridades: string[]): boolean =>
  soloGenero(propuesta.etiquetas) ? prioridades.includes('eje_mujeres') : true;

export const siguienteTarjeta = (
  creencia: Creencia,
  propuestas: PropuestaBoleta[],
  propuestasDe: Record<number, PropuestaBoleta[]>,
  embeddings: Record<string, number>,
  mostradas: string[],
  prioridades: string[],
  yaConfirmo: boolean
): Tarjeta | null => {
  const ids = Object.keys(creencia);
  if (ids.length < 2 || mostradas.length >= MAX_TARJETAS) return null;
  if (liderClaro(creencia, mostradas.length) && !yaConfirmo) {
    const lider = ordenadas(creencia)[0];
    const otra = propuestasDe[lider].find((propuesta) => !mostradas.includes(propuesta.id));
    if (otra) return { tipo: 'confirmacion', propuesta: otra };
    return null;
  }

  const visibles = propuestas.filter((propuesta) => !mostradas.includes(propuesta.id) && entra(propuesta, prioridades));
  if (visibles.length === 0) return null;

  const afinidadesDe = (propuesta: PropuestaBoleta) => {
    const salida: Record<number, number> = {};
    for (const candidatura of ids) salida[Number(candidatura)] = afinidadDe(Number(candidatura), propuesta, propuestasDe, embeddings);
    return salida;
  };

  let mejor: Tarjeta | null = null;
  let mejorGanancia = -1;
  for (const propuesta of visibles) {
    let gan = ganancia(creencia, afinidadesDe(propuesta));
    if (prioridades.includes(ejeDe(propuesta.etiquetas))) gan *= FACTOR_PRIORIDAD;
    if (gan > mejorGanancia) {
      mejorGanancia = gan;
      mejor = { tipo: 'una', propuesta };
    }
  }

  for (let i = 0; i < visibles.length; i += 1) {
    const primera = visibles[i];
    const eje = ejeDe(primera.etiquetas);
    const foco = eje ? enfoqueDe(primera.etiquetas, eje) : '';
    if (!eje || !foco) continue;
    for (const segunda of visibles.slice(i + 1)) {
      if (primera.id_anonimo === segunda.id_anonimo) continue;
      if (ejeDe(segunda.etiquetas) !== eje) continue;
      if (enfoqueDe(segunda.etiquetas, eje) === foco) continue;
      const afinidades: Record<number, number> = {};
      for (const candidatura of ids) {
        const id = Number(candidatura);
        const haciaA = afinidadDe(id, primera, propuestasDe, embeddings);
        const haciaB = afinidadDe(id, segunda, propuestasDe, embeddings);
        afinidades[id] = haciaA + haciaB ? haciaA / (haciaA + haciaB) : 0.5;
      }
      let gan = ganancia(creencia, afinidades);
      if (prioridades.includes(eje)) gan *= FACTOR_PRIORIDAD;
      if (gan > mejorGanancia) {
        mejorGanancia = gan;
        mejor = { tipo: 'dilema', a: primera, b: segunda, tema: eje };
      }
    }
  }
  return mejor;
};

export const responderTarjeta = (
  creencia: Creencia,
  tarjeta: Tarjeta,
  respuesta: Respuesta,
  propuestasDe: Record<number, PropuestaBoleta[]>,
  embeddings: Record<string, number>
): Creencia => {
  if (tarjeta.tipo === 'dilema') {
    const afinidades: Record<number, number> = {};
    for (const candidatura of Object.keys(creencia)) {
      const id = Number(candidatura);
      const haciaA = afinidadDe(id, tarjeta.a, propuestasDe, embeddings);
      const haciaB = afinidadDe(id, tarjeta.b, propuestasDe, embeddings);
      afinidades[id] = haciaA + haciaB ? haciaA / (haciaA + haciaB) : 0.5;
    }
    return actualizar(creencia, afinidades, respuesta);
  }
  const afinidades: Record<number, number> = {};
  for (const candidatura of Object.keys(creencia)) {
    const id = Number(candidatura);
    afinidades[id] = afinidadDe(id, tarjeta.propuesta, propuestasDe, embeddings);
  }
  return actualizar(creencia, afinidades, respuesta);
};

export const aplanarSimilitud = (anidada: Record<string, Record<string, number>>): Record<string, number> => {
  const salida: Record<string, number> = {};
  for (const [origen, destinos] of Object.entries(anidada || {})) {
    for (const [destino, valor] of Object.entries(destinos)) {
      salida[clavePar(origen, destino)] = valor;
    }
  }
  return salida;
};

export const TEMA_LABEL: Record<string, string> = {
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
  eje_indigenas: 'Pueblos indígenas',
  eje_campo: 'Campo y pesca',
  eje_anticorrupcion: 'Anticorrupción',
  eje_derechos_humanos: 'Derechos humanos',
  eje_movilidad: 'Movilidad',
  eje_vivienda: 'Vivienda',
  eje_energia: 'Energía',
  eje_tecnologia: 'Tecnología',
  eje_cultura_deporte: 'Cultura y deporte',
  eje_migracion: 'Migración',
  eje_animales: 'Bienestar animal',
};
