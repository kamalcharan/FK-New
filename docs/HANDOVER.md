# FamilyKnows App - Development Handover Document

**Date:** January 2026
**Branch:** `claude/familyknows-app-setup-b4YIT`

---

## Project Overview

FamilyKnows is a family financial memory app with three core pillars:
1. **Loan Ledger** - Track loans given/taken with digital handshake verification
2. **Insurance Vault** - Store and manage insurance policies (planned)
3. **Renewal Tracker** - Track important renewals (planned)

### Tech Stack
- **Frontend:** React Native + Expo (SDK 54)
- **Routing:** Expo Router (file-based)
- **State Management:** Redux Toolkit
- **Backend:** Supabase (Auth, PostgreSQL, RLS policies)
- **Fonts:** Inter (body), Fraunces (headings)

---

## What Has Been Completed

### 1. Authentication Flow
- Phone number sign-in with OTP (MSG91 ready, not integrated)
- Email/password sign-up and sign-in
- Google Sign-In preparation (client ID configured)
- Session management with secure storage
- Onboarding screens

### 2. Workspace System
- Family workspace creation during onboarding
- Multi-family support architecture
- Workspace switching capability
- Family member management screen (`/family-members`)

### 3. Family Invite System
- 6-digit invite code generation
- Invite sharing via native share sheet
- Invite verification flow (`/verify-invite`)
- Relationship selection (Father, Mother, Spouse, etc.)
- RLS policies for workspace isolation

### 4. Demo Mode
- Toggle in Settings to view sample data
- Yellow banner on dashboard when demo active
- Demo data marked with "DEMO" tag in lists

### 5. Loan Ledger (Core Feature)
- **Loan Intro Screen** (`/loan-intro`) - "How It Works" explanation
- **Empty State** - Emotional design with call-to-action
- **Add Loan Form** (`/add-loan`) with:
  - New Loan vs Historical (Past) Loan toggle
  - Contact picker with search functionality
  - Country code selector (18 countries, default India +91)
  - Currency selector (18 currencies, default INR)
  - Loan date picker
  - Due date picker (optional)
  - Purpose and notes fields
  - Two save options:
    - "Save Record" (without verification)
    - "Save & Share for Verification" (generates code, opens share sheet)

### 6. Loan Verification Infrastructure
- 6-digit verification code generation (PostgreSQL function)
- `create_loan_verification()` - generates code with shareable message
- `verify_loan_by_code()` - validates name (exact match) + phone
- `get_loan_verification_details()` - fetch verification status
- Verification statuses: `pending`, `verified`, `expired`, `historical`

### 7. UI/UX
- Dark theme with glassmorphism design
- Toast notifications (replaced Alert dialogs)
- Tab navigation with floating bottom bar
- Safe area handling
- Keyboard avoiding views

### 8. Database Migrations (Supabase)
```
002_otp_tables.sql          - OTP infrastructure
003_google_tokens.sql       - Google Drive backup prep
004_auto_create_fk_users.sql - Auto-create user profiles
005-006_*.sql               - RLS policy fixes
007_relationships_and_invites.sql - Family invites
008-009_*.sql               - Invite verification fixes
010_workspace_members_management.sql
011_demo_mode.sql           - Demo data infrastructure
012_loan_verification.sql   - Verification code system
013_loan_enhancements.sql   - Currency, is_historical fields
```

---

## What Needs To Be Done

### High Priority

1. **Apply Pending Migrations**
   ```bash
   npx supabase db push
   ```
   Migrations 012 and 013 may need to be applied.

2. **Verification Webpage**
   - Create `familyknows.in/v/{code}` webpage
   - Spec available at: `docs/VERIFICATION_WEBPAGE_SPEC.md`
   - Flow: Enter name + phone → Verify → Show confirmation

3. **Loan List Screen Enhancements**
   - Display verification status badges
   - Show due dates with countdown
   - Filter by status (pending/verified/historical)
   - Loan detail view

