import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Mexican Government & INE Institutional Design System Button
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

  const buttonStyle: StyleProp<ViewStyle> = [
    styles.button,
    isSecondary ? styles.secondaryButton : styles.primaryButton,
    isDanger && styles.dangerButton,
    (disabled || loading) && styles.disabledButton,
    style,
  ];

  const textStyle: StyleProp<TextStyle> = [
    styles.text,
    isSecondary ? styles.secondaryText : styles.primaryText,
    isDanger && styles.dangerText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? '#9F2241' : '#ffffff'} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#9F2241', // Guinda oficial Gobierno de México
    borderWidth: 1,
    borderColor: '#821D35',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#BC955C', // Dorado institucional
  },
  dangerButton: {
    backgroundColor: '#691C32', // Guinda profundo
  },
  disabledButton: {
    opacity: 0.55,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#212529',
  },
  dangerText: {
    color: '#ffffff',
  },
});
