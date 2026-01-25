// src/components/onboarding/FeatureSlide.tsx
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { GlassView } from '../ui/GlassCard';
import { CarouselIndicator } from './CarouselIndicator';
import { Button } from '../ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeatureSlideProps {
  icon: string;
  title: string;
  subtitle: string;
  currentIndex: number;
  totalSlides: number;
  onNext: () => void;
  isLast?: boolean;
}

export function FeatureSlide({
  icon,
  title,
  subtitle,
  currentIndex,
  totalSlides,
  onNext,
  isLast = false,
}: FeatureSlideProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon Circle */}
        <GlassView style={styles.iconContainer} borderRadius={999}>
          <Text style={styles.icon}>{icon}</Text>
        </GlassView>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Carousel Indicators */}
        <View style={styles.indicators}>
          <CarouselIndicator total={totalSlides} currentIndex={currentIndex} />
        </View>
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <Button
          title={isLast ? "Get Started" : "Next"}
          variant="ghost"
          onPress={onNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    lineHeight: 36,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  indicators: {
    marginTop: Spacing.lg,
  },
  buttonContainer: {
    paddingBottom: Spacing.xl,
  },
});
