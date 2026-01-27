// app/loan-intro.tsx
// "How Loan Ledger Works" intro screen
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';

const STEPS = [
  {
    number: '1',
    emoji: '📝',
    title: 'Record the Loan',
    description: 'Enter the amount, who you gave it to (or took from), and any notes. Add their phone number for verification.',
  },
  {
    number: '2',
    emoji: '📱',
    title: 'Share Verification Code',
    description: 'You\'ll get a 6-digit code. Share it with the other person via WhatsApp. They don\'t need to install the app.',
  },
  {
    number: '3',
    emoji: '🌐',
    title: 'They Verify Online',
    description: 'The other person visits familyknows.in, enters the code, confirms their name and phone number.',
  },
  {
    number: '4',
    emoji: '🤝',
    title: 'Digital Handshake',
    description: 'Once verified, both parties have agreed to the same record. This creates an undeniable, timestamped agreement.',
  },
];

export default function LoanIntroScreen() {
  const router = useRouter();

  const handleGetStarted = (type: 'given' | 'taken') => {
    router.replace({ pathname: '/add-loan', params: { type } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>How It Works</Text>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🤝</Text>
          <Text style={styles.heroTitle}>Digital Handshake</Text>
          <Text style={styles.heroSubtitle}>
            A loan recorded by one, verified by another.
            No more "I gave you ₹50,000" vs "It was only ₹40,000" disputes.
          </Text>
        </View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>THE PROCESS</Text>

        {STEPS.map((step, index) => (
          <View key={step.number} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepEmoji}>{step.emoji}</Text>
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
            {index < STEPS.length - 1 && <View style={styles.stepConnector} />}
          </View>
        ))}

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why Digital Handshake?</Text>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Both parties agree to the same record</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Timestamped proof of agreement</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>No app required for the other person</Text>
          </View>
          <View style={styles.benefitRow}>
            <Text style={styles.benefitIcon}>✓</Text>
            <Text style={styles.benefitText}>Prevents future misunderstandings</Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaLabel}>Ready to record?</Text>
          <Pressable
            style={[styles.ctaButton, styles.ctaGiven]}
            onPress={() => handleGetStarted('given')}
          >
            <Text style={styles.ctaEmoji}>💸</Text>
            <Text style={styles.ctaButtonText}>I Gave a Loan</Text>
          </Pressable>
          <Pressable
            style={[styles.ctaButton, styles.ctaTaken]}
            onPress={() => handleGetStarted('taken')}
          >
            <Text style={styles.ctaEmoji}>🙏</Text>
            <Text style={styles.ctaButtonText}>I Took a Loan</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backButton: {
    ...GlassStyle,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h2, color: Colors.text, flex: 1 },

  heroCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['3xl'],
    padding: 28,
    alignItems: 'center',
    marginBottom: 32,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  heroTitle: { ...Typography.h1, color: Colors.text, textAlign: 'center', marginBottom: 12 },
  heroSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 20,
  },

  stepCard: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  stepConnector: {
    position: 'absolute',
    left: 15,
    top: 36,
    width: 2,
    height: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  stepContent: {
    flex: 1,
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepEmoji: { fontSize: 20 },
  stepTitle: {
    ...Typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  stepDescription: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  benefitsCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    marginTop: 8,
    marginBottom: 32,
    borderColor: Colors.successBorder,
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  benefitsTitle: {
    ...Typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 16,
    color: Colors.success,
    fontFamily: 'Inter_600SemiBold',
  },
  benefitText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    flex: 1,
  },

  ctaContainer: {
    gap: 12,
  },
  ctaLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  ctaGiven: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: Colors.successBorder,
  },
  ctaTaken: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: Colors.warningBorder,
  },
  ctaEmoji: { fontSize: 20 },
  ctaButtonText: {
    ...Typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
});
