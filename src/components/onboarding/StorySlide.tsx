// src/components/onboarding/StorySlide.tsx
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { Button } from '../ui/Button';

interface StorySlideProps {
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  buttonText: string;
  onNext: () => void;
}

export function StorySlide({
  badge,
  badgeColor,
  title,
  subtitle,
  buttonText,
  onNext,
}: StorySlideProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.7)', 'rgba(15, 23, 42, 0.95)']}
        style={styles.gradient}
      />

      <View style={styles.content}>
        <Text style={[styles.badge, { color: badgeColor }]}>{badge}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.buttonContainer}>
          <Button
            title={buttonText}
            variant="ghost"
            onPress={onNext}
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
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 34,
    lineHeight: 42,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    ...Typography.bodyLg,
    color: Colors.textSecondary,
    lineHeight: 26,
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
});
