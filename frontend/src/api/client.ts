import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Resolve backend host dynamically for Web, Android Emulator and Physical Devices via Expo Go
const getDefaultBaseURL = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // When testing with Expo Go on a physical phone or simulator,
  // hostUri holds the development PC's IP on the local network (e.g. "192.168.1.50:8081").
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8080`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080'; // Android Studio Emulator fallback
  }

  return 'http://localhost:8080';
};

export const apiClient = axios.create({
  baseURL: getDefaultBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3500, // Fast timeout to trigger offline fallback rather than hanging
});
