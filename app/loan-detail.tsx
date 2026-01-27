// app/loan-detail.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, MoreVertical } from 'lucide-react-native';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';
import { useAppSelector } from '../src/hooks/useStore';
import { getLoanById, createLoanVerification, isSupabaseReady } from '../src/lib/supabase';
import { showSuccessToast, showErrorToast } from '../src/components/ToastConfig';

interface LoanDetail {
  id: string;
  loan_type: 'given' | 'taken';
  counterparty_name: string;
  counterparty_phone: string | null;
  counterparty_email: string | null;
  principal_amount: number;
  amount_repaid: number;
  loan_date: string;
  due_date: string | null;
  status: string;
  verification_status: string;
  verification_code: string | null;
  purpose: string | null;
  notes: string | null;
  currency: string;
  is_historical: boolean;
  is_demo: boolean;
  created_at: string;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const symbols: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };
  const symbol = symbols[currency] || '₹';
  return `${symbol}${amount.toLocaleString('en-IN')}`;
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'verified':
      return { label: 'Verified', emoji: '✓', color: Colors.success, bg: Colors.successMuted };
    case 'historical':
      return { label: 'Historical', emoji: '📜', color: '#64748b', bg: 'rgba(100, 116, 139, 0.2)' };
    case 'expired':
      return { label: 'Expired', emoji: '⏰', color: Colors.danger, bg: 'rgba(239, 68, 68, 0.15)' };
    default:
      return { label: 'Pending', emoji: '⏳', color: Colors.pending, bg: Colors.pendingMuted };
  }
};

