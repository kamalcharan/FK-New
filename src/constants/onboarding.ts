// src/constants/onboarding.ts
/**
 * Onboarding slide content
 * Matches the emotional storytelling from the HTML mockups
 */

export interface OnboardingSlide {
  id: string;
  type: 'emergency' | 'feature' | 'security';
  badge?: string;
  title: string;
  subtitle: string;
  icon?: string;
  buttonText?: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'emergency',
    type: 'emergency',
    badge: '11:00 PM • Goa Medical Emergency',
    title: '"Where is Dad\'s insurance policy?"',
    subtitle: 'Never be caught without critical documents when they matter most.',
    buttonText: 'Secure My Family',
  },
  {
    id: 'handshake',
    type: 'feature',
    title: 'The Digital Handshake',
    subtitle: 'Lent ₹3L to a cousin? Get OTP-verified proof and prevent family disputes before they happen.',
    icon: '🤝',
  },
  {
    id: 'vault',
    type: 'feature',
    title: 'Your Family Vault',
    subtitle: 'Insurance policies, compliance renewals, and important documents — all in one secure place.',
    icon: '🛡️',
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
