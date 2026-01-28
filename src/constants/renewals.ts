// src/constants/renewals.ts

// Renewal Category Enum
export type RenewalCategory =
  | 'trade_license'
  | 'fire_noc'
  | 'fssai'
  | 'shop_act'
  | 'gst_annual'
  | 'pollution_consent'
  | 'factory_license'
  | 'property_tax'
  | 'water_connection'
  | 'electricity_connection'
  | 'society_dues'
  | 'medical_license'
  | 'ca_membership'
  | 'bar_council'
  | 'architect_license'
  | 'passport'
  | 'driving_license'
  | 'pan_reissue'
  | 'aadhaar_update'
  | 'vehicle_rc'
  | 'puc_certificate'
  | 'road_tax'
  | 'club_membership'
  | 'professional_body'
  | 'other';

// Renewal Status
export type RenewalStatus = 'active' | 'renewed' | 'expired' | 'archived';

// Category groups for UI
export const RENEWAL_CATEGORY_GROUPS = [
  {
    id: 'business',
    label: 'Business Compliance',
    icon: '🏪',
    categories: ['trade_license', 'fire_noc', 'fssai', 'shop_act', 'gst_annual', 'pollution_consent', 'factory_license'],
  },
  {
    id: 'property',
    label: 'Property Related',
    icon: '🏠',
    categories: ['property_tax', 'water_connection', 'electricity_connection', 'society_dues'],
  },
  {
    id: 'professional',
    label: 'Professional Licenses',
    icon: '📜',
    categories: ['medical_license', 'ca_membership', 'bar_council', 'architect_license'],
  },
  {
    id: 'personal',
    label: 'Personal Documents',
    icon: '📄',
    categories: ['passport', 'driving_license', 'pan_reissue', 'aadhaar_update'],
  },
  {
    id: 'vehicle',
    label: 'Vehicle Related',
    icon: '🚗',
    categories: ['vehicle_rc', 'puc_certificate', 'road_tax'],
  },
  {
    id: 'membership',
    label: 'Memberships',
    icon: '🎫',
    categories: ['club_membership', 'professional_body'],
  },
  {
    id: 'other',
    label: 'Other',
    icon: '📋',
    categories: ['other'],
  },
];

