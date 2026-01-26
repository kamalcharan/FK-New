# FamilyKnows - Handover Document

## Project Overview
Family financial memory app - tracks loans, insurance, and compliance renewals.

---

## ✅ COMPLETED

### 1. Project Setup
- Expo project with TypeScript
- File-based routing (expo-router)
- Redux Toolkit for state management
- Supabase client configured

### 2. Design System (`src/constants/theme.ts`)
- Colors (dark theme #0F172A)
- Typography (Inter + Fraunces fonts)
- Glass morphism effects
- Status badges (verified, pending, urgent)

### 3. UI Components (`src/components/`)
- `Button` - Primary/secondary/outline variants
- `GlassCard` - Glass morphism cards
- `OTPInput` - 6-digit OTP input
- Onboarding slides (Emergency, Feature, Carousel)

### 4. Screens Built
| Screen | Path | Status |
|--------|------|--------|
| Splash/Onboarding | `app/(auth)/onboarding.tsx` | ✅ Complete |
| Sign In | `app/(auth)/sign-in.tsx` | ✅ Complete |
| Sign Up | `app/(auth)/sign-up.tsx` | ✅ Complete |
| OTP Verification | `app/(auth)/verify-phone.tsx` | ✅ Complete |
| Set Password | `app/(auth)/set-password.tsx` | ✅ Complete |
| Workspace Setup | `app/(auth)/workspace-setup.tsx` | ✅ Complete |
| Dashboard | `app/(tabs)/index.tsx` | ✅ Static UI |
| Loans | `app/(tabs)/loans.tsx` | ⏳ Placeholder |
| Vault | `app/(tabs)/vault.tsx` | ⏳ Placeholder |
| Add | `app/(tabs)/add.tsx` | ⏳ Placeholder |
| Settings | `app/(tabs)/settings.tsx` | ✅ Basic UI |

### 5. Database Schema (`supabase/schema.sql`)
- Master tables: `m_auth_providers`, `m_languages`, `m_roles`, `m_insurance_types`, `m_renewal_types`
- Core tables: `fk_users`, `fk_user_profiles`, `fk_workspaces`, `fk_workspace_members`, `fk_loans`, `fk_insurance_policies`, `fk_renewals`, `fk_documents`
- RLS policies for all tables
- Auto-triggers for timestamps, user profiles

### 6. OTP Authentication (N8N)
- `src/lib/otp.ts` - N8N webhook integration
- `docs/n8n-otp-workflow.json` - Importable workflow
- `supabase/migrations/002_otp_tables.sql` - OTP tables
- Rate limiting, attempt tracking, session tokens

---

## ⏳ PENDING

### Phase 1: Auth Integration
- [ ] Connect to real Supabase instance
- [ ] Google OAuth implementation
- [ ] Workspace creation with DB
- [ ] Join workspace via invite code

### Phase 2: Core Features
- [ ] Loan Ledger - Add/List/Edit
- [ ] Loan verification (WhatsApp share)
- [ ] Insurance Vault - Add/List
- [ ] Renewal Tracker - Add/List
- [ ] Dashboard - Real data connection
- [ ] Expiry alerts

### Phase 3: Documents
- [ ] Google Drive OAuth
- [ ] Document upload
- [ ] Email document to self

### Phase 4: Polish
- [ ] Multi-language (i18n)
- [ ] Push notifications
- [ ] Error handling
- [ ] Testing

---

## Environment Setup

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n.com/webhook
```

---

## Run Commands

```bash
# Install
npm install --legacy-peer-deps

# Start
npx expo start -c

# Android
npx expo start --android
```

---

## Key Files

| Purpose | File |
|---------|------|
| Theme/Colors | `src/constants/theme.ts` |
| Supabase Client | `src/lib/supabase.ts` |
| OTP Service | `src/lib/otp.ts` |
| Redux Store | `src/store/index.ts` |
| DB Schema | `supabase/schema.sql` |
| N8N Workflow | `docs/n8n-otp-workflow.json` |
