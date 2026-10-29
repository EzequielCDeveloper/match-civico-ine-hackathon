import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StepContainer } from '../../../components/ui/StepContainer';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useAnswer, useFlow } from '../../../flow';
import { useSystem } from '../hooks/useSystem';
import { SystemActionPanel } from '../components/SystemActionPanel';
import { fetchAuditoria, resolverFusion, AuditoriaResponse, ResultadoFusion } from '../api/sistema.api';
import { descargarArchivoPDF } from '../utils/descargarPdf';
import { PerfilAnswer } from '../../votantes/types';

type FilaPDF = { nombre?: string; partido?: string; afinidad?: number };
type BloquePDF = { empate?: boolean; nota?: string; filas?: FilaPDF[] };

// Módulo Sistema: Exportación oficial a PDF, volver a realizar match, auditoría y resolución de conflictos.
export const CierreStep: React.FC = () => {
  const { restart } = useFlow();
  const perfil = useAnswer<PerfilAnswer>('votantes.perfil');
  const resultado = useAnswer<any>('candidatos.resultado');
  const { exportLoading, lastExport, handleExportPDF } = useSystem();
  const isAdmin = process.env.EXPO_PUBLIC_ADMIN === '1';

  const [auditoriaData, setAuditoriaData] = useState<AuditoriaResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [fusionData, setFusionData] = useState<ResultadoFusion | null>(null);
  const [fusionLoading, setFusionLoading] = useState<boolean>(false);

  const exportarConResumen = () => {
    const boleta = (bloque: BloquePDF | undefined, cargo: string) => {
      const filas = bloque?.filas ?? [];
      const cuantas = bloque?.empate ? 2 : 1;
      const personas = filas.slice(0, cuantas).map((fila) => ({
        nombre: fila.nombre || 'Sin nombre',
        partido: fila.partido,
        afinidad: Math.round((fila.afinidad || 0) * 100),
      }));
      return {
        cargo,
        empate: !!bloque?.empate && !bloque?.nota,
        nota: personas.length === 0 ? bloque?.nota || 'No evaluada' : bloque?.nota,
        personas,
      };
    };
    const dip = boleta(resultado?.diputacion, 'Diputación');
    const sen = boleta(resultado?.senado, 'Senado');
    const pre = boleta(resultado?.presidencia, 'Presidencia');

    handleExportPDF('candidatos', 1, {
      entidad: perfil?.entidad_display || perfil?.entidad || '',
      distrito: perfil?.distrito_nombre ? `${perfil?.distrito_id} · ${perfil?.distrito_nombre}` : '',
      top_diputacion: dip.personas[0]?.nombre || 'No evaluada',
      top_senado: sen.personas[0]?.nombre || 'No evaluada',
      top_presidencia: pre.personas[0]?.nombre || 'No evaluada',
      boletas: [dip, sen, pre],
    }).catch(() => undefined);
  };

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
    <StepContainer title="¡Listo!" subtitle="Tus resultados cívicos están listos para revisión y descarga">
      <SystemActionPanel
        exportLoading={exportLoading}
        onExport={exportarConResumen}
        onVolverARealizarMatch={restart}
      />

      {lastExport && (
        <Card style={styles.cardInfo}>
          <Text style={styles.ok}>📄 PDF generado y descargado ({lastExport.tamano_bytes || 2850} bytes)</Text>
          <Text style={styles.subtext}>El reporte oficial con tus coincidencias electorales se descargó en tu dispositivo.</Text>
          <Button
            title="📥 Volver a descargar PDF"
            variant="secondary"
            onPress={() => descargarArchivoPDF(lastExport.ruta_o_url, 'reporte_match_civico.pdf')}
            style={styles.reDownloadBtn}
          />
        </Card>
      )}

      {/* Herramientas adicionales de Sistema y Merge Master (Juan) - Solo Admin */}
      {isAdmin && (
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
      )}
    </StepContainer>
  );
};

const styles = StyleSheet.create({
  cardInfo: {
    marginVertical: 10,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    padding: 14,
  },
  ok: { color: '#15803d', fontSize: 14, fontWeight: '700' },
  subtext: { color: '#4B5563', fontSize: 12, marginTop: 4, lineHeight: 18 },
  reDownloadBtn: {
    marginTop: 10,
  },
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
