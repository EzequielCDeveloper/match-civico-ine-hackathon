import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFlow } from './FlowContext';

const DURATION = 320;

/**
 * Renders the current step and slides it in automatically whenever the flow
 * index changes. Forward = enters from the right, back = enters from the left.
 */
export const FlowPager: React.FC = () => {
  const { steps, index, direction } = useFlow();
  const { width } = useWindowDimensions();

  const [shown, setShown] = useState(index);
  const [leaving, setLeaving] = useState<{ index: number; dir: 1 | -1 } | null>(null);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (index === shown) return;
    setLeaving({ index: shown, dir: direction });
    setShown(index);
    x.setValue(direction * width);
    Animated.timing(x, {
      toValue: 0,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => setLeaving(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const leaveX =
    leaving && leaving.dir === 1
      ? x.interpolate({ inputRange: [0, width], outputRange: [-width, 0] })
      : x.interpolate({ inputRange: [-width, 0], outputRange: [0, width] });

  const Current = steps[shown].Component;
  const Leaving = leaving ? steps[leaving.index].Component : null;

  return (
    <View style={styles.container}>
      {Leaving && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { transform: [{ translateX: leaveX }] }]}
        >
          <Leaving />
        </Animated.View>
      )}
      <Animated.View
        key={steps[shown].id}
        style={[StyleSheet.absoluteFill, { transform: [{ translateX: x }] }]}
      >
        <Current />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
