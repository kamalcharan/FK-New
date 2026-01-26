// src/lib/otp.ts
/**
 * OTP Service via N8N Webhooks
 *
 * N8N handles:
 * - OTP generation
 * - SMS sending (via MSG91/Twilio/etc.)
 * - OTP storage & verification
 *
 * This keeps SMS provider logic server-side and flexible.
 */

// N8N webhook base URL from environment
const N8N_WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL || '';

interface SendOTPResponse {
  success: boolean;
  message: string;
  request_id?: string;
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

interface ResendOTPResponse {
  success: boolean;
  message: string;
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
 * Check if N8N is configured
 */
export function isOTPServiceReady(): boolean {
  return N8N_WEBHOOK_URL.length > 0;
}

/**
 * Send OTP to phone number via N8N
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
    if (!isOTPServiceReady()) {
      // Demo mode - simulate success
      console.log('[OTP Demo] Would send OTP to:', phone);
      return {
        success: true,
        message: 'OTP sent (demo mode)',
        request_id: 'demo_' + Date.now(),
      };
    }

    const formattedPhone = formatPhoneNumber(phone, countryCode);

    const response = await fetch(`${N8N_WEBHOOK_URL}/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        country_code: countryCode,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: 'OTP sent successfully',
        request_id: data.request_id,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to send OTP',
      };
    }
  } catch (error) {
    console.error('OTP sendOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

/**
 * Verify OTP entered by user via N8N
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
    if (!isOTPServiceReady()) {
      // Demo mode - accept any 6-digit OTP
      console.log('[OTP Demo] Verifying OTP:', otp, 'for phone:', phone);
      if (otp.length === 6) {
        return {
          success: true,
          message: 'OTP verified (demo mode)',
          verified: true,
        };
      }
      return {
        success: false,
        message: 'Invalid OTP',
        verified: false,
      };
    }

    const formattedPhone = formatPhoneNumber(phone, countryCode);

    const response = await fetch(`${N8N_WEBHOOK_URL}/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        otp: otp,
      }),
    });

    const data = await response.json();

    if (data.success && data.verified) {
      return {
        success: true,
        message: 'OTP verified successfully',
        verified: true,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Invalid OTP',
        verified: false,
      };
    }
  } catch (error) {
    console.error('OTP verifyOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
      verified: false,
    };
  }
}

/**
 * Resend OTP to phone number via N8N
 *
 * @param phone - Phone number
 * @param method - 'sms' or 'voice'
 * @param countryCode - Country code (default: 91)
 * @returns Promise<ResendOTPResponse>
 */
export async function resendOTP(
  phone: string,
  method: 'sms' | 'voice' = 'sms',
  countryCode: string = '91'
): Promise<ResendOTPResponse> {
  try {
    if (!isOTPServiceReady()) {
      // Demo mode
      console.log('[OTP Demo] Would resend OTP to:', phone, 'via:', method);
      return {
        success: true,
        message: method === 'voice' ? 'You will receive a call shortly (demo)' : 'OTP resent (demo)',
      };
    }

    const formattedPhone = formatPhoneNumber(phone, countryCode);

    const response = await fetch(`${N8N_WEBHOOK_URL}/otp/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        method: method,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: method === 'voice' ? 'You will receive a call shortly' : 'OTP resent successfully',
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to resend OTP',
      };
    }
  } catch (error) {
    console.error('OTP resendOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}
