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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { Colors, Typography, GlassStyle, BorderRadius } from '../src/constants/theme';
import { currencyOptions, getDefaultCurrency, getCurrencySymbol } from '../src/constants/currencies';
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
  const [counterpartyPhone, setCounterpartyPhone] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(getDefaultCurrency().code);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [isHistorical, setIsHistorical] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
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
      phone = phone.replace(/[\s\-\(\)]/g, '');
      if (phone.startsWith('+91')) phone = phone.slice(3);
      if (phone.startsWith('91') && phone.length > 10) phone = phone.slice(2);
      setCounterpartyPhone(phone);
    }
    if (contact.emails && contact.emails.length > 0) {
      setCounterpartyEmail(contact.emails[0].email || '');
    }
    setShowContactPicker(false);
  };

  const handleSubmit = async () => {
    if (!currentWorkspace?.id || !user?.id || !isSupabaseReady()) {
      showErrorToast('Error', 'Please sign in to create a loan');
      return;
    }

    if (!counterpartyName.trim() || !amount) {
      showErrorToast('Missing fields', 'Name and amount are required');
      return;
    }

    if (!isHistorical && !counterpartyPhone.trim()) {
      showErrorToast('Phone required', 'Phone number is required for verification');
      return;
    }

    setIsSubmitting(true);

    try {
      const loan = await createLoan({
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        loan_type: type || 'given',
        counterparty_name: counterpartyName.trim(),
        counterparty_phone: counterpartyPhone.trim() || undefined,
        principal_amount: parseFloat(amount),
        loan_date: new Date().toISOString().split('T')[0],
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!isHistorical && loan.id) {
        const verification = await createLoanVerification(loan.id, user.id);
        if (verification.success && verification.shareable_message) {
          showSuccessToast('Loan recorded!', 'Share the verification code with ' + counterpartyName);
        } else {
          showSuccessToast('Loan recorded', 'Verification code generated');
        }
      } else {
        showSuccessToast('Loan recorded', isHistorical ? 'Historical record saved' : 'Saved successfully');
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
  const isFormValid = counterpartyName.trim() && amount && (isHistorical || counterpartyPhone.trim());

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
              <Text style={styles.loanTypeDesc}>Requires verification</Text>
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

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER {!isHistorical && <Text style={styles.required}>*</Text>}</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={counterpartyPhone}
                onChangeText={setCounterpartyPhone}
                maxLength={10}
              />
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

            {/* Verification Note */}
            {!isHistorical ? (
              <View style={styles.verificationNote}>
                <Text style={styles.verificationIcon}>🤝</Text>
                <View style={styles.verificationTextContainer}>
                  <Text style={styles.verificationTitle}>Digital Handshake</Text>
                  <Text style={styles.verificationText}>
                    A 6-digit code will be generated. Share it via WhatsApp for verification.
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

          {/* Submit Button */}
          <Pressable
            style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isHistorical ? 'Save Record' : isGiven ? 'Record & Get Verification Code' : 'Record Loan'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

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
                  style={[styles.currencyOption, currency === item.code && styles.currencyOptionActive]}
                  onPress={() => { setCurrency(item.code); setShowCurrencyPicker(false); }}
                >
                  <Text style={styles.currencyOptionSymbol}>{item.symbol}</Text>
                  <View style={styles.currencyOptionText}>
                    <Text style={styles.currencyOptionCode}>{item.code}</Text>
                    <Text style={styles.currencyOptionName}>{item.name}</Text>
                  </View>
                  {currency === item.code && <Text style={styles.currencyCheck}>✓</Text>}
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

  amountRow: { flexDirection: 'row', gap: 12 },
  currencyButton: { ...GlassStyle, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencySymbol: { fontSize: 18, color: Colors.text },
  currencyCode: { ...Typography.bodySm, color: Colors.textMuted },
  currencyChevron: { fontSize: 10, color: Colors.textMuted },
  amountInput: { flex: 1 },

  verificationNote: { ...GlassStyle, borderRadius: BorderRadius.xl, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' },
  historicalNote: { backgroundColor: 'rgba(100, 116, 139, 0.1)', borderColor: 'rgba(100, 116, 139, 0.3)' },
  verificationIcon: { fontSize: 24 },
  verificationTextContainer: { flex: 1 },
  verificationTitle: { ...Typography.bodySm, fontFamily: 'Inter_600SemiBold', color: Colors.text, marginBottom: 4 },
  verificationText: { ...Typography.bodySm, color: Colors.textSecondary, lineHeight: 18 },

  submitButton: { backgroundColor: Colors.text, paddingVertical: 16, borderRadius: BorderRadius.xl, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { ...Typography.button, color: '#000' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius['3xl'], borderTopRightRadius: BorderRadius['3xl'], maxHeight: '70%', paddingTop: 20 },
  modalTitle: { ...Typography.h3, color: Colors.text, textAlign: 'center', marginBottom: 16 },

  currencyOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  currencyOptionActive: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  currencyOptionSymbol: { fontSize: 20, width: 40, textAlign: 'center', color: Colors.text },
  currencyOptionText: { flex: 1 },
  currencyOptionCode: { ...Typography.body, color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  currencyOptionName: { ...Typography.bodySm, color: Colors.textMuted },
  currencyCheck: { fontSize: 18, color: Colors.primary },

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
