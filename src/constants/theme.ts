// src/constants/theme.ts
/**
 * FamilyKnows Design System
 * Extracted from HTML mockups for pixel-perfect implementation
 */

export const Colors = {
  // Core palette
  background: '#0F172A',
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',

  // Primary accent
  primary: '#88A096',
  primaryMuted: 'rgba(136, 160, 150, 0.2)',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textPlaceholder: '#475569',

  // Status colors
  success: '#4ADE80',
  successMuted: 'rgba(74, 222, 128, 0.1)',
  successBorder: 'rgba(74, 222, 128, 0.2)',

  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.1)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',

  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.1)',
  dangerBorder: 'rgba(239, 68, 68, 0.2)',

  pending: '#94A3B8',
  pendingMuted: 'rgba(148, 163, 184, 0.1)',
  pendingBorder: 'rgba(148, 163, 184, 0.2)',

  // UI elements
  inputBackground: '#1E293B',
  inputBorder: '#334155',
  inputBorderFocus: '#88A096',

  // Special
  whatsapp: '#25D366',
  google: '#FFFFFF',

  // Gradients (for LinearGradient)
  gradientText: ['#88A096', '#CBD5E1'],
} as const;

export const Fonts = {
  // Font families - loaded via expo-font
  sans: 'Inter',
  serif: 'Fraunces',

  // Font weights
  weights: {
    light: '300',
    regular: '400',
    semibold: '600',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const Typography = {
  // Headings (Fraunces)
  h1: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  h3: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
  },

  // Body (Inter)
  bodyLg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  bodySm: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  // Labels - NOTE: textTransform should be applied directly in component styles
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
  },

  // Buttons
  button: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonLg: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
} as const;

// Glass morphism style helper
export const GlassStyle = {
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.surfaceBorder,
  // Note: backdrop-filter blur requires native implementation
} as const;

// Status badge configurations
export const StatusConfig = {
  verified: {
    label: 'Verified',
    color: Colors.success,
    bgColor: Colors.successMuted,
    borderColor: Colors.successBorder,
  },
  pending: {
    label: 'Pending OTP',
    color: Colors.pending,
    bgColor: Colors.pendingMuted,
    borderColor: Colors.pendingBorder,
  },
  urgent: {
    label: 'Urgent',
    color: Colors.danger,
    bgColor: Colors.dangerMuted,
    borderColor: Colors.dangerBorder,
  },
  upcoming: {
    label: 'Upcoming',
    color: Colors.warning,
    bgColor: Colors.warningMuted,
    borderColor: Colors.warningBorder,
  },
  active: {
    label: 'Active',
    color: Colors.success,
    bgColor: Colors.successMuted,
    borderColor: Colors.successBorder,
  },
} as const;

// Insurance/Renewal type icons
export const TypeIcons = {
  insurance: {
    health: '🏥',
    vehicle: '🚗',
    life: '🕊️',
    property: '🏠',
    other: '📄',
  },
  renewal: {
    ghmc: '🏛️',
    fire_noc: '🔥',
    fssai: '🍽️',
    pollution: '🌿',
    property_tax: '🏠',
    other: '📋',
  },
  emergency: {
    health: '🚑',
    property: '🏠',
    legal: '📜',
  },
} as const;
