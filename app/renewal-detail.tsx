// app/renewal-detail.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { useAppSelector } from '../src/store';
import {
  getRenewalById,
  updateRenewal,
  deleteRenewal,
  markRenewalAsRenewed,
  getRenewalPresetByCode,
  RenewalPreset,
} from '../src/lib/supabase';
import {
  calculateDaysUntilExpiry,
  getRenewalUrgencyStatus,
  formatExpiryDate,
  formatCostRange,
  suggestNextExpiryDate,
  getCategoryIcon,
} from '../src/constants/renewals';

interface Renewal {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  renewal_type?: string;
  category?: string;
  subcategory?: string;
  authority_name?: string;
  reference_number?: string;
  property_address?: string;
  fee_amount?: number;
  issue_date?: string;
  expiry_date: string;
  frequency_months?: number;
  preset_code?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function RenewalDetailScreen() {
  const router = useRouter();
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const { user } = useAppSelector(state => state.auth);

  // State
  const [renewal, setRenewal] = useState<Renewal | null>(null);
  const [preset, setPreset] = useState<RenewalPreset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState({
    title: '',
    authority_name: '',
    reference_number: '',
    expiry_date: '',
    fee_amount: '',
    notes: '',
  });

  // Renew modal state
  const [renewData, setRenewData] = useState({
    new_expiry_date: '',
    new_reference_number: '',
    cost_paid: '',
    payment_ref: '',
    notes: '',
  });
  const [useCustomDate, setUseCustomDate] = useState(false);

  // Load renewal data
  useEffect(() => {
    if (id) {
      loadRenewal();
    }
  }, [id]);

  // Auto-open renew modal if action='renew'
  useEffect(() => {
    if (action === 'renew' && renewal && !showRenewModal) {
      openRenewModal();
    }
  }, [action, renewal]);

  const loadRenewal = async () => {
    try {
      const data = await getRenewalById(id!);
      if (data) {
        setRenewal(data as Renewal);
        setEditData({
          title: data.title || '',
          authority_name: data.authority_name || '',
          reference_number: data.reference_number || '',
          expiry_date: data.expiry_date || '',
          fee_amount: data.fee_amount?.toString() || '',
          notes: data.notes || '',
        });

        // Load preset if available
        if (data.preset_code) {
          const presetData = await getRenewalPresetByCode(data.preset_code);
          setPreset(presetData);
        }
      }
    } catch (error) {
      console.error('Error loading renewal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!renewal || !editData.title || !editData.expiry_date) return;

    setIsSaving(true);
    try {
      await updateRenewal(renewal.id, {
        title: editData.title,
        authority_name: editData.authority_name || undefined,
        reference_number: editData.reference_number || undefined,
        expiry_date: editData.expiry_date,
        fee_amount: editData.fee_amount ? parseFloat(editData.fee_amount) : undefined,
        notes: editData.notes || undefined,
      });
      await loadRenewal();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating renewal:', error);
      Alert.alert('Error', 'Failed to update renewal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsRenewed = async () => {
    if (!renewal || !renewData.new_expiry_date) return;

    setIsSaving(true);
    try {
      await markRenewalAsRenewed(
        renewal.id,
        renewData.new_expiry_date,
        renewData.new_reference_number || undefined,
        renewData.cost_paid ? parseFloat(renewData.cost_paid) : undefined,
        renewData.notes || undefined
      );
      setShowRenewModal(false);
      setRenewData({
        new_expiry_date: '',
        new_reference_number: '',
        cost_paid: '',
        notes: '',
      });
      await loadRenewal();
    } catch (error) {
      console.error('Error marking as renewed:', error);
      Alert.alert('Error', 'Failed to mark as renewed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!renewal) return;

    setIsSaving(true);
    try {
      await deleteRenewal(renewal.id);
      router.back();
    } catch (error) {
      console.error('Error deleting renewal:', error);
      Alert.alert('Error', 'Failed to delete renewal');
    } finally {
      setIsSaving(false);
    }
  };

  const openRenewModal = () => {
    // Pre-fill suggested expiry date (default to 1 year if no frequency)
    const frequencyMonths = renewal?.frequency_months || 12;
    const suggested = suggestNextExpiryDate(renewal?.expiry_date || '', frequencyMonths);
    setRenewData({
      new_expiry_date: suggested.toISOString().split('T')[0],
      new_reference_number: renewal?.reference_number || '',
      cost_paid: renewal?.fee_amount?.toString() || '',
      payment_ref: '',
      notes: '',
    });
    setUseCustomDate(false);
    setShowRenewModal(true);
  };

  // Get standard date option label
  const getStandardDateLabel = () => {
    const months = renewal?.frequency_months || 12;
    if (months >= 12) {
      return `${months / 12} Year${months > 12 ? 's' : ''} (Standard)`;
    }
    return `${months} Months (Standard)`;
  };

  // Get standard suggested date
  const getStandardDate = () => {
    const months = renewal?.frequency_months || 12;
    const suggested = suggestNextExpiryDate(renewal?.expiry_date || '', months);
    return suggested.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select...';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!renewal) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Renewal not found</Text>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const daysUntilExpiry = calculateDaysUntilExpiry(renewal.expiry_date);
  const urgency = getRenewalUrgencyStatus(daysUntilExpiry);
  const icon = preset?.icon || getCategoryIcon(renewal.category || '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Renewal Details</Text>
        <Pressable
          style={styles.menuButton}
          onPress={() => setShowDeleteConfirm(true)}
        >
          <Ionicons name="trash-outline" size={22} color={Colors.danger} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card */}
          <View style={[styles.mainCard, { borderLeftColor: urgency.color }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{icon}</Text>
              <View style={styles.cardTitleArea}>
                {isEditing ? (
                  <TextInput
                    style={styles.editTitleInput}
                    value={editData.title}
                    onChangeText={(text) => setEditData({ ...editData, title: text })}
                    placeholder="Title"
                    placeholderTextColor={Colors.textMuted}
                  />
                ) : (
                  <Text style={styles.cardTitle}>{renewal.title}</Text>
                )}
                {renewal.authority_name && !isEditing && (
                  <Text style={styles.cardSubtitle}>{renewal.authority_name}</Text>
                )}
              </View>
              <Pressable
                style={styles.editButton}
                onPress={() => isEditing ? handleSaveEdit() : setIsEditing(true)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name={isEditing ? 'checkmark' : 'pencil'}
                    size={20}
                    color={Colors.primary}
                  />
                )}
              </Pressable>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: urgency.bgColor }]}>
              <Text style={[styles.statusText, { color: urgency.color }]}>
                {urgency.label}
              </Text>
            </View>

            {/* Expiry Info */}
            <View style={styles.expirySection}>
              <Text style={styles.expiryLabel}>
                {daysUntilExpiry < 0 ? 'EXPIRED ON' : 'EXPIRES ON'}
              </Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editData.expiry_date}
                  onChangeText={(text) => setEditData({ ...editData, expiry_date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                />
              ) : (
                <Text style={styles.expiryDate}>{formatExpiryDate(renewal.expiry_date)}</Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {!isEditing && (
            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.actionButton, styles.renewButton]}
                onPress={openRenewModal}
              >
                <Ionicons name="refresh" size={20} color="#000" />
                <Text style={styles.renewButtonText}>Mark as Renewed</Text>
              </Pressable>
            </View>
          )}

          {/* Details Section */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>DETAILS</Text>

            {isEditing ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Authority</Text>
                  <TextInput
                    style={styles.editInputSmall}
                    value={editData.authority_name}
                    onChangeText={(text) => setEditData({ ...editData, authority_name: text })}
                    placeholder="Issuing authority"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reference #</Text>
                  <TextInput
                    style={styles.editInputSmall}
                    value={editData.reference_number}
                    onChangeText={(text) => setEditData({ ...editData, reference_number: text })}
                    placeholder="License/Reference number"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cost (₹)</Text>
                  <TextInput
                    style={styles.editInputSmall}
                    value={editData.fee_amount}
                    onChangeText={(text) => setEditData({ ...editData, fee_amount: text })}
                    placeholder="Renewal cost"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <TextInput
                    style={[styles.editInputSmall, styles.editInputMultiline]}
                    value={editData.notes}
                    onChangeText={(text) => setEditData({ ...editData, notes: text })}
                    placeholder="Additional notes"
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.editActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditing(false);
                      setEditData({
                        title: renewal.title || '',
                        authority_name: renewal.authority_name || '',
                        reference_number: renewal.reference_number || '',
                        expiry_date: renewal.expiry_date || '',
                        fee_amount: renewal.fee_amount?.toString() || '',
                        notes: renewal.notes || '',
                      });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.saveEditButton}
                    onPress={handleSaveEdit}
                    disabled={isSaving || !editData.title || !editData.expiry_date}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.saveEditButtonText}>Save Changes</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {renewal.authority_name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Authority</Text>
                    <Text style={styles.detailValue}>{renewal.authority_name}</Text>
                  </View>
                )}

                {renewal.reference_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reference #</Text>
                    <Text style={[styles.detailValue, styles.monoText]}>
                      {renewal.reference_number}
                    </Text>
                  </View>
                )}

                {renewal.fee_amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cost</Text>
                    <Text style={styles.detailValue}>
                      ₹{renewal.fee_amount.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}

                {renewal.frequency_months && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Frequency</Text>
                    <Text style={styles.detailValue}>
                      {renewal.frequency_months >= 12
                        ? `Every ${renewal.frequency_months / 12} year(s)`
                        : `Every ${renewal.frequency_months} month(s)`}
                    </Text>
                  </View>
                )}

                {renewal.category && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category</Text>
                    <Text style={styles.detailValue}>
                      {renewal.category.charAt(0).toUpperCase() + renewal.category.slice(1)}
                    </Text>
                  </View>
                )}

                {renewal.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.notesText}>{renewal.notes}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Preset Info */}
          {preset && (
            <View style={styles.presetCard}>
              <Text style={styles.sectionTitle}>RENEWAL INFO</Text>

              {preset.penalty_info && (
                <View style={styles.penaltyBanner}>
                  <Text style={styles.penaltyIcon}>⚠️</Text>
                  <Text style={styles.penaltyText}>{preset.penalty_info}</Text>
                </View>
              )}

              {preset.renewal_process && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>How to renew</Text>
                  <Text style={styles.infoText}>{preset.renewal_process}</Text>
                </View>
              )}

              {preset.documents_required && preset.documents_required.length > 0 && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Documents needed</Text>
                  {preset.documents_required.map((doc, index) => (
                    <View key={index} style={styles.documentItem}>
                      <Ionicons name="document-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.documentText}>{doc}</Text>
                    </View>
                  ))}
                </View>
              )}

              {preset.cost_range_min !== null && preset.cost_range_max !== null && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Typical cost</Text>
                  <Text style={styles.infoText}>
                    {formatCostRange(preset.cost_range_min, preset.cost_range_max)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Renew Modal - Bottom Sheet Style */}
      <Modal
        visible={showRenewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.renewModalHeader}>
              <View>
                <Text style={styles.renewModalLabel}>UPDATE RECORD</Text>
                <Text style={styles.renewModalTitle}>Renew {renewal.title}</Text>
              </View>
              <View style={styles.renewModalIcon}>
                <Ionicons name="refresh" size={24} color={Colors.primary} />
              </View>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Date Options */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>New Expiry Date</Text>
                <View style={styles.dateOptionsRow}>
                  {/* Standard Option */}
                  <Pressable
                    style={[
                      styles.dateOption,
                      !useCustomDate && styles.dateOptionSelected,
                    ]}
                    onPress={() => {
                      setUseCustomDate(false);
                      setRenewData({ ...renewData, new_expiry_date: getStandardDate() });
                    }}
                  >
                    <Text style={[styles.dateOptionLabel, !useCustomDate && styles.dateOptionLabelSelected]}>
                      {getStandardDateLabel()}
                    </Text>
                    <Text style={[styles.dateOptionValue, !useCustomDate && styles.dateOptionValueSelected]}>
                      {formatDateDisplay(getStandardDate())}
                    </Text>
                    {!useCustomDate && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={styles.dateOptionCheck} />
                    )}
                  </Pressable>

                  {/* Custom Option */}
                  <Pressable
                    style={[
                      styles.dateOption,
                      useCustomDate && styles.dateOptionSelected,
                    ]}
                    onPress={() => setUseCustomDate(true)}
                  >
                    <Text style={[styles.dateOptionLabel, useCustomDate && styles.dateOptionLabelSelected]}>
                      Custom Date
                    </Text>
                    {useCustomDate ? (
                      <TextInput
                        style={styles.customDateInput}
                        value={renewData.new_expiry_date}
                        onChangeText={(text) => setRenewData({ ...renewData, new_expiry_date: text })}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={styles.dateOptionValue}>Select...</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Reference Number with Helper */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>New Reference Number</Text>
                <View style={styles.inputWithHelper}>
                  <TextInput
                    style={styles.modalInput}
                    value={renewData.new_reference_number}
                    onChangeText={(text) => setRenewData({ ...renewData, new_reference_number: text })}
                    placeholder="TL/HYD/2026/54321"
                    placeholderTextColor={Colors.textMuted}
                  />
                  {renewal.reference_number && (
                    <Pressable
                      style={styles.sameAsOldButton}
                      onPress={() => setRenewData({ ...renewData, new_reference_number: renewal.reference_number || '' })}
                    >
                      <Text style={styles.sameAsOldText}>SAME AS OLD</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Amount + Payment Ref Row */}
              <View style={styles.splitRow}>
                <View style={styles.splitInput}>
                  <Text style={styles.modalLabel}>Amount Paid</Text>
                  <View style={styles.amountInputWrapper}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={renewData.cost_paid}
                      onChangeText={(text) => setRenewData({ ...renewData, cost_paid: text })}
                      placeholder="5500"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.splitInput}>
                  <Text style={styles.modalLabel}>Payment Ref</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={renewData.payment_ref}
                    onChangeText={(text) => setRenewData({ ...renewData, payment_ref: text })}
                    placeholder="GPay / Portal ID"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Document Upload Placeholder */}
              <Pressable style={styles.uploadZone}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="cloud-upload-outline" size={24} color={Colors.textMuted} />
                </View>
                <Text style={styles.uploadTitle}>Upload New License</Text>
                <Text style={styles.uploadSubtitle}>PDF, JPG up to 10MB</Text>
              </Pressable>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowRenewModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmButton,
                  !renewData.new_expiry_date && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleMarkAsRenewed}
                disabled={!renewData.new_expiry_date || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={styles.modalConfirmButtonText}>CONFIRM RENEWAL</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteTitle}>Delete Renewal?</Text>
            <Text style={styles.deleteMessage}>
              This will permanently delete "{renewal.title}". This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <Pressable
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.deleteConfirmButton}
                onPress={handleDelete}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  backLink: {
    padding: Spacing.sm,
  },
  backLinkText: {
    ...Typography.button,
    color: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  // Main Card
  mainCard: {
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    borderLeftWidth: 4,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cardIcon: {
    fontSize: 40,
    marginRight: Spacing.md,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  cardSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(136, 160, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editTitleInput: {
    ...Typography.h3,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: Spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  statusText: {
    ...Typography.button,
    fontWeight: '700',
  },
  expirySection: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.md,
  },
  expiryLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  expiryDate: {
    ...Typography.h3,
    color: Colors.text,
  },
  editInput: {
    ...GlassStyle,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
  },

  // Action Buttons
  actionButtons: {
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  renewButton: {
    backgroundColor: Colors.text,
  },
  renewButtonText: {
    ...Typography.button,
    color: Colors.background,
  },

  // Details Card
  detailsCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  detailLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  notesSection: {
    paddingTop: Spacing.md,
  },
  notesText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  editInputSmall: {
    flex: 1,
    ...GlassStyle,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  editInputMultiline: {
    textAlign: 'left',
    minHeight: 60,
    textAlignVertical: 'top',
    marginLeft: 0,
    marginTop: Spacing.sm,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.button,
    color: Colors.textMuted,
  },
  saveEditButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.text,
    alignItems: 'center',
  },
  saveEditButtonText: {
    ...Typography.button,
    color: Colors.background,
  },

  // Preset Card
  presetCard: {
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  penaltyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.warningMuted,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  penaltyIcon: {
    fontSize: 16,
  },
  penaltyText: {
    flex: 1,
    ...Typography.bodySm,
    color: Colors.warning,
  },
  infoSection: {
    marginBottom: Spacing.md,
  },
  infoLabel: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  documentText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  bottomPadding: {
    height: 40,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalScrollView: {
    maxHeight: 400,
  },

  // Renew Modal Header
  renewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  renewModalLabel: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  renewModalTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  renewModalIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Date Options
  dateOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    position: 'relative',
  },
  dateOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  dateOptionLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateOptionLabelSelected: {
    color: Colors.primary,
  },
  dateOptionValue: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  dateOptionValueSelected: {
    color: Colors.text,
  },
  dateOptionCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  customDateInput: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },

  // Input with Helper
  inputWithHelper: {
    position: 'relative',
  },
  sameAsOldButton: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  sameAsOldText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },

  // Split Row
  splitRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  splitInput: {
    flex: 1,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    paddingLeft: Spacing.md,
  },
  currencySymbol: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    padding: Spacing.md,
    paddingLeft: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
  },

  // Upload Zone
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.surfaceBorder,
    borderRadius: BorderRadius['3xl'],
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    marginTop: Spacing.md,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadTitle: {
    ...Typography.bodySm,
    color: Colors.text,
    fontWeight: '700',
  },
  uploadSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  modalInputGroup: {
    marginBottom: Spacing.md,
  },
  modalLabel: {
    ...Typography.bodySm,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalInput: {
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  modalCancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    ...Typography.button,
    color: Colors.textMuted,
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    ...Typography.button,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Delete Modal
  deleteModal: {
    backgroundColor: Colors.background,
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  deleteTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  deleteMessage: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...GlassStyle,
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    ...Typography.button,
    color: Colors.textMuted,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.danger,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    ...Typography.button,
    color: '#fff',
  },
});
