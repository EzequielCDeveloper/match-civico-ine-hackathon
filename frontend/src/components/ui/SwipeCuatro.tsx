import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { capturar, prepararSeleccionWeb, punto, type Puntero } from './punteroWeb';

export type DireccionSwipe = 'left' | 'right' | 'up' | 'down';

interface SwipeCuatroProps {
  children: ReactNode;
  onSwipe: (direccion: DireccionSwipe) => void;
  derecha: string;
  izquierda: string;
  arriba: string;
  abajo: string;
}

const sinSeleccion = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
} as unknown as ViewStyle;

/** Arrastra la tarjeta en las cuatro direcciones. El texto no se puede seleccionar. */
export const SwipeCuatro: React.FC<SwipeCuatroProps> = ({
  children,
  onSwipe,
  derecha,
  izquierda,
  arriba,
  abajo,
}) => {
  const { width, height } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);
  const umbral = 64;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const sizeRef = useRef({ width, height, umbral });
  sizeRef.current = { width, height, umbral };

  const volar = (direccion: DireccionSwipe) => {
    if (busy.current) return;
    busy.current = true;
    const { width: w, height: h } = sizeRef.current;
    const destino = { x: 0, y: 0 };
    if (direccion === 'right') destino.x = w;
    if (direccion === 'left') destino.x = -w;
    if (direccion === 'up') destino.y = -h;
    if (direccion === 'down') destino.y = h;
    Animated.timing(pan, {
      toValue: destino,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      busy.current = false;
      onSwipeRef.current(direccion);
    });
  };
  const volarRef = useRef(volar);
  volarRef.current = volar;
  const activo = useRef<number | null>(null);
  const origen = useRef({ x: 0, y: 0 });

  useEffect(() => {
    prepararSeleccionWeb();
  }, []);

  const alBajar = (e: Puntero) => {
    if (busy.current) return;
    const p = punto(e);
    if (p.button !== 0) return;
    e.preventDefault?.();
    activo.current = p.pointerId;
    origen.current = { x: p.x, y: p.y };
    capturar(e, p.pointerId);
  };
  const alMover = (e: Puntero) => {
    if (activo.current == null || punto(e).pointerId !== activo.current) return;
    const p = punto(e);
    pan.setValue({ x: p.x - origen.current.x, y: p.y - origen.current.y });
  };
  const alSoltar = (e: Puntero) => {
    if (activo.current == null || punto(e).pointerId !== activo.current) return;
    activo.current = null;
    const p = punto(e);
    const dx = p.x - origen.current.x;
    const dy = p.y - origen.current.y;
    const limite = sizeRef.current.umbral;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < limite) {
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) volarRef.current(dx > 0 ? 'right' : 'left');
    else volarRef.current(dy > 0 ? 'down' : 'up');
  };
  const punteroWeb =
    Platform.OS === 'web'
      ? {
          dataSet: { swipe: '1' },
          onPointerDown: alBajar,
          onPointerMove: alMover,
          onPointerUp: alSoltar,
          onPointerCancel: alSoltar,
        }
      : null;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesto) => {
        const horizontal = Math.abs(gesto.dx);
        const vertical = Math.abs(gesto.dy);
        if (Math.max(horizontal, vertical) < sizeRef.current.umbral) {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
          return;
        }
        if (horizontal > vertical) volarRef.current(gesto.dx > 0 ? 'right' : 'left');
        else volarRef.current(gesto.dy > 0 ? 'down' : 'up');
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const opacidadHacia = (valor: number, eje: 'x' | 'y') => {
    const nodo = eje === 'x' ? pan.x : pan.y;
    const negativo = valor < 0;
    return nodo.interpolate({
      inputRange: negativo ? [valor, 0] : [0, valor],
      outputRange: negativo ? [1, 0] : [0, 1],
      extrapolate: 'clamp',
    });
  };

  return (
    <View style={styles.marco}>
      <Animated.View
        {...(Platform.OS === 'web' ? {} : responder.panHandlers)}
        style={[
          styles.tarjeta,
          sinSeleccion,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
      >
        <View collapsable={false} {...punteroWeb} style={[styles.contenido, sinSeleccion]}>
          {children}
        </View>
        <Animated.View pointerEvents="none" style={[styles.sello, styles.selloDerecha, { opacity: opacidadHacia(umbral, 'x') }]}>
          <Text selectable={false} style={styles.selloSi}>{derecha}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.sello, styles.selloIzquierda, { opacity: opacidadHacia(-umbral, 'x') }]}>
          <Text selectable={false} style={styles.selloNo}>{izquierda}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.sello, styles.selloArriba, { opacity: opacidadHacia(-umbral, 'y') }]}>
          <Text selectable={false} style={styles.selloIgual}>{arriba}</Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.sello, styles.selloAbajo, { opacity: opacidadHacia(umbral, 'y') }]}>
          <Text selectable={false} style={styles.selloIgual}>{abajo}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  marco: { flex: 1, minHeight: 220 },
  tarjeta: { flex: 1 },
  contenido: { flex: 1 },
  sello: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: '#ffffffF0',
  },
  selloDerecha: { top: 28, left: 16, borderColor: '#10312B' },
  selloIzquierda: { top: 28, right: 16, borderColor: '#9F2241' },
  selloArriba: { top: 8, alignSelf: 'center', borderColor: '#BC955C' },
  selloAbajo: { bottom: 8, alignSelf: 'center', borderColor: '#BC955C' },
  selloSi: { color: '#10312B', fontWeight: '800', fontSize: 16 },
  selloNo: { color: '#9F2241', fontWeight: '800', fontSize: 16 },
  selloIgual: { color: '#8C652E', fontWeight: '800', fontSize: 16 },
});
