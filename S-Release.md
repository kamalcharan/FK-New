# S-Release: FamilyKnows First Ship

**Scope:** S0 → S3
**Window:** Feb 20 – Apr 3, 2026 (6 weeks)
**Goal:** A working app where a family can store records locally and share them with each other.

---

## Architecture — One Sentence

Local-first SQLite vault + Supabase as an encrypted mailbox for family sharing. No sync. No merge. No CRDT. Ship → copy → done.

```
┌──────────────┐      encrypted blob      ┌──────────────┐
│  Dad's Phone │  ───────────────────────► │   Supabase   │
│  (SQLite)    │     shared_items table    │   (Relay)    │
└──────────────┘                           └──────┬───────┘
                                                  │ pick up
                                                  ▼
                                           ┌──────────────┐
                                           │  Mom's Phone │
                                           │  (SQLite)    │
                                           └──────────────┘
                                           decrypt → save → done
                                           relay entry deleted
                                           log written
```

---

## What Already Exists (don't rebuild)

| Layer | Status | Details |
|-------|--------|---------|
| Auth | Done | OTP, email/password, Google OAuth via Supabase |
| Design system | Done | Dark theme, Inter/Fraunces, glass cards |
| Onboarding screens | Done | 5-step carousel, sign-in, sign-up, OTP verify |
| Workspace setup | Done | Create/join workspace flow |
| Supabase schema | Done | 17 migrations, RLS policies, master tables |
| Redux store | Done | 4 slices (auth, workspace, loans, vault) |
| TypeScript types | Done | All entities typed in `src/types/index.ts` |
| Tab navigation | Done | Dashboard, Vault, Loans, Add, Settings |

**What we are NOT touching in this release:** i18n, push notifications, on-device AI, subscriptions/payments.

---

## S0 — Local Database (3 days: Feb 20–22)

**Objective:** Replace AsyncStorage with expo-sqlite. Every read/write goes through SQLite. App works 100% offline.

### Tasks

| # | Task | File(s) | Done |
|---|------|---------|------|
| 1 | `npx expo install expo-sqlite` | `package.json` | [ ] |
| 2 | Create `src/db/schema.ts` — define all tables as SQL CREATE statements | new file | [ ] |
| 3 | Create `src/db/connection.ts` — single `openDatabaseSync('familyknows.db')` export | new file | [ ] |
| 4 | Create `src/db/migrations.ts` — version-tracked migrations (user_version pragma) | new file | [ ] |
| 5 | Create `src/db/repository.ts` — CRUD functions for each table | new file | [ ] |
| 6 | Initialize DB on app launch in `app/_layout.tsx` | existing | [ ] |
| 7 | Remove AsyncStorage reads/writes, point Redux thunks at SQLite | `src/store/slices/*` | [ ] |
| 8 | Smoke test — app boots, creates DB, inserts a test loan, reads it back | manual | [ ] |

### Local Schema (mirrors Supabase, minus RLS)

```sql
-- core
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  phone         TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspaces (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  owner_id      TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id  TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  role          TEXT DEFAULT 'member',
  joined_at     TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, user_id)
);

-- loans
CREATE TABLE IF NOT EXISTS loans (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  created_by      TEXT NOT NULL,
  amount          REAL NOT NULL,
  borrower_name   TEXT NOT NULL,
  borrower_phone  TEXT,
  given_date      TEXT DEFAULT (date('now')),
  return_date     TEXT,
  otp_verified    INTEGER DEFAULT 0,
  verified_at     TEXT,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- insurance
CREATE TABLE IF NOT EXISTS insurance_policies (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL,
  policy_type       TEXT NOT NULL,
  subtype           TEXT,
  subtype_name      TEXT,
  policy_number     TEXT,
  provider_name     TEXT NOT NULL,
  scheme_name       TEXT,
  sum_insured       REAL,
  premium_amount    REAL,
  premium_frequency TEXT,
  start_date        TEXT,
  expiry_date       TEXT NOT NULL,
  status            TEXT DEFAULT 'active',
  document_url      TEXT,
  tpa_name          TEXT,
  tpa_helpline      TEXT,
  agent_name        TEXT,
  agent_phone       TEXT,
  notes             TEXT,
  metadata          TEXT,  -- JSON string
  created_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS insurance_covered_members (
  id                TEXT PRIMARY KEY,
  policy_id         TEXT NOT NULL,
  member_id         TEXT,
  custom_name       TEXT,
  relationship      TEXT,
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id)
);

-- renewals
CREATE TABLE IF NOT EXISTS renewals (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL,
  type              TEXT NOT NULL,
  description       TEXT,
  issuing_authority TEXT,
  license_number    TEXT,
  expiry_date       TEXT NOT NULL,
  fee_amount        REAL,
  reminder_days     INTEGER DEFAULT 30,
  document_url      TEXT,
  status            TEXT DEFAULT 'active',
  created_at        TEXT DEFAULT (datetime('now'))
);

-- documents (metadata only, actual files on Google Drive later)
CREATE TABLE IF NOT EXISTS documents (
  id              TEXT PRIMARY KEY,
  record_type     TEXT NOT NULL,  -- 'loan' | 'insurance' | 'renewal'
  record_id       TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  drive_file_id   TEXT,           -- filled in S2
  local_uri       TEXT,
  mime_type       TEXT,
  size_bytes      INTEGER,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- sharing log (filled in S3)
CREATE TABLE IF NOT EXISTS share_log (
  id              TEXT PRIMARY KEY,
  record_type     TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  shared_by       TEXT NOT NULL,
  shared_with     TEXT NOT NULL,
  shared_at       TEXT DEFAULT (datetime('now')),
  direction       TEXT DEFAULT 'outgoing'  -- 'outgoing' | 'incoming'
);
```

