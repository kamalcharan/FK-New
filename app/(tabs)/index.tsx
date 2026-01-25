import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';

export default function DashboardScreen() {
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

        {/* Emergency Access */}
        <Text style={styles.sectionTitle}>FAMILY EMERGENCY ACCESS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emergencyScroll}>
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
});
