// src/constants/currencies.ts

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault?: boolean;
}

export const currencyOptions: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', isDefault: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', isDefault: false },
  { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false },
  { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isDefault: false },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', isDefault: false },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', isDefault: false },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', isDefault: false },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', isDefault: false },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', isDefault: false },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', isDefault: false },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', isDefault: false },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', isDefault: false },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', isDefault: false },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', isDefault: false },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', isDefault: false },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', isDefault: false },
];

// Helper function to get the default currency
export const getDefaultCurrency = (): Currency => {
  const defaultCurrency = currencyOptions.find(currency => currency.isDefault);
  return defaultCurrency || currencyOptions[0];
};

// Helper function to get currency by code
export const getCurrencyByCode = (code: string): Currency | undefined => {
  return currencyOptions.find(currency => currency.code === code);
};

// Helper function to get currency symbol
export const getCurrencySymbol = (code: string): string => {
  const currency = getCurrencyByCode(code);
  return currency?.symbol || '₹';
};

// Format amount with currency symbol
export const formatCurrencyAmount = (amount: number, currencyCode: string = 'INR'): string => {
  const symbol = getCurrencySymbol(currencyCode);

  // Indian style formatting for INR
  if (currencyCode === 'INR') {
    if (amount >= 10000000) return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `${symbol}${(amount / 100000).toFixed(1)}L`;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  // Standard formatting for other currencies
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString('en-US')}`;
};
