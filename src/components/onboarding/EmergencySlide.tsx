import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { Button } from '../ui/Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EmergencySlideProps {
  onContinue: () => void;
}

export function EmergencySlide({ onContinue }: EmergencySlideProps) {
  return (
    <View style={styles.container}>
      {/* Background with gradient overlay */}
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.7)', 'rgba(15, 23, 42, 0.95)']}
        style={styles.gradient}
      />

      {/* Content at bottom */}
      <View style={styles.content}>
        <Text style={styles.badge}>11:00 PM • Goa Medical Emergency</Text>
        <Text style={styles.title}>"Where is Dad's insurance policy?"</Text>
        <Text style={styles.subtitle}>
          Never be caught without critical documents when they matter most.
        </Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Secure My Family"
            variant="white"
            onPress={onContinue}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  badge: {
    color: Colors.danger,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 36,
    lineHeight: 44,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodyLg,
    color: Colors.textSecondary,
    lineHeight: 28,
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
