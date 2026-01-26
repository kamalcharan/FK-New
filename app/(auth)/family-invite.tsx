// app/(auth)/family-invite.tsx
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Share, ScrollView, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui';
import { showSuccessToast, showErrorToast } from '../../src/components/ToastConfig';
import {
  createFamilyInvite,
  getWorkspaceInvites,
  updateOnboardingStatus,
  isSupabaseReady,
  getCurrentUser
} from '../../src/lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Relationship data
const CONSTELLATION_RELATIONSHIPS = [
  { code: 'mom', label: 'Mom', icon: '👩', position: { top: '18%', left: '12%' } },
  { code: 'dad', label: 'Dad', icon: '👨', position: { top: '15%', right: '12%' } },
  { code: 'spouse', label: 'Spouse', icon: '💑', position: { top: '45%', left: '5%' } },
  { code: 'sibling', label: 'Sibling', icon: '👫', position: { top: '48%', right: '8%' } },
  { code: 'child', label: 'Child', icon: '👶', position: { bottom: '25%', left: '20%' } },
];

const MORE_RELATIONSHIPS = [
  { code: 'grandpa', label: 'Grandpa', icon: '👴' },
  { code: 'grandma', label: 'Grandma', icon: '👵' },
  { code: 'uncle', label: 'Uncle', icon: '👨‍🦳' },
  { code: 'aunt', label: 'Aunt', icon: '👩‍🦳' },
  { code: 'cousin', label: 'Cousin', icon: '🧑‍🤝‍🧑' },
  { code: 'in_law', label: 'In-Law', icon: '👨‍👩‍👧' },
  { code: 'friend', label: 'Friend', icon: '🤝' },
  { code: 'other', label: 'Other', icon: '➕' },
];

interface Invite {
  id: string;
  invitee_name: string;
  relationship_code: string;
  relationship_label: string;
  relationship_icon: string;
  status: string;
  invite_code: string;
  sent_at: string;
}

