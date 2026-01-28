// app/add-insurance.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { showSuccessToast, showErrorToast } from '../src/components/ToastConfig';
import { useWorkspace } from '../src/contexts/WorkspaceContext';
import {
  getInsuranceTypesWithSubtypes,
  getWorkspaceMembersWithDetails,
  getWorkspaceInvites,
  createInsurancePolicyWithMembers,
  getCurrentUser,
  isSupabaseReady,
  InsuranceTypeWithSubtypes,
  WorkspaceMember,
} from '../src/lib/supabase';

// Steps in the flow
type Step = 'type' | 'subtype' | 'form';

// Insurance types with icons (fallback if API fails)
const DEFAULT_TYPES = [
  { type_code: 'health', type_name: 'Health', type_icon: '🏥', subtypes: [] },
  { type_code: 'vehicle', type_name: 'Vehicle', type_icon: '🚗', subtypes: [] },
  { type_code: 'life', type_name: 'Life', type_icon: '🕊️', subtypes: [] },
  { type_code: 'property', type_name: 'Home', type_icon: '🏠', subtypes: [] },
  { type_code: 'travel', type_name: 'Travel', type_icon: '✈️', subtypes: [] },
  { type_code: 'other', type_name: 'Other', type_icon: '📄', subtypes: [] },
];

interface PendingInvite {
  id: string;
  invitee_name: string | null;
  relationship_label: string | null;
  relationship_icon: string | null;
}

interface SelectedMember {
  type: 'member' | 'invite' | 'custom';
  id?: string;
  name: string;
  icon: string;
  label: string;
}