### S0 Exit Criteria
- App launches, SQLite DB created with all tables
- Can insert and read a loan, insurance policy, and renewal from SQLite
- AsyncStorage dependency removed from data flows
- No network needed — fully offline

---

## S1 — Local-First Screens (2 weeks: Feb 23 – Mar 8)

**Objective:** Every core screen reads/writes from SQLite. User can manage their entire vault offline.

### Week 1 (Feb 23–Mar 1): Loan Ledger + Dashboard

| # | Task | File(s) | Done |
|---|------|---------|------|
| 1 | Loan list screen — query SQLite, show all loans sorted by date | `app/(tabs)/loans.tsx` | [ ] |
| 2 | Add loan form — collect fields, generate UUID, insert into SQLite | new: `app/add-loan.tsx` | [ ] |
| 3 | Loan detail screen — view single loan, edit, mark as returned | new: `app/loan-detail.tsx` | [ ] |
| 4 | OTP verification for loans — borrower acknowledges via OTP | reuse `src/lib/otp.ts` | [ ] |
| 5 | Dashboard — real counts from SQLite (total loans, amounts, expiring items) | `app/(tabs)/index.tsx` | [ ] |
| 6 | Dashboard alerts — upcoming expiry cards (next 30 days) | `app/(tabs)/index.tsx` | [ ] |

### Week 2 (Mar 2–8): Insurance Vault + Renewals + Add Flow

| # | Task | File(s) | Done |
|---|------|---------|------|
| 7 | Insurance list screen — grouped by type, expiry badges | `app/(tabs)/vault.tsx` | [ ] |
| 8 | Add insurance form — type picker, all fields from `InsurancePolicyFormData` | `app/add-insurance.tsx` (exists) | [ ] |
| 9 | Insurance detail screen — full view, edit, covered members | new: `app/insurance-detail.tsx` | [ ] |
| 10 | Renewal list — separate tab/section in vault | `app/(tabs)/vault.tsx` | [ ] |
| 11 | Add renewal form | new: `app/add-renewal.tsx` | [ ] |
| 12 | Unified "Add" screen — pick what to add (loan/insurance/renewal) | `app/(tabs)/add.tsx` | [ ] |
| 13 | Settings screen — workspace info, members list, logout | `app/(tabs)/settings.tsx` | [ ] |
| 14 | Delete/archive flows for all record types | various | [ ] |

### S1 Exit Criteria
- User can add, view, edit, delete: loans, insurance policies, renewals
- Dashboard shows real aggregated data from SQLite
- All screens work offline, no Supabase calls for CRUD
- Urgency badges (overdue/urgent/upcoming/healthy) work correctly

---

## S2 — Google Drive Documents (2 weeks: Mar 9–22)

**Objective:** Users can attach documents (photos of policies, PDFs) to any record. Files stored on user's own Google Drive.

### Week 1 (Mar 9–15): OAuth + Upload

| # | Task | File(s) | Done |
|---|------|---------|------|
| 1 | Google Drive OAuth — request `drive.file` scope (app-created files only) | `src/lib/googleDrive.ts` (new) | [ ] |
| 2 | Token storage — save refresh token in expo-secure-store | `src/lib/googleDrive.ts` | [ ] |
| 3 | Create "FamilyKnows" app folder on user's Drive | `src/lib/googleDrive.ts` | [ ] |
| 4 | Upload function — pick file/photo → upload to Drive folder → get file ID | `src/lib/googleDrive.ts` | [ ] |
| 5 | Link document to record — save `drive_file_id` in `documents` table | `src/db/repository.ts` | [ ] |
| 6 | UI: "Attach document" button on add/detail screens | various screens | [ ] |

### Week 2 (Mar 16–22): View + Offline Thumbnails

| # | Task | File(s) | Done |
|---|------|---------|------|
| 7 | View document — open from Drive (in-app browser or share sheet) | `src/lib/googleDrive.ts` | [ ] |
| 8 | Download for offline — cache locally, update `local_uri` in documents table | `src/lib/googleDrive.ts` | [ ] |
| 9 | Thumbnail generation — for images, show preview in list/detail screens | component | [ ] |
| 10 | Document list per record — show all attached docs with icons by mime type | component | [ ] |
| 11 | Delete document — remove from Drive + local cache + DB | `src/lib/googleDrive.ts` | [ ] |
| 12 | Handle no-network — show cached docs, queue uploads for when online | `src/lib/googleDrive.ts` | [ ] |

