import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';

interface Fila {
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

interface Resultado {
  cargo: string;
  empate: boolean;
  filas: Fila[];
  sinPropuestas: { nombre_candidato: string; partido_coalicion: string }[];
}

export const CandidatosResumenStep: React.FC = () => {
  const { next } = useFlow();
  const resultado = useAnswer<Resultado>('candidatos.resultado');
  const filas = resultado?.filas ?? [];

  return (
    <StepContainer
      title={resultado?.empate ? 'Hay un empate' : 'Quien más coincide'}
      subtitle={resultado?.cargo ?? 'Resultado de la boleta'}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        {resultado?.empate ? (
          <Text style={styles.empate}>Las respuestas no alcanzan para separar a una sola candidatura. Estas son las más cercanas.</Text>
        ) : null}
        {filas.map((fila, indice) => (
          <Card key={fila.id} style={indice === 0 ? styles.primera : undefined}>
            <Text style={styles.puesto}>{indice + 1}</Text>
            <Text style={styles.nombre}>{fila.nombre}</Text>
            <Text style={styles.partido}>{fila.partido}</Text>
            <Text style={styles.afinidad}>{Math.round(fila.afinidad * 100)}% de afinidad</Text>
            <Text style={styles.razon}>{fila.razones}</Text>
            {fila.avisos.map((aviso) => (
              <Text key={aviso} style={styles.aviso}>{aviso}</Text>
            ))}
            {fila.escolaridad ? <Text style={styles.dato}>Escolaridad: {fila.escolaridad}</Text> : null}
            {fila.trayectoria ? <Text style={styles.dato}>{fila.trayectoria}</Text> : null}
            {fila.propuestas.map((texto) => (
              <Text key={texto.slice(0, 40)} style={styles.propuesta}>{texto}</Text>
            ))}
          </Card>
        ))}
        {(resultado?.sinPropuestas ?? []).length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.aparte}>No registraron propuestas</Text>
            {resultado!.sinPropuestas.map((persona) => (
              <Text key={persona.nombre_candidato} style={styles.dato}>
                {persona.nombre_candidato} · {persona.partido_coalicion}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <Button title="Continuar al cierre ›" onPress={next} style={{ marginTop: 12 }} />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  empate: { color: '#92400E', marginBottom: 8, lineHeight: 20 },
  primera: { borderWidth: 1, borderColor: '#9F2241' },
  puesto: { color: '#BC955C', fontWeight: '800', fontSize: 12 },
  nombre: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginTop: 2 },
  partido: { color: '#691C32', fontWeight: '600', marginTop: 2 },
  afinidad: { marginTop: 6, fontWeight: '700', color: '#111827' },
  razon: { marginTop: 4, color: '#374151', lineHeight: 20 },
  aviso: { marginTop: 4, color: '#9A3412' },
  dato: { marginTop: 6, color: '#4B5563', lineHeight: 18 },
  propuesta: { marginTop: 8, color: '#1F2937', lineHeight: 20 },
  aparte: { fontWeight: '800', color: '#6B7280', marginBottom: 4 },
});
