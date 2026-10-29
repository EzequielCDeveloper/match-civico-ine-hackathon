import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';
import { TEMA_LABEL } from '../match/motor';

export const PrioridadesStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  const temasPrevios = useAnswer<{ temas?: string[] }>('votantes.perfil')?.temas ?? [];
  const iniciales = temasPrevios.filter((tema) => tema in TEMA_LABEL).slice(0, 3);
  const [elegidos, setElegidos] = useState<string[]>(iniciales);

  const alternar = (eje: string) => {
    setElegidos((prev) => {
      if (prev.includes(eje)) return prev.filter((item) => item !== eje);
      if (prev.length >= 3) return prev;
      return [...prev, eje];
    });
  };

  return (
    <StepContainer
      title="¿Qué tres temas pesan más?"
      subtitle="No descartan a nadie. Solo hacen que el recorrido pregunte eso primero"
    >
      <View style={styles.lista}>
        {Object.entries(TEMA_LABEL).map(([eje, nombre]) => {
          const activo = elegidos.includes(eje);
          return (
            <TouchableOpacity key={eje} style={[styles.chip, activo && styles.chipActivo]} onPress={() => alternar(eje)}>
              <Text style={[styles.texto, activo && styles.textoActivo]}>{nombre}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Button
        title={elegidos.length ? 'Comparar propuestas ›' : 'Seguir sin prioridades ›'}
        onPress={() => {
          setAnswer('candidatos.prioridades', elegidos);
          next();
        }}
        style={{ marginTop: 16 }}
      />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  lista: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  chipActivo: { backgroundColor: '#691C32', borderColor: '#691C32' },
  texto: { color: '#1F2937', fontSize: 13, fontWeight: '600' },
  textoActivo: { color: '#fff' },
});
