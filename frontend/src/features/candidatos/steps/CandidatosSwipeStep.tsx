import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';
import { BoletaResponse, PropuestaBoleta, fetchBoleta } from '../api/candidatos.api';
import { PropuestaCard } from '../components/PropuestaCard';
import {
  Creencia,
  Respuesta,
  Tarjeta,
  TEMA_LABEL,
  aplanarSimilitud,
  hayEmpate,
  ordenadas,
  responderTarjeta,
  siguienteTarjeta,
} from '../match/motor';

interface Eleccion {
  entidad: string;
  distritoId?: number;
  cargo?: 'DIPUTACION_MR' | 'SENADO_MR' | 'PRESIDENCIA';
}

interface Hecho {
  candidato: number;
  respuesta: Respuesta;
  tema: string;
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

export const CandidatosSwipeStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const eleccion = useAnswer<Eleccion>('candidatos.eleccion');
  const prioridades = useAnswer<string[]>('candidatos.prioridades') ?? [];

  const [boleta, setBoleta] = useState<BoletaResponse | null>(null);
  const [creencia, setCreencia] = useState<Creencia>({});
  const [mostradas, setMostradas] = useState<string[]>([]);
  const [yaConfirmo, setYaConfirmo] = useState(false);
  const [hechos, setHechos] = useState<Hecho[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const cerrado = useRef(false);

  useEffect(() => {
    if (!eleccion?.entidad || !eleccion.cargo) {
      setError('Falta elegir la boleta.');
      setCargando(false);
      return;
    }
    fetchBoleta(eleccion.entidad, eleccion.distritoId ?? 0, eleccion.cargo)
      .then((data) => {
        const inicial: Creencia = {};
        for (const candidato of data.candidatos) inicial[candidato.id_anonimo] = 1 / data.candidatos.length;
        setBoleta(data);
        setCreencia(inicial);
      })
      .catch(() => setError('No se pudo cargar la boleta.'))
      .finally(() => setCargando(false));
  }, [eleccion?.entidad, eleccion?.distritoId, eleccion?.cargo]);

  const propuestasDe = useMemo(() => {
    const mapa: Record<number, PropuestaBoleta[]> = {};
    for (const propuesta of boleta?.propuestas ?? []) {
      (mapa[propuesta.id_anonimo] ??= []).push(propuesta);
    }
    return mapa;
  }, [boleta]);

  const embeddings = useMemo(() => aplanarSimilitud(boleta?.similitud ?? {}), [boleta]);

  const cerrar = (final: Creencia, historial: Hecho[]) => {
    if (!boleta || cerrado.current) return;
    cerrado.current = true;
    const ranking = ordenadas(final);
    setAnswer('candidatos.resultado', {
      cargo: boleta.cargo,
      empate: hayEmpate(final),
      filas: ranking.map((id) => {
        const candidato = boleta.candidatos.find((item) => item.id_anonimo === id)!;
        const suyos = historial.filter((hecho) => hecho.candidato === id);
        const aFavor = suyos.filter((hecho) => hecho.respuesta === 'si').length;
        const enContra = suyos.filter((hecho) => hecho.respuesta === 'no').length;
        const avisos = [];
        if (candidato.concrecion > 0 && candidato.concrecion < 0.4) avisos.push('Sus propuestas son poco concretas.');
        if (candidato.competencia_cargo > 0 && candidato.competencia_cargo < 0.4) {
          avisos.push('Parte de lo que promete no corresponde a ese cargo.');
        }
        return {
          id,
          nombre: candidato.nombre_candidato,
          partido: candidato.partido_coalicion,
          afinidad: final[id],
          razones: aFavor + enContra > 0 ? `Coincidiste con ${aFavor} y rechazaste ${enContra} de las propuestas suyas que viste.` : 'No se mostró una propuesta suya.',
          avisos,
          propuestas: (propuestasDe[id] ?? []).map((propuesta) => propuesta.texto),
          escolaridad: candidato.escolaridad,
          trayectoria: candidato.trayectoria_politica,
        };
      }),
      sinPropuestas: boleta.sin_propuestas,
    });
    next();
  };

  const tarjeta = boleta && boleta.candidatos.length >= 2
    ? siguienteTarjeta(creencia, boleta.propuestas, propuestasDe, embeddings, mostradas, prioridades, yaConfirmo)
    : null;

  useEffect(() => {
    if (tarjeta || cargando || !boleta || boleta.candidatos.length < 2) return;
    cerrar(creencia, hechos);
  }, [tarjeta, cargando, boleta, creencia, hechos]);

  if (cargando) {
    return (
      <StepContainer title="Armando tu boleta" subtitle="Solo las candidaturas entre las que puedes elegir">
        <ActivityIndicator size="large" color="#9F2241" style={{ marginTop: 40 }} />
      </StepContainer>
    );
  }
  if (error || !boleta) {
    return (
      <StepContainer title="Boleta" subtitle="">
        <Text style={{ color: '#6B7280' }}>{error}</Text>
      </StepContainer>
    );
  }
  if (boleta.candidatos.length < 2) {
    return (
      <StepContainer title="No hay comparación posible" subtitle={boleta.cargo}>
        <Text style={styles.nota}>
          {boleta.candidatos.length === 1
            ? `${boleta.candidatos[0].nombre_candidato} es la única candidatura con propuestas en esta boleta.`
            : 'Ninguna candidatura de esta boleta registró propuestas.'}
        </Text>
        <Button title="Ver el resultado ›" onPress={() => cerrar(creencia, hechos)} style={{ marginTop: 16 }} />
      </StepContainer>
    );
  }

  if (!tarjeta) {
    return (
      <StepContainer title="Cerrando la comparación" subtitle={boleta.cargo}>
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
      historial.push({ candidato: tarjeta.a.id_anonimo, respuesta: respuesta === 'si' ? 'si' : respuesta === 'no' ? 'no' : 'igual', tema: TEMA_LABEL[tarjeta.tema] ?? tarjeta.tema });
      historial.push({ candidato: tarjeta.b.id_anonimo, respuesta: respuesta === 'no' ? 'si' : respuesta === 'si' ? 'no' : 'igual', tema: TEMA_LABEL[tarjeta.tema] ?? tarjeta.tema });
    } else {
      vistas.push(tarjeta.propuesta.id);
      historial.push({ candidato: tarjeta.propuesta.id_anonimo, respuesta, tema: temaDe(tarjeta.propuesta) });
    }
    const confirmo = yaConfirmo || tarjeta.tipo === 'confirmacion';
    if (tarjeta.tipo === 'confirmacion' && respuesta === 'si') {
      cerrar(siguiente, historial);
      return;
    }
    const otra = siguienteTarjeta(siguiente, boleta.propuestas, propuestasDe, embeddings, vistas, prioridades, confirmo);
    if (!otra) {
      cerrar(siguiente, historial);
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
      title={titulo}
      subtitle={
        tarjeta.tipo === 'dilema'
          ? 'Elige la que más se parece a lo que buscas'
          : tarjeta.tipo === 'confirmacion'
            ? 'Si no te convence, el recorrido sigue'
            : `Tarjeta ${mostradas.length + 1} · sin nombre ni partido`
      }
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
        {tarjeta.tipo === 'dilema' ? (
          <View>
            <Text style={styles.marca}>Primera</Text>
            <PropuestaCard tema={titulo} texto={tarjeta.a.texto} />
            <Text style={styles.marca}>Segunda</Text>
            <PropuestaCard tema={titulo} texto={tarjeta.b.texto} />
          </View>
        ) : (
          <PropuestaCard tema={titulo} texto={tarjeta.propuesta.texto} />
        )}
      </ScrollView>
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
  nota: { color: '#374151', fontSize: 15, lineHeight: 22 },
  marca: { marginTop: 8, fontSize: 12, fontWeight: '800', color: '#691C32', letterSpacing: 0.4 },
  acciones: { flexDirection: 'row', paddingTop: 8 },
  boton: { flex: 1, marginHorizontal: 4 },
});
