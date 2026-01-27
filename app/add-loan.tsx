// app/add-loan.tsx
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Contacts from 'expo-contacts';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';
import { currencyOptions, getDefaultCurrency, getCurrencySymbol } from '../src/constants/currencies';
import { countryCodeOptions, getDefaultCountryCode, CountryCode } from '../src/constants/countryCodes';
import { useAppSelector } from '../src/hooks/useStore';
import { createLoan, createLoanVerification, isSupabaseReady } from '../src/lib/supabase';
import { showSuccessToast, showErrorToast } from '../src/components/ToastConfig';

export default function AddLoanScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: 'given' | 'taken' }>();
  const isGiven = type === 'given';

  const { currentWorkspace } = useAppSelector(state => state.workspace);
  const { user } = useAppSelector(state => state.auth);

  // Form state
  const [counterpartyName, setCounterpartyName] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(getDefaultCountryCode());
  const [counterpartyPhone, setCounterpartyPhone] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(getDefaultCurrency().code);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [isHistorical, setIsHistorical] = useState(false);

  // Date state
  const [startDate, setStartDate] = useState(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCountryCodePicker, setShowCountryCodePicker] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPermission, setContactsPermission] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');

  // Load contacts when picker opens
  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      setContactsPermission(status);

      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
          sort: Contacts.SortTypes.FirstName,
        });
        setContacts(data);
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleOpenContactPicker = async () => {
    setContactSearch('');
    await loadContacts();
    setShowContactPicker(true);
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact => {
    if (!contactSearch.trim()) return true;
    const searchLower = contactSearch.toLowerCase();
    const nameMatch = contact.name?.toLowerCase().includes(searchLower);
    const phoneMatch = contact.phoneNumbers?.some(p => p.number?.includes(contactSearch));
    return nameMatch || phoneMatch;
  });

  const handleSelectContact = (contact: Contacts.Contact) => {
    if (contact.name) {
      setCounterpartyName(contact.name);
    }
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      let phone = contact.phoneNumbers[0].number || '';
      // Remove spaces, dashes, parentheses
      phone = phone.replace(/[\s\-\(\)]/g, '');
      // Check for country codes and extract phone number
      for (const cc of countryCodeOptions) {
        if (phone.startsWith(cc.dial)) {
          phone = phone.slice(cc.dial.length);
          setCountryCode(cc);
          break;
        }
        // Also check without + for India (91...)
        if (phone.startsWith(cc.dial.slice(1)) && phone.length > 10) {
          phone = phone.slice(cc.dial.length - 1);
          setCountryCode(cc);
          break;
        }
      }
      setCounterpartyPhone(phone);
    }
    if (contact.emails && contact.emails.length > 0) {
      setCounterpartyEmail(contact.emails[0].email || '');
    }
    setShowContactPicker(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleDueDateChange = (event: any, selectedDate?: Date) => {
    setShowDueDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const getFullPhoneNumber = (): string => {
    return `${countryCode.dial}${counterpartyPhone}`;
  };

  const handleSave = async (withVerification: boolean) => {
    if (!currentWorkspace?.id || !user?.id || !isSupabaseReady()) {
      showErrorToast('Error', 'Please sign in to create a loan');
      return;
    }

    if (!counterpartyName.trim() || !amount) {
      showErrorToast('Missing fields', 'Name and amount are required');
      return;
    }

    if (withVerification && !counterpartyPhone.trim()) {
      showErrorToast('Phone required', 'Phone number is required for verification');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = counterpartyPhone.trim() ? getFullPhoneNumber() : undefined;

      const loan = await createLoan({
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        loan_type: type || 'given',
        counterparty_name: counterpartyName.trim(),
        counterparty_phone: fullPhone,
        principal_amount: parseFloat(amount),
        loan_date: startDate.toISOString().split('T')[0],
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
        currency: currency,
        is_historical: isHistorical,
      });

      if (withVerification && loan.id) {
        const verification = await createLoanVerification(loan.id, user.id);

        if (verification.success && verification.shareable_message) {
          // Generate share content
          const verificationCode = verification.verification_code || '------';
          const currencySymbol = getCurrencySymbol(currency);
          const shareMessage = `Hi ${counterpartyName.trim()},

I've recorded a loan in FamilyKnows app:

Amount: ${currencySymbol}${parseFloat(amount).toLocaleString()}
Date: ${formatDate(startDate)}
Type: ${isGiven ? 'Loan Given' : 'Loan Taken'}

Please verify this transaction using the link below:
https://familyknows.in/v/${verificationCode}

Or enter code: ${verificationCode} at https://familyknows.in/verify

This creates a trusted digital handshake between us.

- ${user.user_metadata?.full_name || 'Your friend'}`;

          try {
            const result = await Share.share({
              message: shareMessage,
              title: 'Verify Loan - FamilyKnows',
            });

            if (result.action === Share.sharedAction) {
              showSuccessToast('Shared!', 'Verification request sent');
            } else if (result.action === Share.dismissedAction) {
              showSuccessToast('Loan saved', 'Verification code: ' + verificationCode);
            }
          } catch (shareError) {
            console.error('Share error:', shareError);
            showSuccessToast('Loan saved', 'Code: ' + verificationCode + '. Share manually.');
          }
        } else {
          showSuccessToast('Loan saved', 'Could not generate verification code');
        }
      } else {
        showSuccessToast('Loan saved', isHistorical ? 'Historical record saved' : 'Saved without verification');
      }

      router.back();
    } catch (err: any) {
      console.error('Error creating loan:', err);
      showErrorToast('Error', err.message || 'Failed to create loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);
  const isFormValid = counterpartyName.trim() && amount;
  const canVerify = isFormValid && counterpartyPhone.trim() && !isHistorical;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <Text style={styles.title}>{isGiven ? 'Record Loan Given' : 'Record Loan Taken'}</Text>
          </View>

          {/* Loan Type Toggle */}
          <View style={styles.loanTypeToggle}>
            <Pressable
              style={[styles.loanTypeOption, !isHistorical && styles.loanTypeActive]}
              onPress={() => setIsHistorical(false)}
            >
              <Text style={styles.loanTypeEmoji}>🆕</Text>
              <Text style={[styles.loanTypeText, !isHistorical && styles.loanTypeTextActive]}>New Loan</Text>
              <Text style={styles.loanTypeDesc}>Can be verified</Text>
            </Pressable>
            <Pressable
              style={[styles.loanTypeOption, isHistorical && styles.loanTypeActive]}
              onPress={() => setIsHistorical(true)}
            >
              <Text style={styles.loanTypeEmoji}>📜</Text>
              <Text style={[styles.loanTypeText, isHistorical && styles.loanTypeTextActive]}>Past Loan</Text>
              <Text style={styles.loanTypeDesc}>For records only</Text>
            </Pressable>
          </View>

          {/* Type Indicator */}
          <View style={[styles.typeIndicator, isGiven ? styles.givenIndicator : styles.takenIndicator]}>
            <Text style={styles.typeIcon}>{isGiven ? '💸' : '🙏'}</Text>
            <Text style={styles.typeText}>{isGiven ? 'Money you are lending to someone' : 'Money you are borrowing'}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Counterparty Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isGiven ? 'BORROWER NAME' : 'LENDER NAME'}</Text>
              <View style={styles.inputWithAction}>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder={isGiven ? 'Who are you lending to?' : 'Who are you borrowing from?'}
                  placeholderTextColor={Colors.textMuted}
                  value={counterpartyName}
                  onChangeText={setCounterpartyName}
                />
                <Pressable style={styles.contactButton} onPress={handleOpenContactPicker}>
                  <Text style={styles.contactButtonText}>📇</Text>
                </Pressable>
              </View>
            </View>

            {/* Phone Number with Country Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER {!isHistorical && <Text style={styles.required}>*</Text>}</Text>
              <View style={styles.phoneRow}>
                <Pressable style={styles.countryCodeButton} onPress={() => setShowCountryCodePicker(true)}>
                  <Text style={styles.countryFlag}>{countryCode.flag}</Text>
                  <Text style={styles.countryDial}>{countryCode.dial}</Text>
                  <Text style={styles.countryChevron}>▼</Text>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="Phone number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={counterpartyPhone}
                  onChangeText={setCounterpartyPhone}
                  maxLength={15}
                />
              </View>
              {!isHistorical && <Text style={styles.helperText}>Required for verification via WhatsApp</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={counterpartyEmail}
                onChangeText={setCounterpartyEmail}
              />
            </View>

            {/* Amount with Currency */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>AMOUNT</Text>
              <View style={styles.amountRow}>
                <Pressable style={styles.currencyButton} onPress={() => setShowCurrencyPicker(true)}>
                  <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                  <Text style={styles.currencyCode}>{currency}</Text>
                  <Text style={styles.currencyChevron}>▼</Text>
                </Pressable>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  placeholder="Enter amount"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Loan Duration - Start Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>LOAN DATE</Text>
              <Pressable style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                <Text style={styles.dateChevron}>▼</Text>
              </Pressable>
            </View>

            {/* Due Date (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DUE DATE (OPTIONAL)</Text>
              <View style={styles.dueDateRow}>
                <Pressable
                  style={[styles.dateButton, styles.dueDateButton]}
                  onPress={() => setShowDueDatePicker(true)}
                >
                  <Text style={styles.dateIcon}>📆</Text>
                  <Text style={styles.dateText}>{dueDate ? formatDate(dueDate) : 'No due date set'}</Text>
                  <Text style={styles.dateChevron}>▼</Text>
                </Pressable>
                {dueDate && (
                  <Pressable style={styles.clearDateButton} onPress={() => setDueDate(null)}>
                    <Text style={styles.clearDateText}>✕</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Purpose */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PURPOSE (OPTIONAL)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Medical emergency, Business, Home repairs"
                placeholderTextColor={Colors.textMuted}
                value={purpose}
                onChangeText={setPurpose}
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional details..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Info Note */}
            {!isHistorical ? (
              <View style={styles.verificationNote}>
                <Text style={styles.verificationIcon}>🤝</Text>
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationTitle}>Digital Handshake</Text>
                  <Text style={styles.verificationText}>
                    Choose "Save & Share" to send a verification code via WhatsApp. The counterparty verifies on our website.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.verificationNote, styles.historicalNote]}>
                <Text style={styles.verificationIcon}>📜</Text>
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationTitle}>Historical Record</Text>
                  <Text style={styles.verificationText}>This loan will be saved for your records without verification.</Text>
                </View>
              </View>
            )}
          </View>

          {/* Submit Buttons */}
          <View style={styles.submitButtons}>
            {/* Save Only Button */}
            <Pressable
              style={[styles.saveOnlyButton, (!isFormValid || isSubmitting) && styles.buttonDisabled]}
              onPress={() => handleSave(false)}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.text} size="small" />
              ) : (
                <>
                  <Text style={styles.saveOnlyIcon}>💾</Text>
                  <Text style={styles.saveOnlyText}>Save Record</Text>
                </>
              )}
            </Pressable>

            {/* Save & Share Button - Only for non-historical loans */}
            {!isHistorical && (
              <Pressable
                style={[styles.shareButton, (!canVerify || isSubmitting) && styles.buttonDisabled]}
                onPress={() => handleSave(true)}
                disabled={!canVerify || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.shareButtonIcon}>📤</Text>
                    <Text style={styles.shareButtonText}>Save & Share for Verification</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          maximumDate={new Date()}
        />
      )}

      {showDueDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDueDateChange}
          minimumDate={startDate}
        />
      )}

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <FlatList
              data={currencyOptions}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.pickerOption, currency === item.code && styles.pickerOptionActive]}
                  onPress={() => { setCurrency(item.code); setShowCurrencyPicker(false); }}
                >
                  <Text style={styles.pickerOptionSymbol}>{item.symbol}</Text>
                  <View style={styles.pickerOptionText}>
                    <Text style={styles.pickerOptionCode}>{item.code}</Text>
                    <Text style={styles.pickerOptionName}>{item.name}</Text>
                  </View>
                  {currency === item.code && <Text style={styles.pickerCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Country Code Picker Modal */}
      <Modal visible={showCountryCodePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCountryCodePicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country Code</Text>
            <FlatList
              data={countryCodeOptions}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.pickerOption, countryCode.code === item.code && styles.pickerOptionActive]}
                  onPress={() => { setCountryCode(item); setShowCountryCodePicker(false); }}
                >
                  <Text style={styles.pickerOptionSymbol}>{item.flag}</Text>
                  <View style={styles.pickerOptionText}>
                    <Text style={styles.pickerOptionCode}>{item.dial}</Text>
                    <Text style={styles.pickerOptionName}>{item.name}</Text>
                  </View>
                  {countryCode.code === item.code && <Text style={styles.pickerCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={showContactPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowContactPicker(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            {contactsLoading ? (
              <View style={styles.contactsLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.contactsLoadingText}>Loading contacts...</Text>
              </View>
            ) : contactsPermission !== 'granted' ? (
              <View style={styles.contactsPermission}>
                <Text style={styles.contactsPermissionText}>Contact permission is required to pick from contacts.</Text>
              </View>
            ) : (
              <>
                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or phone..."
                    placeholderTextColor={Colors.textMuted}
                    value={contactSearch}
                    onChangeText={setContactSearch}
                    autoCorrect={false}
                  />
                  {contactSearch.length > 0 && (
                    <Pressable onPress={() => setContactSearch('')} style={styles.searchClear}>
                      <Text style={styles.searchClearText}>✕</Text>
                    </Pressable>
                  )}
                </View>
                <FlatList
                  data={filteredContacts}
                  keyExtractor={item => item.id || Math.random().toString()}
                  renderItem={({ item }) => (
                    <Pressable style={styles.contactOption} onPress={() => handleSelectContact(item)}>
                      <View style={styles.contactAvatar}>
                        <Text style={styles.contactAvatarText}>{item.name?.charAt(0).toUpperCase() || '?'}</Text>
                      </View>
                      <View style={styles.contactDetails}>
                        <Text style={styles.contactName}>{item.name || 'No name'}</Text>
                        {item.phoneNumbers?.[0] && <Text style={styles.contactPhone}>{item.phoneNumbers[0].number}</Text>}
                      </View>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.noContactsText}>
                      {contactSearch ? 'No matching contacts' : 'No contacts found'}
                    </Text>
                  }
                  keyboardShouldPersistTaps="handled"
                />
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  backButton: { ...GlassStyle, width: 44, height: 44, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.text },
  title: { ...Typography.h2, color: Colors.text, flex: 1 },

  loanTypeToggle: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  loanTypeOption: { flex: 1, ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, alignItems: 'center' },
  loanTypeActive: { borderColor: Colors.primary, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  loanTypeEmoji: { fontSize: 24, marginBottom: 8 },
  loanTypeText: { ...Typography.bodySm, color: Colors.textMuted, fontFamily: 'Inter_600SemiBold' },
  loanTypeTextActive: { color: Colors.text },
  loanTypeDesc: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },

  typeIndicator: { ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  givenIndicator: { borderColor: Colors.successBorder },
  takenIndicator: { borderColor: Colors.warningBorder },
  typeIcon: { fontSize: 24 },
  typeText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },

  form: { gap: 20, marginBottom: 32 },
  inputGroup: { gap: 8 },
  label: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: Colors.textMuted, letterSpacing: 1.5 },
  required: { color: Colors.danger },
  input: { ...GlassStyle, borderRadius: BorderRadius.lg, padding: 16, ...Typography.body, color: Colors.text },
  inputFlex: { flex: 1 },
  textArea: { height: 80, textAlignVertical: 'top' },
  helperText: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },

  inputWithAction: { flexDirection: 'row', gap: 12 },
  contactButton: { ...GlassStyle, borderRadius: BorderRadius.lg, width: 52, alignItems: 'center', justifyContent: 'center' },
  contactButtonText: { fontSize: 20 },

  // Phone input with country code
  phoneRow: { flexDirection: 'row', gap: 12 },
  countryCodeButton: { ...GlassStyle, borderRadius: BorderRadius.lg, paddingHorizontal: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  countryFlag: { fontSize: 18 },
  countryDial: { ...Typography.body, color: Colors.text },
  countryChevron: { fontSize: 10, color: Colors.textMuted },
  phoneInput: { flex: 1 },

  // Amount row
  amountRow: { flexDirection: 'row', gap: 12 },
  currencyButton: { ...GlassStyle, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencySymbol: { fontSize: 18, color: Colors.text },
  currencyCode: { ...Typography.bodySm, color: Colors.textMuted },
  currencyChevron: { fontSize: 10, color: Colors.textMuted },
  amountInput: { flex: 1 },

  // Date buttons
  dateButton: { ...GlassStyle, borderRadius: BorderRadius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateIcon: { fontSize: 18 },
  dateText: { ...Typography.body, color: Colors.text, flex: 1 },
  dateChevron: { fontSize: 10, color: Colors.textMuted },
  dueDateRow: { flexDirection: 'row', gap: 12 },
  dueDateButton: { flex: 1 },
  clearDateButton: { ...GlassStyle, borderRadius: BorderRadius.lg, width: 52, alignItems: 'center', justifyContent: 'center' },
  clearDateText: { fontSize: 16, color: Colors.textMuted },

  verificationNote: { ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' },
  historicalNote: { backgroundColor: 'rgba(100, 116, 139, 0.1)', borderColor: 'rgba(100, 116, 139, 0.3)' },
  verificationIcon: { fontSize: 24 },
  verificationTextContainer: { flex: 1 },
  verificationTitle: { ...Typography.bodySm, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 4 },
  verificationText: { ...Typography.bodySm, color: Colors.textSecondary, lineHeight: 18 },

  // Submit buttons
  submitButtons: { gap: 12 },
  saveOnlyButton: {
    ...GlassStyle,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveOnlyIcon: { fontSize: 18 },
  saveOnlyText: { ...Typography.button, color: Colors.text },
  shareButton: {
    backgroundColor: Colors.text,
    paddingVertical: 16,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareButtonIcon: { fontSize: 18 },
  shareButtonText: { ...Typography.button, color: '#000' },
  buttonDisabled: { opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius['3xl'], borderTopRightRadius: BorderRadius['3xl'], maxHeight: '70%', paddingTop: 20 },
  modalTitle: { ...Typography.h3, color: Colors.text, textAlign: 'center', marginBottom: 16 },

  pickerOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerOptionActive: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  pickerOptionSymbol: { fontSize: 20, width: 40, textAlign: 'center', color: Colors.text },
  pickerOptionText: { flex: 1 },
  pickerOptionCode: { ...Typography.body, color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  pickerOptionName: { ...Typography.bodySm, color: Colors.textMuted },
  pickerCheck: { fontSize: 18, color: Colors.primary },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, ...Typography.body, color: Colors.text, padding: 0 },
  searchClear: { padding: 4 },
  searchClearText: { fontSize: 14, color: Colors.textMuted },

  contactsLoading: { padding: 40, alignItems: 'center' },
  contactsLoadingText: { ...Typography.body, color: Colors.textMuted, marginTop: 16 },
  contactsPermission: { padding: 40, alignItems: 'center' },
  contactsPermissionText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center' },
  contactOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  contactAvatarText: { ...Typography.body, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  contactDetails: { flex: 1 },
  contactName: { ...Typography.body, color: Colors.text },
  contactPhone: { ...Typography.bodySm, color: Colors.textMuted },
  noContactsText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', padding: 40 },
});
