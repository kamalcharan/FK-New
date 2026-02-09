// app/(tabs)/index.tsx
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
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

// Urgency item type for unified attention section
type UrgencyItem = {
  id: string;
  title: string;
  subtitle: string;
  daysLeft: number;
  type: 'renewal' | 'policy';
  icon: string;
  color: string;
  route: string;
  routeParams?: Record<string, string>;
};

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
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Pulsing animation for urgent items
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // FAB rotation animation
  const toggleFabMenu = () => {
    const toValue = showFabMenu ? 0 : 1;
    Animated.spring(fabRotation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setShowFabMenu(!showFabMenu);
  };

  const fabRotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

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

  // Build unified urgency items from alerts
  const urgencyItems: UrgencyItem[] = alerts
    .filter(alert => alert.daysLeft <= 30) // Show items due within 30 days
    .map(alert => ({
      id: alert.id || `alert-${alert.title}`,
      title: alert.title,
      subtitle: alert.daysLeft <= 0
        ? `Overdue by ${Math.abs(alert.daysLeft)} days`
        : alert.daysLeft <= 7
        ? `Due in ${alert.daysLeft} day${alert.daysLeft !== 1 ? 's' : ''}`
        : `Due in ${alert.daysLeft} days`,
      daysLeft: alert.daysLeft,
      type: alert.type === 'renewal' ? 'renewal' : 'policy',
      icon: alert.type === 'renewal' ? '📅' : '🛡️',
      color: alert.daysLeft <= 0 ? Colors.danger : alert.daysLeft <= 7 ? Colors.warning : Colors.primary,
      route: alert.type === 'renewal' ? '/renewal-detail' : '/policy-detail',
      routeParams: { id: alert.id || '' },
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft); // Sort by urgency

  const overdueCount = urgencyItems.filter(item => item.daysLeft <= 0).length;
  const urgentCount = urgencyItems.filter(item => item.daysLeft > 0 && item.daysLeft <= 7).length;
  const totalAttentionCount = overdueCount + urgentCount;

  // Calculate family finances summary
  const familyFinances = {
    moneyGiven: stats?.total_loans_given || 0,
    moneyTaken: stats?.total_loans_taken || 0,
    netPosition: (stats?.total_loans_given || 0) - (stats?.total_loans_taken || 0),
    activePolicies: stats?.active_policies || 0,
    pendingVerifications: stats?.pending_verification || 0,
  };

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
{/* Notification button hidden - not implemented yet */}
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

            {/* Needs Attention Section */}
            {totalAttentionCount > 0 && (
              <View style={styles.attentionSection}>
                <View style={styles.attentionHeader}>
                  <View style={styles.attentionTitleRow}>
                    <Text style={styles.attentionTitle}>Needs Attention</Text>
                    <View style={styles.attentionBadge}>
                      <Text style={styles.attentionBadgeText}>{totalAttentionCount}</Text>
                    </View>
                  </View>
                  {overdueCount > 0 && (
                    <Text style={styles.attentionOverdueText}>
                      {overdueCount} overdue
                    </Text>
                  )}
                </View>

                {/* Urgency Items List */}
                {urgencyItems.slice(0, 3).map((item, index) => (
                  <Animated.View
                    key={item.id}
                    style={[
                      styles.urgencyItem,
                      item.daysLeft <= 0 && { transform: [{ scale: pulseAnim }] },
                      item.daysLeft <= 0 && styles.urgencyItemOverdue,
                      item.daysLeft > 0 && item.daysLeft <= 7 && styles.urgencyItemUrgent,
                    ]}
                  >
                    <Pressable
                      style={styles.urgencyItemContent}
                      onPress={() => router.push({ pathname: item.route as any, params: item.routeParams })}
                    >
                      <View style={[styles.urgencyItemIcon, { backgroundColor: `${item.color}20` }]}>
                        <Text style={styles.urgencyItemEmoji}>{item.icon}</Text>
                      </View>
                      <View style={styles.urgencyItemText}>
                        <Text style={styles.urgencyItemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.urgencyItemSubtitle, { color: item.color }]}>
                          {item.subtitle}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.urgencyActionButton, { backgroundColor: item.color }]}
                        onPress={() => router.push({
                          pathname: item.route as any,
                          params: { ...item.routeParams, action: 'renew' }
                        })}
                      >
                        <Text style={styles.urgencyActionText}>
                          {item.daysLeft <= 0 ? 'Fix Now' : 'Renew'}
                        </Text>
                      </Pressable>
                    </Pressable>
                  </Animated.View>
                ))}

                {/* See All Button */}
                {urgencyItems.length > 3 && (
                  <Pressable
                    style={styles.seeAllButton}
                    onPress={() => router.push('/renewals')}
                  >
                    <Text style={styles.seeAllText}>
                      See all {urgencyItems.length} items
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                  </Pressable>
                )}
              </View>
            )}

            {/* Family Finances Snapshot */}
            <View style={styles.financeCard}>
              <Text style={styles.financeCardTitle}>Family Finances</Text>

              <View style={styles.financeGrid}>
                {/* Net Position */}
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Net Position</Text>
                  <Text style={[
                    styles.financeValue,
                    familyFinances.netPosition >= 0 ? styles.financeValuePositive : styles.financeValueNegative
                  ]}>
                    {familyFinances.netPosition >= 0 ? '+' : ''}{formatCurrency(familyFinances.netPosition)}
                  </Text>
                  <Text style={styles.financeSubtext}>
                    {formatCurrency(familyFinances.moneyGiven)} given • {formatCurrency(familyFinances.moneyTaken)} taken
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.financeDivider} />

                {/* Insurance Coverage */}
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>Protection</Text>
                  <Text style={styles.financeValue}>
                    {familyFinances.activePolicies} Policies
                  </Text>
                  <Text style={styles.financeSubtext}>
                    {(stats?.expiring_soon_policies || 0) > 0
                      ? `${stats?.expiring_soon_policies} expiring soon`
                      : 'All policies active'
                    }
                  </Text>
                </View>
              </View>

              {/* Quick Stats Row */}
              <View style={styles.financeStatsRow}>
                <Pressable style={styles.financeStat} onPress={() => router.push('/(tabs)/loans')}>
                  <View style={[styles.financeStatIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Text style={styles.financeStatEmoji}>💰</Text>
                  </View>
                  <View style={styles.financeStatText}>
                    <Text style={styles.financeStatValue}>
                      {(stats?.loans_given_count || 0) + (stats?.loans_taken_count || 0)}
                    </Text>
                    <Text style={styles.financeStatLabel}>Active Loans</Text>
                  </View>
                  {familyFinances.pendingVerifications > 0 && (
                    <View style={styles.financeStatBadge}>
                      <Text style={styles.financeStatBadgeText}>{familyFinances.pendingVerifications}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={styles.financeStat} onPress={() => router.push('/renewals')}>
                  <View style={[styles.financeStatIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                    <Text style={styles.financeStatEmoji}>📅</Text>
                  </View>
                  <View style={styles.financeStatText}>
                    <Text style={styles.financeStatValue}>
                      {stats?.upcoming_renewals || 0}
                    </Text>
                    <Text style={styles.financeStatLabel}>Upcoming Renewals</Text>
                  </View>
                  {(stats?.overdue_renewals || 0) > 0 && (
                    <View style={[styles.financeStatBadge, { backgroundColor: Colors.danger }]}>
                      <Text style={styles.financeStatBadgeText}>{stats?.overdue_renewals}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Pillar Cards Grid */}
            <Text style={styles.sectionTitle}>YOUR PILLARS</Text>
            <View style={styles.pillarGrid}>
              <Pressable style={styles.pillarCard} onPress={() => router.push('/(tabs)/loans')}>
                <View style={[styles.pillarIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Text style={styles.pillarEmoji}>💰</Text>
                </View>
                <Text style={styles.pillarTitle}>Loan Ledger</Text>
                <Text style={styles.pillarValue}>{formatCurrency(stats?.total_loans_given || 0)}</Text>
                <Text style={styles.pillarSubtext}>
                  {stats?.loans_given_count || 0}G • {stats?.loans_taken_count || 0}T
                </Text>
              </Pressable>

              <Pressable style={styles.pillarCard} onPress={() => router.push('/vault')}>
                <View style={[styles.pillarIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={styles.pillarEmoji}>🛡️</Text>
                </View>
                <Text style={styles.pillarTitle}>Insurance</Text>
                <Text style={styles.pillarValue}>{stats?.active_policies || 0}</Text>
                <Text style={styles.pillarSubtext}>Active policies</Text>
              </Pressable>

              <Pressable style={styles.pillarCard} onPress={() => router.push('/renewals')}>
                <View style={[styles.pillarIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Text style={styles.pillarEmoji}>📅</Text>
                </View>
                <Text style={styles.pillarTitle}>Renewals</Text>
                <Text style={styles.pillarValue}>{stats?.upcoming_renewals || 0}</Text>
                <Text style={styles.pillarSubtext}>
                  {(stats?.overdue_renewals || 0) > 0 ? `${stats?.overdue_renewals} overdue` : 'On track'}
                </Text>
              </Pressable>

              <Pressable style={styles.pillarCard} onPress={() => router.push('/family-members')}>
                <View style={[styles.pillarIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Text style={styles.pillarEmoji}>👨‍👩‍👧‍👦</Text>
                </View>
                <Text style={styles.pillarTitle}>Family</Text>
                <Text style={styles.pillarValue}>{currentWorkspace?.member_count || 1}</Text>
                <Text style={styles.pillarSubtext}>Members</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {hasData && (
        <>
          {/* FAB Menu Overlay */}
          {showFabMenu && (
            <Pressable style={styles.fabOverlay} onPress={toggleFabMenu}>
              <Animated.View style={[styles.fabMenuContainer]}>
                <Pressable
                  style={styles.fabMenuItem}
                  onPress={() => {
                    toggleFabMenu();
                    router.push({ pathname: '/add-loan', params: { type: 'given' } });
                  }}
                >
                  <View style={[styles.fabMenuIcon, { backgroundColor: 'rgba(99, 102, 241, 0.2)' }]}>
                    <Text style={styles.fabMenuEmoji}>💸</Text>
                  </View>
                  <Text style={styles.fabMenuLabel}>Record Loan</Text>
                </Pressable>

                <Pressable
                  style={styles.fabMenuItem}
                  onPress={() => {
                    toggleFabMenu();
                    router.push('/add-insurance');
                  }}
                >
                  <View style={[styles.fabMenuIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                    <Text style={styles.fabMenuEmoji}>🛡️</Text>
                  </View>
                  <Text style={styles.fabMenuLabel}>Add Policy</Text>
                </Pressable>

                <Pressable
                  style={styles.fabMenuItem}
                  onPress={() => {
                    toggleFabMenu();
                    router.push('/add-renewal');
                  }}
                >
                  <View style={[styles.fabMenuIcon, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                    <Text style={styles.fabMenuEmoji}>📅</Text>
                  </View>
                  <Text style={styles.fabMenuLabel}>Add Renewal</Text>
                </Pressable>
              </Animated.View>
            </Pressable>
          )}

          {/* FAB Button */}
          <Pressable style={styles.fab} onPress={toggleFabMenu}>
            <Animated.View style={{ transform: [{ rotate: fabRotateInterpolate }] }}>
              <Ionicons name="add" size={28} color={Colors.text} />
            </Animated.View>
          </Pressable>
        </>
      )}
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

  // Needs Attention Section
  attentionSection: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 16,
    marginBottom: 20,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  attentionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attentionTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontSize: 16,
  },
  attentionBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  attentionBadgeText: {
    color: Colors.text,
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  attentionOverdueText: {
    ...Typography.caption,
    color: Colors.danger,
  },

  // Urgency Items
  urgencyItem: {
    marginBottom: 10,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  urgencyItemOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  urgencyItemUrgent: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  urgencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  urgencyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyItemEmoji: {
    fontSize: 18,
  },
  urgencyItemText: {
    flex: 1,
  },
  urgencyItemTitle: {
    ...Typography.body,
    color: Colors.text,
    fontSize: 14,
  },
  urgencyItemSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  urgencyActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  urgencyActionText: {
    color: Colors.text,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    gap: 4,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },

  // Family Finances Card
  financeCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 18,
    marginBottom: 20,
  },
  financeCardTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: 14,
    letterSpacing: 1.2,
  },
  financeGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  financeItem: {
    flex: 1,
    paddingVertical: 4,
  },
  financeLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  financeValue: {
    fontSize: 22,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
    marginBottom: 4,
  },
  financeValuePositive: {
    color: '#22c55e',
  },
  financeValueNegative: {
    color: Colors.danger,
  },
  financeSubtext: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  financeDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: 16,
  },
  financeStatsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  financeStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: BorderRadius.lg,
  },
  financeStatIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeStatEmoji: {
    fontSize: 16,
  },
  financeStatText: {
    flex: 1,
  },
  financeStatValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  financeStatLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 9,
  },
  financeStatBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  financeStatBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },

  // Pillar Cards Grid
  pillarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pillarCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius.xl,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pillarEmoji: {
    fontSize: 20,
  },
  pillarTitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pillarValue: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 2,
  },
  pillarSubtext: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 10,
  },

  // FAB (Floating Action Button)
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingBottom: 170,
    paddingRight: 24,
  },
  fabMenuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 8,
    minWidth: 180,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: BorderRadius.md,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuEmoji: {
    fontSize: 18,
  },
  fabMenuLabel: {
    ...Typography.body,
    color: Colors.text,
    fontSize: 14,
  },
});