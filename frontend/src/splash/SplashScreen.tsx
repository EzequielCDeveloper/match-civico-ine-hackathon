import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../api/client';

const MIN_DURATION_MS = 2000;

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * Initial loading screen. Shows a placeholder image (assets/splash-placeholder.png,
 * replace it with the real logo keeping the same filename) while the backend is
 * pinged. It never blocks: it finishes after MIN_DURATION_MS even if the API is down.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    let cancelled = false;
    const delay = new Promise<void>((resolve) => setTimeout(resolve, MIN_DURATION_MS));
    const ping = apiClient.get('/health', { timeout: 3000 }).catch(() => null);
    Promise.all([delay, ping]).then(() => {
      if (!cancelled) onDone();
    });
    return () => {
      cancelled = true;
    };
  }, [fade, onDone]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.center, { opacity: fade }]}>
        <Image
          source={require('../../assets/splash-placeholder.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.instSubtitle}>INSTITUTO NACIONAL ELECTORAL</Text>
        <Text style={styles.title}>Match Cívico</Text>
        <View style={styles.goldLine} />
        <Text style={styles.electionYear}>Proceso Electoral Concurrente 2024</Text>
        <ActivityIndicator size="small" color="#9F2241" style={styles.loader} />
        <Text style={styles.caption}>Cargando plataforma cívica...</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: 24 },
  image: { width: 140, height: 140, marginBottom: 20 },
  instSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#BC955C', // Dorado institucional
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#691C32', letterSpacing: -0.5 }, // Guinda profundo
  goldLine: {
    width: 60,
    height: 3,
    backgroundColor: '#BC955C',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 8,
  },
  electionYear: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  loader: { marginTop: 24 },
  caption: { marginTop: 10, fontSize: 12, color: '#9CA3AF' },
});
