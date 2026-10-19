import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { useFlow } from '../../../flow';
import { useSystem } from '../hooks/useSystem';
import { SystemActionPanel } from '../components/SystemActionPanel';

// Juan — final step: export to PDF or reset the whole app and go back to the start.
export const CierreStep: React.FC = () => {
  const { restart } = useFlow();
  const { resetLoading, exportLoading, lastExport, handleReset, handleExportPDF } = useSystem();

  return (
    <StepContainer title="¡Listo!" subtitle="Exporta tu resultado o empieza de nuevo">
      <SystemActionPanel
        exportLoading={exportLoading}
        resetLoading={resetLoading}
        onExport={() => handleExportPDF('candidatos', 1).catch(() => undefined)}
        onReset={async () => {
          try {
            await handleReset('PERFILES', 'Reinicio desde el flujo');
          } finally {
            restart();
          }
        }}
      />
      {lastExport && (
        <Card>
          <Text style={styles.ok}>PDF generado: {lastExport.ruta_o_url}</Text>
        </Card>
      )}
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  ok: { color: '#15803d', fontSize: 13 },
});
