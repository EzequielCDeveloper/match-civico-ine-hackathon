import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Button } from '../../../components/ui/Button';
import { DireccionSwipe, SwipeCuatro } from '../../../components/ui/SwipeCuatro';
import { useAnswer, useFlow } from '../../../flow';
import { BoletaResponse, PropuestaBoleta, fetchBoleta } from '../api/candidatos.api';
import { PropuestaCard } from '../components/PropuestaCard';
import {
  Creencia,
  Respuesta,
  TEMA_LABEL,
  aplanarSimilitud,
  hayEmpate,
  ordenadas,
  responderTarjeta,
  siguienteTarjeta,
} from '../match/motor';

type Cargo = 'DIPUTACION_MR' | 'SENADO_MR' | 'PRESIDENCIA';

const BLOQUES: { cargo: Cargo; titulo: string; clave: 'diputacion' | 'senado' | 'presidencia' }[] = [
  { cargo: 'DIPUTACION_MR', titulo: 'Diputación', clave: 'diputacion' },
  { cargo: 'SENADO_MR', titulo: 'Senado', clave: 'senado' },
  { cargo: 'PRESIDENCIA', titulo: 'Presidencia', clave: 'presidencia' },
];

interface Eleccion {
  entidad: string;
  distritoId?: number;
}

interface Hecho {
  candidato: number;
  respuesta: Respuesta;
  tema: string;
}

export interface FilaResultado {
  id: number;
  nombre: string;
  partido: string;
  afinidad: number;
  razones: string;
  avisos: string[];
  propuestas: string[];
  escolaridad: string;
  trayectoria: string;
}

export interface ResultadoBoleta {
  titulo: string;
  empate: boolean;
  nota?: string;
  filas: FilaResultado[];
  sinPropuestas: { nombre_candidato: string; partido_coalicion: string }[];
}

const temaDe = (propuesta: PropuestaBoleta): string => {
  let mejor = '';
  let peso = 0;
  for (const [clave, valor] of Object.entries(propuesta.etiquetas)) {
    if (clave.startsWith('eje_') && valor > peso) {
      mejor = clave;
      peso = valor;
    }
  }
  if (mejor) return TEMA_LABEL[mejor] ?? mejor;
  if (Object.keys(propuesta.etiquetas).some((clave) => clave.startsWith('enfoque_genero.'))) {
    return 'Igualdad de género';
  }
  return 'Propuesta';
};

const armar = (boleta: BoletaResponse, titulo: string, final: Creencia, historial: Hecho[], propuestasDe: Record<number, PropuestaBoleta[]>, nota?: string): ResultadoBoleta => {
  const ranking = ordenadas(final);
  return {
    titulo,
    empate: hayEmpate(final),
    nota,
    filas: ranking.map((id) => {
      const candidato = boleta.candidatos.find((item) => item.id_anonimo === id)!;
      const suyos = historial.filter((hecho) => hecho.candidato === id);
      const aFavor = suyos.filter((hecho) => hecho.respuesta === 'si').length;
      const enContra = suyos.filter((hecho) => hecho.respuesta === 'no').length;
      const avisos: string[] = [];
      if (candidato.concrecion > 0 && candidato.concrecion < 0.4) avisos.push('Sus propuestas son poco concretas.');
      if (candidato.competencia_cargo > 0 && candidato.competencia_cargo < 0.4) {
        avisos.push('Parte de lo que promete no corresponde a ese cargo.');
      }
      return {
        id,
        nombre: candidato.nombre_candidato,
        partido: candidato.partido_coalicion,
        afinidad: final[id] ?? 0,
        razones: aFavor + enContra > 0
          ? `Coincidiste con ${aFavor} y rechazaste ${enContra} de las propuestas suyas que viste.`
          : 'No se mostró una propuesta suya.',
        avisos,
        propuestas: (propuestasDe[id] ?? []).map((propuesta) => propuesta.texto),
        escolaridad: candidato.escolaridad,
        trayectoria: candidato.trayectoria_politica,
      };
    }),
    sinPropuestas: boleta.sin_propuestas,
  };
};