export default function LoanDetailScreen() {
  const router = useRouter();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const { user } = useAppSelector(state => state.auth);

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    loadLoan();
  }, [loanId]);

  const loadLoan = async () => {
    if (!loanId || !isSupabaseReady()) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getLoanById(loanId);
      setLoan(data);
    } catch (err) {
      console.error('Error loading loan:', err);
      showErrorToast('Error', 'Could not load loan details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareVerification = async () => {
    if (!loan || !user?.id) return;

    setIsSharing(true);
    try {
      let verificationCode = loan.verification_code;

      // Generate new code if none exists
      if (!verificationCode) {
        const result = await createLoanVerification(loan.id, user.id);
        if (result.success && result.verification_code) {
          verificationCode = result.verification_code;
        } else {
          showErrorToast('Error', 'Could not generate verification code');
          return;
        }
      }

      const shareMessage = `Hi ${loan.counterparty_name},

I've recorded a loan in FamilyKnows app:

Amount: ${formatCurrency(loan.principal_amount, loan.currency)}
Date: ${formatDate(loan.loan_date)}
Type: ${loan.loan_type === 'given' ? 'Loan Given' : 'Loan Taken'}

Please verify this transaction using the link below:
https://familyknows.in/v/${verificationCode}

Or enter code: ${verificationCode} at https://familyknows.in/verify

This creates a trusted digital handshake between us.

- ${user.user_metadata?.full_name || 'Your friend'}`;

      const result = await Share.share({
        message: shareMessage,
        title: 'Verify Loan - FamilyKnows',
      });

      if (result.action === Share.sharedAction) {
        showSuccessToast('Shared!', 'Verification request sent');
        loadLoan(); // Refresh to show updated status
      }
    } catch (err) {
      console.error('Share error:', err);
      showErrorToast('Error', 'Could not share verification');
    } finally {
      setIsSharing(false);
    }
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

  if (!loan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Loan Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loan not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(loan.verification_status);
  const isGiven = loan.loan_type === 'given';
  const outstanding = loan.principal_amount - loan.amount_repaid;
  const canShare = !loan.is_historical && loan.verification_status !== 'verified' && loan.counterparty_phone;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Loan Details</Text>
          <Pressable style={styles.moreButton}>
            <MoreVertical size={20} color={Colors.textMuted} />
          </Pressable>
        </View>

        {/* Demo Tag */}
        {loan.is_demo && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoText}>✨ DEMO DATA</Text>
          </View>
        )}

        {/* Main Card */}
        <View style={[styles.mainCard, isGiven ? styles.givenCard : styles.takenCard]}>
          <View style={styles.typeRow}>
            <Text style={styles.typeEmoji}>{isGiven ? '💸' : '🙏'}</Text>
            <Text style={styles.typeLabel}>
              {isGiven ? 'Loan Given to' : 'Loan Taken from'}
            </Text>
          </View>
          <Text style={styles.counterpartyName}>{loan.counterparty_name}</Text>
          {loan.counterparty_phone && (
            <Text style={styles.counterpartyPhone}>{loan.counterparty_phone}</Text>
          )}

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amount}>{formatCurrency(loan.principal_amount, loan.currency)}</Text>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.emoji} {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>DETAILS</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(loan.loan_date)}</Text>
          </View>

          {loan.due_date && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(loan.due_date)}</Text>
            </View>
          )}

          {loan.purpose && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Purpose</Text>
              <Text style={styles.detailValue}>{loan.purpose}</Text>
            </View>
          )}

          {loan.amount_repaid > 0 && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Repaid</Text>
                <Text style={[styles.detailValue, { color: Colors.success }]}>
                  {formatCurrency(loan.amount_repaid, loan.currency)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Outstanding</Text>
                <Text style={[styles.detailValue, { color: Colors.warning }]}>
                  {formatCurrency(outstanding, loan.currency)}
                </Text>
              </View>
            </>
          )}

          {loan.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesText}>{loan.notes}</Text>
            </View>
          )}
        </View>

        {/* Verification Status Card */}
        {!loan.is_historical && (
          <View style={styles.verificationCard}>
            <Text style={styles.sectionTitle}>VERIFICATION</Text>

            {loan.verification_status === 'verified' ? (
              <View style={styles.verifiedContainer}>
                <Text style={styles.verifiedEmoji}>✅</Text>
                <Text style={styles.verifiedTitle}>Digitally Verified</Text>
                <Text style={styles.verifiedDesc}>
                  Both parties have confirmed this transaction
                </Text>
              </View>
            ) : loan.verification_status === 'pending' ? (
              <View style={styles.pendingContainer}>
                <Text style={styles.pendingEmoji}>⏳</Text>
                <Text style={styles.pendingTitle}>Awaiting Verification</Text>
                <Text style={styles.pendingDesc}>
                  {loan.verification_code
                    ? `Verification code: ${loan.verification_code}`
                    : 'Share with counterparty to verify'}
                </Text>
              </View>
            ) : null}

            {canShare && (
              <Pressable
                style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
                onPress={handleShareVerification}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Share2 size={18} color="#000" />
                    <Text style={styles.shareButtonText}>
                      {loan.verification_code ? 'Re-share via WhatsApp' : 'Share for Verification'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Record Payment</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { ...GlassStyle, width: 44, height: 44, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.h2, color: Colors.text },
  moreButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 44 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { ...Typography.body, color: Colors.textMuted, marginBottom: 16 },
  backLink: { padding: 12 },
  backLinkText: { ...Typography.body, color: Colors.primary },

  demoBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  demoText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#fbbf24', letterSpacing: 1 },

  mainCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['3xl'],
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  givenCard: { borderColor: Colors.successBorder },
  takenCard: { borderColor: Colors.warningBorder },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeEmoji: { fontSize: 20 },
  typeLabel: { ...Typography.bodySm, color: Colors.textMuted },
  counterpartyName: { ...Typography.h1, color: Colors.text, marginBottom: 4, textAlign: 'center' },
  counterpartyPhone: { ...Typography.bodySm, color: Colors.textMuted, marginBottom: 20 },
  amountContainer: { alignItems: 'center', marginBottom: 20 },
  amountLabel: { ...Typography.bodySm, color: Colors.textMuted, marginBottom: 4 },
  amount: { fontSize: 36, fontFamily: 'Inter_300Light', color: Colors.text },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full },
  statusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },

  detailsCard: { ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { ...Typography.bodySm, color: Colors.textMuted },
  detailValue: { ...Typography.body, color: Colors.text },
  notesContainer: { paddingTop: 12 },
  notesText: { ...Typography.body, color: Colors.textSecondary, marginTop: 8, lineHeight: 22 },

  verificationCard: { ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20, marginBottom: 20 },
  verifiedContainer: { alignItems: 'center', paddingVertical: 16 },
  verifiedEmoji: { fontSize: 40, marginBottom: 12 },
  verifiedTitle: { ...Typography.h3, color: Colors.success, marginBottom: 4 },
  verifiedDesc: { ...Typography.bodySm, color: Colors.textMuted, textAlign: 'center' },
  pendingContainer: { alignItems: 'center', paddingVertical: 16 },
  pendingEmoji: { fontSize: 40, marginBottom: 12 },
  pendingTitle: { ...Typography.h3, color: Colors.pending, marginBottom: 4 },
  pendingDesc: { ...Typography.bodySm, color: Colors.textMuted, textAlign: 'center' },
  shareButton: {
    backgroundColor: Colors.text,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  shareButtonDisabled: { opacity: 0.6 },
  shareButtonText: { ...Typography.button, color: '#000' },

  actionsContainer: { marginTop: 8 },
  actionButton: {
    ...GlassStyle,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  actionButtonText: { ...Typography.button, color: Colors.text },
});
