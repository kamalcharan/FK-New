// app/profile.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ChevronDown, User, Mail, Phone, Save } from 'lucide-react-native';
import { Colors, Typography, BorderRadius, GlassStyle } from '../src/constants/theme';
import { countryCodeOptions, getDefaultCountryCode, getCountryByCode, CountryCode } from '../src/constants/countryCodes';
import { updateUserProfile, getUserProfile, isSupabaseReady } from '../src/lib/supabase';
import { showErrorToast, showSuccessToast } from '../src/components/ToastConfig';
import { useAppSelector, useAppDispatch } from '../src/hooks/useStore';
import { setUser } from '../src/store/slices/authSlice';

export default function ProfileScreen() {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(getDefaultCountryCode());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id || !isSupabaseReady()) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setFullName(profile.full_name || user?.full_name || '');

          // Parse phone number to extract country code and number
          if (profile.phone) {
            const phoneStr = profile.phone;
            // Try to find matching country code
            const country = profile.country_code
              ? getCountryByCode(profile.country_code)
              : countryCodeOptions.find(c => phoneStr.startsWith(c.dial));

            if (country) {
              setSelectedCountry(country);
              setPhone(phoneStr.replace(country.dial, ''));
            } else {
              setPhone(phoneStr.replace(/^\+\d+/, ''));
            }
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  // Track changes
  useEffect(() => {
    const nameChanged = fullName !== (user?.full_name || '');
    setHasChanges(nameChanged || phone.length > 0);
  }, [fullName, phone, user?.full_name]);

  const handleSave = async () => {
    if (!user?.id || !isSupabaseReady()) return;

    setIsSaving(true);
    try {
      // Format phone with country code
      const fullPhone = phone ? `${selectedCountry.dial}${phone.replace(/\D/g, '')}` : undefined;

      // Update profile
      await updateUserProfile(user.id, {
        full_name: fullName.trim() || undefined,
        phone: fullPhone,
        country_code: phone ? selectedCountry.code : undefined,
      });

      // Update Redux
      if (fullName.trim()) {
        dispatch(setUser({
          ...user,
          full_name: fullName.trim(),
        }));
      }

      showSuccessToast('Profile Updated', 'Your changes have been saved');
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showErrorToast('Error', err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCountryItem = ({ item }: { item: CountryCode }) => (
    <Pressable
      style={styles.countryItem}
      onPress={() => {
        setSelectedCountry(item);
        setShowCountryPicker(false);
        setHasChanges(true);
      }}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName}>{item.name}</Text>
      <Text style={styles.countryDial}>{item.dial}</Text>
    </Pressable>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase() || 'U'}</Text>
            ) : (
              <User size={40} color={Colors.textMuted} />
            )}
          </View>
          <Text style={styles.avatarName}>{fullName || 'Your Name'}</Text>
          <Text style={styles.avatarEmail}>{user?.email}</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            <View style={styles.inputWithIcon}>
              <User size={18} color={Colors.textMuted} />
              <TextInput
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setHasChanges(true);
                }}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.textPlaceholder}
                autoCapitalize="words"
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={[styles.inputWithIcon, styles.inputReadOnly]}>
              <Mail size={18} color={Colors.textMuted} />
              <Text style={styles.readOnlyText}>{user?.email}</Text>
            </View>
            <Text style={styles.helperText}>Email cannot be changed</Text>
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
              <View style={styles.phoneInputWrapper}>
                <Phone size={18} color={Colors.textMuted} />
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/\D/g, ''));
                    setHasChanges(true);
                  }}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.textPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={15}
                  style={styles.phoneInputField}
                />
              </View>
            </View>
            <Text style={styles.helperText}>Used for loan verifications via WhatsApp</Text>
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, (!hasChanges || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <Save size={18} color={hasChanges ? Colors.text : Colors.textMuted} />
              <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
                Save Changes
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
  avatarName: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  avatarEmail: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  form: {
    gap: 24,
    marginBottom: 32,
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
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  inputReadOnly: {
    backgroundColor: Colors.surface,
  },
  inputField: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    padding: 0,
  },
  readOnlyText: {
    flex: 1,
    ...Typography.body,
    color: Colors.textMuted,
  },
  helperText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
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
    paddingVertical: 14,
    gap: 8,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDialText: {
    ...Typography.body,
    color: Colors.text,
  },
  phoneInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  phoneInputField: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    padding: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surface,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.text,
  },
  saveButtonTextDisabled: {
    color: Colors.textMuted,
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
