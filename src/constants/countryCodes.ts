// src/constants/countryCodes.ts

export interface CountryCode {
  code: string;
  name: string;
  dial: string;
  flag: string;
  isDefault?: boolean;
}

export const countryCodeOptions: CountryCode[] = [
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', isDefault: true },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
];

export const getDefaultCountryCode = (): CountryCode => {
  return countryCodeOptions.find(c => c.isDefault) || countryCodeOptions[0];
};

export const getCountryByCode = (code: string): CountryCode | undefined => {
  return countryCodeOptions.find(c => c.code === code);
};

export const getCountryByDial = (dial: string): CountryCode | undefined => {
  return countryCodeOptions.find(c => c.dial === dial);
};
