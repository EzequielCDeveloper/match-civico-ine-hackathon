import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Candidato } from '../api/candidatos.api';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface CandidateCardProps {
  candidato: Candidato;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidato }) => {
  return (
    <Card style={styles.container}>
      <View style={styles.topAccent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{candidato.nombre_candidato}</Text>
          <Text style={styles.party}>{candidato.partido_coalicion}</Text>
        </View>

        <View style={styles.tagsRow}>
          <Badge label={candidato.cargo} variant="info" />
          <Badge label={candidato.entidad} variant="warning" />
          {candidato.tiene_titulo && <Badge label="Con Título" variant="success" />}
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Escolaridad:</Text>
          <Text style={styles.value}>
            {candidato.escolaridad || 'No especificada'}{' '}
            {candidato.estatus_escolaridad ? `(${candidato.estatus_escolaridad})` : ''}
          </Text>
        </View>

        {candidato.distrito_nombre ? (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Distrito:</Text>
            <Text style={styles.value}>
              {candidato.distrito_id} - {candidato.distrito_nombre}
            </Text>
          </View>
        ) : null}

        {candidato.propuesta_1 ? (
          <View style={styles.proposalSection}>
            <View style={styles.proposalHeaderRow}>
              <View style={styles.proposalDot} />
              <Text style={styles.proposalTitle}>Propuesta Principal:</Text>
            </View>
            <Text numberOfLines={4} style={styles.proposalText}>
              {candidato.propuesta_1}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topAccent: {
    height: 4,
    backgroundColor: '#9F2241', // Guinda institucional
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 10,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  party: {
    fontSize: 13,
    fontWeight: '600',
    color: '#691C32', // Guinda profundo
    marginTop: 3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    width: 95,
  },
  value: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
  proposalSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  proposalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  proposalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BC955C', // Acento Dorado
    marginRight: 6,
  },
  proposalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C652E', // Dorado oscuro
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  proposalText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
});
