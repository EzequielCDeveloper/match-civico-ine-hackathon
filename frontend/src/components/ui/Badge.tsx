import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'info' | 'success' | 'warning';
}

// Mexican Government & INE Institutional Badges
export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info' }) => {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
        // Verde Bandera Institucional
        return { bg: 'rgba(16, 49, 43, 0.08)', border: 'rgba(16, 49, 43, 0.3)', text: '#10312B' };
      case 'warning':
        // Dorado Oficial GobMx
        return { bg: 'rgba(188, 149, 92, 0.15)', border: 'rgba(188, 149, 92, 0.45)', text: '#8C652E' };
      default:
        // Guinda Oficial / Magenta INE
        return { bg: 'rgba(159, 34, 65, 0.08)', border: 'rgba(159, 34, 65, 0.3)', text: '#9F2241' };
    }
  };

  const colors = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginRight: 6,
    marginBottom: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
