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
import { ChevronDown, User, Phone } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '../../src/constants/theme';
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

  const isPhoneValid = phone.length >= 10;
  const isFormValid = fullName.trim().length >= 2 && isPhoneValid;

  const handleContinue = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    try {
      if (isSupabaseReady() && user?.id) {
        // Format phone with country code
        const fullPhone = `${selectedCountry.dial}${phone.replace(/\D/g, '')}`;

        // Update user profile in database
        await updateUserProfile(user.id, {
          full_name: fullName.trim(),
          phone: fullPhone,
          country_code: selectedCountry.code,
        });

        // Update Redux state
        dispatch(setUser({
          ...user,
          full_name: fullName.trim(),
        }));

        showSuccessToast('Profile Updated', 'Your profile has been saved');
      }

      // Navigate to workspace setup
      router.replace({
        pathname: '/(auth)/workspace-setup',
        params: { userName: fullName.trim() },
      });
    } catch (err: any) {
      console.error('[ProfileSetup] Error:', err);
      showErrorToast('Error', err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Navigate to workspace setup without saving phone
    router.replace({
      pathname: '/(auth)/workspace-setup',
      params: { userName: fullName.trim() || userName || '' },
    });
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <User size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Help your family members recognize you
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="words"
                autoComplete="name"
                style={styles.input}
              />
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={styles.phoneContainer}>
                {/* Country Code Selector */}
                <Pressable
                  style={styles.countrySelector}
                  onPress={() => setShowCountryPicker(true)}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryDialText}>{selectedCountry.dial}</Text>
                  <ChevronDown size={16} color={Colors.textMuted} />
                </Pressable>

                {/* Phone Input */}
                <TextInput
                  value={phone}
                  onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={styles.phoneInput}
                />
              </View>
              <Text style={styles.helperText}>
                We'll use this for loan verifications via WhatsApp
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? 'Saving...' : 'Continue'}
              onPress={handleContinue}
              disabled={!isFormValid || isLoading}
              loading={isLoading}
              style={styles.continueButton}
            />
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          </View>

          {/* Privacy Note */}
          <Text style={styles.privacyNote}>
            Your phone number is only shared with family members you invite
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
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  buttonContainer: {
    gap: 16,
    marginBottom: 24,
  },
  continueButton: {
    // default styles from Button
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  privacyNote: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal Styles
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
