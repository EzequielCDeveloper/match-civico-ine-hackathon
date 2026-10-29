import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const limiteAlcanzado = elegidos.length >= 3;

  return (
    <StepContainer
      title="¿Qué tres temas pesan más?"
      subtitle="No descartan a nadie. Solo hacen que el recorrido pregunte eso primero"
    >
      <View style={styles.encabezadoContador}>
        <Text style={styles.textoContador}>
          Seleccionados:{' '}
          <Text style={styles.contadorResaltado}>
            {elegidos.length} de 3
          </Text>
        </Text>
        {limiteAlcanzado && (
          <View style={styles.badgeMaximo}>
            <Text style={styles.textoBadgeMaximo}>Máximo 3 ejes</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollLista}
        contentContainerStyle={styles.contenidoScroll}
        showsVerticalScrollIndicator={true}
      >
        {Object.entries(TEMA_LABEL).map(([eje, nombre]) => {
          const index = elegidos.indexOf(eje);
          const activo = index !== -1;
          const bloqueado = !activo && limiteAlcanzado;

          return (
            <TouchableOpacity
              key={eje}
              style={[
                styles.filaCasilla,
                activo && styles.filaCasillaActiva,
                bloqueado && styles.filaCasillaBloqueada,
              ]}
              onPress={() => alternar(eje)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: activo, disabled: bloqueado }}
              accessibilityLabel={`${nombre}, casilla ${activo ? 'marcada' : 'no marcada'}`}
            >
              <View style={[styles.casilla, activo && styles.casillaActiva, bloqueado && styles.casillaBloqueada]}>
                {activo ? <Text style={styles.iconoCheck}>✓</Text> : null}
              </View>

              <Text style={[styles.textoNombre, activo && styles.textoNombreActivo, bloqueado && styles.textoNombreBloqueado]}>
                {nombre}
              </Text>

              {activo && (
                <View style={styles.badgePrioridad}>
                  <Text style={styles.textoPrioridad}>#{index + 1}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Button
        title={elegidos.length ? 'Comparar propuestas ›' : 'Seguir sin prioridades ›'}
        onPress={() => {
          setAnswer('candidatos.prioridades', elegidos);
          next();
        }}
        style={{ marginTop: 12 }}
      />
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  encabezadoContador: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  textoContador: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  contadorResaltado: {
    color: '#691C32',
    fontWeight: '700',
  },
  badgeMaximo: {
    backgroundColor: '#FDF2F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5C5CD',
  },
  textoBadgeMaximo: {
    fontSize: 11,
    color: '#691C32',
    fontWeight: '700',
  },
  scrollLista: {
    flex: 1,
    minHeight: 180,
  },
  contenidoScroll: {
    paddingVertical: 4,
  },
  filaCasilla: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  filaCasillaActiva: {
    borderColor: '#691C32',
    backgroundColor: '#FDF7F8',
  },
  filaCasillaBloqueada: {
    opacity: 0.55,
  },
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  casillaActiva: {
    borderColor: '#691C32',
    backgroundColor: '#691C32',
  },
  casillaBloqueada: {
    borderColor: '#D1D5DB',
  },
  iconoCheck: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  textoNombre: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  textoNombreActivo: {
    color: '#691C32',
    fontWeight: '700',
  },
  textoNombreBloqueado: {
    color: '#6B7280',
  },
  badgePrioridad: {
    backgroundColor: '#691C32',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  textoPrioridad: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
