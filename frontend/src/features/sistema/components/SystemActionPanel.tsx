import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface SystemActionPanelProps {
  onReset: () => void;
  onExport: () => void;
  resetLoading: boolean;
  exportLoading: boolean;
}

export const SystemActionPanel: React.FC<SystemActionPanelProps> = ({
  onReset,
  onExport,
  resetLoading,
  exportLoading,
}) => {
  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Acciones del Sistema</Text>
      <Text style={styles.description}>
        Herramientas de administración, vaciado de caché/perfiles y generación de reportes en PDF.
      </Text>

      <View style={styles.actionsRow}>
        <Button
          title="Exportar Reporte a PDF"
          variant="primary"
          onPress={onExport}
          loading={exportLoading}
          style={styles.actionBtn}
        />

        <Button
          title="Reset de Info App"
          variant="danger"
          onPress={onReset}
          loading={resetLoading}
          style={styles.actionBtn}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderTopWidth: 4,
    borderTopColor: '#BC955C', // Acento Dorado institucional
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 16,
  },
  actionsRow: {
    gap: 12,
  },
  actionBtn: {
    marginVertical: 2,
  },
});
