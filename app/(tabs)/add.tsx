// app/(tabs)/add.tsx
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, GlassStyle, BorderRadius } from '../../src/constants/theme';

const ADD_OPTIONS = [
  {
    id: 'loan-given',
    icon: '💸',
    title: 'Loan Given',
    subtitle: 'Record money you lent to someone',
    color: Colors.success,
  },
  {
    id: 'loan-taken',
    icon: '🤝',
    title: 'Loan Taken',
    subtitle: 'Track money you borrowed',
    color: Colors.warning,
  },
  {
    id: 'insurance',
    icon: '🛡️',
    title: 'Insurance Policy',
    subtitle: 'Add health, vehicle, or life insurance',
    color: Colors.primary,
  },
  {
    id: 'renewal',
    icon: '📋',
    title: 'Compliance/Renewal',
    subtitle: 'Property tax, NOC, licenses',
    color: Colors.textSecondary,
  },
];

export default function AddScreen() {
  const handleOptionPress = (optionId: string) => {
    // TODO: Navigate to specific add form
    console.log('Selected:', optionId);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Add New Record</Text>
        <Text style={styles.subtitle}>What would you like to track?</Text>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {ADD_OPTIONS.map(option => (
            <Pressable
              key={option.id}
              style={styles.optionCard}
              onPress={() => handleOptionPress(option.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                <Text style={styles.icon}>{option.icon}</Text>
              </View>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        <Pressable style={styles.quickAction}>
          <Text style={styles.quickIcon}>📸</Text>
          <View style={styles.quickTextArea}>
            <Text style={styles.quickTitle}>Scan Document</Text>
            <Text style={styles.quickSubtitle}>Auto-extract details from photo</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
        <Pressable style={styles.quickAction}>
          <Text style={styles.quickIcon}>👨‍👩‍👧‍👦</Text>
          <View style={styles.quickTextArea}>
            <Text style={styles.quickTitle}>Invite Family</Text>
            <Text style={styles.quickSubtitle}>Share vault access with members</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  title: { ...Typography.h1, color: Colors.text, marginBottom: 4 },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: 32 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 40 },
  optionCard: { width: '47%', ...GlassStyle, borderRadius: BorderRadius['2xl'], padding: 20, alignItems: 'center' },
  iconContainer: { width: 56, height: 56, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon: { fontSize: 28 },
  optionTitle: { ...Typography.h3, color: Colors.text, textAlign: 'center', marginBottom: 4 },
  optionSubtitle: { ...Typography.bodySm, color: Colors.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 16 },
  quickAction: { ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  quickIcon: { fontSize: 24 },
  quickTextArea: { flex: 1 },
  quickTitle: { ...Typography.body, color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  quickSubtitle: { ...Typography.bodySm, color: Colors.textMuted },
  arrow: { fontSize: 20, color: Colors.textMuted },
});