export const CandidatosSwipeStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const eleccion = useAnswer<Eleccion>('candidatos.eleccion');
  const prioridades = useAnswer<string[]>('candidatos.prioridades') ?? [];

  const [bloque, setBloque] = useState(0);
  const [boleta, setBoleta] = useState<BoletaResponse | null>(null);
  const [creencia, setCreencia] = useState<Creencia>({});
  const [mostradas, setMostradas] = useState<string[]>([]);
  const [yaConfirmo, setYaConfirmo] = useState(false);
  const [hechos, setHechos] = useState<Hecho[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const bloqueRef = useRef(0);
  const acumulado = useRef<Partial<Record<CargoClave, ResultadoBoleta>>>({});
  const saltado = useRef(-1);

  type CargoClave = (typeof BLOQUES)[number]['clave'];

  useEffect(() => {
    if (!eleccion?.entidad) {
      setError('Falta elegir el distrito.');
      setCargando(false);
      return;
    }
    let cancel = false;
    setCargando(true);
    setError(null);
    fetchBoleta(eleccion.entidad, eleccion.distritoId ?? 0, BLOQUES[bloque].cargo)
      .then((data) => {
        if (cancel) return;
        const inicial: Creencia = {};
        const n = Math.max(data.candidatos.length, 1);
        for (const candidato of data.candidatos) inicial[candidato.id_anonimo] = 1 / n;
        setBoleta(data);
        setCreencia(inicial);
        setMostradas([]);
        setYaConfirmo(false);
        setHechos([]);
      })
      .catch(() => {
        if (!cancel) setError('No se pudo cargar la boleta.');
      })
      .finally(() => {
        if (!cancel) setCargando(false);
      });
    return () => {
      cancel = true;
    };
  }, [eleccion?.entidad, eleccion?.distritoId, bloque]);

  const propuestasDe = useMemo(() => {
    const mapa: Record<number, PropuestaBoleta[]> = {};
    for (const propuesta of boleta?.propuestas ?? []) {
      (mapa[propuesta.id_anonimo] ??= []).push(propuesta);
    }
    return mapa;
  }, [boleta]);

  const embeddings = useMemo(() => aplanarSimilitud(boleta?.similitud ?? {}), [boleta]);

  const terminarBloque = (resultado: ResultadoBoleta) => {
    const indice = bloqueRef.current;
    const juntos = { ...acumulado.current, [BLOQUES[indice].clave]: resultado };
    acumulado.current = juntos;
    if (indice < BLOQUES.length - 1) {
      bloqueRef.current = indice + 1;
      setBloque(indice + 1);
      setBoleta(null);
      setCargando(true);
      return;
    }
    setAnswer('candidatos.resultado', {
      diputacion: juntos.diputacion,
      senado: juntos.senado,
      presidencia: juntos.presidencia,
    });
    next();
  };

  const tarjeta = boleta && boleta.candidatos.length >= 2
    ? siguienteTarjeta(creencia, boleta.propuestas, propuestasDe, embeddings, mostradas, prioridades, yaConfirmo)
    : null;

  useEffect(() => {
    if (cargando || !boleta || boleta.candidatos.length >= 2) return;
    if (saltado.current === bloque) return;
    saltado.current = bloque;
    const nota = boleta.candidatos.length === 1
      ? 'Solo una candidatura registró propuestas. No hubo con quién compararla.'
      : 'Nadie registró propuestas en esta boleta.';
    const inicial: Creencia = {};
    for (const candidato of boleta.candidatos) inicial[candidato.id_anonimo] = 1;
    terminarBloque(armar(boleta, BLOQUES[bloque].titulo, inicial, [], propuestasDe, nota));
  }, [cargando, boleta, bloque]);

  useEffect(() => {
    if (tarjeta || cargando || !boleta || boleta.candidatos.length < 2) return;
    terminarBloque(armar(boleta, BLOQUES[bloque].titulo, creencia, hechos, propuestasDe));
  }, [tarjeta, cargando, boleta, creencia, hechos, bloque]);

  if (cargando || !boleta) {
    return (
      <StepContainer title={BLOQUES[bloque].titulo} subtitle="Cargando a quienes compiten en esta boleta">
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
        {error ? <Text style={styles.nota}>{error}</Text> : null}
      </StepContainer>
    );
  }
  if (boleta.candidatos.length < 2 || !tarjeta) {
    return (
      <StepContainer title={BLOQUES[bloque].titulo} subtitle="Pasando a la siguiente boleta">
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
      </StepContainer>
    );
  }

  const contestar = (respuesta: Respuesta) => {
    const siguiente = responderTarjeta(creencia, tarjeta, respuesta, propuestasDe, embeddings);
    const vistas = [...mostradas];
    const historial = [...hechos];
    if (tarjeta.tipo === 'dilema') {
      vistas.push(tarjeta.a.id, tarjeta.b.id);
      const tema = TEMA_LABEL[tarjeta.tema] ?? tarjeta.tema;
      historial.push({ candidato: tarjeta.a.id_anonimo, respuesta: respuesta === 'si' ? 'si' : respuesta === 'no' ? 'no' : 'igual', tema });
      historial.push({ candidato: tarjeta.b.id_anonimo, respuesta: respuesta === 'no' ? 'si' : respuesta === 'si' ? 'no' : 'igual', tema });
    } else {
      vistas.push(tarjeta.propuesta.id);
      historial.push({ candidato: tarjeta.propuesta.id_anonimo, respuesta, tema: temaDe(tarjeta.propuesta) });
    }
    const confirmo = yaConfirmo || tarjeta.tipo === 'confirmacion';
    if (tarjeta.tipo === 'confirmacion' && respuesta === 'si') {
      terminarBloque(armar(boleta, BLOQUES[bloque].titulo, siguiente, historial, propuestasDe));
      return;
    }
    const otra = siguienteTarjeta(siguiente, boleta.propuestas, propuestasDe, embeddings, vistas, prioridades, confirmo);
    if (!otra) {
      terminarBloque(armar(boleta, BLOQUES[bloque].titulo, siguiente, historial, propuestasDe));
      return;
    }
    setCreencia(siguiente);
    setMostradas(vistas);
    setHechos(historial);
    setYaConfirmo(confirmo);
  };

  const titulo = tarjeta.tipo === 'dilema'
    ? (TEMA_LABEL[tarjeta.tema] ?? 'El mismo tema, otro camino')
    : tarjeta.tipo === 'confirmacion'
      ? 'Una propuesta más de quien va adelante'
      : temaDe(tarjeta.propuesta);

  return (
    <StepContainer
      title={`${BLOQUES[bloque].titulo} · ${titulo}`}
      subtitle={
        tarjeta.tipo === 'dilema'
          ? 'Elige la que más se parece a lo que buscas'
          : tarjeta.tipo === 'confirmacion'
            ? 'Si no te convence, el recorrido sigue'
            : `Tarjeta ${mostradas.length + 1} · derecha sí, izquierda no, arriba o abajo me da igual`
      }
    >
      <SwipeCuatro
        key={tarjeta.tipo === 'dilema' ? `${tarjeta.a.id}-${tarjeta.b.id}` : tarjeta.propuesta.id}
        derecha={tarjeta.tipo === 'dilema' ? 'La primera' : 'Me convence'}
        izquierda={tarjeta.tipo === 'dilema' ? 'La segunda' : 'No'}
        arriba="Me da igual"
        abajo="Me da igual"
        onSwipe={(direccion: DireccionSwipe) => {
          if (direccion === 'right') contestar('si');
          else if (direccion === 'left') contestar('no');
          else contestar('igual');
        }}
      >
        {tarjeta.tipo === 'dilema' ? (
          <View>
            <Text selectable={false} style={styles.marca}>Primera</Text>
            <PropuestaCard tema={titulo} texto={tarjeta.a.texto} />
            <Text selectable={false} style={styles.marca}>Segunda</Text>
            <PropuestaCard tema={titulo} texto={tarjeta.b.texto} />
          </View>
        ) : (
          <PropuestaCard tema={titulo} texto={tarjeta.propuesta.texto} />
        )}
      </SwipeCuatro>
      <View style={styles.acciones}>
        {tarjeta.tipo === 'dilema' ? (
          <>
            <Button title="La primera" onPress={() => contestar('si')} style={styles.boton} />
            <Button title="Me da igual" variant="secondary" onPress={() => contestar('igual')} style={styles.boton} />
            <Button title="La segunda" variant="danger" onPress={() => contestar('no')} style={styles.boton} />
          </>
        ) : (
          <>
            <Button title="No me convence" variant="danger" onPress={() => contestar('no')} style={styles.boton} />
            <Button title="Me da igual" variant="secondary" onPress={() => contestar('igual')} style={styles.boton} />
            <Button title="Me convence" onPress={() => contestar('si')} style={styles.boton} />
          </>
        )}
      </View>
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  nota: { color: '#374151', fontSize: 15, lineHeight: 22, marginTop: 12 },
  marca: { marginTop: 8, fontSize: 12, fontWeight: '800', color: '#691C32', letterSpacing: 0.4 },
  acciones: { flexDirection: 'row', paddingTop: 8 },
  boton: { flex: 1, marginHorizontal: 4 },
});