// Category details with icons, labels, and typical info
export const RENEWAL_CATEGORIES: Record<RenewalCategory, {
  label: string;
  icon: string;
  typicalFrequencyMonths: number;
  applicableTo: 'business' | 'individual' | 'property' | 'all';
  documentsRequired?: string[];
}> = {
  // Business Compliance
  trade_license: {
    label: 'Trade License',
    icon: '🏪',
    typicalFrequencyMonths: 12,
    applicableTo: 'business',
    documentsRequired: ['Previous license copy', 'Property tax receipt', 'ID proof'],
  },
  fire_noc: {
    label: 'Fire NOC',
    icon: '🔥',
    typicalFrequencyMonths: 12,
    applicableTo: 'business',
    documentsRequired: ['Building plan', 'Previous NOC', 'Fire equipment bill'],
  },
  fssai: {
    label: 'FSSAI License',
    icon: '🍽️',
    typicalFrequencyMonths: 12,
    applicableTo: 'business',
    documentsRequired: ['Previous license', 'Food safety plan', 'ID proof'],
  },
  shop_act: {
    label: 'Shop & Establishment',
    icon: '🏬',
    typicalFrequencyMonths: 60,
    applicableTo: 'business',
    documentsRequired: ['Previous certificate', 'Rent agreement', 'ID proof'],
  },
  gst_annual: {
    label: 'GST Annual Return',
    icon: '📊',
    typicalFrequencyMonths: 12,
    applicableTo: 'business',
    documentsRequired: ['GSTR-9', 'Annual accounts'],
  },
  pollution_consent: {
    label: 'Pollution Consent',
    icon: '🌿',
    typicalFrequencyMonths: 12,
    applicableTo: 'business',
    documentsRequired: ['Previous consent', 'Pollution control measures'],
  },
  factory_license: {
    label: 'Factory License',
    icon: '🏭',
    typicalFrequencyMonths: 12,
    applicableTo: 'business',
    documentsRequired: ['Previous license', 'Safety compliance certificate'],
  },

  // Property Related
  property_tax: {
    label: 'Property Tax',
    icon: '🏠',
    typicalFrequencyMonths: 12,
    applicableTo: 'property',
    documentsRequired: ['Previous receipt', 'Property documents'],
  },
  water_connection: {
    label: 'Water Connection',
    icon: '💧',
    typicalFrequencyMonths: 12,
    applicableTo: 'property',
    documentsRequired: ['Previous bill', 'Property documents'],
  },
  electricity_connection: {
    label: 'Electricity Connection',
    icon: '⚡',
    typicalFrequencyMonths: 12,
    applicableTo: 'property',
    documentsRequired: ['Previous bill', 'Property documents'],
  },
  society_dues: {
    label: 'Society Dues',
    icon: '🏢',
    typicalFrequencyMonths: 12,
    applicableTo: 'property',
    documentsRequired: ['Previous receipt', 'Membership proof'],
  },

  // Professional Licenses
  medical_license: {
    label: 'Medical License',
    icon: '⚕️',
    typicalFrequencyMonths: 60,
    applicableTo: 'individual',
    documentsRequired: ['Previous certificate', 'Degree certificate', 'ID proof'],
  },
  ca_membership: {
    label: 'CA Membership',
    icon: '📈',
    typicalFrequencyMonths: 12,
    applicableTo: 'individual',
    documentsRequired: ['Previous certificate', 'CPE hours proof'],
  },
  bar_council: {
    label: 'Bar Council License',
    icon: '⚖️',
    typicalFrequencyMonths: 12,
    applicableTo: 'individual',
    documentsRequired: ['Previous enrollment', 'Fee receipt'],
  },
  architect_license: {
    label: 'Architect License',
    icon: '🏗️',
    typicalFrequencyMonths: 12,
    applicableTo: 'individual',
    documentsRequired: ['Previous certificate', 'CPD points proof'],
  },

  // Personal Documents
  passport: {
    label: 'Passport',
    icon: '🛂',
    typicalFrequencyMonths: 120,
    applicableTo: 'individual',
    documentsRequired: ['Current passport', 'Address proof', 'Photos'],
  },
  driving_license: {
    label: 'Driving License',
    icon: '🪪',
    typicalFrequencyMonths: 240,
    applicableTo: 'individual',
    documentsRequired: ['Current DL', 'Address proof', 'Medical certificate (if 50+)'],
  },
  pan_reissue: {
    label: 'PAN Card Reissue',
    icon: '🆔',
    typicalFrequencyMonths: 0, // One-time
    applicableTo: 'individual',
    documentsRequired: ['Current PAN', 'ID proof'],
  },
  aadhaar_update: {
    label: 'Aadhaar Update',
    icon: '🔢',
    typicalFrequencyMonths: 0, // One-time
    applicableTo: 'individual',
    documentsRequired: ['Current Aadhaar', 'Supporting documents'],
  },

  // Vehicle Related
  vehicle_rc: {
    label: 'Vehicle RC',
    icon: '📋',
    typicalFrequencyMonths: 180,
    applicableTo: 'individual',
    documentsRequired: ['Current RC', 'Insurance', 'PUC'],
  },
  puc_certificate: {
    label: 'PUC Certificate',
    icon: '🌱',
    typicalFrequencyMonths: 6,
    applicableTo: 'individual',
    documentsRequired: ['Vehicle RC', 'Previous PUC'],
  },
  road_tax: {
    label: 'Road Tax',
    icon: '🛣️',
    typicalFrequencyMonths: 12,
    applicableTo: 'individual',
    documentsRequired: ['Vehicle RC', 'Previous receipt'],
  },

  // Memberships
  club_membership: {
    label: 'Club Membership',
    icon: '🎯',
    typicalFrequencyMonths: 12,
    applicableTo: 'individual',
    documentsRequired: ['Membership card', 'Previous receipt'],
  },
  professional_body: {
    label: 'Professional Body',
    icon: '🎖️',
    typicalFrequencyMonths: 12,
    applicableTo: 'individual',
    documentsRequired: ['Membership certificate', 'Previous receipt'],
  },

  // Other
  other: {
    label: 'Other',
    icon: '📋',
    typicalFrequencyMonths: 12,
    applicableTo: 'all',
    documentsRequired: [],
  },
};