4. **Lucide Icons Implementation**
   - Package installed but NOT used
   - Replace text arrows (←) with Lucide icons
   - Replace chevrons (▼) with Lucide icons
   - Keep emojis for emotional elements (🤝, 💸, 🏠)

### Medium Priority

5. **Insurance Vault**
   - Add insurance form exists but needs completion
   - Policy document upload (Google Drive integration)
   - Renewal reminders

6. **Renewal Tracker**
   - Generic renewal tracking
   - Push notification integration

7. **Google Drive Backup**
   - Infrastructure partially ready
   - Need to implement backup/restore flow

8. **MSG91 OTP Integration**
   - ENV vars configured
   - Need to implement actual SMS sending

### Low Priority

9. **Loan Repayment Tracking**
   - Record partial payments
   - Calculate outstanding balance

10. **Reports/Analytics**
    - Total loans given/taken summary
    - Family financial overview

---

## File Structure Reference

```
app/
├── (auth)/              # Auth screens
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   ├── verify-phone.tsx
│   ├── onboarding.tsx
│   ├── workspace-setup.tsx
│   ├── family-invite.tsx
│   └── verify-invite.tsx
├── (tabs)/              # Main app tabs
│   ├── index.tsx        # Dashboard
│   ├── vault.tsx        # Insurance vault
│   ├── loans.tsx        # Loan list
│   ├── settings.tsx
│   └── add.tsx          # Add menu
├── add-loan.tsx         # Loan form
├── loan-intro.tsx       # How it works
├── family-members.tsx   # Member management
└── backup.tsx           # Backup screen

src/
├── components/
│   └── ToastConfig.tsx  # Toast notifications
├── constants/
│   ├── theme.ts         # Colors, Typography
│   ├── currencies.ts    # Currency options
│   └── countryCodes.ts  # Country dial codes
├── lib/
│   └── supabase.ts      # Supabase client + helpers
├── store/
│   ├── authSlice.ts
│   ├── workspaceSlice.ts
│   └── demoSlice.ts
└── hooks/
    └── useStore.ts

supabase/
└── migrations/          # Database migrations

docs/
├── VERIFICATION_WEBPAGE_SPEC.md
└── HANDOVER.md          # This file
```

---

## Key Constants

### Environment Variables (.env)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
MSG91_AUTH_KEY=
MSG91_SENDER_ID=
MSG91_COUNTRY_CODE=
```

### Default Values
- Default currency: INR (₹)
- Default country code: India (+91)
- Verification code expiry: 7 days
- OTP expiry: 10 minutes

---

## Lessons Learned

### 1. React 19 Compatibility
Many packages have peer dependency conflicts with React 19. Always use:
```bash
npm install <package> --legacy-peer-deps
# or
npx expo install <package>
```

### 2. Supabase RLS Recursion
RLS policies that reference the same table can cause infinite recursion. Solution:
- Use SECURITY DEFINER functions
- Avoid self-referencing policies in workspace isolation

### 3. Expo Router Navigation
- Tab routes must be in `(tabs)/` folder
- Use `/(tabs)/loans` not `/ledger` for tab navigation
- Modal screens go in app root

### 4. Contact Picker
- expo-contacts requires permission request
- Phone numbers come in various formats - always normalize
- Extract country code before storing

### 5. Share API
React Native's Share API works well for WhatsApp sharing. No need for expo-sharing for text content.

### 6. DateTimePicker
Use `@react-native-community/datetimepicker` with Expo-compatible version (8.4.4).

---

## Testing Checklist

Before deployment:
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Workspace creation works
- [ ] Family invite generation works
- [ ] Invite verification works
- [ ] Loan creation (both types) works
- [ ] Share sheet opens for verification
- [ ] Contact picker loads
- [ ] Currency/country pickers work
- [ ] Date pickers work
- [ ] Demo mode toggle works
- [ ] Toast notifications show

---

## Git Workflow

- Main branch: `main`
- Feature branch: `claude/familyknows-app-setup-b4YIT`
- Always push to feature branch, create PR for merge

---

## Contact

For questions about this codebase, refer to this handover document and the inline comments in the code.
