// app/(tabs)/loans.tsx
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';
import { useAppSelector } from '../../src/hooks/useStore';
import { getLoans, isSupabaseReady } from '../../src/lib/supabase';

interface Loan {
  id: string;
  loan_type: 'given' | 'taken';
  counterparty_name: string;
  counterparty_phone: string | null;
  principal_amount: number;
  amount_repaid: number;
  loan_date: string;
  due_date: string | null;
  status: string;
  verification_status: string;
  purpose: string | null;
  is_demo: boolean;
}

// Format date to readable string
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format currency
const formatCurrency = (amount: number): string => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export default function LoansScreen() {
  const router = useRouter();
  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const { user } = useAppSelector(state => state.auth);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  const loadLoans = useCallback(async () => {
    if (!currentWorkspace?.id || !isSupabaseReady()) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getLoans(currentWorkspace.id);
      setLoans(data || []);
    } catch (err) {
      console.error('Error loading loans:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  }, [loadLoans]);

  const handleAddLoan = (type: 'given' | 'taken') => {
    // Check if user has seen intro
    if (!hasSeenIntro && loans.length === 0) {
      router.push('/loan-intro');
      setHasSeenIntro(true);
    } else {
      router.push({ pathname: '/add-loan', params: { type } });
    }
  };

  const handleLoanPress = (loan: Loan) => {
    router.push({ pathname: '/loan-detail', params: { loanId: loan.id } });
  };

  // Filter active loans
  const activeLoans = loans.filter(l => l.status !== 'settled');
  const givenLoans = activeLoans.filter(l => l.loan_type === 'given');
  const takenLoans = activeLoans.filter(l => l.loan_type === 'taken');

  const totalGiven = givenLoans.reduce((sum, l) => sum + (l.principal_amount - l.amount_repaid), 0);
  const totalTaken = takenLoans.reduce((sum, l) => sum + (l.principal_amount - l.amount_repaid), 0);

  const hasData = loans.length > 0;

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <Text style={styles.title}>Loan Ledger</Text>
        <Text style={styles.subtitle}>Every rupee has a story</Text>

        {!hasData ? (
          /* Empty State */
          <View style={styles.emptyStateContainer}>
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeEmoji}>🤝</Text>
              <Text style={styles.welcomeTitle}>No loans yet</Text>
              <Text style={styles.welcomeSubtitle}>
                Track money given and taken with digital verification.
                Both parties confirm, creating an undeniable record.
              </Text>
            </View>

            {/* How it Works Card */}
            <Pressable style={styles.howItWorksCard} onPress={() => router.push('/loan-intro')}>
              <View style={styles.howItWorksContent}>
                <Text style={styles.howItWorksIcon}>💡</Text>
                <View style={styles.howItWorksText}>
                  <Text style={styles.howItWorksTitle}>How does it work?</Text>
                  <Text style={styles.howItWorksSubtitle}>Learn about digital handshake verification</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            {/* Action Cards */}
            <Text style={styles.sectionTitle}>GET STARTED</Text>

            <Pressable style={[styles.actionCard, styles.givenActionCard]} onPress={() => handleAddLoan('given')}>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionEmoji}>💸</Text>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>Record Loan Given</Text>
                  <Text style={styles.actionSubtitle}>Money you've lent to someone</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable style={[styles.actionCard, styles.takenActionCard]} onPress={() => handleAddLoan('taken')}>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionEmoji}>🙏</Text>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>Record Loan Taken</Text>
                  <Text style={styles.actionSubtitle}>Money you've borrowed</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            {/* Trust Note */}
            <View style={styles.trustNote}>
              <Text style={styles.trustNoteText}>
                "In family finances, clarity builds trust. Every recorded loan becomes
                a promise both parties remember the same way."
              </Text>
            </View>
          </View>
        ) : (
          /* Data State */
          <>
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <Pressable style={[styles.summaryCard, styles.givenCard]} onPress={() => handleAddLoan('given')}>
                <Text style={styles.summaryLabel}>GIVEN</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(totalGiven)}</Text>
                <Text style={styles.summaryCount}>{givenLoans.length} active</Text>
              </Pressable>
              <Pressable style={[styles.summaryCard, styles.takenCard]} onPress={() => handleAddLoan('taken')}>
                <Text style={styles.summaryLabel}>TAKEN</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(totalTaken)}</Text>
                <Text style={styles.summaryCount}>{takenLoans.length} active</Text>
              </Pressable>
            </View>

            {/* Loans Given */}
            {givenLoans.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>LOANS GIVEN</Text>
                {givenLoans.map(loan => (
                  <Pressable key={loan.id} style={styles.loanCard} onPress={() => handleLoanPress(loan)}>
                    <View style={styles.loanHeader}>
                      <View>
                        <Text style={styles.loanName}>{loan.counterparty_name}</Text>
                        {loan.is_demo && <Text style={styles.demoTag}>DEMO</Text>}
                      </View>
                      <View style={[
                        styles.statusBadge,
                        loan.verification_status === 'verified' ? styles.verifiedBadge : styles.pendingBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          loan.verification_status === 'verified' ? styles.verifiedText : styles.pendingText
                        ]}>
                          {loan.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.loanDetails}>
                      <View>
                        <Text style={styles.loanAmount}>₹{loan.principal_amount.toLocaleString('en-IN')}</Text>
                        <Text style={styles.loanDate}>{formatDate(loan.loan_date)}</Text>
                      </View>
                      {loan.amount_repaid > 0 && (
                        <View style={styles.repaidContainer}>
                          <Text style={styles.repaidLabel}>Repaid</Text>
                          <Text style={styles.repaidAmount}>₹{loan.amount_repaid.toLocaleString('en-IN')}</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {/* Loans Taken */}
            {takenLoans.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>LOANS TAKEN</Text>
                {takenLoans.map(loan => (
                  <Pressable key={loan.id} style={styles.loanCard} onPress={() => handleLoanPress(loan)}>
                    <View style={styles.loanHeader}>
                      <View>
                        <Text style={styles.loanName}>{loan.counterparty_name}</Text>
                        {loan.is_demo && <Text style={styles.demoTag}>DEMO</Text>}
                      </View>
                      <View style={[
                        styles.statusBadge,
                        loan.verification_status === 'verified' ? styles.verifiedBadge : styles.pendingBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          loan.verification_status === 'verified' ? styles.verifiedText : styles.pendingText
                        ]}>
                          {loan.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.loanDetails}>
                      <View>
                        <Text style={styles.loanAmount}>₹{loan.principal_amount.toLocaleString('en-IN')}</Text>
                        <Text style={styles.loanDate}>{formatDate(loan.loan_date)}</Text>
                      </View>
                      <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>
                          {Math.round((loan.amount_repaid / loan.principal_amount) * 100)}% paid
                        </Text>
                        <View style={styles.progressBar}>
                          <View style={[
                            styles.progressFill,
                            { width: `${(loan.amount_repaid / loan.principal_amount) * 100}%` }
                          ]} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {/* Quick Add Buttons */}
            <View style={styles.quickAddRow}>
              <Pressable style={[styles.quickAddButton, styles.quickAddGiven]} onPress={() => handleAddLoan('given')}>
                <Text style={styles.quickAddText}>+ Loan Given</Text>
              </Pressable>
              <Pressable style={[styles.quickAddButton, styles.quickAddTaken]} onPress={() => handleAddLoan('taken')}>
                <Text style={styles.quickAddText}>+ Loan Taken</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  title: { ...Typography.h1, color: Colors.text, marginBottom: 4 },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: 24, fontStyle: 'italic' },

  // Empty State
  emptyStateContainer: { gap: 16 },
  welcomeCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['3xl'],
    padding: 28,
    alignItems: 'center',
    marginBottom: 8,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  welcomeEmoji: { fontSize: 48, marginBottom: 16 },
  welcomeTitle: { ...Typography.h2, color: Colors.text, textAlign: 'center', marginBottom: 8 },
  welcomeSubtitle: { ...Typography.bodySm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  howItWorksCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: 'rgba(251, 191, 36, 0.3)',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
  },
  howItWorksContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  howItWorksIcon: { fontSize: 24 },
  howItWorksText: { flex: 1 },
  howItWorksTitle: { ...Typography.body, color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  howItWorksSubtitle: { ...Typography.bodySm, color: Colors.textMuted, marginTop: 2 },

  actionCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  givenActionCard: { borderColor: Colors.successBorder },
  takenActionCard: { borderColor: Colors.warningBorder },
  actionCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  actionEmoji: { fontSize: 24 },
  actionText: { flex: 1 },
  actionTitle: { ...Typography.body, color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  actionSubtitle: { ...Typography.bodySm, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 24, color: Colors.textMuted },

  trustNote: {
    padding: 20,
    marginTop: 8,
  },
  trustNoteText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Data State
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 8,
  },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  summaryCard: { flex: 1, ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20 },
  givenCard: { borderColor: Colors.successBorder },
  takenCard: { borderColor: Colors.warningBorder },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  summaryAmount: { fontSize: 28, fontFamily: 'Inter_300Light', color: Colors.text, marginBottom: 4 },
  summaryCount: { ...Typography.bodySm, color: Colors.textSecondary },

  loanCard: { ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20, marginBottom: 16 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  loanName: { ...Typography.h3, color: Colors.text },
  demoTag: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: '#fbbf24',
    letterSpacing: 1,
    marginTop: 4,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  verifiedBadge: { backgroundColor: Colors.successMuted },
  pendingBadge: { backgroundColor: Colors.pendingMuted },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  verifiedText: { color: Colors.success },
  pendingText: { color: Colors.pending },
  loanDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  loanAmount: { fontSize: 24, fontFamily: 'Inter_300Light', color: Colors.text },
  loanDate: { ...Typography.bodySm, color: Colors.textMuted, marginTop: 4 },
  repaidContainer: { alignItems: 'flex-end' },
  repaidLabel: { ...Typography.bodySm, color: Colors.textMuted },
  repaidAmount: { ...Typography.body, color: Colors.success },
  progressContainer: { alignItems: 'flex-end', width: 100 },
  progressText: { ...Typography.bodySm, color: Colors.textMuted, marginBottom: 4 },
  progressBar: { width: '100%', height: 4, backgroundColor: Colors.surface, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: Colors.success, borderRadius: 2 },

  quickAddRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickAddButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  quickAddGiven: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: Colors.successBorder,
  },
  quickAddTaken: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: Colors.warningBorder,
  },
  quickAddText: {
    ...Typography.bodySm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
});
