// app/(tabs)/loans.tsx
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';

const DUMMY_LOANS = [
  {
    id: '1',
    type: 'given',
    counterparty: 'Ramesh Kumar',
    amount: 50000,
    date: '15 Jan 2026',
    status: 'verified',
    repaid: 0,
  },
  {
    id: '2',
    type: 'given',
    counterparty: 'Suresh Patel',
    amount: 25000,
    date: '02 Dec 2025',
    status: 'pending',
    repaid: 10000,
  },
  {
    id: '3',
    type: 'taken',
    counterparty: 'State Bank of India',
    amount: 500000,
    date: '10 Aug 2024',
    status: 'verified',
    repaid: 175000,
  },
];

export default function LoansScreen() {
  const givenLoans = DUMMY_LOANS.filter(l => l.type === 'given');
  const takenLoans = DUMMY_LOANS.filter(l => l.type === 'taken');

  const totalGiven = givenLoans.reduce((sum, l) => sum + l.amount - l.repaid, 0);
  const totalTaken = takenLoans.reduce((sum, l) => sum + l.amount - l.repaid, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Loan Ledger</Text>
        <Text style={styles.subtitle}>Track every rupee, digitally handshaked</Text>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.givenCard]}>
            <Text style={styles.summaryLabel}>GIVEN</Text>
            <Text style={styles.summaryAmount}>₹{(totalGiven / 1000).toFixed(0)}K</Text>
            <Text style={styles.summaryCount}>{givenLoans.length} active</Text>
          </View>
          <View style={[styles.summaryCard, styles.takenCard]}>
            <Text style={styles.summaryLabel}>TAKEN</Text>
            <Text style={styles.summaryAmount}>₹{(totalTaken / 1000).toFixed(0)}K</Text>
            <Text style={styles.summaryCount}>{takenLoans.length} active</Text>
          </View>
        </View>

        {/* Loans Given */}
        <Text style={styles.sectionTitle}>LOANS GIVEN</Text>
        {givenLoans.map(loan => (
          <Pressable key={loan.id} style={styles.loanCard}>
            <View style={styles.loanHeader}>
              <Text style={styles.loanName}>{loan.counterparty}</Text>
              <View style={[styles.statusBadge, loan.status === 'verified' ? styles.verifiedBadge : styles.pendingBadge]}>
                <Text style={[styles.statusText, loan.status === 'verified' ? styles.verifiedText : styles.pendingText]}>
                  {loan.status === 'verified' ? '✓ Verified' : '⏳ Pending OTP'}
                </Text>
              </View>
            </View>
            <View style={styles.loanDetails}>
              <View>
                <Text style={styles.loanAmount}>₹{loan.amount.toLocaleString()}</Text>
                <Text style={styles.loanDate}>{loan.date}</Text>
              </View>
              {loan.repaid > 0 ? (
                <View style={styles.repaidContainer}>
                  <Text style={styles.repaidLabel}>Repaid</Text>
                  <Text style={styles.repaidAmount}>₹{loan.repaid.toLocaleString()}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}

        {/* Loans Taken */}
        <Text style={styles.sectionTitle}>LOANS TAKEN</Text>
        {takenLoans.map(loan => (
          <Pressable key={loan.id} style={styles.loanCard}>
            <View style={styles.loanHeader}>
              <Text style={styles.loanName}>{loan.counterparty}</Text>
              <View style={[styles.statusBadge, styles.verifiedBadge]}>
                <Text style={[styles.statusText, styles.verifiedText]}>✓ Verified</Text>
              </View>
            </View>
            <View style={styles.loanDetails}>
              <View>
                <Text style={styles.loanAmount}>₹{loan.amount.toLocaleString()}</Text>
                <Text style={styles.loanDate}>{loan.date}</Text>
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{Math.round((loan.repaid / loan.amount) * 100)}% paid</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${(loan.repaid / loan.amount) * 100}%` }]} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  title: { ...Typography.h1, color: Colors.text, marginBottom: 4 },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  summaryCard: { flex: 1, ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20 },
  givenCard: { borderColor: Colors.successBorder },
  takenCard: { borderColor: Colors.warningBorder },
  summaryLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  summaryAmount: { fontSize: 28, fontFamily: 'Inter_300Light', color: Colors.text, marginBottom: 4 },
  summaryCount: { ...Typography.bodySm, color: Colors.textSecondary },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 16, marginTop: 8 },
  loanCard: { ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20, marginBottom: 16 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  loanName: { ...Typography.h3, color: Colors.text },
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
});
