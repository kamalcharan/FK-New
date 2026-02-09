// app/(auth)/profile-setup.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { countryCodeOptions, getDefaultCountryCode, CountryCode } from '../../src/constants/countryCodes';
import { updateUserProfile, isSupabaseReady } from '../../src/lib/supabase';
import { showErrorToast, showSuccessToast } from '../../src/components/ToastConfig';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useStore';
import { setUser } from '../../src/store/slices/authSlice';

export default function ProfileSetupScreen() {
  const { userName } = useLocalSearchParams<{ userName?: string }>();
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const [fullName, setFullName] = useState(userName || user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(getDefaultCountryCode());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const firstName = (userName || user?.full_name || '').split(' ')[0] || 'there';
  const isPhoneValid = phone.length >= 10;
  const isNameValid = fullName.trim().length >= 2;
  const isFormValid = isNameValid && isPhoneValid;

  const handleContinue = async () => {
    if (!isFormValid) {
      if (!isNameValid) {
        showErrorToast('Name Required', 'Please enter your full name');
        return;
      }
      if (!isPhoneValid) {
        showErrorToast('Mobile Required', 'Please enter a valid mobile number');
        return;
      }
      return;
    }

    setIsLoading(true);
    try {
      if (isSupabaseReady() && user?.id) {
        const fullPhone = `${selectedCountry.dial}${phone.replace(/\D/g, '')}`;

        await updateUserProfile(user.id, {
          full_name: fullName.trim(),
          phone: fullPhone,
          country_code: selectedCountry.code,
        });

        dispatch(setUser({
          ...user,
          full_name: fullName.trim(),
        }));
      }

      // Navigate to pain point picker
      router.replace({
        pathname: '/(auth)/pain-point',
        params: { userName: fullName.trim() },
      });
    } catch (err: any) {
      console.error('[ProfileSetup] Error:', err);
      showErrorToast('Error', err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCountryItem = ({ item }: { item: CountryCode }) => (
    <Pressable
      style={styles.countryItem}
      onPress={() => {
        setSelectedCountry(item);
        setShowCountryPicker(false);
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryDial}>{item.dial}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Persistent Tag */}
          <Text style={styles.buildingTag}>BUILDING YOUR FAMILY'S SECOND BRAIN</Text>

          {/* Welcome Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome, {firstName}</Text>
            <Text style={styles.subtitle}>
              You're one step away from building your family's second brain.
            </Text>
          </View>

          {/* Phone Explanation */}
          <Text style={styles.explanation}>
            Before we leap ahead to awesomeness — we need your contact number. This is required to initiate messages within your circle.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name - pre-filled, editable */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>YOUR NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="words"
                autoComplete="name"
                style={[styles.input, !isNameValid && fullName.length > 0 && styles.inputError]}
              />
              {!isNameValid && fullName.length > 0 && (
                <Text style={styles.errorText}>Name must be at least 2 characters</Text>
              )}
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.phoneContainer}>
                <Pressable
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryDialText}>{selectedCountry.dial}</Text>
                  <ChevronDown size={16} color={Colors.textMuted} />
                </Pressable>

                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={[styles.phoneInput, !isPhoneValid && phone.length > 0 && styles.inputError]}
                />
              </View>
              {!isPhoneValid && phone.length > 0 ? (
                <Text style={styles.errorText}>Please enter a valid 10-digit mobile number</Text>
              ) : (
                <Text style={styles.helperText}>
                  Used for loan verifications and family notifications
                </Text>
              )}
            </View>
          </View>

          {/* Continue Button */}
          <Button
            title={isLoading ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            style={styles.continueButton}
          />

          {/* Privacy Note */}
          <Text style={styles.privacyNote}>
            Your number is only visible to family members you invite.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <Pressable onPress={() => setShowCountryPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={countryCodeOptions}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.countryList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  buildingTag: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 30,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  explanation: {
    ...Typography.body,
    color: Colors.textMuted,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  form: {
    marginBottom: 32,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.body,
    color: Colors.text,
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDialText: {
    ...Typography.body,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.body,
    color: Colors.text,
  },
  helperText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.danger,
    marginTop: 4,
  },
  continueButton: {
    marginBottom: 16,
  },
  privacyNote: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  modalClose: {
    ...Typography.body,
    color: Colors.primary,
  },
  countryList: {
    paddingHorizontal: 24,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: 12,
  },
  countryName: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
  },
  countryDial: {
    ...Typography.body,
    color: Colors.textMuted,
  },
});
