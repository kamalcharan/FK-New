// app/(auth)/guided-entry.tsx
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { useAppSelector } from '../../src/hooks/useStore';
import {
  createInsurancePolicyWithMembers,
  createLoan,
  createRenewal,
  isSupabaseReady,
  getCurrentUser,
} from '../../src/lib/supabase';
import { showSuccessToast, showErrorToast } from '../../src/components/ToastConfig';
import { getIndustryByCode } from '../../src/constants/renewals';

// Pain point configs
const PAIN_POINT_CONFIG = {
  insurance: {
    icon: '🛡️',
    title: 'Secure your first policy',
    subtitle: 'Start with the one that matters most. You can always add more later.',
    successTitle: 'Policy Saved!',
    successMessage: 'Your family will never lose track of this again.',
  },
  loans: {
    icon: '💰',
    title: 'Record your first loan',
    subtitle: 'The one nobody wrote down. Let\'s fix that now.',
    successTitle: 'Loan Recorded!',
    successMessage: 'This is now in your family\'s memory forever.',
  },
  compliance: {
    icon: '📋',
    title: 'Track your first compliance',
    subtitle: 'Pick the one that keeps you up at night. We\'ll watch it for you.',
    successTitle: 'Compliance Tracked!',
    successMessage: 'You\'ll never miss this deadline again.',
  },
};

const INSURANCE_TYPES = [
  { code: 'health', label: 'Health', icon: '🏥' },
  { code: 'vehicle', label: 'Vehicle', icon: '🚗' },
  { code: 'life', label: 'Life', icon: '🕊️' },
  { code: 'property', label: 'Home', icon: '🏠' },
];

// Default compliance presets (fallback when no industry selected)
const DEFAULT_COMPLIANCE_PRESETS = [
  { code: 'fire_noc', label: 'Fire NOC', icon: '🔥' },
  { code: 'trade_license', label: 'Trade License', icon: '📜' },
  { code: 'fssai', label: 'FSSAI', icon: '🍽️' },
  { code: 'pollution', label: 'Pollution', icon: '🏭' },
  { code: 'other', label: 'Other', icon: '📋' },
];

// Industry-specific compliance presets
const INDUSTRY_COMPLIANCE_PRESETS: Record<string, { code: string; label: string; icon: string }[]> = {
  food_service: [
    { code: 'fssai_license', label: 'FSSAI License', icon: '🍽️' },
    { code: 'fire_noc', label: 'Fire NOC', icon: '🔥' },
    { code: 'trade_license', label: 'Trade License', icon: '📜' },
    { code: 'health_license', label: 'Health License', icon: '🏥' },
  ],
  retail: [
    { code: 'trade_license', label: 'Trade License', icon: '📜' },
    { code: 'gst_filing', label: 'GST Return', icon: '📊' },
    { code: 'fire_noc', label: 'Fire NOC', icon: '🔥' },
    { code: 'shop_establishment', label: 'Shop License', icon: '🏪' },
  ],
  manufacturing: [
    { code: 'pollution_consent', label: 'Pollution Board', icon: '🏭' },
    { code: 'factory_license', label: 'Factory License', icon: '⚙️' },
    { code: 'fire_noc', label: 'Fire NOC', icon: '🔥' },
    { code: 'labour_license', label: 'Labour License', icon: '👷' },
  ],
  real_estate: [
    { code: 'property_tax', label: 'Property Tax', icon: '🏠' },
    { code: 'fire_noc', label: 'Fire NOC', icon: '🔥' },
    { code: 'building_plan_approval', label: 'Building Plan', icon: '📐' },
    { code: 'occupancy_certificate', label: 'Occupancy Cert', icon: '🏗️' },
  ],
  healthcare: [
    { code: 'clinical_establishment', label: 'Clinic License', icon: '🏥' },
    { code: 'biomedical_waste', label: 'Biomedical Waste', icon: '⚕️' },
    { code: 'drug_license', label: 'Drug License', icon: '💊' },
    { code: 'fire_noc', label: 'Fire NOC', icon: '🔥' },
  ],
  professional: [
    { code: 'gst_filing', label: 'GST Return', icon: '📊' },
    { code: 'professional_tax', label: 'Professional Tax', icon: '👔' },
    { code: 'trade_license', label: 'Trade License', icon: '📜' },
    { code: 'shop_establishment', label: 'Shop License', icon: '🏪' },
  ],
};

