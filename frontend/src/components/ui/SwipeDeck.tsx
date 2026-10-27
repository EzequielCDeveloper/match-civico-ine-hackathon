import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Button } from './Button';
import { capturar, prepararSeleccionWeb, punto, type Puntero } from './punteroWeb';

export type SwipeDirection = 'left' | 'right';
export interface SwipeResult<T> {
  item: T;
  direction: SwipeDirection;
}

interface SwipeDeckProps<T> {
  items: T[];
  keyExtractor: (item: T) => string | number;
  renderCard: (item: T) => ReactNode;
  onSwipe?: (item: T, direction: SwipeDirection) => void;
  onFinish?: (results: SwipeResult<T>[]) => void;
  leftLabel?: string;
  rightLabel?: string;
}

// Mexican Government & INE Institutional Tinder-style Swipe Deck
export function SwipeDeck<T>({
  items,
  keyExtractor,
  renderCard,
  onSwipe,
  onFinish,
  leftLabel = 'Descartar',
  rightLabel = 'Me interesa',
}: SwipeDeckProps<T>) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 32, 440);
  const threshold = cardWidth * 0.28;

  const [index, setIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const results = useRef<SwipeResult<T>[]>([]);
  const finished = useRef(false);
  const busy = useRef(false);

  const indexRef = useRef(index);
  indexRef.current = index;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cbRef = useRef({ onSwipe, onFinish });
  cbRef.current = { onSwipe, onFinish };
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;
  const widthRef = useRef(width);
  widthRef.current = width;

  const complete = useCallback((direction: SwipeDirection) => {
    const item = itemsRef.current[indexRef.current];
    if (item === undefined) return;
    results.current.push({ item, direction });
    cbRef.current.onSwipe?.(item, direction);
    setIndex((i) => i + 1);
  }, []);

  useLayoutEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    busy.current = false;
  }, [index, pan]);

  useEffect(() => {
    if (items.length > 0 && index >= items.length && !finished.current) {
      finished.current = true;
      cbRef.current.onFinish?.(results.current);
    }
  }, [index, items.length]);

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      if (busy.current) return;
      busy.current = true;
      const target = widthRef.current * 1.3 * (direction === 'right' ? 1 : -1);
      Animated.timing(pan, {
        toValue: { x: target, y: 0 },
        duration: 220,
        useNativeDriver: false,
      }).start(() => complete(direction));
    },
    [pan, complete]
  );
  const flyOutRef = useRef(flyOut);
  flyOutRef.current = flyOut;

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
    const limite = thresholdRef.current;
    if (Math.abs(dx) >= limite && Math.abs(dx) >= Math.abs(dy)) {
      flyOutRef.current(dx > 0 ? 'right' : 'left');
    } else {
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    }
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
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > thresholdRef.current) flyOutRef.current('right');
        else if (g.dx < -thresholdRef.current) flyOutRef.current('left');
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-cardWidth, 0, cardWidth],
    outputRange: ['-10deg', '0deg', '10deg'],
  });
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = pan.x.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nextScale = pan.x.interpolate({
    inputRange: [-cardWidth, 0, cardWidth],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  const top = items[index];
  const second = items[index + 1];

  return (
    <View style={styles.root}>
      <View style={styles.deck}>
        {second !== undefined && (
          <Animated.View
            key={keyExtractor(second)}
            pointerEvents="none"
            style={[styles.layer, { transform: [{ scale: nextScale }] }]}
          >
            <View style={{ width: cardWidth, flex: 1, minHeight: 0 }}>{renderCard(second)}</View>
          </Animated.View>
        )}
        {top !== undefined && (
          <Animated.View
            key={keyExtractor(top)}
            {...(Platform.OS === 'web' ? {} : responder.panHandlers)}
            style={[
              styles.layer,
              sinSeleccion,
              { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
            ]}
          >
            <View
              collapsable={false}
              {...punteroWeb}
              style={[{ width: cardWidth, flex: 1, minHeight: 0 }, sinSeleccion]}
            >
              {renderCard(top)}
              <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
                <Text selectable={false} style={[styles.stampText, { color: '#10312B' }]}>{rightLabel}</Text>
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
                <Text selectable={false} style={[styles.stampText, { color: '#9F2241' }]}>{leftLabel}</Text>
              </Animated.View>
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          title={`✕  ${leftLabel}`}
          variant="secondary"
          onPress={() => flyOut('left')}
          style={styles.actionBtn}
        />
        <Button
          title={`✓  ${rightLabel}`}
          variant="primary"
          onPress={() => flyOut('right')}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const sinSeleccion = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
} as unknown as ViewStyle;

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  deck: { height: 460, maxHeight: '68%', minHeight: 240, overflow: 'hidden' },
  layer: { ...StyleSheet.absoluteFill, alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12 },
  actionBtn: { flex: 1, maxWidth: 200, marginHorizontal: 6 },
  stamp: {
    position: 'absolute',
    top: 24,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 3,
    borderRadius: 8,
    backgroundColor: '#ffffffF0',
  },
  stampLike: {
    left: 20,
    borderColor: '#10312B', // Verde bandera
    transform: [{ rotate: '-10deg' }],
  },
  stampNope: {
    right: 20,
    borderColor: '#9F2241', // Guinda oficial
    transform: [{ rotate: '10deg' }],
  },
  stampText: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
