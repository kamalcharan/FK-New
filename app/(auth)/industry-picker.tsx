// app/(auth)/industry-picker.tsx
// Persona picker — loads bundles from fk_renewal_bundles (same data as add-renewal persona step)
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import {
  updateOnboardingContext,
  isSupabaseReady,
  getRenewalBundles,
  RenewalBundle,
} from '../../src/lib/supabase';
import { useAppSelector } from '../../src/hooks/useStore';

export default function IndustryPickerScreen() {
  const { userName, painPoint } = useLocalSearchParams<{
    userName?: string;
    painPoint?: string;
  }>();
  const { user } = useAppSelector(state => state.auth);
  const [isNavigating, setIsNavigating] = useState(false);
  const [bundles, setBundles] = useState<RenewalBundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = async () => {
    try {
      const data = await getRenewalBundles();
      setBundles(data);
    } catch (err) {
      console.error('[IndustryPicker] Failed to load bundles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (bundle: RenewalBundle) => {
    if (isNavigating) return;
    setIsNavigating(true);

    // Save persona (bundle code) to profile metadata
    try {
      if (isSupabaseReady() && user?.id) {
        await updateOnboardingContext(user.id, {
          persona: bundle.code,
          persona_title: bundle.title,
        });
      }
    } catch (err) {
      console.error('[IndustryPicker] Failed to save context:', err);
    }

    router.replace({
      pathname: '/(auth)/workspace-setup',
      params: {
        userName: userName || '',
        painPoint: painPoint || 'compliance',
        persona: bundle.code,
      },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Persistent Tag */}
        <Text style={styles.buildingTag}>BUILDING YOUR FAMILY'S SECOND BRAIN</Text>

        {/* Header */}
        <Text style={styles.title}>What describes you?</Text>
        <Text style={styles.subtitle}>
          We'll show you the exact licenses and deadlines that matter.
        </Text>

        {/* Persona Cards — from DB */}
        <View style={styles.cardsContainer}>
          {bundles.map((bundle) => (
            <Pressable
              key={bundle.id}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleSelect(bundle)}
              disabled={isNavigating}
            >
              <Text style={styles.cardIcon}>{bundle.icon || '📋'}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{bundle.title}</Text>
                {bundle.hook && (
                  <Text style={styles.cardSubtitle} numberOfLines={2}>{bundle.hook}</Text>
                )}
                <Text style={styles.cardCount}>{bundle.preset_codes.length} compliance items</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 4,
  },
  cardCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
});