// Default reminder days
export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 15, 7, 1];

// Renewal presets for quick add
export const RENEWAL_PRESETS = [
  {
    category: 'trade_license' as RenewalCategory,
    titleTemplate: 'GHMC Trade License',
    authorityTemplate: 'GHMC',
    typicalFrequencyMonths: 12,
    typicalCostRange: '₹2,000 - ₹25,000',
    state: 'telangana',
  },
  {
    category: 'fire_noc' as RenewalCategory,
    titleTemplate: 'Fire NOC',
    authorityTemplate: 'Fire Department',
    typicalFrequencyMonths: 12,
    typicalCostRange: '₹5,000 - ₹15,000',
    state: 'all',
  },
  {
    category: 'fssai' as RenewalCategory,
    titleTemplate: 'FSSAI License',
    authorityTemplate: 'FSSAI',
    typicalFrequencyMonths: 12,
    typicalCostRange: '₹2,000 - ₹7,500',
    state: 'all',
  },
  {
    category: 'property_tax' as RenewalCategory,
    titleTemplate: 'Property Tax',
    authorityTemplate: 'Municipal Corporation',
    typicalFrequencyMonths: 12,
    typicalCostRange: 'Varies',
    state: 'all',
  },
  {
    category: 'driving_license' as RenewalCategory,
    titleTemplate: 'Driving License',
    authorityTemplate: 'RTO',
    typicalFrequencyMonths: 240,
    typicalCostRange: '₹500 - ₹1,000',
    state: 'all',
  },
  {
    category: 'passport' as RenewalCategory,
    titleTemplate: 'Passport',
    authorityTemplate: 'Passport Seva Kendra',
    typicalFrequencyMonths: 120,
    typicalCostRange: '₹1,500 - ₹2,000',
    state: 'all',
  },
  {
    category: 'puc_certificate' as RenewalCategory,
    titleTemplate: 'PUC Certificate',
    authorityTemplate: 'Authorized PUC Center',
    typicalFrequencyMonths: 6,
    typicalCostRange: '₹100 - ₹500',
    state: 'all',
  },
];

// Helper function to get urgency status
export function getRenewalUrgencyStatus(daysUntilExpiry: number): {
  status: 'overdue' | 'critical' | 'warning' | 'upcoming' | 'good';
  color: string;
  label: string;
} {
  if (daysUntilExpiry < 0) {
    return { status: 'overdue', color: '#ef4444', label: 'Overdue' };
  }
  if (daysUntilExpiry <= 7) {
    return { status: 'critical', color: '#ef4444', label: `${daysUntilExpiry}d left` };
  }
  if (daysUntilExpiry <= 30) {
    return { status: 'warning', color: '#f59e0b', label: `${daysUntilExpiry}d left` };
  }
  if (daysUntilExpiry <= 90) {
    return { status: 'upcoming', color: '#fbbf24', label: `${daysUntilExpiry}d left` };
  }
  return { status: 'good', color: '#22c55e', label: `${daysUntilExpiry}d left` };
}

// Helper to calculate days until expiry
export function calculateDaysUntilExpiry(expiryDate: string | Date): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Helper to suggest next expiry date
export function suggestNextExpiryDate(currentExpiry: Date, frequencyMonths: number): Date {
  const nextExpiry = new Date(currentExpiry);
  nextExpiry.setMonth(nextExpiry.getMonth() + frequencyMonths);
  return nextExpiry;
}
