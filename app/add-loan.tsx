// app/add-loan.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';

export default function AddLoanScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'given' | 'taken' }>();
  const isGiven = type === 'given';

  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    // TODO: Save to database
    console.log('Loan data:', { type, counterparty, amount, notes });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Text style={styles.title}>
              {isGiven ? 'Record Loan Given' : 'Record Loan Taken'}
            </Text>
          </View>

          {/* Type Indicator */}
          <View style={[styles.typeIndicator, isGiven ? styles.givenIndicator : styles.takenIndicator]}>
            <Text style={styles.typeIcon}>{isGiven ? '💸' : '🤝'}</Text>
            <Text style={styles.typeText}>
              {isGiven ? 'Money you are lending to someone' : 'Money you are borrowing'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isGiven ? 'BORROWER NAME' : 'LENDER NAME'}</Text>
              <TextInput
                style={styles.input}
                placeholder={isGiven ? 'Who are you lending to?' : 'Who are you borrowing from?'}
                placeholderTextColor={Colors.textMuted}
                value={counterparty}
                onChangeText={setCounterparty}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>AMOUNT (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any details about this loan..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* OTP Verification Note */}
            <View style={styles.verificationNote}>
              <Text style={styles.verificationIcon}>📱</Text>
              <Text style={styles.verificationText}>
                {isGiven
                  ? 'The borrower will receive an OTP to verify this loan'
                  : 'You will need to verify this loan with an OTP'}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, (!counterparty || !amount) ? styles.submitButtonDisabled : null]}
            onPress={handleSubmit}
            disabled={!counterparty || !amount}
          >
            <Text style={styles.submitButtonText}>
              {isGiven ? 'Record & Send Verification' : 'Record Loan'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backButton: { ...GlassStyle, width: 44, height: 44, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.text },
  title: { ...Typography.h2, color: Colors.text, flex: 1 },
  typeIndicator: { ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  givenIndicator: { borderColor: Colors.successBorder },
  takenIndicator: { borderColor: Colors.warningBorder },
  typeIcon: { fontSize: 24 },
  typeText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  form: { gap: 24, marginBottom: 32 },
  inputGroup: { gap: 8 },
  label: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5 },
  input: { ...GlassStyle, borderRadius: BorderRadius.lg, padding: 16, ...Typography.body, color: Colors.text },
  textArea: { height: 100, textAlignVertical: 'top' },
  verificationNote: { ...GlassStyle, borderRadius: BorderRadius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' },
  verificationIcon: { fontSize: 20 },
  verificationText: { ...Typography.bodySm, color: Colors.textSecondary, flex: 1 },
  submitButton: { backgroundColor: Colors.text, paddingVertical: 16, borderRadius: BorderRadius.xl, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { ...Typography.button, color: '#000' },
});
