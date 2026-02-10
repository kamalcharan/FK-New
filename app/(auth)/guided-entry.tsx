// app/(auth)/guided-entry.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
  getRenewalBundles,
  getRenewalBundleByCode,
  getRenewalPresets,
  getOnboardingContext,
  updateOnboardingContext,
  RenewalPreset,
  RenewalBundle,
} from '../../src/lib/supabase';
import { showSuccessToast, showErrorToast } from '../../src/components/ToastConfig';
import { formatCostRange } from '../../src/constants/renewals';

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
    title: 'What describes you best?',
    subtitle: 'We\'ll show you the exact licenses and deadlines that matter.',
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

// Resolved preset with full info from DB
type ResolvedPreset = {
  code: string;
  title: string;
  icon: string;
  frequency_months?: number | null;
  cost_range_min?: number | null;
  cost_range_max?: number | null;
  penalty_info?: string | null;
};

// Compliance has two phases: pick persona, then pick compliance item
type CompliancePhase = 'persona' | 'items';

export default function GuidedEntryScreen() {
  const { painPoint, workspaceName, workspaceId, persona } = useLocalSearchParams<{
    painPoint?: string;
    workspaceName?: string;
    workspaceId?: string;
    persona?: string;
  }>();

  const { user } = useAppSelector(state => state.auth);
  const activePainPoint = (painPoint || 'insurance') as keyof typeof PAIN_POINT_CONFIG;
  const config = PAIN_POINT_CONFIG[activePainPoint];

  // Compliance: two-phase flow (persona picker → compliance items)
  const [compliancePhase, setCompliancePhase] = useState<CompliancePhase>('persona');
  const [allBundles, setAllBundles] = useState<RenewalBundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(activePainPoint === 'compliance');
  const [compliancePresets, setCompliancePresets] = useState<ResolvedPreset[]>([]);
  const [personaBundle, setPersonaBundle] = useState<RenewalBundle | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // On mount: load bundles for persona picker, and check if persona already exists
  useEffect(() => {
    if (activePainPoint !== 'compliance') return;

    const init = async () => {
      try {
        // Load all bundles for persona picker
        const bundles = await getRenewalBundles();
        setAllBundles(bundles);

        // Check if persona already known (from param or metadata)
        let personaCode = persona || '';
        if (!personaCode && user?.id) {
          const ctx = await getOnboardingContext(user.id);
          personaCode = ctx?.persona || '';
        }

        if (personaCode) {
          // Persona already known — skip to items phase
          const bundle = bundles.find(b => b.code === personaCode) || null;
          if (bundle) {
            setPersonaBundle(bundle);
            setCompliancePhase('items');
            await loadPresetsForBundle(bundle);
          }
        }
      } catch (err) {
        console.error('[GuidedEntry] Init error:', err);
      } finally {
        setBundlesLoading(false);
      }
    };

    init();
  }, [activePainPoint]);

  // Load presets for a selected bundle
  const loadPresetsForBundle = async (bundle: RenewalBundle) => {
    setPresetsLoading(true);
    try {
      const allPresets = await getRenewalPresets();
      const resolved = bundle.preset_codes
        .map(code => {
          const preset = allPresets.find(p => p.code === code);
          if (preset) {
            return {
              code: preset.code,
              title: preset.title,
              icon: preset.icon || '📋',
              frequency_months: preset.frequency_months,
              cost_range_min: preset.cost_range_min,
              cost_range_max: preset.cost_range_max,
              penalty_info: preset.penalty_info,
            };
          }
          return null;
        })
        .filter(Boolean) as ResolvedPreset[];

      setCompliancePresets(resolved);
    } catch (err) {
      console.error('[GuidedEntry] Failed to load presets:', err);
    } finally {
      setPresetsLoading(false);
    }
  };

  // Handle persona selection (inline)
  const handlePersonaSelect = async (bundle: RenewalBundle) => {
    setPersonaBundle(bundle);
    setCompliancePhase('items');

    // Save persona to metadata
    try {
      if (isSupabaseReady() && user?.id) {
        await updateOnboardingContext(user.id, {
          persona: bundle.code,
          persona_title: bundle.title,
        });
      }
    } catch (err) {
      console.error('[GuidedEntry] Failed to save persona:', err);
    }

    await loadPresetsForBundle(bundle);
  };

  // Dynamic header based on phase and persona
  const getHeaderConfig = () => {
    if (activePainPoint !== 'compliance') return config;

    if (compliancePhase === 'persona') {
      return config; // "What describes you best?"
    }

    // Items phase — personalized header
    if (personaBundle) {
      return {
        icon: personaBundle.icon || config.icon,
        title: `Track your ${personaBundle.title} compliance`,
        subtitle: personaBundle.hook || 'Pick the one that keeps you up at night. We\'ll watch it for you.',
        successTitle: config.successTitle,
        successMessage: config.successMessage,
      };
    }

    return config;
  };

  const headerConfig = getHeaderConfig();

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

  // Compliance fields
  const [selectedPresetCode, setSelectedPresetCode] = useState<string | null>(null);
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
    if (!selectedPresetCode) return;
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

      const preset = compliancePresets.find(p => p.code === selectedPresetCode);

      await createRenewal({
        workspace_id: workspaceId || 'demo-workspace',
        created_by: currentUser.id,
        title: preset?.title || 'Compliance Item',
        expiry_date: complianceExpiry.toISOString().split('T')[0],
        preset_code: selectedPresetCode,
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
      case 'compliance': return !selectedPresetCode;
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

  // --- Render Compliance: Phase 1 — Persona Picker (inline) ---
  const renderPersonaPicker = () => (
    <>
      {bundlesLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
      ) : (
        <View style={styles.personaGrid}>
          {allBundles.map((bundle) => (
            <Pressable
              key={bundle.id}
              style={({ pressed }) => [
                styles.personaCard,
                pressed && styles.personaCardPressed,
              ]}
              onPress={() => handlePersonaSelect(bundle)}
            >
              <Text style={styles.personaCardIcon}>{bundle.icon || '📋'}</Text>
              <Text style={styles.personaCardTitle}>{bundle.title}</Text>
              <Text style={styles.personaCardCount}>
                {bundle.preset_codes.length} items
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );

  // --- Render Compliance: Phase 2 — Compliance Items List ---
  const renderComplianceItems = () => (
    <>
      {presetsLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
      ) : compliancePresets.length > 0 ? (
        <View>
          <Text style={styles.label}>TAP ONE TO START TRACKING</Text>
          <View style={styles.complianceList}>
            {compliancePresets.map((preset) => {
              const isSelected = selectedPresetCode === preset.code;
              return (
                <View key={preset.code}>
                  <Pressable
                    style={[styles.complianceCard, isSelected && styles.complianceCardSelected]}
                    onPress={() => setSelectedPresetCode(isSelected ? null : preset.code)}
                  >
                    <View style={styles.complianceCardLeft}>
                      <Text style={styles.complianceCardIcon}>{preset.icon}</Text>
                      <View style={styles.complianceCardInfo}>
                        <Text style={[styles.complianceCardTitle, isSelected && styles.complianceCardTitleSelected]}>
                          {preset.title}
                        </Text>
                        <View style={styles.complianceCardMeta}>
                          {preset.frequency_months && (
                            <Text style={styles.complianceCardFreq}>
                              {preset.frequency_months >= 12
                                ? `Every ${preset.frequency_months / 12}yr`
                                : `Every ${preset.frequency_months}mo`}
                            </Text>
                          )}
                          {preset.cost_range_min != null && preset.cost_range_max != null && (
                            <Text style={styles.complianceCardCost}>
                              {formatCostRange(preset.cost_range_min, preset.cost_range_max)}
                            </Text>
                          )}
                        </View>
                        {preset.penalty_info && (
                          <Text style={styles.complianceCardPenalty} numberOfLines={1}>
                            {preset.penalty_info}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={[styles.complianceRadio, isSelected && styles.complianceRadioSelected]}>
                      {isSelected && <View style={styles.complianceRadioDot} />}
                    </View>
                  </Pressable>

                  {/* Inline expiry date when selected */}
                  {isSelected && (
                    <View style={styles.inlineDateSection}>
                      <Text style={styles.inlineDateLabel}>EXPIRY / DUE DATE</Text>
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

                      <Text style={[styles.inlineDateLabel, { marginTop: Spacing.md }]}>
                        REFERENCE NUMBER (OPTIONAL)
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="License or certificate number"
                        placeholderTextColor={Colors.textPlaceholder}
                        value={referenceNumber}
                        onChangeText={setReferenceNumber}
                        autoCapitalize="characters"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Change persona link */}
          <Pressable
            style={styles.changePersonaButton}
            onPress={() => {
              setCompliancePhase('persona');
              setPersonaBundle(null);
              setCompliancePresets([]);
              setSelectedPresetCode(null);
            }}
          >
            <Text style={styles.changePersonaText}>Not you? Pick a different profile</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.noPersonaHint}>
          <Text style={styles.noPersonaText}>
            No compliance items found for this profile.
          </Text>
        </View>
      )}
    </>
  );

  // --- Render Compliance Form (both phases) ---
  const renderComplianceForm = () => {
    if (compliancePhase === 'persona') {
      return renderPersonaPicker();
    }
    return renderComplianceItems();
  };

  const renderForm = () => {
    switch (activePainPoint) {
      case 'insurance': return renderInsuranceForm();
      case 'loans': return renderLoanForm();
      case 'compliance': return renderComplianceForm();
    }
  };

  // Hide save button during persona picker phase
  const showSaveButton = activePainPoint !== 'compliance' || compliancePhase === 'items';

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

        {/* Debug: remove after confirming new code loads */}
        <Text style={{ color: '#f59e0b', fontSize: 10, marginBottom: 4 }}>v7-inline-persona | pain={painPoint} | phase={activePainPoint === 'compliance' ? compliancePhase : 'n/a'}</Text>

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

        {/* Save Button — hidden during persona picker */}
        {showSaveButton && (
          <Button
            title={isLoading ? 'Saving...' : 'Save & Continue'}
            variant="primary"
            onPress={handleSave}
            disabled={isSaveDisabled() || isLoading}
            loading={isLoading}
          />
        )}

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

  // Persona picker grid (inline in guided-entry)
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  personaCard: {
    width: '47%',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: BorderRadius.xl,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  personaCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  personaCardIcon: {
    fontSize: 28,
  },
  personaCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
  },
  personaCardCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Compliance list styles
  complianceList: {
    gap: Spacing.sm,
  },
  complianceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  complianceCardSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: Colors.primary,
  },
  complianceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  complianceCardIcon: {
    fontSize: 24,
  },
  complianceCardInfo: {
    flex: 1,
  },
  complianceCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  complianceCardTitleSelected: {
    color: Colors.primary,
  },
  complianceCardMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  complianceCardFreq: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  complianceCardCost: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  complianceCardPenalty: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 2,
  },
  complianceRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  complianceRadioSelected: {
    borderColor: Colors.primary,
  },
  complianceRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  inlineDateSection: {
    paddingHorizontal: 16,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    marginTop: -1,
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  inlineDateLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  changePersonaButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  changePersonaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.primary,
  },
  noPersonaHint: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  noPersonaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
