// src/constants/renewals.ts
// Types and helper functions for renewals
// Master data is now stored in DB (fk_renewal_presets, fk_renewal_bundles, fk_renewal_stories)

// ============================================
// Types
// ============================================

export type RenewalStatus = 'active' | 'renewed' | 'expired';

export type RenewalUrgencyStatus = 'overdue' | 'critical' | 'warning' | 'upcoming' | 'good';

// Category codes (match DB)
export type RenewalCategory =
  | 'business'
  | 'property'
  | 'professional'
  | 'personal'
  | 'vehicle'
  | 'contracts'
  | 'subscriptions';

// Category display info (for UI when DB not available)
export const CATEGORY_INFO: Record<RenewalCategory, { label: string; icon: string }> = {
  business: { label: 'Business', icon: '🏪' },
  property: { label: 'Property', icon: '🏠' },
  professional: { label: 'Professional', icon: '👔' },
  personal: { label: 'Personal', icon: '📄' },
  vehicle: { label: 'Vehicle', icon: '🚗' },
  contracts: { label: 'Contracts & AMC', icon: '📝' },
  subscriptions: { label: 'Subscriptions', icon: '🔄' },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate days until expiry from a date
 */
export function calculateDaysUntilExpiry(expiryDate: string | Date): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency status with color and label
 */
export function getRenewalUrgencyStatus(daysUntilExpiry: number): {
  status: RenewalUrgencyStatus;
  color: string;
  bgColor: string;
  label: string;
} {
  if (daysUntilExpiry < 0) {
    return {
      status: 'overdue',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      label: `${Math.abs(daysUntilExpiry)}d overdue`,
    };
  }
  if (daysUntilExpiry <= 7) {
    return {
      status: 'critical',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      label: `${daysUntilExpiry}d left`,
    };
  }
  if (daysUntilExpiry <= 30) {
    return {
      status: 'warning',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      label: `${daysUntilExpiry}d left`,
    };
  }
  if (daysUntilExpiry <= 90) {
    return {
      status: 'upcoming',
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.15)',
      label: `${daysUntilExpiry}d left`,
    };
  }
  return {
    status: 'good',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    label: `${daysUntilExpiry}d left`,
  };
}

/**
 * Suggest next expiry date based on frequency
 */
export function suggestNextExpiryDate(currentExpiry: Date | string, frequencyMonths: number): Date {
  const expiry = new Date(currentExpiry);
  expiry.setMonth(expiry.getMonth() + frequencyMonths);
  return expiry;
}

/**
 * Format cost range for display
 */
export function formatCostRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Varies';
  if (min === 0 && max === 0) return 'Varies';
  if (min === max) return `₹${min?.toLocaleString('en-IN')}`;
  if (!min) return `Up to ₹${max?.toLocaleString('en-IN')}`;
  if (!max) return `₹${min?.toLocaleString('en-IN')}+`;
  return `₹${min?.toLocaleString('en-IN')} - ₹${max?.toLocaleString('en-IN')}`;
}

/**
 * Format date for display
 */
export function formatExpiryDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get category icon (fallback if DB data not available)
 */
export function getCategoryIcon(category: string): string {
  const info = CATEGORY_INFO[category as RenewalCategory];
  return info?.icon || '📋';
}

/**
 * Get category label (fallback if DB data not available)
 */
export function getCategoryLabel(category: string): string {
  const info = CATEGORY_INFO[category as RenewalCategory];
  return info?.label || category.charAt(0).toUpperCase() + category.slice(1);
}

// Default reminder days
export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 15, 7, 1];

