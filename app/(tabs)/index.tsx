import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false} 
          style={styles.emergencyScroll}
        >
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
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
    color: Colors.text,
  },
  status: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  notificationButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.warning,
    textTransform: 'uppercase',
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: '#000',
  },
  snoozeButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  snoozeButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    textTransform: 'uppercase',
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
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.success,
    textTransform: 'uppercase',
  },
  summaryStatusMuted: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 16,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  emergencyScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  emergencyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
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