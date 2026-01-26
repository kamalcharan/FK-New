// src/lib/msg91.ts
/**
 * MSG91 OTP Service
 *
 * For production: These API calls should go through Supabase Edge Functions
 * to protect the AUTH_KEY. This client-side implementation is for development.
 *
 * MSG91 API Docs: https://docs.msg91.com/collection/otp-api/5/send-otp/TZ6HN0YI
 */

// Environment variables
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'FMLYKNW';

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5';

interface SendOTPResponse {
  success: boolean;
  message: string;
  type?: string;
  request_id?: string;
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  type?: string;
}

interface ResendOTPResponse {
  success: boolean;
  message: string;
  type?: string;
}

/**
 * Format phone number to include country code
 * Assumes Indian numbers if no country code provided
 */
export function formatPhoneNumber(phone: string, countryCode: string = '91'): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');

  // If starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If doesn't start with country code, add it
  if (!cleaned.startsWith(countryCode)) {
    cleaned = countryCode + cleaned;
  }

  return cleaned;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // Indian mobile: 10 digits, or with country code 12 digits
  return cleaned.length === 10 || cleaned.length === 12;
}

/**
 * Send OTP to phone number
 *
 * @param phone - Phone number (with or without country code)
 * @param countryCode - Country code (default: 91 for India)
 * @returns Promise<SendOTPResponse>
 */
export async function sendOTP(
  phone: string,
  countryCode: string = '91'
): Promise<SendOTPResponse> {
  try {
    const formattedPhone = formatPhoneNumber(phone, countryCode);

    const response = await fetch(`${MSG91_BASE_URL}/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        mobile: formattedPhone,
        sender: MSG91_SENDER_ID,
        otp_length: 6,
        otp_expiry: 10, // 10 minutes
      }),
    });

    const data = await response.json();

    if (data.type === 'success') {
      return {
        success: true,
        message: 'OTP sent successfully',
        type: data.type,
        request_id: data.request_id,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to send OTP',
        type: data.type,
      };
    }
  } catch (error) {
    console.error('MSG91 sendOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Verify OTP entered by user
 *
 * @param phone - Phone number used to send OTP
 * @param otp - 6-digit OTP entered by user
 * @param countryCode - Country code (default: 91)
 * @returns Promise<VerifyOTPResponse>
 */
export async function verifyOTP(
  phone: string,
  otp: string,
  countryCode: string = '91'
): Promise<VerifyOTPResponse> {
  try {
    const formattedPhone = formatPhoneNumber(phone, countryCode);

    const response = await fetch(
      `${MSG91_BASE_URL}/otp/verify?mobile=${formattedPhone}&otp=${otp}`,
      {
        method: 'GET',
        headers: {
          'authkey': MSG91_AUTH_KEY,
        },
      }
    );

    const data = await response.json();

    if (data.type === 'success') {
      return {
        success: true,
        message: 'OTP verified successfully',
        type: data.type,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Invalid OTP',
        type: data.type,
      };
    }
  } catch (error) {
    console.error('MSG91 verifyOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Resend OTP to phone number
 *
 * @param phone - Phone number
 * @param retryType - 'text' for SMS, 'voice' for voice call
 * @param countryCode - Country code (default: 91)
 * @returns Promise<ResendOTPResponse>
 */
export async function resendOTP(
  phone: string,
  retryType: 'text' | 'voice' = 'text',
  countryCode: string = '91'
): Promise<ResendOTPResponse> {
  try {
    const formattedPhone = formatPhoneNumber(phone, countryCode);

    const response = await fetch(
      `${MSG91_BASE_URL}/otp/retry?mobile=${formattedPhone}&retrytype=${retryType}`,
      {
        method: 'GET',
        headers: {
          'authkey': MSG91_AUTH_KEY,
        },
      }
    );

    const data = await response.json();

    if (data.type === 'success') {
      return {
        success: true,
        message: retryType === 'voice' ? 'You will receive a call shortly' : 'OTP resent successfully',
        type: data.type,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to resend OTP',
        type: data.type,
      };
    }
  } catch (error) {
    console.error('MSG91 resendOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Check if MSG91 is configured
 */
export function isMSG91Configured(): boolean {
  return MSG91_AUTH_KEY.length > 0 && MSG91_TEMPLATE_ID.length > 0;
}