export default function AddInsuranceScreen() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();

  // Step management
  const [step, setStep] = useState<Step>('type');

  // Data from API
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceTypeWithSubtypes[]>(DEFAULT_TYPES);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state - Type & Subtype
  const [selectedType, setSelectedType] = useState<InsuranceTypeWithSubtypes | null>(null);
  const [selectedSubtype, setSelectedSubtype] = useState<{ code: string; name: string; icon: string } | null>(null);

  // Form state - Policy Details
  const [providerName, setProviderName] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [sumInsured, setSumInsured] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumFrequency, setPremiumFrequency] = useState<'yearly' | 'monthly' | 'quarterly' | 'one_time'>('yearly');
  const [startDate, setStartDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year from now
  const [tpaName, setTpaName] = useState('');
  const [tpaHelpline, setTpaHelpline] = useState('');
  const [notes, setNotes] = useState('');

  // Covered members
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [currentWorkspace?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load insurance types
      if (isSupabaseReady()) {
        const types = await getInsuranceTypesWithSubtypes();
        if (types && types.length > 0) {
          setInsuranceTypes(types);
        }

        // Load workspace members and invites
        if (currentWorkspace?.id) {
          const [membersData, invitesData] = await Promise.all([
            getWorkspaceMembersWithDetails(currentWorkspace.id),
            getWorkspaceInvites(currentWorkspace.id),
          ]);
          setMembers(membersData || []);

          const pending = (invitesData || []).filter(
            (inv: PendingInvite) => ['pending', 'sent', 'opened'].includes((inv as any).status)
          );
          setPendingInvites(pending);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle type selection
  const handleSelectType = (type: InsuranceTypeWithSubtypes) => {
    setSelectedType(type);
    setSelectedSubtype(null);
    setStep('subtype');
  };

  // Handle subtype selection
  const handleSelectSubtype = (subtype: { code: string; name: string; icon: string }) => {
    setSelectedSubtype(subtype);
    setStep('form');
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === 'form') {
      setStep('subtype');
    } else if (step === 'subtype') {
      setStep('type');
    } else {
      router.back();
    }
  };

  // Toggle member selection
  const toggleMember = (member: SelectedMember) => {
    const exists = selectedMembers.find(
      m => m.type === member.type && m.id === member.id && m.name === member.name
    );
    if (exists) {
      setSelectedMembers(selectedMembers.filter(
        m => !(m.type === member.type && m.id === member.id && m.name === member.name)
      ));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const isMemberSelected = (type: string, id?: string, name?: string) => {
    return selectedMembers.some(
      m => m.type === type && m.id === id && (name ? m.name === name : true)
    );
  };

  // Submit the form
  const handleSubmit = async () => {
    if (!currentWorkspace?.id || !selectedType || !selectedSubtype) {
      showErrorToast('Error', 'Please complete all required fields');
      return;
    }

    if (!providerName.trim()) {
      showErrorToast('Error', 'Please enter provider name');
      return;
    }

    if (!expiryDate) {
      showErrorToast('Error', 'Please select expiry date');
      return;
    }

    setIsSaving(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        showErrorToast('Error', 'Please sign in again');
        return;
      }

      // Build covered members array
      const coveredMembers = selectedMembers.map(m => ({
        member_id: m.type === 'member' ? m.id : undefined,
        invite_id: m.type === 'invite' ? m.id : undefined,
        custom_name: m.type === 'custom' ? m.name : undefined,
        relationship_label: m.label,
        relationship_icon: m.icon,
      }));

      await createInsurancePolicyWithMembers(
        {
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          policy_type: selectedType.type_code,
          subtype: selectedSubtype.code,
          provider_name: providerName.trim(),
          scheme_name: schemeName.trim() || undefined,
          policy_number: policyNumber.trim() || undefined,
          sum_insured: sumInsured ? parseFloat(sumInsured.replace(/,/g, '')) : undefined,
          premium_amount: premiumAmount ? parseFloat(premiumAmount.replace(/,/g, '')) : undefined,
          premium_frequency: premiumFrequency,
          start_date: startDate.toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          tpa_name: tpaName.trim() || undefined,
          tpa_helpline: tpaHelpline.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        coveredMembers
      );

      showSuccessToast('Policy Added', `${selectedType.type_name} insurance saved`);
      router.back();
    } catch (err: any) {
      console.error('Error saving policy:', err);
      showErrorToast('Error', err.message || 'Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num).toLocaleString('en-IN');
  };

  // Render type selection step
  const renderTypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What type of insurance?</Text>
      <Text style={styles.stepSubtitle}>Select the category</Text>

      <View style={styles.typeGrid}>
        {insuranceTypes.map(type => (
          <Pressable
            key={type.type_code}
            style={styles.typeCard}
            onPress={() => handleSelectType(type)}
          >
            <Text style={styles.typeIcon}>{type.type_icon}</Text>
            <Text style={styles.typeLabel}>{type.type_name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // Render subtype selection step
  const renderSubtypeStep = () => {
    const subtypes = selectedType?.subtypes || [];

    return (
      <View style={styles.stepContent}>
        <View style={styles.selectedTypeHeader}>
          <Text style={styles.selectedTypeIcon}>{selectedType?.type_icon}</Text>
          <Text style={styles.selectedTypeName}>{selectedType?.type_name} Insurance</Text>
        </View>

        <Text style={styles.stepSubtitle}>Select policy type</Text>

        <ScrollView style={styles.subtypeList} showsVerticalScrollIndicator={false}>
          {subtypes.map(subtype => (
            <Pressable
              key={subtype.code}
              style={styles.subtypeCard}
              onPress={() => handleSelectSubtype(subtype)}
            >
              <Text style={styles.subtypeIcon}>{subtype.icon}</Text>
              <View style={styles.subtypeInfo}>
                <Text style={styles.subtypeName}>{subtype.name}</Text>
                <Text style={styles.subtypeDesc}>{subtype.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>
          ))}

          {subtypes.length === 0 && (
            <Pressable
              style={styles.subtypeCard}
              onPress={() => handleSelectSubtype({ code: selectedType?.type_code + '_general', name: 'General', icon: selectedType?.type_icon || '📄' })}
            >
              <Text style={styles.subtypeIcon}>{selectedType?.type_icon}</Text>
              <View style={styles.subtypeInfo}>
                <Text style={styles.subtypeName}>General {selectedType?.type_name}</Text>
                <Text style={styles.subtypeDesc}>Standard policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render form step
  const renderFormStep = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.formContainer}
    >
      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* Selected Type Badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeIcon}>{selectedType?.type_icon}</Text>
          <Text style={styles.typeBadgeText}>
            {selectedType?.type_name} • {selectedSubtype?.name}
          </Text>
        </View>

        {/* Provider & Policy Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>PROVIDER & POLICY</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Insurance Provider *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., HDFC Ergo, Star Health"
              placeholderTextColor={Colors.textMuted}
              value={providerName}
              onChangeText={setProviderName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Scheme/Plan Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Optima Secure, Family Floater"
              placeholderTextColor={Colors.textMuted}
              value={schemeName}
              onChangeText={setSchemeName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Policy Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter policy number"
              placeholderTextColor={Colors.textMuted}
              value={policyNumber}
              onChangeText={setPolicyNumber}
            />
          </View>
        </View>

        {/* Coverage Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>COVERAGE</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sum Insured (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10,00,000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={sumInsured}
              onChangeText={v => setSumInsured(formatCurrency(v))}
            />
          </View>

          {/* Covered Members */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Covered Members</Text>
            <View style={styles.membersGrid}>
              {/* Workspace Members */}
              {members.map(member => (
                <Pressable
                  key={member.member_id}
                  style={[
                    styles.memberChip,
                    isMemberSelected('member', member.member_id) && styles.memberChipSelected,
                  ]}
                  onPress={() =>
                    toggleMember({
                      type: 'member',
                      id: member.member_id,
                      name: member.full_name,
                      icon: member.relationship_icon || '👤',
                      label: member.relationship_label || 'Member',
                    })
                  }
                >
                  <Text style={styles.memberChipIcon}>
                    {member.relationship_icon || (member.is_owner ? '👑' : '👤')}
                  </Text>
                  <Text style={styles.memberChipName}>{member.full_name?.split(' ')[0]}</Text>
                  {isMemberSelected('member', member.member_id) && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  )}
                </Pressable>
              ))}

              {/* Pending Invites */}
              {pendingInvites.map(invite => (
                <Pressable
                  key={invite.id}
                  style={[
                    styles.memberChip,
                    styles.memberChipPending,
                    isMemberSelected('invite', invite.id) && styles.memberChipSelected,
                  ]}
                  onPress={() =>
                    toggleMember({
                      type: 'invite',
                      id: invite.id,
                      name: invite.invitee_name || invite.relationship_label || 'Pending',
                      icon: invite.relationship_icon || '📨',
                      label: invite.relationship_label || 'Pending',
                    })
                  }
                >
                  <Text style={styles.memberChipIcon}>{invite.relationship_icon || '📨'}</Text>
                  <Text style={styles.memberChipName}>
                    {(invite.invitee_name || invite.relationship_label || 'Pending').split(' ')[0]}
                  </Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                  {isMemberSelected('invite', invite.id) && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  )}
                </Pressable>
              ))}
            </View>
            {selectedMembers.length > 0 && (
              <Text style={styles.selectedCount}>
                {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
              </Text>
            )}
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>VALIDITY</Text>

          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateText}>{startDate.toLocaleDateString('en-IN')}</Text>
                <Ionicons name="calendar" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Expiry Date *</Text>
              <Pressable style={styles.dateInput} onPress={() => setShowExpiryPicker(true)}>
                <Text style={styles.dateText}>{expiryDate.toLocaleDateString('en-IN')}</Text>
                <Ionicons name="calendar" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartPicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}

          {showExpiryPicker && (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowExpiryPicker(false);
                if (date) setExpiryDate(date);
              }}
            />
          )}
        </View>

        {/* Premium Section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>PREMIUM</Text>

          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 25,000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={premiumAmount}
                onChangeText={v => setPremiumAmount(formatCurrency(v))}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {(['yearly', 'monthly', 'quarterly'] as const).map(freq => (
                  <Pressable
                    key={freq}
                    style={[
                      styles.freqChip,
                      premiumFrequency === freq && styles.freqChipActive,
                    ]}
                    onPress={() => setPremiumFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        premiumFrequency === freq && styles.freqChipTextActive,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1, 3)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* TPA Section (for Health) */}
        {selectedType?.type_code === 'health' && (
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>TPA DETAILS</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TPA Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Medi Assist, Health India"
                placeholderTextColor={Colors.textMuted}
                value={tpaName}
                onChangeText={setTpaName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TPA Helpline</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1800-XXX-XXXX"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={tpaHelpline}
                onChangeText={setTpaHelpline}
              />
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any additional notes..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <Pressable
          style={[styles.submitButton, isSaving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.submitButtonText}>Save Insurance Policy</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === 'type' ? 'Add Insurance' : step === 'subtype' ? 'Select Type' : 'Policy Details'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, step === 'type' && styles.stepDotActive]} />
        <View style={[styles.stepLine, (step === 'subtype' || step === 'form') && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 'subtype' && styles.stepDotActive]} />
        <View style={[styles.stepLine, step === 'form' && styles.stepLineActive]} />
        <View style={[styles.stepDot, step === 'form' && styles.stepDotActive]} />
      </View>

      {/* Content */}
      {step === 'type' && renderTypeStep()}
      {step === 'subtype' && renderSubtypeStep()}
      {step === 'form' && renderFormStep()}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  typeCard: {
    width: '45%',
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeIcon: {
    fontSize: 40,
  },
  typeLabel: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  selectedTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  selectedTypeIcon: {
    fontSize: 28,
  },
  selectedTypeName: {
    ...Typography.h3,
    color: Colors.text,
  },
  subtypeList: {
    flex: 1,
  },
  subtypeCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subtypeIcon: {
    fontSize: 28,
  },
  subtypeInfo: {
    flex: 1,
  },
  subtypeName: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  subtypeDesc: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
  },
  formScroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginVertical: Spacing.md,
  },
  typeBadgeIcon: {
    fontSize: 16,
  },
  typeBadgeText: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
  },
  formSection: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateInput: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    ...Typography.body,
    color: Colors.text,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  freqChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  freqChipActive: {
    backgroundColor: Colors.primary,
  },
  freqChipText: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  freqChipTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  memberChipSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: Colors.success,
  },
  memberChipPending: {
    borderStyle: 'dashed',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  memberChipIcon: {
    fontSize: 16,
  },
  memberChipName: {
    ...Typography.bodySm,
    color: Colors.text,
  },
  pendingBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pendingBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fbbf24',
  },
  selectedCount: {
    ...Typography.bodySm,
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  bottomPadding: {
    height: 120,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButton: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    ...Typography.button,
    color: '#000',
  },
});
