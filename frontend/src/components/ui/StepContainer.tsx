import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StepContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Mexican Government & INE Institutional Step Layout
export const StepContainer: React.FC<StepContainerProps> = ({ title, subtitle, children }) => (
  <View style={styles.root}>
    <View style={styles.inner}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  inner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  body: {
    flex: 1,
    minHeight: 0,
    marginTop: 6,
  },
});
