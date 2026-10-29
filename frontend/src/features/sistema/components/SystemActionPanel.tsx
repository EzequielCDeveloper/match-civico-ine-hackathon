import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface SystemActionPanelProps {
  onVolverARealizarMatch: () => void;
  onExport: () => void;
  exportLoading: boolean;
}

export const SystemActionPanel: React.FC<SystemActionPanelProps> = ({
  onVolverARealizarMatch,
  onExport,
  exportLoading,
}) => {
  return (
    <Card style={styles.container}>
      <Text style={styles.title}>Acciones Finales</Text>
      <Text style={styles.description}>
        Descarga tu reporte oficial con tus coincidencias electorales en PDF o vuelve a realizar el ejercicio cívico desde el inicio.
      </Text>

      <View style={styles.actionsRow}>
        <Button
          title="Exportar y Descargar PDF"
          variant="primary"
          onPress={onExport}
          loading={exportLoading}
          style={styles.actionBtn}
        />

        <Button
          title="Volver a realizar match"
          variant="secondary"
          onPress={onVolverARealizarMatch}
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
