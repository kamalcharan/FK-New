// app/(tabs)/index.tsx
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../../src/constants/theme';
import { useAppSelector } from '../../src/hooks/useStore';
import {
  getDashboardStats,
  getUpcomingAlerts,
  isDemoModeEnabled,
  DashboardStats,
  UpcomingAlert,
  isSupabaseReady,
} from '../../src/lib/supabase';

// Format currency in Indian style (₹1,00,000)
const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const { user } = useAppSelector(state => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<UpcomingAlert[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentWorkspace?.id || !isSupabaseReady()) {
      setIsLoading(false);
      return;
    }

    try {
      const [statsData, alertsData, demoStatus] = await Promise.all([
        getDashboardStats(currentWorkspace.id),
        getUpcomingAlerts(currentWorkspace.id),
        user?.id ? isDemoModeEnabled(user.id) : Promise.resolve(false),
      ]);
      setStats(statsData);
      setAlerts(alertsData);
      setIsDemoMode(demoStatus);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, user?.id]);

  // Reload data whenever screen comes into focus (e.g., after toggling demo mode)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Check if workspace has any data
  const hasData = stats && (
    stats.loans_given_count > 0 ||
    stats.loans_taken_count > 0 ||
    stats.active_policies > 0 ||
    stats.upcoming_renewals > 0
  );

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.workspaceName}>{currentWorkspace?.name || 'Family Vault'}</Text>
          </View>
          <Pressable style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </Pressable>
        </View>

        {/* Empty State - Show when no data */}
        {!hasData ? (
          <View style={styles.emptyStateContainer}>
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeEmoji}>🏠</Text>
              <Text style={styles.welcomeTitle}>Welcome to your Family Vault</Text>
              <Text style={styles.welcomeSubtitle}>
                Your family's financial memory starts here. Track loans, secure policies, never miss renewals.
              </Text>
            </View>

            {/* Empty Pillar Cards */}
            <Text style={styles.sectionTitle}>GET STARTED</Text>

            {/* Loan Ledger Empty */}
            <Pressable style={styles.emptyPillarCard} onPress={() => router.push('/(tabs)/loans')}>
              <View style={styles.emptyPillarIcon}>
                <Text style={styles.emptyPillarEmoji}>💰</Text>
              </View>
              <View style={styles.emptyPillarContent}>
                <Text style={styles.emptyPillarTitle}>Loan Ledger</Text>
                <Text style={styles.emptyPillarTagline}>"Every rupee has a story"</Text>
                <Text style={styles.emptyPillarDesc}>
                  Track money given & taken. Never forget who owes what.
                </Text>
              </View>
              <View style={styles.emptyPillarAction}>
                <Ionicons name="add-circle" size={28} color={Colors.primary} />
              </View>
            </Pressable>

            {/* Insurance Vault Empty */}
            <Pressable style={styles.emptyPillarCard} onPress={() => router.push('/vault')}>
              <View style={[styles.emptyPillarIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Text style={styles.emptyPillarEmoji}>🛡️</Text>
              </View>
              <View style={styles.emptyPillarContent}>
                <Text style={styles.emptyPillarTitle}>Insurance Vault</Text>
                <Text style={styles.emptyPillarTagline}>"Protection, organized"</Text>
                <Text style={styles.emptyPillarDesc}>
                  Store all policies in one place. Get expiry reminders.
                </Text>
              </View>
              <View style={styles.emptyPillarAction}>
                <Ionicons name="add-circle" size={28} color="#22c55e" />
              </View>
            </Pressable>

            {/* Renewal Tracker Empty */}
            <Pressable style={styles.emptyPillarCard} onPress={() => router.push('/renewals')}>
              <View style={[styles.emptyPillarIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                <Text style={styles.emptyPillarEmoji}>📅</Text>
              </View>
              <View style={styles.emptyPillarContent}>
                <Text style={styles.emptyPillarTitle}>Renewal Tracker</Text>
                <Text style={styles.emptyPillarTagline}>"Never miss a deadline"</Text>
                <Text style={styles.emptyPillarDesc}>
                  Property tax, licenses, certificates - all tracked.
                </Text>
              </View>
              <View style={styles.emptyPillarAction}>
                <Ionicons name="add-circle" size={28} color="#fbbf24" />
              </View>
            </Pressable>

            {/* Demo Mode Card - Prominent */}
            <View style={styles.demoCard}>
              <View style={styles.demoCardIcon}>
                <Text style={styles.demoCardEmoji}>✨</Text>
              </View>
              <Text style={styles.demoCardTitle}>See how it works</Text>
              <Text style={styles.demoCardSubtitle}>
                Enable demo mode to explore FamilyKnows with sample loans, policies, and renewals
              </Text>
              <Pressable
                style={styles.demoCardButton}
                onPress={() => router.push('/(tabs)/settings')}
              >
                <Text style={styles.demoCardButtonText}>Enable Demo Mode</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Data State - Show when there's data */
          <>
            {/* Demo Mode Banner */}
            {isDemoMode && (
              <Pressable
                style={styles.demoBanner}
                onPress={() => router.push('/settings')}
              >
                <View style={styles.demoBannerContent}>
                  <Text style={styles.demoBannerIcon}>✨</Text>
                  <View style={styles.demoBannerText}>
                    <Text style={styles.demoBannerTitle}>Demo Mode Active</Text>
                    <Text style={styles.demoBannerSubtitle}>You're viewing sample data. Tap to disable.</Text>
                  </View>
                </View>
                <Ionicons name="close-circle" size={20} color="rgba(251, 191, 36, 0.7)" />
              </Pressable>
            )}

            {/* Urgent Alert Card */}
            {alerts.length > 0 && (
              <View style={[styles.alertCard, alerts[0].daysLeft <= 7 ? styles.alertCardRed : styles.alertCardAmber]}>
                <View style={styles.alertHeader}>
                  <View style={[styles.alertDot, alerts[0].daysLeft <= 7 && styles.alertDotRed]} />
                  <Text style={[styles.alertLabel, alerts[0].daysLeft <= 7 && styles.alertLabelRed]}>
                    {alerts[0].daysLeft <= 0 ? 'OVERDUE' : alerts[0].daysLeft <= 7 ? 'URGENT' : 'UPCOMING'}
                  </Text>
                </View>
                <Text style={styles.alertTitle}>{alerts[0].title}</Text>
                <Text style={styles.alertSubtitle}>
                  {alerts[0].daysLeft <= 0
                    ? `Expired ${Math.abs(alerts[0].daysLeft)} days ago`
                    : `Expires in ${alerts[0].daysLeft} days`}
                </Text>
                <View style={styles.alertActions}>
                  <Pressable style={styles.renewButton}>
                    <Text style={styles.renewButtonText}>View Details</Text>
                  </Pressable>
                  {alerts.length > 1 && (
                    <View style={styles.moreAlertsButton}>
                      <Text style={styles.moreAlertsText}>+{alerts.length - 1} more</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <Pressable style={styles.summaryCard} onPress={() => router.push('/(tabs)/loans')}>
                <Text style={styles.summaryLabel}>LOAN LEDGER</Text>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(stats?.total_loans_given || 0)}
                  </Text>
                  <Text style={styles.summaryStatus}>
                    {stats?.loans_given_count || 0} given • {stats?.loans_taken_count || 0} taken
                  </Text>
                  {stats?.pending_verification ? (
                    <Text style={styles.summaryWarning}>
                      {stats.pending_verification} pending verification
                    </Text>
                  ) : null}
                </View>
              </Pressable>

              <Pressable style={styles.summaryCard} onPress={() => router.push('/vault')}>
                <Text style={styles.summaryLabel}>INSURANCE</Text>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryValue}>{stats?.active_policies || 0}</Text>
                  <Text style={styles.summaryStatusMuted}>Active policies</Text>
                  {stats?.expiring_soon_policies ? (
                    <Text style={styles.summaryWarning}>
                      {stats.expiring_soon_policies} expiring soon
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </View>

            {/* Renewals Card */}
            <Pressable style={styles.renewalsCard} onPress={() => router.push('/renewals')}>
              <View style={styles.renewalsHeader}>
                <Text style={styles.renewalsIcon}>📅</Text>
                <View style={styles.renewalsContent}>
                  <Text style={styles.renewalsTitle}>Renewals</Text>
                  <Text style={styles.renewalsSubtitle}>
                    {stats?.upcoming_renewals || 0} upcoming • {stats?.overdue_renewals || 0} overdue
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </View>
            </Pressable>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
              <Pressable style={styles.quickAction} onPress={() => router.push({ pathname: '/add-loan', params: { type: 'given' } })}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Text style={styles.quickActionEmoji}>💸</Text>
                </View>
                <Text style={styles.quickActionLabel}>Record Loan</Text>
              </Pressable>

              <Pressable style={styles.quickAction} onPress={() => router.push('/add-insurance')}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={styles.quickActionEmoji}>🛡️</Text>
                </View>
                <Text style={styles.quickActionLabel}>Add Policy</Text>
              </Pressable>

              <Pressable style={styles.quickAction} onPress={() => router.push('/add-renewal')}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Text style={styles.quickActionEmoji}>📋</Text>
                </View>
                <Text style={styles.quickActionLabel}>Add Renewal</Text>
              </Pressable>

              <Pressable style={styles.quickAction} onPress={() => router.push('/family-members')}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Text style={styles.quickActionEmoji}>👨‍👩‍👧‍👦</Text>
                </View>
                <Text style={styles.quickActionLabel}>Family</Text>
              </Pressable>
            </ScrollView>
          </>
        )}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  workspaceName: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: 4,
  },
  notificationButton: {
    ...GlassStyle,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Demo Mode Banner
  demoBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: BorderRadius.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  demoBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  demoBannerIcon: {
    fontSize: 20,
  },
  demoBannerText: {
    flex: 1,
  },
  demoBannerTitle: {
    ...Typography.bodySm,
    color: '#fbbf24',
    fontFamily: 'Inter_600SemiBold',
  },
  demoBannerSubtitle: {
    ...Typography.caption,
    color: 'rgba(251, 191, 36, 0.8)',
    marginTop: 2,
  },

  // Empty State
  emptyStateContainer: {
    gap: 16,
  },
  welcomeCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['3xl'],
    padding: 28,
    alignItems: 'center',
    marginBottom: 8,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  welcomeTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyPillarCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emptyPillarIcon: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPillarEmoji: {
    fontSize: 24,
  },
  emptyPillarContent: {
    flex: 1,
  },
  emptyPillarTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  emptyPillarTagline: {
    fontSize: 11,
    color: Colors.primary,
    fontStyle: 'italic',
    marginTop: 1,
  },
  emptyPillarDesc: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  emptyPillarAction: {
    padding: 4,
  },
  // Demo Mode Card - Prominent
  demoCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: BorderRadius['2xl'],
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  demoCardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  demoCardEmoji: {
    fontSize: 28,
  },
  demoCardTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  demoCardSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  demoCardButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: BorderRadius.lg,
  },
  demoCardButtonText: {
    ...Typography.button,
    color: Colors.text,
  },

  // Data State
  alertCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['3xl'],
    padding: 24,
    marginBottom: 24,
  },
  alertCardAmber: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  alertCardRed: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  alertDotRed: {
    backgroundColor: Colors.danger,
  },
  alertLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.warning,
    textTransform: 'uppercase',
  },
  alertLabelRed: {
    color: Colors.danger,
  },
  alertTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.text,
    marginBottom: 4,
  },
  alertSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 12,
  },
  renewButton: {
    flex: 1,
    backgroundColor: Colors.text,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  renewButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
  },
  moreAlertsButton: {
    ...GlassStyle,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  moreAlertsText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 18,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryContent: {
    gap: 2,
  },
  summaryValue: {
    fontSize: 26,
    fontFamily: 'Inter_300Light',
    color: Colors.text,
  },
  summaryStatus: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontSize: 9,
    textTransform: 'none',
  },
  summaryStatusMuted: {
    ...Typography.label,
    color: Colors.textMuted,
    fontSize: 9,
    textTransform: 'none',
  },
  summaryWarning: {
    ...Typography.label,
    color: Colors.warning,
    fontSize: 9,
    marginTop: 4,
    textTransform: 'none',
  },
  renewalsCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 24,
  },
  renewalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  renewalsIcon: {
    fontSize: 24,
  },
  renewalsContent: {
    flex: 1,
  },
  renewalsTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  renewalsSubtitle: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickActions: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  quickAction: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});