export default function FamilyInviteScreen() {
  const { workspaceName, workspaceId } = useLocalSearchParams<{
    workspaceName?: string;
    workspaceId?: string;
  }>();

  const [selectedRelation, setSelectedRelation] = useState<typeof CONSTELLATION_RELATIONSHIPS[0] | null>(null);
  const [inviteeName, setInviteeName] = useState('');
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [showMoreRelations, setShowMoreRelations] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Animation refs for floating bubbles
  const floatAnimations = useRef(
    CONSTELLATION_RELATIONSHIPS.map(() => new Animated.Value(0))
  ).current;

  // Start floating animations
  useEffect(() => {
    CONSTELLATION_RELATIONSHIPS.forEach((_, index) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnimations[index], {
            toValue: 1,
            duration: 3000 + index * 500,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnimations[index], {
            toValue: 0,
            duration: 3000 + index * 500,
            useNativeDriver: true,
          }),
        ])
      );
      setTimeout(() => animation.start(), index * 300);
    });
  }, []);

  // Load pending invites
  useEffect(() => {
    loadPendingInvites();
  }, [workspaceId]);

  const loadPendingInvites = async () => {
    if (!workspaceId || !isSupabaseReady()) return;

    try {
      const invites = await getWorkspaceInvites(workspaceId);
      setPendingInvites(invites || []);
    } catch (err) {
      console.error('Error loading invites:', err);
    }
  };

  const handleRelationSelect = (relation: typeof CONSTELLATION_RELATIONSHIPS[0]) => {
    setSelectedRelation(relation);
    setInviteeName('');
    setShowInviteSheet(true);
    setShowMoreRelations(false);
  };

  const handleSendInvite = async () => {
    if (!selectedRelation || !workspaceId) return;

    setIsLoading(true);

    try {
      if (!isSupabaseReady()) {
        // Demo mode
        const demoMessage = `Hey! 👋\n\nYou've been invited to join ${workspaceName || 'Our Family'} on FamilyKnows as ${selectedRelation.label}.\n\n🔐 Your invite code: DEMO1234\n\nDownload the app to join!`;
        await Share.share({
          message: demoMessage,
        });
        showSuccessToast('Invite Sent!', `Shared invite for ${selectedRelation.label}`);
        setShowInviteSheet(false);
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        showErrorToast('Session Error', 'Please sign in again');
        return;
      }

      const result = await createFamilyInvite(
        workspaceId,
        user.id,
        selectedRelation.code,
        inviteeName || undefined
      );

      if (result?.invite_message) {
        await Share.share({
          message: result.invite_message,
        });

        showSuccessToast('Invite Created!', `Code: ${result.invite_code}`);
        setShowInviteSheet(false);
        loadPendingInvites();
      }
    } catch (err: any) {
      showErrorToast('Failed to Create Invite', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      if (isSupabaseReady()) {
        const user = await getCurrentUser();
        if (user) {
          await updateOnboardingStatus(user.id, true);
        }
      }
      router.replace('/(tabs)');
    } catch (err) {
      console.error('Error updating onboarding status:', err);
      router.replace('/(tabs)');
    }
  };

  const handleSkip = () => {
    handleContinue();
  };

  const displayName = useMemo(() => {
    if (workspaceName) {
      return workspaceName;
    }
    return 'Your Family';
  }, [workspaceName]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>STEP 2 OF 2</Text>
        <Text style={styles.title}>Invite Your Family</Text>
        <Text style={styles.subtitle}>
          Tap a relationship to send an invite via WhatsApp
        </Text>
      </View>

      {/* Constellation Area */}
      <View style={styles.constellationArea}>
        {/* Central Orb */}
        <View style={styles.centerOrbContainer}>
          <LinearGradient
            colors={['#6366f1', '#a855f7']}
            style={styles.centerOrb}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="home" size={32} color="white" />
          </LinearGradient>
          <Text style={styles.workspaceName}>{displayName}</Text>
        </View>

        {/* Floating Relationship Bubbles */}
        {CONSTELLATION_RELATIONSHIPS.map((relation, index) => {
          const translateY = floatAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0, -12],
          });

          const rotate = floatAnimations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '5deg'],
          });

          return (
            <Animated.View
              key={relation.code}
              style={[
                styles.bubbleContainer,
                relation.position,
                {
                  transform: [{ translateY }, { rotate }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.bubble}
                onPress={() => handleRelationSelect(relation)}
                activeOpacity={0.8}
              >
                <Text style={styles.bubbleIcon}>{relation.icon}</Text>
                <Text style={styles.bubbleLabel}>{relation.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* More Relationships Button */}
        <TouchableOpacity
          style={[styles.bubbleContainer, styles.moreBubble]}
          onPress={() => setShowMoreRelations(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.bubble, styles.moreButton]}>
            <Ionicons name="add" size={24} color="#a855f7" />
            <Text style={styles.bubbleLabel}>More</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Pending Invites List */}
      {pendingInvites.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>PENDING INVITES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {pendingInvites.map((invite) => (
              <View key={invite.id} style={styles.pendingCard}>
                <Text style={styles.pendingIcon}>{invite.relationship_icon || '👤'}</Text>
                <Text style={styles.pendingName}>
                  {invite.invitee_name || invite.relationship_label}
                </Text>
                <View style={styles.pendingStatus}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingStatusText}>Pending</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          onPress={handleContinue}
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Bottom Sheet */}
      <Modal
        visible={showInviteSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>
              Invite {selectedRelation?.label}
            </Text>

            <View style={styles.selectedBubble}>
              <Text style={styles.selectedIcon}>{selectedRelation?.icon}</Text>
            </View>

            <TextInput
              style={styles.nameInput}
              placeholder="Their name (optional)"
              placeholderTextColor={Colors.textPlaceholder}
              value={inviteeName}
              onChangeText={setInviteeName}
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleSendInvite}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <Ionicons name="logo-whatsapp" size={24} color="white" />
              <Text style={styles.whatsappText}>
                {isLoading ? 'Creating...' : 'Share via WhatsApp'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowInviteSheet(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* More Relationships Modal */}
      <Modal
        visible={showMoreRelations}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreRelations(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>More Relationships</Text>

            <View style={styles.moreGrid}>
              {MORE_RELATIONSHIPS.map((relation) => (
                <TouchableOpacity
                  key={relation.code}
                  style={styles.moreGridItem}
                  onPress={() => handleRelationSelect(relation as any)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.moreGridIcon}>{relation.icon}</Text>
                  <Text style={styles.moreGridLabel}>{relation.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMoreRelations(false)}
            >
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  stepIndicator: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  constellationArea: {
    flex: 1,
    position: 'relative',
    marginTop: 20,
  },
  centerOrbContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -60 }],
    alignItems: 'center',
  },
  centerOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  workspaceName: {
    marginTop: Spacing.md,
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '600',
  },
  bubbleContainer: {
    position: 'absolute',
  },
  bubble: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleIcon: {
    fontSize: 28,
  },
  bubbleLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#a855f7',
    marginTop: 4,
  },
  moreBubble: {
    bottom: '22%',
    right: '15%',
  },
  moreButton: {
    borderStyle: 'dashed',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  pendingSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  pendingTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  pendingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  pendingIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  pendingName: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500',
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
    marginRight: 4,
  },
  pendingStatusText: {
    fontSize: 9,
    color: '#fbbf24',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  sheetTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 22,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  selectedBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  selectedIcon: {
    fontSize: 36,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: BorderRadius.xl,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  whatsappText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  moreGridItem: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreGridIcon: {
    fontSize: 24,
  },
  moreGridLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
