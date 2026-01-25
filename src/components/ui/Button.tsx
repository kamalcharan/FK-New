import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'white';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  // FIX: Use ternary with null instead of && which returns false
  const buttonStyles = [
    styles.base,
    styles[variant],
    disabled ? styles.disabled : null,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles],
    disabled ? styles.disabledText : null,
    textStyle,
  ];

  return (
    <Pressable
      // FIX: Use ternary with null in style function
      style={({ pressed }) => [
        ...buttonStyles,
        pressed ? styles.pressed : null,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'white' ? Colors.background : Colors.text}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: BorderRadius['2xl'],
    gap: 12,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  ghost: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  white: {
    backgroundColor: Colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...Typography.buttonLg,
    color: Colors.text,
  },
  primaryText: {
    color: Colors.text,
  },
  secondaryText: {
    color: Colors.textSecondary,
  },
  ghostText: {
    color: Colors.text,
  },
  whiteText: {
    color: Colors.background,
  },
  disabledText: {
    opacity: 0.7,
  },
});