// src/utils/urgency.ts
import type { UrgencyLevel, UrgencyInfo, VaultItem, Loan } from '../types';

/**
 * Calculate urgency level based on expiry date
 */
export function getUrgencyLevel(expiryDate: string): UrgencyLevel {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'urgent';
  if (diffDays <= 30) return 'upcoming';
  return 'healthy';
}

/**
 * Get complete urgency info including label
 */
export function getUrgencyInfo(expiryDate: string): UrgencyInfo {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const level = getUrgencyLevel(expiryDate);

  let label: string;
  if (diffDays < 0) {
    label = `${Math.abs(diffDays)} days overdue`;
  } else if (diffDays === 0) {
    label = 'Expires today';
  } else if (diffDays === 1) {
    label = 'Expires tomorrow';
  } else if (diffDays <= 7) {
    label = `${diffDays} days left`;
  } else if (diffDays <= 30) {
    label = `${diffDays} days left`;
  } else {
    label = 'Active';
  }

  return { level, daysUntilExpiry: diffDays, label };
}

/**
 * Sort vault items by urgency (most urgent first)
 */
export function sortByUrgency<T extends { expiry_date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.expiry_date).getTime();
    const bDate = new Date(b.expiry_date).getTime();
    return aDate - bDate;
  });
}

/**
 * Filter items that need attention (within reminder window)
 */
export function getItemsNeedingAttention(items: VaultItem[]): VaultItem[] {
  const today = new Date();

  return items.filter(item => {
    const expiry = new Date(item.expiry_date);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Include if within reminder window or overdue
    return diffDays <= item.reminder_days;
  });
}

/**
 * Get the most urgent item from a list
 */
export function getMostUrgentItem(items: VaultItem[]): VaultItem | null {
  if (items.length === 0) return null;

  return items.reduce((mostUrgent, item) => {
    const urgentDate = new Date(mostUrgent.expiry_date).getTime();
    const itemDate = new Date(item.expiry_date).getTime();
    return itemDate < urgentDate ? item : mostUrgent;
  });
}

/**
 * Get pending loans (awaiting OTP verification)
 */
export function getPendingLoans(loans: Loan[]): Loan[] {
  return loans.filter(loan => !loan.otp_verified && loan.status === 'pending');
}

/**
 * Get verified loans
 */
export function getVerifiedLoans(loans: Loan[]): Loan[] {
  return loans.filter(loan => loan.otp_verified);
}

/**
 * Calculate total loan amount
 */
export function getTotalLoanAmount(loans: Loan[]): number {
  return loans.reduce((total, loan) => total + loan.amount, 0);
}
