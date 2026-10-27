import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useFlow } from '../../../flow';
import { useSystem } from '../hooks/useSystem';
import { SystemActionPanel } from '../components/SystemActionPanel';
import { fetchAuditoria, resolverFusion, AuditoriaResponse, ResultadoFusion } from '../api/sistema.api';

// Juan — final step: Reset de info, exportar a PDF, auditoría de base de datos y resolución de conflictos.
export const CierreStep: React.FC = () => {
  const { restart } = useFlow();
  const { resetLoading, exportLoading, lastExport, lastReset, handleReset, handleExportPDF } = useSystem();

  const [auditoriaData, setAuditoriaData] = useState<AuditoriaResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [fusionData, setFusionData] = useState<ResultadoFusion | null>(null);
  const [fusionLoading, setFusionLoading] = useState<boolean>(false);

  const consultarAuditoriaBD = async () => {
    setAuditLoading(true);
    try {
      const data = await fetchAuditoria();
      setAuditoriaData(data);
    } catch {
      // Ignorar error de red si offline
    } finally {
      setAuditLoading(false);
    }
  };

  const ejecutarResolucionConflictos = async () => {
    setFusionLoading(true);
    try {
      const res = await resolverFusion({
        entidad_id: 'CAND-0884',
        tipo_entidad: 'candidato',
        estrategia: 'source_priority',
        registro_base: {
          nombre_candidato: 'Candidatura Oficial INE',
          propuesta_1: 'Transparencia y Rendición de Cuentas',
          telefono: '',
        },
        registro_entrante: {
          nombre_candidato: 'Candidatura Propuesta Externa',
          propuesta_1: 'Modificación no canónica',
          telefono: '55-1234-5678',
        },
      });
      setFusionData(res);
    } catch {
      // Ignorar error de red si offline
    } finally {
      setFusionLoading(false);
    }
  };

  return (
    <StepContainer title="¡Listo!" subtitle="Módulo Sistema: Exportación, Reset, Auditoría y Fusión">
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
        <Card style={styles.cardInfo}>
          <Text style={styles.ok}>📄 PDF generado ({lastExport.tamano_bytes || 2850} bytes)</Text>
          <Text style={styles.subtext}>{lastExport.ruta_o_url}</Text>
        </Card>
      )}

      {lastReset && (
        <Card style={styles.cardInfo}>
          <Text style={styles.ok}>🔄 Reset completado ({lastReset.registros_afectados} perfiles limpiados)</Text>
          {lastReset.ruta_snapshot && (
            <Text style={styles.subtext}>Snapshot: {lastReset.ruta_snapshot}</Text>
          )}
        </Card>
      )}

      {/* Herramientas adicionales de Sistema y Merge Master (Juan) */}
      <Card style={styles.adminCard}>
        <Text style={styles.adminTitle}>Auditoría y Resolución de Conflictos (Juan)</Text>
        <Text style={styles.adminDesc}>
          Inspección de logs de base de datos y algoritmos de conciliación de datos.
        </Text>
        <View style={styles.btnRow}>
          <Button
            title="Consultar Auditoría BD"
            variant="secondary"
            onPress={consultarAuditoriaBD}
            loading={auditLoading}
            style={styles.adminBtn}
          />
          <Button
            title="Probar Fusión de Conflictos"
            variant="secondary"
            onPress={ejecutarResolucionConflictos}
            loading={fusionLoading}
            style={styles.adminBtn}
          />
        </View>

        {auditoriaData && (
          <View style={styles.detailsBox}>
            <Text style={styles.bold}>
              Auditoría: {auditoriaData.total_resets} resets, {auditoriaData.total_exportaciones} exportaciones
            </Text>
          </View>
        )}

        {fusionData && (
          <View style={styles.detailsBox}>
            <Text style={styles.bold}>
              Fusión {fusionData.estado}: {fusionData.total_conflictos} campos resueltos con {fusionData.estrategia}
            </Text>
          </View>
        )}
      </Card>
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  cardInfo: {
    marginVertical: 6,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  ok: { color: '#15803d', fontSize: 13, fontWeight: '700' },
  subtext: { color: '#4B5563', fontSize: 11, marginTop: 4 },
  adminCard: {
    marginVertical: 10,
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  adminTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  adminDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'column',
    gap: 8,
  },
  adminBtn: {
    marginVertical: 2,
  },
  detailsBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
});
