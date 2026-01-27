# FamilyKnows Phone OTP Authentication - Setup Guide

## Overview

This N8N workflow provides phone-based OTP authentication for FamilyKnows using MSG91 as the SMS provider.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SEND OTP FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /otp/send                                                              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Validate    │───▶│ Generate OTP │───▶│ Store in DB │───▶│ Send via    │  │
│  │ Phone       │    │ (6-digit)    │    │ (hashed)    │    │ MSG91       │  │
│  └─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERIFY OTP FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /otp/verify                                                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Validate    │───▶│ Fetch from   │───▶│ Compare     │───▶│ Create      │  │
│  │ Input       │    │ Database     │    │ OTP Hash    │    │ Session     │  │
│  └─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

1. **MSG91 Account** with:
   - Auth Key
   - OTP Template approved by DLT (for India)
   - Sufficient SMS credits

2. **N8N Instance** with:
   - PostgreSQL credentials configured
   - Environment variables access

3. **Database** with migration applied

---

## Step 1: MSG91 Configuration

### Get Your Credentials

1. Login to [MSG91 Dashboard](https://control.msg91.com)
2. Go to **API** → **Keys** → Copy your **Auth Key**
3. Go to **OTP** → **Templates** → Create/Get your **Template ID**

### Create OTP Template in MSG91

Template format (example):
```
Your FamilyKnows verification code is ##OTP##. Valid for 5 minutes. Do not share with anyone.
```

Note: For India, ensure DLT registration is complete.

---

## Step 2: N8N Environment Variables

Add these to your N8N environment (`.env` file or Docker env):

```bash
# MSG91 Configuration
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_OTP_TEMPLATE_ID=your_template_id_here
MSG91_SENDER_ID=FMLYNO
MSG91_COUNTRY_CODE=91

# Database (if not already configured)
DB_POSTGRESDB_HOST=your_db_host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=familyknows
DB_POSTGRESDB_USER=your_db_user
DB_POSTGRESDB_PASSWORD=your_db_password
```

---

## Step 3: Database Setup

Run the migration script on your FamilyKnows database:

```bash
psql -h your_db_host -U your_db_user -d familyknows -f otp-database-migration.sql
```

---

## Step 4: Import N8N Workflow

1. Open N8N Dashboard
2. Click **+** → **Import from File**
3. Select `familyknows-phone-otp-workflow.json`
4. Configure the **PostgreSQL credential** in each database node:
   - Click on any Postgres node
   - Select or create credential for FamilyKnows database
5. **Activate** the workflow

---

## API Endpoints

### 1. Send OTP

**Endpoint:** `POST /webhook/familyknows/otp/send`

**Request:**
```json
{
  "phone": "9876543210"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "919876543210",
  "expiresIn": 300
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid phone number"
}
```

---

### 2. Verify OTP

**Endpoint:** `POST /webhook/familyknows/otp/verify`

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "a1b2c3d4e5f6...",
  "expiresAt": "2026-02-25T12:00:00Z"
}
```

**Error Responses (400):**
```json
{
  "success": false,
  "message": "Invalid OTP. Please try again.",
  "code": "INVALID"
}
```

```json
{
  "success": false,
  "message": "OTP has expired. Please request a new OTP.",
  "code": "EXPIRED"
}
```

```json
{
  "success": false,
  "message": "Too many failed attempts. Please request a new OTP.",
  "code": "MAX_ATTEMPTS"
}
```

---

## React Native Integration

### OTP Service

```typescript
// services/otpService.ts
const N8N_BASE_URL = 'https://your-n8n-instance.com/webhook';

export const otpService = {
  async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${N8N_BASE_URL}/familyknows/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return response.json();
  },

  async verifyOTP(phone: string, otp: string): Promise<{
    success: boolean;
    message: string;
    token?: string;
    expiresAt?: string;
  }> {
    const response = await fetch(`${N8N_BASE_URL}/familyknows/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    return response.json();
  },
};
```

### Login Screen Update

```typescript
// screens/LoginScreen.tsx
import { otpService } from '../services/otpService';

const handleSendOTP = async () => {
  try {
    setLoading(true);
    const fullPhone = `${selectedCountry.code}${phoneNumber}`;
    const result = await otpService.sendOTP(fullPhone);
    
    if (result.success) {
      navigation.navigate('OtpVerification', { phone: fullPhone });
    } else {
      Alert.alert('Error', result.message);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to send OTP. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### OTP Verification Screen Update

```typescript
// screens/OtpVerificationScreen.tsx
import { otpService } from '../services/otpService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const handleVerifyOTP = async () => {
  try {
    setLoading(true);
    const otpCode = otp.join('');
    const result = await otpService.verifyOTP(phone, otpCode);
    
    if (result.success) {
      // Store the session token
      await AsyncStorage.setItem('authToken', result.token);
      await AsyncStorage.setItem('tokenExpiry', result.expiresAt);
      
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } else {
      Alert.alert('Verification Failed', result.message);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to verify OTP. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| OTP Hashing | SHA256 - OTP never stored in plain text |
| Expiry | 5 minutes default |
| Max Attempts | 5 attempts before requiring new OTP |
| Rate Limiting | 5 OTP requests per phone per hour |
| Session Token | 64-char random hex, 30-day validity |

---

## Troubleshooting

### OTP Not Received

1. Check MSG91 dashboard for delivery status
2. Verify phone number format (should include country code)
3. Check MSG91 balance/credits
4. Verify template is approved (for India DLT)

### Invalid OTP Errors

1. Ensure user enters 6 digits
2. Check if OTP has expired (5 min window)
3. Check attempt count in database

### Database Connection Issues

1. Verify PostgreSQL credentials in N8N
2. Check database firewall rules
3. Test connection manually

---

## Maintenance

### Cleanup Expired OTPs

Run periodically (cron job or scheduled workflow):

```sql
SELECT cleanup_expired_otps();
```

### Monitor Rate Limits

```sql
SELECT * FROM otp_rate_limits WHERE blocked_until > NOW();
```

---

## Security Recommendations

1. **Use HTTPS** for all API endpoints
2. **Add IP-based rate limiting** at proxy/load balancer level
3. **Log all OTP attempts** for security auditing
4. **Implement CAPTCHA** after 2-3 failed attempts
5. **Send notifications** on successful logins from new devices