### S2 Exit Criteria
- User can attach photos/PDFs to any loan, insurance, or renewal record
- Files live on user's personal Google Drive in a FamilyKnows folder
- Cached locally for offline viewing
- Documents table tracks every attachment with record linkage

---

## S3 — Family Sharing (4 days: Mar 23–26)

**Objective:** Share any record with a family member. Encrypted transport via Supabase relay. No sync — just send a copy.

### How It Works

```
1. Dad taps "Share with Mom" on LIC Policy
2. App serializes the record (+ attached doc metadata) to JSON
3. JSON encrypted with workspace shared key (AES-256-GCM via expo-crypto)
4. Encrypted blob → INSERT into supabase.shared_items
5. Mom's app polls / gets push → finds new item in her mailbox
6. Downloads blob → decrypts → inserts into her local SQLite
7. Relay row deleted
8. Both devices write to share_log
9. Done
```

### Tasks

| # | Task | File(s) | Done |
|---|------|---------|------|
| 1 | Supabase migration: `shared_items` relay table | `supabase/migrations/018_shared_items.sql` | [ ] |
| 2 | Key management — generate workspace key on workspace create, store in secure-store | `src/lib/sharing.ts` (new) | [ ] |
| 3 | Encrypt function — serialize record → AES-256-GCM encrypt → base64 | `src/lib/sharing.ts` | [ ] |
| 4 | Share action — "Share with..." picker → encrypt → insert relay | `src/lib/sharing.ts` | [ ] |
| 5 | Receive function — poll `shared_items` where `recipient_id = me` | `src/lib/sharing.ts` | [ ] |
| 6 | Decrypt + save — decrypt blob → insert into local SQLite → delete relay row | `src/lib/sharing.ts` | [ ] |
| 7 | Share log — write entry on both send and receive | `src/db/repository.ts` | [ ] |
| 8 | UI: "Share" button on detail screens + share history view | various screens | [ ] |
| 9 | UI: "Inbox" indicator — badge when new shared items waiting | `app/(tabs)/_layout.tsx` | [ ] |

### Supabase `shared_items` Table

```sql
CREATE TABLE shared_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES fk_workspaces(id),
  sender_id     UUID NOT NULL REFERENCES fk_users(id),
  recipient_id  UUID NOT NULL REFERENCES fk_users(id),
  record_type   TEXT NOT NULL,  -- 'loan' | 'insurance' | 'renewal'
  encrypted_blob TEXT NOT NULL, -- AES-256-GCM encrypted JSON
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- RLS: sender can insert, recipient can select+delete
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sender_insert" ON shared_items
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "recipient_read" ON shared_items
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "recipient_delete" ON shared_items
  FOR DELETE USING (auth.uid() = recipient_id);

-- Auto-cleanup expired items
CREATE INDEX idx_shared_items_expires ON shared_items(expires_at);
```

### S3 Exit Criteria
- User can share any record with any workspace member
- Record arrives encrypted, is decrypted only on recipient's device
- Supabase relay is cleaned up after delivery (or after 7-day TTL)
- Share log shows full history: who shared what, when, with whom
- No persistent data on Supabase — relay only

---

## S-Release Exit Criteria (Apr 3)

After S3, a user can:

- [x] Sign up, create a family workspace, invite members
- [ ] Add loans, insurance policies, renewals — all stored locally in SQLite
- [ ] Attach documents from phone → stored on personal Google Drive
- [ ] Share any record with a family member via encrypted relay
- [ ] View share history / audit log
- [ ] Everything works offline (except sharing, which needs one network round-trip)

**What ships:** Internal beta APK via EAS Build. Family of 3-4 tests for 1 week before public launch planning begins.

---

## Dependencies to Install

```bash
# S0
npx expo install expo-sqlite

# S2
npx expo install expo-image-picker expo-file-system expo-document-picker

# S3 — no new deps, uses existing expo-crypto + @supabase/supabase-js
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google Drive OAuth rejection on review | S2 blocked | Use `drive.file` scope (app-created files only) — lowest permission, auto-approved |
| expo-sqlite performance with large vaults | Slow queries | Index on workspace_id + expiry_date. Unlikely issue — even 10K records is tiny for SQLite |
| Encryption key distribution for sharing | S3 blocked | Key generated at workspace creation, distributed via Supabase encrypted channel during invite flow |
| Family member not on app yet | Can't share | Show "Invite first" prompt, fall back to existing invite flow |

---

## What Is NOT In This Release

- Payment / subscriptions (S4)
- On-device AI — OCR, auto-classify (S5)
- Multi-language / i18n
- Push notifications (polling is fine for beta)
- Export / PDF generation
- Biometric lock

These come after S-Release ships and gets real user feedback.
