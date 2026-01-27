# Loan Verification Webpage Specification

## Overview

A simple, mobile-first webpage at `familyknows.in/v/{code}` that allows loan counterparties to verify loan records without installing the app.

---

## URL Structure

```
https://familyknows.in/v/{6-digit-code}
```

Example: `https://familyknows.in/v/847291`

Alternative entry point:
```
https://familyknows.in/verify
```
(User enters code manually)

---

## User Flow

### Step 1: Landing Page

**URL:** `/v/{code}` or `/verify`

**Display:**
- FamilyKnows logo
- "Loan Verification" heading
- If code in URL: proceed to Step 2
- If no code: show input field for 6-digit code

**Input field:**
- Placeholder: "Enter 6-digit code"
- Numeric keyboard on mobile
- "Continue" button

**Error states:**
- Invalid code format: "Please enter a valid 6-digit code"
- Code not found: "This verification code is invalid or expired"
- Code already used: "This loan has already been verified"

---

### Step 2: Loan Details & Verification Form

**Display loan information (read-only):**
```
┌─────────────────────────────────────┐
│  Loan Verification Request          │
│                                     │
│  Amount: ₹50,000                    │
│  Date: 15 Jan 2026                  │
│  Type: Loan Given                   │
│  Recorded by: Rajesh Kumar          │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  To verify, confirm your details:   │
│                                     │
│  Your Name: [___________________]   │
│  Your Phone: [___________________]  │
│                                     │
│  [ Verify & Confirm ]               │
│                                     │
└─────────────────────────────────────┘
```

**Form fields:**
| Field | Type | Validation |
|-------|------|------------|
| Name | Text | Required, exact match with loan record (case-insensitive) |
| Phone | Tel | Required, 10 digits, must match loan record (normalized) |

**Phone normalization:**
- Strip all non-numeric characters
- Remove country code (+91, 91) if present
- Compare last 10 digits

---

### Step 3: Verification Result

**Success:**
```
┌─────────────────────────────────────┐
│           ✓ Verified!               │
│                                     │
│  Digital Handshake Complete         │
│  27 January 2026, 3:45 PM           │
│                                     │
│  Both parties have confirmed this   │
│  loan record. This agreement is     │
│  now timestamped and secured.       │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Loan Details:                      │
│  Amount: ₹50,000                    │
│  Date: 15 Jan 2026                  │
│  Confirmed by: Ravi Kumar           │
│  Recorded by: Rajesh Kumar          │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Want to track your own loans?      │
│  [ Download FamilyKnows App ]       │
│                                     │
└─────────────────────────────────────┘
```

**Failure - Name mismatch:**
```
"The name you entered doesn't match our records.
Please enter your name exactly as shared with the loan recorder."
```

**Failure - Phone mismatch:**
```
"The phone number doesn't match our records.
Please use the same phone number that was shared with the loan recorder."
```

---

## API Integration

### Endpoint: Verify Loan

**Supabase RPC:** `verify_loan_by_code`

**Request:**
```typescript
{
  p_code: string,   // 6-digit code
  p_name: string,   // User's name
  p_phone: string   // User's phone (will be normalized server-side)
}
```

**Response (Success):**
```typescript
{
  success: true,
  loan_type: "given" | "taken",
  amount: 50000,
  loan_date: "2026-01-15",
  lender_name: "Rajesh Kumar",  // The person who recorded the loan
  handshake_date: "2026-01-27T10:15:30Z",
  error_message: null
}
```

**Response (Error):**
```typescript
{
  success: false,
  loan_type: null,
  amount: null,
  loan_date: null,
  lender_name: null,
  handshake_date: null,
  error_message: "Name does not match our records"
}
```

---

## Technical Requirements

### Frontend Stack
- **Framework:** Next.js (for familyknows.in website)
- **Styling:** Tailwind CSS
- **Theme:** Dark mode matching app aesthetic

### Security
- Rate limiting: Max 5 verification attempts per IP per hour
- Code expiry: 7 days from generation
- HTTPS only
- No sensitive data in URL (code is just a lookup key)

### Mobile Optimization
- Viewport meta tag for mobile
- Large touch targets (min 44x44px)
- Numeric keyboard for code/phone inputs
- Responsive layout

### Analytics
Track these events:
- `verification_page_view`
- `verification_code_entered`
- `verification_success`
- `verification_failed` (with reason)
- `app_download_clicked`

---

## Design Guidelines

### Colors (match app theme)
```css
--background: #0f172a;
--surface: rgba(30, 41, 59, 0.5);
--border: rgba(71, 85, 105, 0.5);
--text: #f8fafc;
--text-muted: #94a3b8;
--primary: #6366f1;
--success: #4ade80;
--error: #ef4444;
```

### Typography
- Font: Inter (same as app)
- Headings: Inter SemiBold
- Body: Inter Regular

### Components
- Glass-morphism cards (backdrop blur)
- Rounded corners (16px for cards)
- Subtle borders with transparency

---

## Page States

| State | Condition | Display |
|-------|-----------|---------|
| Loading | Fetching loan data | Spinner + "Loading..." |
| Code Entry | No code or invalid format | Code input form |
| Verification Form | Valid code, loan found | Loan details + name/phone form |
| Success | Verification passed | Success message + loan summary |
| Error - Invalid Code | Code not found/expired | Error message + retry option |
| Error - Already Verified | Code already used | Info message (already done) |
| Error - Mismatch | Name/phone don't match | Error message + retry form |

---

## Copy/Messaging

### Page Title
"Verify Loan | FamilyKnows"

### Meta Description
"Verify a loan record on FamilyKnows. Complete the digital handshake to confirm the loan agreement."

### Success Message
"Digital Handshake Complete - Both parties have confirmed this loan record. This agreement is now timestamped and secured in FamilyKnows."

### Trust Footer
"FamilyKnows helps families track loans, insurance, and renewals. Your verification creates a trusted, timestamped record that both parties can reference."

---

## Future Enhancements

1. **WhatsApp Deep Link:** After verification, offer to save confirmation in WhatsApp
2. **PDF Receipt:** Generate downloadable verification receipt
3. **SMS Notification:** Notify the loan recorder when verification is complete
4. **Multi-language:** Support Hindi, Telugu, Tamil translations
5. **Dispute Flow:** Allow counterparty to dispute if details are wrong

---

## Implementation Checklist

- [ ] Create `/verify` and `/v/[code]` routes
- [ ] Build verification form component
- [ ] Integrate with Supabase RPC
- [ ] Add success/error states
- [ ] Mobile responsive styling
- [ ] Rate limiting middleware
- [ ] Analytics events
- [ ] SEO meta tags
- [ ] App download CTA
- [ ] Error handling & logging
