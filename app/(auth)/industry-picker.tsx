// app/(auth)/industry-picker.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { updateOnboardingContext, isSupabaseReady } from '../../src/lib/supabase';
import { useAppSelector } from '../../src/hooks/useStore';
import { INDUSTRIES } from '../../src/constants/renewals';

export default function IndustryPickerScreen() {
  const { userName, painPoint } = useLocalSearchParams<{
    userName?: string;
    painPoint?: string;
  }>();
  const { user } = useAppSelector(state => state.auth);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelect = async (industryCode: string) => {
    if (isNavigating) return;
    setIsNavigating(true);

    // Save industry to profile metadata
    try {
      if (isSupabaseReady() && user?.id) {
        await updateOnboardingContext(user.id, { industry: industryCode });
      }
    } catch (err) {
      console.error('[IndustryPicker] Failed to save context:', err);
    }

    router.replace({
      pathname: '/(auth)/workspace-setup',
      params: {
        userName: userName || '',
        painPoint: painPoint || 'compliance',
        industry: industryCode,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Persistent Tag */}
        <Text style={styles.buildingTag}>BUILDING YOUR FAMILY'S SECOND BRAIN</Text>

        {/* Header */}
        <Text style={styles.title}>What's your business?</Text>
        <Text style={styles.subtitle}>
          We'll show you the exact licenses and deadlines that matter.
        </Text>

        {/* Industry Cards */}
        <View style={styles.cardsContainer}>
          {INDUSTRIES.map((industry) => (
            <Pressable
              key={industry.code}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelect(industry.code)}
              disabled={isNavigating}
            >
              <Text style={styles.cardIcon}>{industry.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{industry.label}</Text>
                <Text style={styles.cardSubtitle}>{industry.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  buildingTag: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: Colors.text,
    lineHeight: 36,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textMuted,
    marginBottom: Spacing['2xl'],
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.2)',
    gap: 16,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardIcon: {
    fontSize: 32,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
