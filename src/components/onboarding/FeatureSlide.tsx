import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
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
        <Animated.View entering={FadeIn.delay(200).duration(600)}>
          <GlassView style={styles.iconContainer} borderRadius={999}>
            <Text style={styles.icon}>{icon}</Text>
          </GlassView>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInUp.delay(400).duration(600)}>
          <Text style={styles.title}>{title}</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View entering={FadeInUp.delay(500).duration(600)}>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>

        {/* Carousel Indicators */}
        <Animated.View entering={FadeIn.delay(600).duration(600)} style={styles.indicators}>
          <CarouselIndicator total={totalSlides} currentIndex={currentIndex} />
        </Animated.View>
      </View>

      {/* Button */}
      <Animated.View entering={FadeInUp.delay(700).duration(600)} style={styles.buttonContainer}>
        <Button
          title={isLast ? "Get Started" : "Next"}
          variant="ghost"
          onPress={onNext}
        />
      </Animated.View>
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
