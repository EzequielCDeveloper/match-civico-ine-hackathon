import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FlowProvider, FlowShell } from './src/flow';
import { FLOW_STEPS } from './src/flow/steps';
import { SplashScreen } from './src/splash/SplashScreen';

export default function App() {
  const [ready, setReady] = useState(false);
  const handleDone = useCallback(() => setReady(true), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <FlowProvider steps={FLOW_STEPS}>
          <FlowShell />
        </FlowProvider>
      ) : (
        <SplashScreen onDone={handleDone} />
      )}
    </SafeAreaProvider>
  );
}
