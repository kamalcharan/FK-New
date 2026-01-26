// app/(tabs)/index.tsx
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';

// Dummy health insurance data for dashboard
const HEALTH_INSURANCE = [
  {
    id: '1',
    provider: 'HDFC Ergo',
    policyType: 'Family Floater',
    sumInsured: 1000000,
    members: ['Self', 'Spouse', '2 Children'],
    expiryDate: '15 Mar 2026',
    daysLeft: 48,
  },
  {
    id: '2',
    provider: 'Star Health',
    policyType: 'Senior Citizen',
    sumInsured: 500000,
    members: ['Father', 'Mother'],
    expiryDate: '20 Apr 2026',
    daysLeft: 84,
  },
];

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>The Sharma Vault</Text>
            <Text style={styles.status}>STATUS: ALL SECURED</Text>
          </View>
          <View style={styles.notificationButton}>
            <Text>🔔</Text>
          </View>
        </View>

        {/* Urgent Alert Card */}
        <View style={[styles.alertCard, styles.alertCardAmber]}>
          <View style={styles.alertHeader}>
            <View style={styles.alertDot} />
            <Text style={styles.alertLabel}>UPCOMING RENEWAL</Text>
          </View>
          <Text style={styles.alertTitle}>Car Insurance (HDFC)</Text>
          <Text style={styles.alertSubtitle}>Expires in 15 days. Renew now to avoid premium hikes.</Text>
          <View style={styles.alertActions}>
            <View style={styles.renewButton}>
              <Text style={styles.renewButtonText}>Renew Now</Text>
            </View>
            <View style={styles.snoozeButton}>
              <Text style={styles.snoozeButtonText}>Snooze</Text>
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>LOAN LEDGER</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryValue}>₹2.50L</Text>
              <Text style={styles.summaryStatus}>✓ 2 Verified</Text>
            </View>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>COMPLIANCES</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryValue}>04</Text>
              <Text style={styles.summaryStatusMuted}>All records valid</Text>
            </View>
          </View>
        </View>

        {/* Health Insurance Section */}
        <Text style={styles.sectionTitle}>HEALTH INSURANCE</Text>
        {HEALTH_INSURANCE.map(policy => (
          <Pressable key={policy.id} style={styles.insuranceCard} onPress={() => router.push('/vault')}>
            <View style={styles.insuranceHeader}>
              <View style={styles.insuranceIconContainer}>
                <Text style={styles.insuranceIcon}>🏥</Text>
              </View>
              <View style={styles.insuranceTitleArea}>
                <Text style={styles.insuranceProvider}>{policy.provider}</Text>
                <Text style={styles.insuranceType}>{policy.policyType}</Text>
              </View>
              {policy.daysLeft <= 60 ? (
                <View style={styles.expiryBadge}>
                  <Text style={styles.expiryText}>{policy.daysLeft}d left</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.insuranceDetails}>
              <View style={styles.insuranceRow}>
                <Text style={styles.insuranceLabel}>Sum Insured</Text>
                <Text style={styles.insuranceValue}>₹{(policy.sumInsured / 100000).toFixed(0)}L</Text>
              </View>
              <View style={styles.insuranceRow}>
                <Text style={styles.insuranceLabel}>Members</Text>
                <Text style={styles.insuranceValue}>{policy.members.length} covered</Text>
              </View>
            </View>
            <View style={styles.memberTags}>
              {policy.members.map((member, idx) => (
                <View key={idx} style={styles.memberTag}>
                  <Text style={styles.memberTagText}>{member}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        ))}

        {/* Emergency Access */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>FAMILY EMERGENCY ACCESS</Text>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.emergencyScroll}>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyIcon}>🚑</Text>
            <Text style={styles.emergencyLabel}>Health</Text>
          </View>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyIcon}>🏠</Text>
            <Text style={styles.emergencyLabel}>Property</Text>
          </View>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyIcon}>📜</Text>
            <Text style={styles.emergencyLabel}>Will/Legal</Text>
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    marginBottom: 32,
    marginTop: 16,
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
  },
  status: {
    ...Typography.label,
    color: Colors.textMuted,
    marginTop: 4,
  },
  notificationButton: {
    ...GlassStyle,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['3xl'],
    padding: 24,
    marginBottom: 32,
  },
  alertCardAmber: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
  },
  alertLabel: {
    ...Typography.label,
    color: Colors.warning,
  },
  alertTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  alertSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: 24,
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
    ...Typography.button,
    color: '#000',
  },
  snoozeButton: {
    ...GlassStyle,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  snoozeButtonText: {
    ...Typography.button,
    color: Colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  summaryCard: {
    flex: 1,
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  summaryContent: {
    gap: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'Inter_300Light',
    color: Colors.text,
  },
  summaryStatus: {
    ...Typography.label,
    color: Colors.success,
  },
  summaryStatusMuted: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'none',
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    marginBottom: 16,
    marginLeft: 4,
  },
  emergencyScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  emergencyCard: {
    ...GlassStyle,
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginRight: 16,
  },
  emergencyIcon: {
    fontSize: 24,
  },
  emergencyLabel: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  insuranceCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    marginBottom: 16,
  },
  insuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  insuranceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insuranceIcon: {
    fontSize: 20,
  },
  insuranceTitleArea: {
    flex: 1,
  },
  insuranceProvider: {
    ...Typography.h3,
    color: Colors.text,
  },
  insuranceType: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  expiryBadge: {
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  expiryText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.warning,
  },
  insuranceDetails: {
    gap: 8,
    marginBottom: 12,
  },
  insuranceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insuranceLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  insuranceValue: {
    ...Typography.body,
    color: Colors.text,
  },
  memberTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  memberTagText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
  },
});
