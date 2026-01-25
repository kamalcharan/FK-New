import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  borderRadius?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  borderRadius = BorderRadius['3xl'],
}: GlassCardProps) {
  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <View style={[styles.glass, { borderRadius }]}>
        {children}
      </View>
    </View>
  );
}

// Simple glass effect without blur (for better performance)
export function GlassView({
  children,
  style,
  borderRadius = BorderRadius['3xl'],
}: GlassCardProps) {
  return (
    <View style={[styles.simpleGlass, { borderRadius }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  glass: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  simpleGlass: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
});
