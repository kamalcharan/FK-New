// app/(auth)/pain-point.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { updateOnboardingContext, isSupabaseReady } from '../../src/lib/supabase';
import { useAppSelector } from '../../src/hooks/useStore';

const PAIN_POINTS = [
  {
    id: 'insurance',
    icon: '🛡️',
    title: 'Health insurance is scattered',
    subtitle: 'Nobody knows where the policies are',
    color: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  {
    id: 'loans',
    icon: '💰',
    title: 'Family loans with no record',
    subtitle: 'Money was lent, but nothing was written',
    color: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  {
    id: 'compliance',
    icon: '📋',
    title: 'Compliance deadlines slipping',
    subtitle: 'Renewals nobody is tracking',
    color: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
];

export default function PainPointScreen() {
  const { userName } = useLocalSearchParams<{ userName?: string }>();
  const { user } = useAppSelector(state => state.auth);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelect = async (painPointId: string) => {
    if (isNavigating) return;
    setIsNavigating(true);

    // Save pain point to profile metadata
    try {
      if (isSupabaseReady() && user?.id) {
        await updateOnboardingContext(user.id, { pain_point: painPointId });
      }
    } catch (err) {
      console.error('[PainPoint] Failed to save context:', err);
      // Continue navigation even if save fails
    }

    // All pain points go directly to workspace-setup
    // Compliance persona selection happens inside guided-entry itself
    router.replace({
      pathname: '/(auth)/workspace-setup',
      params: {
        userName: userName || '',
        painPoint: painPointId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Persistent Tag */}
        <Text style={styles.buildingTag}>BUILDING YOUR FAMILY'S SECOND BRAIN</Text>

        {/* Header */}
        <Text style={styles.title}>
          What's your biggest concern right now?
        </Text>
        <Text style={styles.subtitle}>
          We'll help you set it up in 2 minutes.
        </Text>

        {/* Pain Point Cards */}
        <View style={styles.cardsContainer}>
          {PAIN_POINTS.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: item.color, borderColor: item.borderColor },
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelect(item.id)}
            >
              <Text style={styles.cardIcon}>{item.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing['2xl'],
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
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
    ...Typography.body,
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  cardSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
