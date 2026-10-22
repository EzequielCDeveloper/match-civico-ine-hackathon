import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';

interface PropuestaCardProps {
  tema: string;
  texto: string;
}

/** Tarjeta a ciegas: el tema y una propuesta, sin nombre ni partido. */
export const PropuestaCard: React.FC<PropuestaCardProps> = ({ tema, texto }) => {
  return (
    <Card style={styles.container}>
      <View style={styles.topAccent} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Badge label={tema} variant="info" />
        <Text style={styles.texto}>{texto}</Text>
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    marginVertical: 6,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topAccent: {
    height: 4,
    backgroundColor: '#9F2241',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentInner: {
    padding: 16,
  },
  texto: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
});
