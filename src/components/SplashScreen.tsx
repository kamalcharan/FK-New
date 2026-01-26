// src/components/SplashScreen.tsx
import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors } from '../constants/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = new Animated.Value(0);
  const taglineFadeAnim = new Animated.Value(0);

  useEffect(() => {
    // Fade in logo
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Delay then fade in tagline
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 2.5 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>FK</Text>
        </View>
        <Text style={styles.appName}>FamilyKnows</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, { opacity: taglineFadeAnim }]}>
        <Text style={styles.tagline}>
          Your family's second brain{'\n'}for things that matter
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 36,
    color: Colors.text,
    letterSpacing: 2,
  },
  appName: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    color: Colors.text,
    letterSpacing: 1,
  },
  taglineContainer: {
    position: 'absolute',
    bottom: 80,
    left: 40,
    right: 40,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
