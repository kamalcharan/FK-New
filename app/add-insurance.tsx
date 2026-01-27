// app/add-insurance.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';

const INSURANCE_TYPES = [
  { id: 'health', icon: '🏥', label: 'Health' },
  { id: 'vehicle', icon: '🚗', label: 'Vehicle' },
  { id: 'life', icon: '🕊️', label: 'Life' },
  { id: 'home', icon: '🏠', label: 'Home' },
];

export default function AddInsuranceScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('health');
  const [provider, setProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [sumInsured, setSumInsured] = useState('');

  const handleSubmit = () => {
    console.log('Insurance data:', { selectedType, provider, policyNumber, sumInsured });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Add Insurance</Text>
        </View>

        {/* Insurance Type Selector */}
        <Text style={styles.label}>INSURANCE TYPE</Text>
        <View style={styles.typeGrid}>
          {INSURANCE_TYPES.map(type => (
            <Pressable
              key={type.id}
              style={[styles.typeCard, selectedType === type.id ? styles.typeCardActive : null]}
              onPress={() => setSelectedType(type.id)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={styles.typeLabel}>{type.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>INSURANCE PROVIDER</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., HDFC Ergo, ICICI Lombard"
              placeholderTextColor={Colors.textMuted}
              value={provider}
              onChangeText={setProvider}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>POLICY NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter policy number"
              placeholderTextColor={Colors.textMuted}
              value={policyNumber}
              onChangeText={setPolicyNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SUM INSURED (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter coverage amount"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={sumInsured}
              onChangeText={setSumInsured}
            />
          </View>
        </View>

        {/* Submit Button */}
        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save Insurance Policy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backButton: { ...GlassStyle, width: 44, height: 44, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { ...Typography.h2, color: Colors.text, flex: 1 },
  label: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  typeGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  typeCard: { flex: 1, ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, alignItems: 'center', gap: 8 },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  typeIcon: { fontSize: 24 },
  typeLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  form: { gap: 24, marginBottom: 32 },
  inputGroup: { gap: 8 },
  input: { ...GlassStyle, borderRadius: BorderRadius.lg, padding: 16, ...Typography.body, color: Colors.text },
  submitButton: { backgroundColor: Colors.text, paddingVertical: 16, borderRadius: BorderRadius.xl, alignItems: 'center' },
  submitButtonText: { ...Typography.button, color: '#000' },
});
