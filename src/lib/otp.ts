// src/lib/otp.ts
/**
 * OTP Service via N8N Webhooks
 *
 * N8N handles:
 * - OTP generation & hashing
 * - SMS sending via MSG91
 * - OTP storage & verification
 * - Rate limiting
 * - Session token creation
 */

// N8N webhook base URL from environment
const N8N_WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL || '';

interface SendOTPResponse {
  success: boolean;
  message: string;
  phone?: string;
  expiresIn?: number;
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  token?: string;
  expiresAt?: string;
  code?: string;
}

interface ResendOTPResponse {
  success: boolean;
  message: string;
}

/**
 * Format phone number - remove non-digits
 * N8N will handle country code
 */
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
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
 * Check if N8N OTP service is configured
 */
export function isOTPServiceReady(): boolean {
  return N8N_WEBHOOK_URL.length > 0;
}

/**
 * Send OTP to phone number via N8N
 *
 * N8N Endpoint: POST /webhook/familyknows/otp/send
 * Request: { phone: "9876543210" }
 * Response: { success: true, message: "...", phone: "919876543210", expiresIn: 300 }
 */
export async function sendOTP(phone: string): Promise<SendOTPResponse> {
  try {
    if (!isOTPServiceReady()) {
      // Demo mode - simulate success
      console.log('[OTP Demo] Would send OTP to:', phone);
      return {
        success: true,
        message: 'OTP sent (demo mode)',
        phone: '91' + formatPhoneNumber(phone),
        expiresIn: 300,
      };
    }

    const response = await fetch(`${N8N_WEBHOOK_URL}/familyknows/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formatPhoneNumber(phone),
      }),
    });

    const data = await response.json();

    return {
      success: data.success || false,
      message: data.message || 'Failed to send OTP',
      phone: data.phone,
      expiresIn: data.expiresIn,
    };
  } catch (error) {
    console.error('OTP sendOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Verify OTP entered by user via N8N
 *
 * N8N Endpoint: POST /webhook/familyknows/otp/verify
 * Request: { phone: "9876543210", otp: "123456" }
 * Response: { success: true, token: "...", expiresAt: "..." }
 */
export async function verifyOTP(phone: string, otp: string): Promise<VerifyOTPResponse> {
  try {
    if (!isOTPServiceReady()) {
      // Demo mode - accept any 6-digit OTP
      console.log('[OTP Demo] Verifying OTP:', otp, 'for phone:', phone);
      if (otp.length === 6 && /^\d+$/.test(otp)) {
        return {
          success: true,
          message: 'OTP verified (demo mode)',
          token: 'demo_token_' + Date.now(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return {
        success: false,
        message: 'Invalid OTP',
        code: 'INVALID',
      };
    }

    const response = await fetch(`${N8N_WEBHOOK_URL}/familyknows/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formatPhoneNumber(phone),
        otp: otp,
      }),
    });

    const data = await response.json();

    return {
      success: data.success || false,
      message: data.message || 'Verification failed',
      token: data.token,
      expiresAt: data.expiresAt,
      code: data.code,
    };
  } catch (error) {
    console.error('OTP verifyOTP error:', error);
    return {
      success: false,
      message: 'Network error. Please check your connection and try again.',
    };
  }
}

/**
 * Resend OTP - calls send OTP again
 * N8N will handle rate limiting
 */
export async function resendOTP(
  phone: string,
  method: 'sms' | 'voice' = 'sms'
): Promise<ResendOTPResponse> {
  // For now, resend just calls send again
  // N8N handles rate limiting internally
  const result = await sendOTP(phone);

  return {
    success: result.success,
    message: result.success
      ? (method === 'voice' ? 'You will receive a call shortly' : 'OTP resent successfully')
      : result.message,
  };
}

/**
 * Store session token locally after successful verification
 */
export async function storeSessionToken(token: string, expiresAt: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('fk_session_token', token);
    await AsyncStorage.setItem('fk_session_expires', expiresAt);
  } catch (error) {
    console.error('Failed to store session token:', error);
  }
}

/**
 * Get stored session token
 */
export async function getSessionToken(): Promise<{ token: string | null; expiresAt: string | null }> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('fk_session_token');
    const expiresAt = await AsyncStorage.getItem('fk_session_expires');

    // Check if expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      await clearSessionToken();
      return { token: null, expiresAt: null };
    }

    return { token, expiresAt };
  } catch (error) {
    console.error('Failed to get session token:', error);
    return { token: null, expiresAt: null };
  }
}

/**
 * Clear session token (logout)
 */
export async function clearSessionToken(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('fk_session_token');
    await AsyncStorage.removeItem('fk_session_expires');
  } catch (error) {
    console.error('Failed to clear session token:', error);
  }
}
