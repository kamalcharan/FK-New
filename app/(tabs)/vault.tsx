// app/(tabs)/vault.tsx
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';

const DUMMY_INSURANCE = [
  {
    id: '1',
    type: 'health',
    icon: '🏥',
    provider: 'HDFC Ergo',
    policyNumber: 'HE-2024-78542',
    insured: 'Family Floater',
    sumInsured: 1000000,
    premium: 24000,
    expiryDate: '15 Mar 2026',
    daysLeft: 48,
  },
  {
    id: '2',
    type: 'vehicle',
    icon: '🚗',
    provider: 'ICICI Lombard',
    policyNumber: 'VH-2025-12345',
    insured: 'Honda City (TS09-XX-1234)',
    sumInsured: 800000,
    premium: 18500,
    expiryDate: '10 Feb 2026',
    daysLeft: 15,
  },
  {
    id: '3',
    type: 'life',
    icon: '🕊️',
    provider: 'LIC',
    policyNumber: 'LIC-2020-987654',
    insured: 'Rajesh Sharma',
    sumInsured: 5000000,
    premium: 45000,
    expiryDate: '01 Jan 2030',
    daysLeft: 1436,
  },
];

const DUMMY_RENEWALS = [
  {
    id: '1',
    type: 'property_tax',
    icon: '🏠',
    title: 'GHMC Property Tax',
    property: 'Flat 301, Green Valley Apt',
    dueDate: '31 Mar 2026',
    amount: 12500,
    daysLeft: 64,
  },
  {
    id: '2',
    type: 'fire_noc',
    icon: '🔥',
    title: 'Fire NOC Renewal',
    property: 'Sharma & Co. Office',
    dueDate: '15 Feb 2026',
    amount: 5000,
    daysLeft: 20,
  },
];

export default function VaultScreen() {
  const expiringCount = DUMMY_INSURANCE.filter(i => i.daysLeft <= 30).length +
                        DUMMY_RENEWALS.filter(r => r.daysLeft <= 30).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Insurance Vault</Text>
        <Text style={styles.subtitle}>All policies & renewals in one place</Text>

        {/* Alert Banner */}
        {expiringCount > 0 ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>{expiringCount} items need attention in next 30 days</Text>
          </View>
        ) : null}

        {/* Insurance Policies */}
        <Text style={styles.sectionTitle}>INSURANCE POLICIES</Text>
        {DUMMY_INSURANCE.map(policy => (
          <Pressable key={policy.id} style={[styles.card, policy.daysLeft <= 30 ? styles.cardWarning : null]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{policy.icon}</Text>
              </View>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>{policy.provider}</Text>
                <Text style={styles.cardSubtitle}>{policy.insured}</Text>
              </View>
              {policy.daysLeft <= 30 ? (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>{policy.daysLeft}d left</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Sum Insured</Text>
                <Text style={styles.cardValue}>₹{(policy.sumInsured / 100000).toFixed(1)}L</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Premium</Text>
                <Text style={styles.cardValue}>₹{policy.premium.toLocaleString()}/yr</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Expires</Text>
                <Text style={[styles.cardValue, policy.daysLeft <= 30 ? styles.urgentValue : null]}>{policy.expiryDate}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {/* Renewals */}
        <Text style={styles.sectionTitle}>COMPLIANCE & RENEWALS</Text>
        {DUMMY_RENEWALS.map(renewal => (
          <Pressable key={renewal.id} style={[styles.card, renewal.daysLeft <= 30 ? styles.cardWarning : null]}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{renewal.icon}</Text>
              </View>
              <View style={styles.cardTitleArea}>
                <Text style={styles.cardTitle}>{renewal.title}</Text>
                <Text style={styles.cardSubtitle}>{renewal.property}</Text>
              </View>
              <View style={[styles.urgentBadge, renewal.daysLeft <= 20 ? styles.criticalBadge : null]}>
                <Text style={styles.urgentText}>{renewal.daysLeft}d left</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Due Date</Text>
                <Text style={[styles.cardValue, styles.urgentValue]}>{renewal.dueDate}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Amount</Text>
                <Text style={styles.cardValue}>₹{renewal.amount.toLocaleString()}</Text>
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
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningMuted, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 24, gap: 12, borderWidth: 1, borderColor: Colors.warningBorder },
  alertIcon: { fontSize: 20 },
  alertText: { ...Typography.body, color: Colors.warning, flex: 1 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 16, marginTop: 8 },
  card: { ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20, marginBottom: 16 },
  cardWarning: { borderColor: Colors.warningBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  cardTitleArea: { flex: 1 },
  cardTitle: { ...Typography.h3, color: Colors.text },
  cardSubtitle: { ...Typography.bodySm, color: Colors.textMuted, marginTop: 2 },
  urgentBadge: { backgroundColor: Colors.warningMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  criticalBadge: { backgroundColor: Colors.dangerMuted },
  urgentText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.warning },
  cardBody: { gap: 8 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { ...Typography.bodySm, color: Colors.textMuted },
  cardValue: { ...Typography.body, color: Colors.text },
  urgentValue: { color: Colors.warning },
});