function getCompliancePresets(industryCode?: string) {
  if (industryCode && INDUSTRY_COMPLIANCE_PRESETS[industryCode]) {
    return INDUSTRY_COMPLIANCE_PRESETS[industryCode];
  }
  return DEFAULT_COMPLIANCE_PRESETS;
}

export default function GuidedEntryScreen() {
  const { painPoint, workspaceName, workspaceId, industry } = useLocalSearchParams<{
    painPoint?: string;
    workspaceName?: string;
    workspaceId?: string;
    industry?: string;
  }>();

  const { user } = useAppSelector(state => state.auth);
  const activePainPoint = (painPoint || 'insurance') as keyof typeof PAIN_POINT_CONFIG;
  const config = PAIN_POINT_CONFIG[activePainPoint];

  // Get industry-specific compliance presets
  const compliancePresets = getCompliancePresets(industry);
  const industryConfig = industry ? getIndustryByCode(industry) : undefined;

  // Override header for compliance users with industry context
  const headerConfig = activePainPoint === 'compliance' && industryConfig
    ? {
        icon: industryConfig.icon,
        title: `Track your ${industryConfig.label} compliance`,
        subtitle: `We've picked the top licenses for your business. Start with one.`,
        successTitle: config.successTitle,
        successMessage: config.successMessage,
      }
    : config;

  const [isLoading, setIsLoading] = useState(false);

  // Insurance fields
  const [policyType, setPolicyType] = useState('health');
  const [providerName, setProviderName] = useState('');
  const [sumInsured, setSumInsured] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Loan fields
  const [loanType, setLoanType] = useState<'given' | 'taken'>('given');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState(new Date());
  const [showLoanDatePicker, setShowLoanDatePicker] = useState(false);
  const [loanPurpose, setLoanPurpose] = useState('');

  // Compliance fields — default to first industry-relevant preset
  const [complianceType, setComplianceType] = useState(compliancePresets[0]?.code || 'fire_noc');
  const [complianceExpiry, setComplianceExpiry] = useState(new Date());
  const [showComplianceDatePicker, setShowComplianceDatePicker] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const navigateToInvite = () => {
    router.replace({
      pathname: '/(auth)/family-invite',
      params: {
        workspaceName: workspaceName || '',
        workspaceId: workspaceId || '',
        painPoint: activePainPoint,
      },
    });
  };

  // --- Insurance save ---
  const handleSaveInsurance = async () => {
    if (!providerName.trim()) return;
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        showSuccessToast(headerConfig.successTitle, headerConfig.successMessage);
        navigateToInvite();
        return;
      }

      const currentUser = user?.id ? { id: user.id } : await getCurrentUser();
      if (!currentUser) {
        showErrorToast('Session Error', 'Please sign in again');
        return;
      }

      await createInsurancePolicyWithMembers(
        {
          workspace_id: workspaceId || 'demo-workspace',
          created_by: currentUser.id,
          policy_type: policyType,
          provider_name: providerName.trim(),
          sum_insured: sumInsured ? parseFloat(sumInsured) : undefined,
          expiry_date: expiryDate.toISOString().split('T')[0],
        },
        []
      );

      showSuccessToast(headerConfig.successTitle, headerConfig.successMessage);
      navigateToInvite();
    } catch (err: any) {
      showErrorToast('Save Failed', err.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Loan save ---
  const handleSaveLoan = async () => {
    if (!counterpartyName.trim() || !loanAmount) return;
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        showSuccessToast(headerConfig.successTitle, headerConfig.successMessage);
        navigateToInvite();
        return;
      }

      const currentUser = user?.id ? { id: user.id } : await getCurrentUser();
      if (!currentUser) {
        showErrorToast('Session Error', 'Please sign in again');
        return;
      }

      await createLoan({
        workspace_id: workspaceId || 'demo-workspace',
        created_by: currentUser.id,
        loan_type: loanType,
        counterparty_name: counterpartyName.trim(),
        principal_amount: parseFloat(loanAmount),
        loan_date: loanDate.toISOString().split('T')[0],
        purpose: loanPurpose.trim() || undefined,
        is_historical: true,
      });

      showSuccessToast(headerConfig.successTitle, headerConfig.successMessage);
      navigateToInvite();
    } catch (err: any) {
      showErrorToast('Save Failed', err.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Compliance save ---
  const handleSaveCompliance = async () => {
    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        showSuccessToast(headerConfig.successTitle, headerConfig.successMessage);
        navigateToInvite();
        return;
      }

      const currentUser = user?.id ? { id: user.id } : await getCurrentUser();
      if (!currentUser) {
        showErrorToast('Session Error', 'Please sign in again');
        return;
      }

      const preset = compliancePresets.find(p => p.code === complianceType);

      await createRenewal({
        workspace_id: workspaceId || 'demo-workspace',
        created_by: currentUser.id,
        title: preset?.label || 'Compliance Item',
        expiry_date: complianceExpiry.toISOString().split('T')[0],
        preset_code: complianceType !== 'other' ? complianceType : undefined,
        reference_number: referenceNumber.trim() || undefined,
      });

      showSuccessToast(headerConfig.successTitle, headerConfig.successMessage);
      navigateToInvite();
    } catch (err: any) {
      showErrorToast('Save Failed', err.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    switch (activePainPoint) {
      case 'insurance': return handleSaveInsurance();
      case 'loans': return handleSaveLoan();
      case 'compliance': return handleSaveCompliance();
    }
  };

  const isSaveDisabled = () => {
    switch (activePainPoint) {
      case 'insurance': return !providerName.trim();
      case 'loans': return !counterpartyName.trim() || !loanAmount;
      case 'compliance': return false; // Always saveable with defaults
    }
  };

  // --- Render Insurance Form ---
  const renderInsuranceForm = () => (
    <>
      <View>
        <Text style={styles.label}>TYPE OF INSURANCE</Text>
        <View style={styles.chipRow}>
          {INSURANCE_TYPES.map((type) => (
            <Pressable
              key={type.code}
              style={[styles.chip, policyType === type.code && styles.chipSelected]}
              onPress={() => setPolicyType(type.code)}
            >
              <Text style={styles.chipIcon}>{type.icon}</Text>
              <Text style={[styles.chipText, policyType === type.code && styles.chipTextSelected]}>
                {type.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>INSURANCE PROVIDER</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Star Health, ICICI Lombard"
          placeholderTextColor={Colors.textPlaceholder}
          value={providerName}
          onChangeText={setProviderName}
          autoCapitalize="words"
        />
      </View>

      <View>
        <Text style={styles.label}>SUM INSURED (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 500000"
          placeholderTextColor={Colors.textPlaceholder}
          value={sumInsured}
          onChangeText={setSumInsured}
          keyboardType="numeric"
        />
      </View>

      <View>
        <Text style={styles.label}>POLICY EXPIRY DATE</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{formatDate(expiryDate)}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={expiryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setExpiryDate(selectedDate);
            }}
            themeVariant="dark"
          />
        )}
      </View>
    </>
  );

  // --- Render Loan Form ---
  const renderLoanForm = () => (
    <>
      <View>
        <Text style={styles.label}>LOAN TYPE</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, loanType === 'given' && styles.toggleSelected]}
            onPress={() => setLoanType('given')}
          >
            <Text style={[styles.toggleText, loanType === 'given' && styles.toggleTextSelected]}>
              💸 Given
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, loanType === 'taken' && styles.toggleSelected]}
            onPress={() => setLoanType('taken')}
          >
            <Text style={[styles.toggleText, loanType === 'taken' && styles.toggleTextSelected]}>
              🤲 Taken
            </Text>
          </Pressable>
        </View>
      </View>

      <View>
        <Text style={styles.label}>
          {loanType === 'given' ? 'GIVEN TO' : 'TAKEN FROM'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Person or family name"
          placeholderTextColor={Colors.textPlaceholder}
          value={counterpartyName}
          onChangeText={setCounterpartyName}
          autoCapitalize="words"
        />
      </View>

      <View>
        <Text style={styles.label}>AMOUNT (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 200000"
          placeholderTextColor={Colors.textPlaceholder}
          value={loanAmount}
          onChangeText={setLoanAmount}
          keyboardType="numeric"
        />
      </View>

      <View>
        <Text style={styles.label}>WHEN</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowLoanDatePicker(true)}>
          <Text style={styles.dateText}>{formatDate(loanDate)}</Text>
        </Pressable>
        {showLoanDatePicker && (
          <DateTimePicker
            value={loanDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_, selectedDate) => {
              setShowLoanDatePicker(Platform.OS === 'ios');
              if (selectedDate) setLoanDate(selectedDate);
            }}
            themeVariant="dark"
          />
        )}
      </View>

      <View>
        <Text style={styles.label}>PURPOSE (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Medical emergency, education"
          placeholderTextColor={Colors.textPlaceholder}
          value={loanPurpose}
          onChangeText={setLoanPurpose}
          autoCapitalize="sentences"
        />
      </View>
    </>
  );

  // --- Render Compliance Form ---
  const renderComplianceForm = () => (
    <>
      {industryConfig && (
        <View style={styles.industryBadge}>
          <Text style={styles.industryBadgeText}>
            {industryConfig.icon} Showing compliance for {industryConfig.label}
          </Text>
        </View>
      )}

      <View>
        <Text style={styles.label}>COMPLIANCE TYPE</Text>
        <View style={styles.chipRow}>
          {compliancePresets.map((preset) => (
            <Pressable
              key={preset.code}
              style={[styles.chip, complianceType === preset.code && styles.chipSelected]}
              onPress={() => setComplianceType(preset.code)}
            >
              <Text style={styles.chipIcon}>{preset.icon}</Text>
              <Text style={[styles.chipText, complianceType === preset.code && styles.chipTextSelected]}>
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.label}>EXPIRY / DUE DATE</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowComplianceDatePicker(true)}>
          <Text style={styles.dateText}>{formatDate(complianceExpiry)}</Text>
        </Pressable>
        {showComplianceDatePicker && (
          <DateTimePicker
            value={complianceExpiry}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selectedDate) => {
              setShowComplianceDatePicker(Platform.OS === 'ios');
              if (selectedDate) setComplianceExpiry(selectedDate);
            }}
            themeVariant="dark"
          />
        )}
      </View>

      <View>
        <Text style={styles.label}>REFERENCE NUMBER (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="License or certificate number"
          placeholderTextColor={Colors.textPlaceholder}
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          autoCapitalize="characters"
        />
      </View>
    </>
  );

  const renderForm = () => {
    switch (activePainPoint) {
      case 'insurance': return renderInsuranceForm();
      case 'loans': return renderLoanForm();
      case 'compliance': return renderComplianceForm();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Building Tag */}
        <Text style={styles.buildingTag}>BUILDING YOUR FAMILY'S SECOND BRAIN</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{headerConfig.icon}</Text>
          <Text style={styles.title}>{headerConfig.title}</Text>
          <Text style={styles.subtitle}>{headerConfig.subtitle}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {renderForm()}
        </View>

        {/* Save Button */}
        <Button
          title={isLoading ? 'Saving...' : 'Save & Continue'}
          variant="primary"
          onPress={handleSave}
          disabled={isSaveDisabled() || isLoading}
          loading={isLoading}
        />

        {/* Skip */}
        <Pressable onPress={navigateToInvite} style={styles.skipButton}>
          <Text style={styles.skipText}>I'll add this later</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  buildingTag: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  icon: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  chipSelected: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
  },
  toggleSelected: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  toggleTextSelected: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  dateButton: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius['2xl'],
    padding: 20,
  },
  dateText: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  skipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  industryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  industryBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
});
