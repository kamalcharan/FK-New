// app/add-renewal.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';

const RENEWAL_TYPES = [
  { id: 'property_tax', icon: '🏠', label: 'Property Tax' },
  { id: 'fire_noc', icon: '🔥', label: 'Fire NOC' },
  { id: 'license', icon: '📜', label: 'License' },
  { id: 'other', icon: '📋', label: 'Other' },
];

export default function AddRenewalScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('property_tax');
  const [title, setTitle] = useState('');
  const [property, setProperty] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    console.log('Renewal data:', { selectedType, title, property, amount });
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
          <Text style={styles.title}>Add Renewal</Text>
        </View>

        {/* Renewal Type Selector */}
        <Text style={styles.label}>RENEWAL TYPE</Text>
        <View style={styles.typeGrid}>
          {RENEWAL_TYPES.map(type => (
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
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., GHMC Property Tax"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PROPERTY / ASSET</Text>
            <TextInput
              style={styles.input}
              placeholder="Which property or asset?"
              placeholderTextColor={Colors.textMuted}
              value={property}
              onChangeText={setProperty}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>AMOUNT (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Estimated renewal cost"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>

        {/* Submit Button */}
        <Pressable style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save Renewal Reminder</Text>
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  typeCard: { width: '47%', ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, alignItems: 'center', gap: 8 },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  typeIcon: { fontSize: 24 },
  typeLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  form: { gap: 24, marginBottom: 32 },
  inputGroup: { gap: 8 },
  input: { ...GlassStyle, borderRadius: BorderRadius.lg, padding: 16, ...Typography.body, color: Colors.text },
  submitButton: { backgroundColor: Colors.text, paddingVertical: 16, borderRadius: BorderRadius.xl, alignItems: 'center' },
  submitButtonText: { ...Typography.button, color: '#000' },
});
