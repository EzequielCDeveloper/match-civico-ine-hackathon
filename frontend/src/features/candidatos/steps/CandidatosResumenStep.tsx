import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';
import { ResultadoBoleta } from './CandidatosSwipeStep';

interface TresResultados {
  diputacion?: ResultadoBoleta;
  senado?: ResultadoBoleta;
  presidencia?: ResultadoBoleta;
}

const Bloque: React.FC<{ resultado?: ResultadoBoleta }> = ({ resultado }) => {
  if (!resultado) return null;
  const destacadas = resultado.empate ? resultado.filas.slice(0, 2) : resultado.filas.slice(0, 1);
  const resto = resultado.filas.slice(destacadas.length);

  return (
    <View style={styles.bloque}>
      <Text style={styles.cargo}>{resultado.titulo}</Text>
      {resultado.nota ? <Text style={styles.nota}>{resultado.nota}</Text> : null}
      {resultado.empate && !resultado.nota ? (
        <Text style={styles.empate}>Empate: las respuestas no separan a una sola persona.</Text>
      ) : null}
      {destacadas.map((fila) => (
        <Card key={fila.id} style={styles.primera}>
          <Text style={styles.nombre}>{fila.nombre}</Text>
          <Text style={styles.partido}>{fila.partido}</Text>
          {fila.afinidad > 0 && !resultado.nota ? (
            <Text style={styles.afinidad}>{Math.round(fila.afinidad * 100)}% de afinidad</Text>
          ) : null}
          {!resultado.nota ? <Text style={styles.razon}>{fila.razones}</Text> : null}
          {fila.avisos.map((aviso) => (
            <Text key={aviso} style={styles.aviso}>{aviso}</Text>
          ))}
          {fila.escolaridad ? <Text style={styles.dato}>Escolaridad: {fila.escolaridad}</Text> : null}
          {fila.propuestas[0] ? <Text style={styles.propuesta}>{fila.propuestas[0]}</Text> : null}
        </Card>
      ))}
      {resto.length > 0 ? (
        <Text style={styles.resto}>
          También en esta boleta:{' '}
          {resto.map((fila) => `${fila.nombre} (${Math.round(fila.afinidad * 100)}%)`).join(' · ')}
        </Text>
      ) : null}
      {resultado.sinPropuestas.length > 0 ? (
        <Text style={styles.resto}>
          Sin propuestas: {resultado.sinPropuestas.map((persona) => persona.nombre_candidato).join(' · ')}
        </Text>
      ) : null}
    </View>
  );
};

export const CandidatosResumenStep: React.FC = () => {
  const { next } = useFlow();
  const resultado = useAnswer<TresResultados>('candidatos.resultado');

  return (
    <StepContainer title="Tus tres coincidencias" subtitle="Diputación, senado y presidencia">
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <Bloque resultado={resultado?.diputacion} />
        <Bloque resultado={resultado?.senado} />
        <Bloque resultado={resultado?.presidencia} />
      </ScrollView>
      <Button title="Continuar al cierre ›" onPress={next} style={{ marginTop: 12 }} />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  bloque: { marginBottom: 16 },
  cargo: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: '#691C32', marginBottom: 6 },
  nota: { color: '#4B5563', lineHeight: 20, marginBottom: 6 },
  empate: { color: '#92400E', marginBottom: 6, lineHeight: 20 },
  primera: { borderWidth: 1, borderColor: '#9F2241' },
  nombre: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  partido: { color: '#691C32', fontWeight: '600', marginTop: 2 },
  afinidad: { marginTop: 6, fontWeight: '700', color: '#111827' },
  razon: { marginTop: 4, color: '#374151', lineHeight: 20 },
  aviso: { marginTop: 4, color: '#9A3412' },
  dato: { marginTop: 6, color: '#4B5563', lineHeight: 18 },
  propuesta: { marginTop: 8, color: '#1F2937', lineHeight: 20 },
  resto: { marginTop: 6, color: '#6B7280', lineHeight: 18 },
});
