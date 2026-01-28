// app/add-renewal.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, GlassStyle, BorderRadius, Spacing } from '../src/constants/theme';
import { useAppSelector } from '../src/store';
import {
  getRenewalStories,
  getRenewalBundles,
  getRenewalPresets,
  getRenewalPresetByCode,
  createRenewal,
  trackRenewalInterest,
  markInterestConverted,
  getSameCategoryPresets,
  searchRenewalPresets,
  RenewalStory,
  RenewalBundle,
  RenewalPreset,
} from '../src/lib/supabase';
import {
  formatCostRange,
  getCategoryIcon,
  CATEGORY_INFO,
} from '../src/constants/renewals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'stories' | 'persona' | 'stack' | 'form';

export default function AddRenewalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ showStories?: string; presetCode?: string }>();
  const { user } = useAppSelector(state => state.auth);
  const { currentWorkspace } = useAppSelector(state => state.workspace);

  // State
  const [step, setStep] = useState<Step>(params.showStories === 'true' ? 'stories' : 'persona');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Data
  const [stories, setStories] = useState<RenewalStory[]>([]);
  const [bundles, setBundles] = useState<RenewalBundle[]>([]);
  const [presets, setPresets] = useState<RenewalPreset[]>([]);
  const [presetsByCategory, setPresetsByCategory] = useState<Record<string, RenewalPreset[]>>({});

  // Selection state
  const [selectedBundle, setSelectedBundle] = useState<RenewalBundle | null>(null);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const [currentPreset, setCurrentPreset] = useState<RenewalPreset | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    authority_name: '',
    reference_number: '',
    expiry_date: '',
    fee_amount: '',
    notes: '',
  });

  // Suggestion modal state
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [sameCategoryPresets, setSameCategoryPresets] = useState<RenewalPreset[]>([]);
  const [lastAddedCategory, setLastAddedCategory] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RenewalPreset[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Animation
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle direct preset code from params
  useEffect(() => {
    if (params.presetCode && presets.length > 0) {
      const preset = presets.find(p => p.code === params.presetCode);
      if (preset) {
        setCurrentPreset(preset);
        prefillForm(preset);
        setStep('form');
      }
    }
  }, [params.presetCode, presets]);

  const loadData = async () => {
    try {
      const [storiesData, bundlesData, presetsData] = await Promise.all([
        getRenewalStories(),
        getRenewalBundles(),
        getRenewalPresets(),
      ]);

      setStories(storiesData);
      setBundles(bundlesData);
      setPresets(presetsData);

      // Group presets by category
      const grouped = presetsData.reduce((acc, preset) => {
        if (!acc[preset.category]) acc[preset.category] = [];
        acc[preset.category].push(preset);
        return acc;
      }, {} as Record<string, RenewalPreset[]>);
      setPresetsByCategory(grouped);
    } catch (error) {
      console.error('Error loading renewal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const prefillForm = (preset: RenewalPreset) => {
    setFormData({
      title: preset.title,
      authority_name: preset.authority_template || '',
      reference_number: '',
      expiry_date: '',
      fee_amount: '',
      notes: '',
    });
  };

  // Track interest when user views/interacts with a preset
  const trackInterest = useCallback((
    preset: RenewalPreset,
    interactionType: 'view' | 'bundle_view' | 'search' | 'suggestion_view',
    bundleCode?: string
  ) => {
    if (!currentWorkspace?.id || !user?.id) return;
    trackRenewalInterest(
      currentWorkspace.id,
      user.id,
      preset.code,
      preset.category,
      interactionType,
      bundleCode
    );
  }, [currentWorkspace?.id, user?.id]);

  const handleBundleSelect = (bundle: RenewalBundle) => {
    setSelectedBundle(bundle);
    // Pre-select all presets in the bundle
    setSelectedPresets(new Set(bundle.preset_codes));
    setStep('stack');

    // Track interest for all presets in bundle
    bundle.preset_codes.forEach(code => {
      const preset = presets.find(p => p.code === code);
      if (preset) {
        trackInterest(preset, 'bundle_view', bundle.code);
      }
    });
  };

  const handlePresetToggle = (presetCode: string) => {
    const newSelected = new Set(selectedPresets);
    if (newSelected.has(presetCode)) {
      newSelected.delete(presetCode);
    } else {
      newSelected.add(presetCode);
      // Track interest when selecting a preset (user is showing intent)
      const preset = presets.find(p => p.code === presetCode);
      if (preset) {
        trackInterest(preset, 'view');
      }
    }
    setSelectedPresets(newSelected);
  };

  const handleAddSelected = async () => {
    if (selectedPresets.size === 0) return;

    // If only one selected, go to form for that one
    if (selectedPresets.size === 1) {
      const presetCode = Array.from(selectedPresets)[0];
      const preset = presets.find(p => p.code === presetCode);
      if (preset) {
        setCurrentPreset(preset);
        prefillForm(preset);
        setStep('form');
      }
      return;
    }

    // Multiple selected - batch add with default dates
    setIsSaving(true);
    try {
      const defaultExpiry = new Date();
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
      let lastCategory: string | null = null;

      for (const presetCode of selectedPresets) {
        const preset = presets.find(p => p.code === presetCode);
        if (preset && currentWorkspace?.id && user?.id) {
          await createRenewal({
            workspace_id: currentWorkspace.id,
            created_by: user.id,
            title: preset.title,
            category: preset.category,
            subcategory: preset.subcategory || undefined,
            authority_name: preset.authority_template || undefined,
            preset_code: preset.code,
            frequency_months: preset.frequency_months || undefined,
            expiry_date: defaultExpiry.toISOString().split('T')[0],
          });

          // Mark interest as converted
          await markInterestConverted(currentWorkspace.id, presetCode);
          lastCategory = preset.category;
        }
      }

      // After batch add, check for same-category suggestions
      if (lastCategory && currentWorkspace?.id) {
        const addedCodes = Array.from(selectedPresets);
        const suggestions = await getSameCategoryPresets(lastCategory, addedCodes[0]);
        // Filter out any we just added
        const filteredSuggestions = suggestions.filter(s => !addedCodes.includes(s.code));

        if (filteredSuggestions.length > 0) {
          setSameCategoryPresets(filteredSuggestions);
          setLastAddedCategory(lastCategory);
          setShowSuggestionModal(true);
          return; // Don't navigate away yet
        }
      }

      router.back();
    } catch (error) {
      console.error('Error creating renewals:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRenewal = async () => {
    if (!formData.title || !formData.expiry_date) return;
    if (!currentWorkspace?.id || !user?.id) return;

    setIsSaving(true);
    try {
      await createRenewal({
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        title: formData.title,
        category: currentPreset?.category,
        subcategory: currentPreset?.subcategory || undefined,
        authority_name: formData.authority_name || undefined,
        reference_number: formData.reference_number || undefined,
        preset_code: currentPreset?.code,
        frequency_months: currentPreset?.frequency_months || undefined,
        fee_amount: formData.fee_amount ? parseFloat(formData.fee_amount) : undefined,
        expiry_date: formData.expiry_date,
        notes: formData.notes || undefined,
      });

      // Mark interest as converted if we had a preset
      if (currentPreset?.code) {
        await markInterestConverted(currentWorkspace.id, currentPreset.code);

        // Fetch same-category suggestions
        const suggestions = await getSameCategoryPresets(currentPreset.category, currentPreset.code);
        if (suggestions.length > 0) {
          setSameCategoryPresets(suggestions);
          setLastAddedCategory(currentPreset.category);
          setShowSuggestionModal(true);
          setIsSaving(false);
          return; // Don't navigate away yet
        }
      }

      router.back();
    } catch (error) {
      console.error('Error creating renewal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomAdd = () => {
    setCurrentPreset(null);
    setFormData({
      title: '',
      authority_name: '',
      reference_number: '',
      expiry_date: '',
      fee_amount: '',
      notes: '',
    });
    setStep('form');
  };

  // Handle adding a suggestion from the modal
  const handleAddSuggestion = (preset: RenewalPreset) => {
    // Track that user viewed this suggestion
    trackInterest(preset, 'suggestion_view');
    // Close modal and navigate to form for this preset
    setShowSuggestionModal(false);
    setCurrentPreset(preset);
    prefillForm(preset);
    setStep('form');
    // Clear selected presets since we're starting fresh
    setSelectedPresets(new Set());
  };

  // Handle skipping suggestions
  const handleSkipSuggestions = () => {
    setShowSuggestionModal(false);
    setSameCategoryPresets([]);
    router.back();
  };

  // Handle search input
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const results = await searchRenewalPresets(query);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);

      // Track interest for search results (user is actively looking)
      results.slice(0, 3).forEach(preset => {
        trackInterest(preset, 'search');
      });
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [trackInterest]);

  // Handle selecting a search result
  const handleSearchResultSelect = (preset: RenewalPreset) => {
    trackInterest(preset, 'search');
    setCurrentPreset(preset);
    prefillForm(preset);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setStep('form');
  };

  // Render Stories Step (Empty State Hook)
  const renderStoriesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.storiesHeader}>
        <Text style={styles.storiesTitle}>Real penalties.{'\n'}Real consequences.</Text>
        <Text style={styles.storiesSubtitle}>
          GHMC doesn't send reminders. Neither does the Fire Department.
        </Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 48));
          setActiveStoryIndex(index);
        }}
        style={styles.storiesCarousel}
        contentContainerStyle={styles.storiesContent}
      >
        {stories.map((story, index) => (
          <View key={story.id} style={styles.storyCard}>
            <Text style={styles.storyIcon}>{story.icon || '⚠️'}</Text>
            <Text style={styles.storyQuote}>"{story.quote}"</Text>
            {story.consequence && (
              <Text style={styles.storyConsequence}>{story.consequence}</Text>
            )}
            {story.source && (
              <Text style={styles.storySource}>— {story.source}</Text>
            )}
            {story.preset_code && (
              <Pressable
                style={styles.storyAction}
                onPress={() => {
                  const preset = presets.find(p => p.code === story.preset_code);
                  if (preset) {
                    setCurrentPreset(preset);
                    prefillForm(preset);
                    setStep('form');
                  }
                }}
              >
                <Text style={styles.storyActionText}>I need this too →</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {stories.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeStoryIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => setStep('persona')}
      >
        <Text style={styles.primaryButtonText}>Set up my reminders</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryButtonText}>Maybe later</Text>
      </Pressable>
    </View>
  );

  // Render Persona Step
  const renderPersonaStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.stepContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search for a renewal type..."
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSearchResults(false);
            }}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <View style={styles.searchResults}>
            {searchResults.map((preset) => (
              <Pressable
                key={preset.code}
                style={styles.searchResultItem}
                onPress={() => handleSearchResultSelect(preset)}
              >
                <Text style={styles.searchResultIcon}>{preset.icon}</Text>
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultTitle}>{preset.title}</Text>
                  <Text style={styles.searchResultCategory}>
                    {CATEGORY_INFO[preset.category as keyof typeof CATEGORY_INFO]?.label || preset.category}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.stepTitle}>What describes you?</Text>
      <Text style={styles.stepSubtitle}>
        We'll suggest relevant renewals to track
      </Text>

      <View style={styles.bundleGrid}>
        {bundles.map((bundle) => (
          <Pressable
            key={bundle.id}
            style={styles.bundleCard}
            onPress={() => handleBundleSelect(bundle)}
          >
            <Text style={styles.bundleIcon}>{bundle.icon}</Text>
            <Text style={styles.bundleTitle}>{bundle.title}</Text>
            <Text style={styles.bundleCount}>
              {bundle.preset_codes.length} items
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.skipButton} onPress={handleCustomAdd}>
        <Ionicons name="add-circle-outline" size={20} color={Colors.textMuted} />
        <Text style={styles.skipButtonText}>Add custom renewal</Text>
      </Pressable>
    </ScrollView>
  );

  // Render Stack Builder Step
  const renderStackStep = () => {
    // Get presets for selected bundle
    const bundlePresets = selectedBundle?.preset_codes
      .map(code => presets.find(p => p.code === code))
      .filter(Boolean) as RenewalPreset[];

    // Group remaining presets by category for "You might also need"
    const otherCategories = Object.entries(presetsByCategory)
      .filter(([category]) => {
        const bundleCats = bundlePresets?.map(p => p.category) || [];
        return !bundleCats.includes(category);
      })
      .slice(0, 3);

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.stepContent}>
        {selectedBundle && (
          <>
            <View style={styles.stackHeader}>
              <Text style={styles.stackIcon}>{selectedBundle.icon}</Text>
              <View style={styles.stackHeaderText}>
                <Text style={styles.stackTitle}>{selectedBundle.title}</Text>
                {selectedBundle.hook && (
                  <Text style={styles.stackHook}>{selectedBundle.hook}</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionLabel}>RECOMMENDED</Text>
            <View style={styles.presetList}>
              {bundlePresets?.map((preset) => (
                <Pressable
                  key={preset.code}
                  style={[
                    styles.presetCard,
                    selectedPresets.has(preset.code) && styles.presetCardSelected,
                  ]}
                  onPress={() => handlePresetToggle(preset.code)}
                >
                  <View style={styles.presetCheckbox}>
                    {selectedPresets.has(preset.code) ? (
                      <Ionicons name="checkbox" size={24} color={Colors.primary} />
                    ) : (
                      <Ionicons name="square-outline" size={24} color={Colors.textMuted} />
                    )}
                  </View>
                  <View style={styles.presetInfo}>
                    <View style={styles.presetHeader}>
                      <Text style={styles.presetIcon}>{preset.icon}</Text>
                      <Text style={styles.presetTitle}>{preset.title}</Text>
                    </View>
                    <View style={styles.presetMeta}>
                      {preset.frequency_months && (
                        <Text style={styles.presetFrequency}>
                          {preset.frequency_months >= 12
                            ? `${preset.frequency_months / 12}yr`
                            : `${preset.frequency_months}mo`}
                        </Text>
                      )}
                      <Text style={styles.presetCost}>
                        {formatCostRange(preset.cost_range_min, preset.cost_range_max)}
                      </Text>
                    </View>
                    {preset.penalty_info && (
                      <Text style={styles.presetPenalty}>⚠️ {preset.penalty_info}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Other categories */}
        {otherCategories.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>YOU MIGHT ALSO NEED</Text>
            {otherCategories.map(([category, categoryPresets]) => (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>
                    {CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.icon || '📋'}
                  </Text>
                  <Text style={styles.categoryTitle}>
                    {CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.label || category}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryChips}>
                    {categoryPresets.slice(0, 5).map((preset) => (
                      <Pressable
                        key={preset.code}
                        style={[
                          styles.chipCard,
                          selectedPresets.has(preset.code) && styles.chipCardSelected,
                        ]}
                        onPress={() => handlePresetToggle(preset.code)}
                      >
                        <Text style={styles.chipIcon}>{preset.icon}</Text>
                        <Text style={styles.chipTitle} numberOfLines={1}>
                          {preset.title}
                        </Text>
                        {selectedPresets.has(preset.code) && (
                          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}
          </>
        )}

        {/* Add custom */}
        <Pressable style={styles.addCustomRow} onPress={handleCustomAdd}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addCustomText}>Add something else</Text>
        </Pressable>

        {/* Bottom action */}
        <View style={styles.bottomActions}>
          <Text style={styles.selectedCount}>
            {selectedPresets.size} selected
          </Text>
          <Pressable
            style={[
              styles.continueButton,
              selectedPresets.size === 0 && styles.continueButtonDisabled,
            ]}
            onPress={handleAddSelected}
            disabled={selectedPresets.size === 0 || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.continueButtonText}>
                {selectedPresets.size === 1 ? 'Continue' : `Add ${selectedPresets.size} renewals`}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  // Render Form Step
  const renderFormStep = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.stepContent}>
        {currentPreset && (
          <View style={styles.formPresetHeader}>
            <Text style={styles.formPresetIcon}>{currentPreset.icon}</Text>
            <View>
              <Text style={styles.formPresetTitle}>{currentPreset.title}</Text>
              {currentPreset.penalty_info && (
                <Text style={styles.formPresetPenalty}>⚠️ {currentPreset.penalty_info}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>TITLE *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="e.g., GHMC Trade License"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>ISSUING AUTHORITY</Text>
          <TextInput
            style={styles.input}
            value={formData.authority_name}
            onChangeText={(text) => setFormData({ ...formData, authority_name: text })}
            placeholder="e.g., GHMC - Kukatpally"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>REFERENCE / LICENSE NUMBER</Text>
          <TextInput
            style={styles.input}
            value={formData.reference_number}
            onChangeText={(text) => setFormData({ ...formData, reference_number: text })}
            placeholder="e.g., TL/2025/12345"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>EXPIRY DATE *</Text>
          <TextInput
            style={styles.input}
            value={formData.expiry_date}
            onChangeText={(text) => setFormData({ ...formData, expiry_date: text })}
            placeholder="YYYY-MM-DD (e.g., 2026-03-31)"
            placeholderTextColor={Colors.textMuted}
          />
          {currentPreset?.frequency_months && (
            <Pressable
              style={styles.suggestButton}
              onPress={() => {
                const suggested = new Date();
                suggested.setMonth(suggested.getMonth() + currentPreset.frequency_months!);
                setFormData({
                  ...formData,
                  expiry_date: suggested.toISOString().split('T')[0],
                });
              }}
            >
              <Text style={styles.suggestButtonText}>
                💡 Suggest: {currentPreset.frequency_months >= 12
                  ? `${currentPreset.frequency_months / 12} year from now`
                  : `${currentPreset.frequency_months} months from now`}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>RENEWAL COST (₹)</Text>
          <TextInput
            style={styles.input}
            value={formData.fee_amount}
            onChangeText={(text) => setFormData({ ...formData, fee_amount: text })}
            placeholder="Estimated cost"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />
          {currentPreset && currentPreset.cost_range_min != null && currentPreset.cost_range_max != null && (
            <Text style={styles.costHint}>
              Typical: {formatCostRange(currentPreset.cost_range_min, currentPreset.cost_range_max)}
            </Text>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Contact person, renewal process, etc."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        {currentPreset?.documents_required && currentPreset.documents_required.length > 0 && (
          <View style={styles.documentsSection}>
            <Text style={styles.inputLabel}>DOCUMENTS TYPICALLY NEEDED</Text>
            <View style={styles.documentsList}>
              {currentPreset.documents_required.map((doc, index) => (
                <View key={index} style={styles.documentItem}>
                  <Ionicons name="document-outline" size={16} color={Colors.textMuted} />
                  <Text style={styles.documentText}>{doc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Pressable
          style={[
            styles.saveButton,
            (!formData.title || !formData.expiry_date) && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveRenewal}
          disabled={!formData.title || !formData.expiry_date || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Renewal</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Render Suggestion Modal
  const renderSuggestionModal = () => (
    <Modal
      visible={showSuggestionModal}
      transparent
      animationType="slide"
      onRequestClose={handleSkipSuggestions}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>🎯</Text>
            <Text style={styles.modalTitle}>You might also need...</Text>
            <Text style={styles.modalSubtitle}>
              Since you added a {lastAddedCategory} renewal, here are related items
            </Text>

            <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
              {sameCategoryPresets.map((preset) => (
                <Pressable
                  key={preset.code}
                  style={styles.suggestionCard}
                  onPress={() => handleAddSuggestion(preset)}
                >
                  <Text style={styles.suggestionIcon}>{preset.icon}</Text>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionTitle}>{preset.title}</Text>
                    {preset.penalty_info && (
                      <Text style={styles.suggestionPenalty} numberOfLines={1}>
                        ⚠️ {preset.penalty_info}
                      </Text>
                    )}
                    <View style={styles.suggestionMeta}>
                      {preset.frequency_months && (
                        <Text style={styles.suggestionFrequency}>
                          {preset.frequency_months >= 12
                            ? `Every ${preset.frequency_months / 12}yr`
                            : `Every ${preset.frequency_months}mo`}
                        </Text>
                      )}
                      <Text style={styles.suggestionCost}>
                        {formatCostRange(preset.cost_range_min, preset.cost_range_max)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="add-circle" size={24} color={Colors.primary} />
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSkipButton} onPress={handleSkipSuggestions}>
                <Text style={styles.modalSkipText}>Done for now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (step === 'form' && selectedPresets.size > 0) {
              setStep('stack');
            } else if (step === 'stack') {
              setStep('persona');
            } else if (step === 'persona' && params.showStories === 'true') {
              setStep('stories');
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === 'stories' ? '' : step === 'persona' ? 'Add Renewal' : step === 'stack' ? 'Select Renewals' : 'Renewal Details'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Content */}
      {step === 'stories' && renderStoriesStep()}
      {step === 'persona' && renderPersonaStep()}
      {step === 'stack' && renderStackStep()}
      {step === 'form' && renderFormStep()}

      {/* Suggestion Modal */}
      {renderSuggestionModal()}
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
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  stepContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },

  // Stories Step
  storiesHeader: {
    marginBottom: Spacing.xl,
  },
  storiesTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  storiesSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  storiesCarousel: {
    marginHorizontal: -Spacing.lg,
  },
  storiesContent: {
    paddingHorizontal: Spacing.lg,
  },
  storyCard: {
    width: SCREEN_WIDTH - 48,
    marginRight: Spacing.md,
    ...GlassStyle,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  storyIcon: {
    fontSize: 32,
    marginBottom: Spacing.md,
  },
  storyQuote: {
    ...Typography.bodyLg,
    color: Colors.text,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  storyConsequence: {
    ...Typography.body,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  storySource: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  storyAction: {
    paddingVertical: Spacing.sm,
  },
  storyActionText: {
    ...Typography.button,
    color: Colors.primary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceBorder,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  primaryButton: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.background,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.textMuted,
  },

  // Persona Step
  stepTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.xl,
  },
  bundleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  bundleCard: {
    width: '47%',
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  bundleIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  bundleTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  bundleCount: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  skipButtonText: {
    ...Typography.body,
    color: Colors.textMuted,
  },

  // Stack Step
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
  },
  stackIcon: {
    fontSize: 40,
  },
  stackHeaderText: {
    flex: 1,
  },
  stackTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  stackHook: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  presetList: {
    gap: Spacing.sm,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  presetCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(136, 160, 150, 0.1)',
  },
  presetCheckbox: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  presetInfo: {
    flex: 1,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  presetIcon: {
    fontSize: 18,
  },
  presetTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  presetMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: 4,
  },
  presetFrequency: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  presetCost: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  presetPenalty: {
    ...Typography.bodySm,
    color: Colors.warning,
    marginTop: 4,
  },
  categorySection: {
    marginBottom: Spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  categoryChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...GlassStyle,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  chipCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(136, 160, 150, 0.1)',
  },
  chipIcon: {
    fontSize: 14,
  },
  chipTitle: {
    ...Typography.bodySm,
    color: Colors.text,
    maxWidth: 120,
  },
  addCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  addCustomText: {
    ...Typography.body,
    color: Colors.primary,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  selectedCount: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  continueButton: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    ...Typography.button,
    color: Colors.background,
  },

  // Form Step
  formPresetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
  },
  formPresetIcon: {
    fontSize: 36,
  },
  formPresetTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  formPresetPenalty: {
    ...Typography.bodySm,
    color: Colors.warning,
    marginTop: 4,
  },
  formSection: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.label,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  input: {
    ...GlassStyle,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Typography.body,
    color: Colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
  },
  suggestButtonText: {
    ...Typography.bodySm,
    color: Colors.primary,
  },
  costHint: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  documentsSection: {
    marginBottom: Spacing.xl,
  },
  documentsList: {
    gap: Spacing.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  documentText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  saveButton: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.background,
  },

  // Search
  searchContainer: {
    marginBottom: Spacing.xl,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  searchResults: {
    marginTop: Spacing.sm,
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  searchResultIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  searchResultCategory: {
    ...Typography.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Suggestion Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
  },
  modalContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  suggestionIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionPenalty: {
    ...Typography.bodySm,
    color: Colors.warning,
    marginBottom: 4,
  },
  suggestionMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  suggestionFrequency: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  suggestionCost: {
    ...Typography.bodySm,
    color: Colors.textMuted,
  },
  modalActions: {
    marginTop: Spacing.lg,
  },
  modalSkipButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  modalSkipText: {
    ...Typography.button,
    color: Colors.textMuted,
  },
});
