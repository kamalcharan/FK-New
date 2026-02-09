// src/components/onboarding/BrandSlide.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import { Button } from '../ui/Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BrandSlideProps {
  onGetStarted: () => void;
}

export function BrandSlide({ onGetStarted }: BrandSlideProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslate = useRef(new Animated.Value(15)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslate, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Subtle glow behind logo */}
      <View style={styles.glowBackground} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineContainer,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslate }],
            },
          ]}
        >
          <View style={styles.divider} />
          <Text style={styles.tagline}>
            Your family's second brain
          </Text>
          <Text style={styles.taglineEmphasis}>
            for the things nobody remembers{'\n'}until it's too late.
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.buttonContainer, { opacity: buttonOpacity }]}>
          <Button
            title="Get Started"
            variant="white"
            onPress={onGetStarted}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBackground: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primary,
    opacity: 0.08,
    top: SCREEN_HEIGHT * 0.25,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    marginBottom: 20,
    borderRadius: 1,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 4,
  },
  taglineEmphasis: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  buttonContainer: {
    width: '100%',
  },
});
