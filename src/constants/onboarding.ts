// src/constants/onboarding.ts
/**
 * Onboarding slide content
 * Matches the emotional storytelling from the HTML mockups
 */

export interface OnboardingSlide {
  id: string;
  type: 'emergency' | 'story' | 'brand';
  badge?: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  icon?: string;
  buttonText?: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'emergency',
    type: 'emergency',
    badge: '11:00 PM \u2022 Goa Medical Emergency',
    title: '\u201CWhere is Dad\u2019s insurance policy?\u201D',
    subtitle: 'Never be caught without critical documents when they matter most.',
    buttonText: 'Secure My Family',
  },
  {
    id: 'loans',
    type: 'story',
    badge: '\u20B92,00,000 \u2022 Lent to family \u2022 March 2023',
    badgeColor: '#fbbf24',
    title: '\u201CWho remembers this loan?\u201D',
    subtitle: 'Families lend freely. But nobody writes it down. 18 months later, it\u2019s \u20B92 lakh or \u20B93 lakh \u2014 depending on who you ask.',
    buttonText: 'Start Your Ledger',
  },
  {
    id: 'compliance',
    type: 'story',
    badge: 'Fire Safety NOC \u2022 Expired 4 months ago',
    badgeColor: '#f97316',
    title: '\u201CThe penalty was more than the fee.\u201D',
    subtitle: 'Fire NOC. Trade license. FSSAI. No one sends reminders \u2014 you find out when the inspector or your auditor raises hands. Compliances you can\u2019t afford to miss.',
    buttonText: 'Never Again',
  },
  {
    id: 'brand',
    type: 'brand',
    title: '',
    subtitle: '',
    buttonText: 'Get Started',
  },
];

// Value propositions for the app
export const VALUE_PROPS = [
  {
    icon: '📄',
    title: 'Never Lose Documents',
    description: 'Insurance, licenses, and compliance records always accessible.',
  },
  {
    icon: '🤝',
    title: 'Verified Loans',
    description: 'OTP-based mutual acknowledgment for family lending.',
  },
  {
    icon: '⏰',
    title: 'Smart Reminders',
    description: 'Never miss a renewal deadline again.',
  },
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Family Access',
    description: 'Share critical info with trusted family members.',
  },
];
