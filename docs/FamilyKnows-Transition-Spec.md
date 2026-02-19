# FamilyKnows — Decentralized Vault Architecture Transition Spec

## Document Purpose
This specification defines the architectural transition of FamilyKnows from a cloud-centric model to a **device-sovereign, local-first decentralized vault** architecture. This document serves as the audit baseline for Claude Code to validate implementation compliance.

---

## 1. Architecture Philosophy

### 1.1 Core Principle
**"FamilyKnows never sees your data. Documents live on YOUR Google Drive. We just organize, classify, and protect."**

**The OpenClaw Philosophy**: Reach in (SMS, email, documents) → Extract intelligence → Retract. Nothing taken. Nothing stored on our side. Just insights delivered to the user's device.

### 1.2 Architecture Classification
- **Type**: Decentralized Vault Application (DVA) — "OpenClaw for the Family"
- **Data Sovereignty**: User-owned, device-resident, Google Drive-stored
- **Sync Model**: End-to-end encrypted relay with CRDT conflict resolution (metadata only)
- **AI Model**: On-device inference (LiquidAI / TensorFlow Lite)
- **Proactive Intelligence**: Local SMS/email monitoring — extract, alert, retract
- **Cloud Dependency**: Minimal — Auth, Subscription, Encrypted Metadata Relay only
- **Document Storage**: User's own Google Drive (Vikuna has zero access)

### 1.3 What "Decentralized" Means Here
This is NOT blockchain-based decentralization. This is **device-sovereign decentralization**:
- Each family member's device is a sovereign node
- No central database holds user data
- Sync happens via encrypted relay (zero-knowledge)
- Each device holds a complete, encrypted local copy
- No single point of failure for user data

---

## 2. Component Classification

### 2.1 CLOUD Components (Minimal Footprint)

| Component | Purpose | Data Stored | Technology |
|-----------|---------|-------------|------------|
| Authentication | Login / Signup / Session | Email, hashed password, JWT tokens | Supabase Auth |
| Subscription Management | Plan, billing, payment status | Plan type, payment metadata, lifetime counter | Razorpay + Supabase |
| App Configuration | Feature flags, app version control | Config JSON (no user data) | Supabase DB |
| Encrypted Relay | Sync bridge for vault METADATA between family devices | Encrypted metadata blobs ONLY (zero-knowledge) | Supabase Realtime + Storage |
| Push Notifications | Renewal reminders, sync triggers | Device tokens, notification metadata | Firebase Cloud Messaging |
| App Distribution | App updates | Binary builds | App Store / Play Store |

**NOTE**: Documents/files are stored on the user's OWN Google Drive. Vikuna has no file storage infrastructure.

**AUDIT RULE C-001**: No user vault data (documents, metadata, family info, financial records) shall exist in cloud storage in plaintext at any time.

**AUDIT RULE C-002**: Encrypted relay blobs must have a TTL (Time-To-Live) of maximum 72 hours. After delivery confirmation or TTL expiry, blobs must be purged.

**AUDIT RULE C-003**: Cloud database tables must NOT contain columns for: document_content, file_path, vault_data, family_member_details, asset_information, or any PII beyond authentication credentials.

### 2.2 DEVICE Components (Everything Else)

| Component | Purpose | Technology |
|-----------|---------|------------|
| Local Vault Database | Vault metadata, categories, tags, relationships | WatermelonDB (SQLite) |
| Google Drive Integration | Document storage on USER's own Drive | Google Drive API (OAuth) |
| AI Engine | Document classification, OCR, tagging | LiquidAI / TF Lite / Core ML |
| Sync Engine | CRDT-based family metadata sync | Automerge / Yjs |
| Encryption Layer | Metadata at-rest & sync in-transit encryption | AES-256-GCM + X25519 key exchange |
| Biometric Auth | Device-level access control | Device biometrics API |
| Search Index | Full-text search across vault metadata | Local SQLite FTS5 |
| Notification Scheduler | Local renewal/expiry reminders | Device-local scheduling |

**AUDIT RULE D-001**: All vault data must be encrypted at rest using AES-256-GCM before writing to local storage.

**AUDIT RULE D-002**: Encryption keys must be derived from user's master password + device-specific salt, never transmitted to cloud.

**AUDIT RULE D-003**: WatermelonDB schema must NOT include any `sync_url` or `remote_endpoint` fields pointing to cloud data stores.

---

## 3. Database Schema — Local (WatermelonDB)

### 3.1 Core Tables

```sql
-- VAULT CATEGORIES
CREATE TABLE vault_categories (
    id TEXT PRIMARY KEY,           -- ULID
    name TEXT NOT NULL,            -- Identity, Legal, Financial, Property, Digital
    icon TEXT,
    sort_order INTEGER,
    is_system BOOLEAN DEFAULT true,
    created_at INTEGER NOT NULL,   -- Unix timestamp
    updated_at INTEGER NOT NULL
);

-- VAULT ITEMS (Core entity)
CREATE TABLE vault_items (
    id TEXT PRIMARY KEY,           -- ULID
    category_id TEXT NOT NULL REFERENCES vault_categories(id),
    title TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL,       -- document, asset, credential, service, record
    sub_type TEXT,                 -- insurance, property_deed, bank_account, etc.
    metadata_encrypted TEXT,       -- AES-256 encrypted JSON blob
    tags TEXT,                     -- comma-separated, encrypted
    priority TEXT DEFAULT 'normal', -- critical, high, normal, low
    expiry_date INTEGER,           -- Unix timestamp (for renewals)
    reminder_days INTEGER,         -- Days before expiry to remind
    is_archived BOOLEAN DEFAULT false,
    created_by TEXT NOT NULL,      -- family_member_id
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    _crdt_clock TEXT               -- Automerge vector clock for sync
);

-- VAULT DOCUMENTS (Metadata only — files live on user's Google Drive)
CREATE TABLE vault_documents (
    id TEXT PRIMARY KEY,
    vault_item_id TEXT NOT NULL REFERENCES vault_items(id),
    gdrive_file_id TEXT NOT NULL,    -- Google Drive file ID
    gdrive_file_url TEXT,            -- Drive URL for quick access
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,         -- pdf, jpg, png, doc
    file_size INTEGER,
    file_hash TEXT,                  -- SHA-256 for integrity check
    gdrive_folder_id TEXT,           -- FamilyKnows-managed folder in user's Drive
    ocr_text_encrypted TEXT,         -- Encrypted OCR output (local only)
    ai_classification TEXT,          -- AI-generated category
    ai_confidence REAL,              -- Classification confidence score
    thumbnail_local_path TEXT,       -- Local cached thumbnail (encrypted)
    is_synced BOOLEAN DEFAULT false, -- Whether metadata synced to family
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    _crdt_clock TEXT
);

-- FAMILY MEMBERS
CREATE TABLE family_members (
    id TEXT PRIMARY KEY,
    name_encrypted TEXT NOT NULL,  -- Encrypted
    relationship TEXT NOT NULL,    -- self, spouse, child, parent, sibling, other
    email_encrypted TEXT,          -- Encrypted (used for invite only)
    phone_encrypted TEXT,          -- Encrypted
    role TEXT DEFAULT 'viewer',    -- admin, editor, viewer
    device_public_key TEXT,        -- X25519 public key for E2E sync
    permissions_json TEXT,         -- Encrypted JSON: {category_id: 'read'|'write'|'none'}
    avatar_encrypted TEXT,
    is_active BOOLEAN DEFAULT true,
    joined_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    _crdt_clock TEXT
);

-- VAULT ACCESS LOG (Local audit trail)
CREATE TABLE vault_access_log (
    id TEXT PRIMARY KEY,
    vault_item_id TEXT REFERENCES vault_items(id),
    family_member_id TEXT REFERENCES family_members(id),
    action TEXT NOT NULL,          -- view, edit, share, delete, export
    action_detail TEXT,
    device_info TEXT,
    created_at INTEGER NOT NULL
);

-- SYNC QUEUE (Pending sync operations)
CREATE TABLE sync_queue (
    id TEXT PRIMARY KEY,
    target_member_id TEXT NOT NULL,
    operation TEXT NOT NULL,       -- create, update, delete
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL, -- E2E encrypted change
    status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    sent_at INTEGER,
    delivered_at INTEGER
);

-- REMINDER SCHEDULE (Local)
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    vault_item_id TEXT REFERENCES vault_items(id),
    reminder_date INTEGER NOT NULL,
    reminder_type TEXT NOT NULL,   -- expiry, renewal, custom
    message_encrypted TEXT,
    is_triggered BOOLEAN DEFAULT false,
    created_at INTEGER NOT NULL
);

-- AI PROCESSING LOG (Local)
CREATE TABLE ai_processing_log (
    id TEXT PRIMARY KEY,
    vault_document_id TEXT REFERENCES vault_documents(id),
    model_name TEXT NOT NULL,      -- liquidai_doc_classifier_v1, tflite_ocr_v2
    model_version TEXT,
    processing_type TEXT NOT NULL, -- classification, ocr, extraction, translation
    input_summary TEXT,            -- Non-sensitive processing metadata
    output_summary TEXT,
    confidence_score REAL,
    processing_time_ms INTEGER,
    processed_at INTEGER NOT NULL
);
```

**AUDIT RULE DB-001**: Every column containing PII must have suffix `_encrypted` and store AES-256-GCM ciphertext only.

**AUDIT RULE DB-002**: The `_crdt_clock` column must be present on all sync-eligible tables for Automerge vector clock tracking.

**AUDIT RULE DB-003**: No foreign keys shall reference cloud-side table IDs. Cloud auth user ID is mapped locally via a `local_identity` table.

### 3.2 Cloud Database (Supabase — Minimal)

```sql
-- AUTH: Handled entirely by Supabase Auth (no custom tables needed)

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id),
    plan_type TEXT NOT NULL,       -- free_trial, monthly, annual, lifetime
    status TEXT NOT NULL,          -- active, expired, cancelled
    payment_provider TEXT,         -- razorpay
    payment_reference TEXT,        -- Razorpay subscription ID
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- DEVICE REGISTRY (For sync relay routing)
CREATE TABLE device_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id),
    device_token TEXT NOT NULL,     -- FCM token for push
    device_name TEXT,               -- "Charan's iPhone"
    public_key TEXT NOT NULL,       -- X25519 public key
    platform TEXT NOT NULL,         -- ios, android
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ENCRYPTED SYNC RELAY (Zero-knowledge blobs)
CREATE TABLE sync_relay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_device_id UUID REFERENCES device_registry(id),
    recipient_device_id UUID REFERENCES device_registry(id),
    encrypted_payload TEXT NOT NULL, -- Opaque E2E encrypted blob
    payload_size INTEGER,
    status TEXT DEFAULT 'pending',   -- pending, delivered, expired
    expires_at TIMESTAMPTZ NOT NULL, -- 72-hour TTL
    created_at TIMESTAMPTZ DEFAULT now(),
    delivered_at TIMESTAMPTZ
);

-- FAMILY GROUPS (For invite/join flow only)
CREATE TABLE family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_user_id UUID NOT NULL REFERENCES auth.users(id),
    invite_code TEXT UNIQUE,        -- One-time invite codes
    group_name_hash TEXT,           -- Hashed, not plaintext
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- FAMILY GROUP MEMBERS
CREATE TABLE family_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES family_groups(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT now()
);

-- APP CONFIG
CREATE TABLE app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**AUDIT RULE CS-001**: `sync_relay.encrypted_payload` must NEVER be decryptable by server-side code. No decryption keys stored in cloud.

**AUDIT RULE CS-002**: A cron job must exist to purge `sync_relay` records where `expires_at < now()`.

**AUDIT RULE CS-003**: `family_groups.group_name_hash` must be a one-way hash (SHA-256). No plaintext family names in cloud.

---

## 4. Encryption Specification

### 4.1 Key Hierarchy

```
Master Password (User-provided, never stored)
    │
    ├── Master Key (PBKDF2: password + device_salt, 100K iterations)
    │       │
    │       ├── Vault Encryption Key (HKDF-derived, context: "vault")
    │       │       └── Encrypts: All vault_items, vault_documents, family_members PII
    │       │
    │       ├── Sync Encryption Key (HKDF-derived, context: "sync")
    │       │       └── Encrypts: Sync payloads for relay
    │       │
    │       └── Local Auth Key (HKDF-derived, context: "local_auth")
    │               └── Encrypts: Local session tokens
    │
    └── Device Key Pair (X25519, generated per device)
            ├── Public Key → Shared to cloud device_registry
            └── Private Key → Stored in device Secure Enclave / Keystore
```

### 4.2 Encryption Standards

| Context | Algorithm | Key Size | Notes |
|---------|-----------|----------|-------|
| Metadata at rest | AES-256-GCM | 256-bit | Unique IV per record |
| Key derivation | PBKDF2-SHA512 | N/A | 100,000 iterations minimum |
| Key expansion | HKDF-SHA256 | 256-bit | Context-specific derivation |
| Sync encryption | AES-256-GCM + X25519 | 256-bit | Hybrid encryption per message |
| Cached thumbnails | AES-256-GCM | 256-bit | Local thumbnail cache only |
| Hashing | SHA-256 | N/A | Integrity checks, name hashing |
| Document files | Google Drive encryption | N/A | Handled by Google — not our responsibility |

**AUDIT RULE E-001**: Master password must never be stored anywhere — not on device, not in cloud, not in logs.

**AUDIT RULE E-002**: Every encrypted field must use a unique IV/nonce. No IV reuse across records.

**AUDIT RULE E-003**: PBKDF2 iteration count must be ≥ 100,000. Audit must flag any lower value.

**AUDIT RULE E-004**: Private keys must be stored in platform Secure Enclave (iOS) or Android Keystore. Never in SQLite or filesystem.

---

## 5. Sync Protocol

### 5.1 Google Drive Integration (Document Storage)

#### 5.1.1 Core Principle
**Documents NEVER touch Vikuna's infrastructure.** Files go directly from the user's device to their own Google Drive. FamilyKnows only stores metadata locally.

#### 5.1.2 Architecture

```
User captures/uploads document
    │
    ├── 1. AI processes document ON-DEVICE (OCR, classify, tag)
    │
    ├── 2. Upload original file to USER'S Google Drive
    │       └── Folder: /FamilyKnows/{category}/
    │       └── Uses: Google Drive API with user's OAuth token
    │       └── Vikuna sees: NOTHING
    │
    ├── 3. Store metadata LOCALLY in WatermelonDB
    │       └── gdrive_file_id, classification, tags, reminders
    │
    └── 4. Cache thumbnail locally (encrypted) for offline browsing
```

#### 5.1.3 Google Drive Folder Structure (Auto-created in user's Drive)

```
My Drive/
└── FamilyKnows/                          -- Root folder
    ├── Identity Documents/               -- Aadhar, PAN, Passport
    ├── Legal Documents/                  -- Property, Wills, POA
    ├── Financial Assets/                 -- Insurance, FDs, MFs
    ├── Property & Assets/                -- Registration, Vehicle
    └── Digital Assets & Services/        -- Medical, AMCs, Warranties
```

#### 5.1.4 OAuth Scopes

```
Scope: https://www.googleapis.com/auth/drive.file
```

This scope gives FamilyKnows access ONLY to files it creates — not the user's entire Drive. The user can still see and manage these files directly in Google Drive.

**AUDIT RULE GD-001**: FamilyKnows must use `drive.file` scope only. NEVER request `drive` (full access) scope.

**AUDIT RULE GD-002**: OAuth tokens must be stored in device Secure Enclave / Keystore, never in SQLite or SharedPreferences.

**AUDIT RULE GD-003**: If user revokes Google Drive access, app must gracefully degrade to metadata-only mode. No crashes, no data loss of local metadata.

#### 5.1.5 Family Sharing of Documents

When a family member needs to see a document:
- **Option A (Google Drive native)**: Admin shares the Google Drive folder with family member's Google account. FamilyKnows metadata syncs via encrypted relay. Family member's app picks up the shared file via their own Drive access.
- **Option B (View-only via relay)**: For family members without Google accounts (elderly parents), admin can generate a time-limited, view-only link via Google Drive's sharing API. Link sent via encrypted relay.

**AUDIT RULE GD-004**: FamilyKnows must NEVER download a document from one user's Drive and upload it to another's. Sharing must happen via Google Drive's native sharing mechanisms.

#### 5.1.6 Offline Access

- Thumbnails cached locally (encrypted) for browsing
- Full documents available offline ONLY if Google Drive's own offline feature is enabled
- Metadata (tags, classifications, reminders) always available offline via WatermelonDB

#### 5.1.7 What Happens When...

| Scenario | Behavior |
|----------|----------|
| User deletes file from Google Drive directly | FamilyKnows detects missing file on next sync, marks metadata as "file missing", prompts user |
| User runs out of Google Drive storage | Upload fails gracefully, metadata still saved locally, user prompted to free space |
| Google Drive API is down | Metadata operations continue normally. File uploads queued for retry. |
| User switches Google accounts | Re-auth flow, remap folder structure, existing metadata retained |
| User has multiple Google accounts | Support for primary Drive account selection in settings |

### 5.2 Family Metadata Sync Flow

```
Device A (Sender)                  Cloud Relay                    Device B (Receiver)
     │                                  │                               │
     │  1. Detect local change          │                               │
     │  2. Generate CRDT operation      │                               │
     │  3. Encrypt with B's public key  │                               │
     │──── 4. Push encrypted blob ─────>│                               │
     │                                  │  5. Store blob (opaque)       │
     │                                  │  6. Push notification ───────>│
     │                                  │                               │  7. Pull encrypted blob
     │                                  │<──── 8. Fetch blob ───────────│
     │                                  │  9. Delete blob after delivery│
     │                                  │                               │  10. Decrypt with private key
     │                                  │                               │  11. Apply CRDT merge
     │                                  │                               │  12. Confirm delivery
     │                                  │<──── 13. ACK ─────────────────│
     │                                  │  14. Purge blob               │
     │                                  │                               │
```

### 5.2 CRDT Conflict Resolution Rules

| Scenario | Resolution |
|----------|------------|
| Same field edited on 2 devices | Last-writer-wins (LWW) by Automerge vector clock |
| Document added on Device A, not on B | Auto-merge: add to both |
| Document deleted on A, edited on B | Conflict flagged to user for manual resolution |
| Permission changed by admin | Admin change always wins (higher priority) |
| New family member joins | Full vault sync (encrypted batch transfer) |

**AUDIT RULE S-001**: Sync must never fallback to plaintext transmission, even on error.

**AUDIT RULE S-002**: If sync fails 3 times, queue for retry with exponential backoff (max 6 hours). No data loss on sync failure.

**AUDIT RULE S-003**: Every sync operation must be logged in `vault_access_log` with action = 'sync_send' or 'sync_receive'.

---

## 6. On-Device AI (LiquidAI) Specification

### 6.1 AI Capabilities

| Capability | Model | Size | Trigger |
|------------|-------|------|---------|
| Document Classification | LiquidAI Doc Classifier | ~50MB | On document upload |
| OCR Text Extraction | TF Lite OCR / Core ML | ~30MB | On image/photo capture |
| Smart Tagging | LiquidAI Tag Suggester | ~20MB | After classification |
| Date/Number Extraction | Rule-based + NLP | ~10MB | After OCR |
| Language Detection | Compact LangID | ~5MB | On text input |
| Translation (Te/Hi/En) | On-device NMT | ~150MB | User-triggered |

**Total AI footprint**: ~265MB (downloaded progressively, not at install)

### 6.2 AI Processing Rules

**AUDIT RULE AI-001**: All AI inference must execute on-device. No document content, OCR text, or classification data shall be sent to any cloud AI service unless user explicitly opts in via a clearly labeled toggle.

**AUDIT RULE AI-002**: If optional cloud AI is enabled, data must be processed in stateless, ephemeral sessions — no server-side logging, no retention, no training.

**AUDIT RULE AI-003**: AI model updates must be delivered as encrypted model files via app update channel, not via dynamic download from arbitrary URLs.

### 6.3 AI Pipeline

```
User captures/uploads document
    │
    ├── 1. OCR Engine (TF Lite) → Extracted text (local)
    │
    ├── 2. Language Detection → Telugu / Hindi / English
    │
    ├── 3. Document Classifier (LiquidAI)
    │       └── Output: category, sub_type, confidence
    │
    ├── 4. Smart Extractor (Rule-based + NLP)
    │       └── Output: dates, amounts, names, policy numbers
    │
    ├── 5. Tag Suggester (LiquidAI)
    │       └── Output: suggested tags
    │
    └── 6. Store all results encrypted in vault_documents
            └── Update ai_processing_log
```

---

## 7. Device Recovery & Backup

### 7.1 Recovery Scenarios

| Scenario | Recovery Method |
|----------|----------------|
| Phone lost/stolen | Documents safe on Google Drive. Re-login on new device + Google OAuth = documents restored. Metadata via family member device sync. |
| Phone broken | Same as lost — Google Drive has all files. Metadata recovered via family sync or local backup. |
| Forgot master password | Recovery key (generated at setup, user stores offline) restores local metadata encryption. Google Drive files unaffected. |
| All family devices lost | Google Drive still has all documents. Metadata lost unless local backup was enabled. Worst case: re-classify from Drive files. |
| Google account compromised | FamilyKnows metadata still intact locally. User secures Google account, re-authorizes. |

### 7.2 Backup Architecture

```
Recovery is fundamentally simpler because documents live on Google Drive:

DOCUMENTS: Already backed up by Google (Drive has its own version history)
            └── Nothing for Vikuna to backup

METADATA: Local WatermelonDB (classifications, tags, reminders, relationships)
            ├── OPTION A: Family Sync Recovery (Default)
            │     └── New device joins family → existing device syncs metadata
            ├── OPTION B: Local Device Backup
            │     └── Encrypted metadata export to user's Google Drive
            │     └── File: /FamilyKnows/.backup/metadata_encrypted.json
            └── OPTION C: Manual Re-classification
                  └── AI re-processes existing Google Drive files
                  └── Slower but works even with zero backup
```

**AUDIT RULE R-001**: Recovery key must be generated client-side and displayed ONCE for user to save. Never transmitted to cloud.

**AUDIT RULE R-002**: Cloud backup, if enabled, must show explicit consent dialog explaining what is stored and that FamilyKnows cannot access it.

**AUDIT RULE R-003**: Remote wipe capability must exist — admin family member can invalidate a lost device's sync key via cloud device_registry.

---

## 8. Audit Checklist for Claude Code

### 8.1 Cloud Compliance Audit

- [ ] **C-001**: No plaintext user vault data in any cloud table
- [ ] **C-002**: sync_relay TTL ≤ 72 hours with purge cron
- [ ] **C-003**: No PII columns in cloud schema beyond auth
- [ ] **CS-001**: No server-side decryption capability for relay payloads
- [ ] **CS-002**: Purge cron job exists and runs on schedule
- [ ] **CS-003**: Family group names are hashed, never plaintext

### 8.2 Device Compliance Audit

- [ ] **D-001**: All vault data encrypted at rest (AES-256-GCM)
- [ ] **D-002**: Encryption keys derived locally, never transmitted
- [ ] **D-003**: No remote data endpoints in WatermelonDB config
- [ ] **DB-001**: All PII columns have `_encrypted` suffix
- [ ] **DB-002**: `_crdt_clock` present on sync-eligible tables
- [ ] **DB-003**: No cloud table ID foreign keys in local schema

### 8.3 Encryption Compliance Audit

- [ ] **E-001**: Master password not stored anywhere
- [ ] **E-002**: Unique IV/nonce per encrypted record
- [ ] **E-003**: PBKDF2 iterations ≥ 100,000
- [ ] **E-004**: Private keys in Secure Enclave / Android Keystore

### 8.4 Sync Compliance Audit

- [ ] **S-001**: No plaintext sync fallback
- [ ] **S-002**: Retry with exponential backoff on failure
- [ ] **S-003**: All sync operations logged in access log

### 8.5 AI Compliance Audit

- [ ] **AI-001**: All AI inference on-device (no cloud calls without explicit opt-in)
- [ ] **AI-002**: Cloud AI (if opted in) is stateless, no retention
- [ ] **AI-003**: Model updates via secure app update channel only

### 8.6 Google Drive Compliance Audit

- [ ] **GD-001**: OAuth scope is `drive.file` only — never full `drive` access
- [ ] **GD-002**: OAuth tokens stored in Secure Enclave / Keystore
- [ ] **GD-003**: Graceful degradation if Drive access revoked
- [ ] **GD-004**: No cross-user document transfers via Vikuna infrastructure

### 8.7 Recovery Compliance Audit

- [ ] **R-001**: Recovery key generated client-side, shown once
- [ ] **R-002**: Cloud backup requires explicit consent dialog
- [ ] **R-003**: Remote wipe capability exists for lost devices

---

## 9. Migration Path (From Previous Architecture)

### 9.1 If existing users have cloud-stored data:

1. On app update, prompt user to set master password
2. Download their existing cloud data
3. Encrypt locally with new master key
4. Store in local WatermelonDB
5. Verify local data integrity (hash comparison)
6. Purge cloud data after confirmation
7. Generate and display recovery key

### 9.2 For new users:

1. Standard onboarding: signup → set master password → generate recovery key
2. All data local from day one
3. No migration needed

---

## 10. Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| Mobile Framework | React Native (Expo) | Cross-platform, existing codebase |
| Local Database | WatermelonDB (SQLite) | Offline-first, performant, Observable |
| Document Storage | User's own Google Drive | Zero storage cost for Vikuna, user trust |
| Encryption | libsodium (react-native-sodium) | Industry-standard, X25519 + AES-256-GCM |
| CRDT Sync | Automerge | Mature CRDT library, JSON-compatible |
| On-Device AI | LiquidAI + TensorFlow Lite | Small models, mobile-optimized |
| OCR | Google ML Kit (on-device) | Free, fast, multilingual |
| Auth | Supabase Auth | Minimal cloud, proven |
| Payments | Razorpay | Indian market, subscription support |
| Push Notifications | Firebase Cloud Messaging | Standard, reliable |
| Cloud DB | Supabase (PostgreSQL) | Minimal tables: auth, subscription, relay |
| Google Drive API | OAuth 2.0 + drive.file scope | Scoped access, user-controlled |

---

## 11. Positioning Statement

### Brand Positioning:
**"FamilyKnows — The Decentralized Family Vault"**
**"OpenClaw for the Family"** — An open, intelligent claw that reaches into your SMS, email, Google Drive, and local data — organizes, classifies, alerts, and protects — then pulls back. Nothing taken. Nothing stored. Just intelligence delivered.

### Tagline Options:
- "Your documents. Your Google Drive. Our intelligence."
- "We organize your family's legacy. We never touch your files."
- "The family office that lives in your pocket — files stay in your Drive."

### Strategic Value to Vikuna Technologies
FamilyKnows is not just a product — it is a **branding vehicle for Vikuna Technologies**.

Whether FamilyKnows achieves mass consumer adoption or not, it delivers:
- **Technical credibility**: A decentralized, local-first, AI-on-device architecture demonstrates Vikuna's engineering depth to enterprise prospects
- **Consulting pipeline**: Every demo of FamilyKnows is a proof-of-concept for Vikuna's AI transformation, data privacy, and mobile architecture capabilities
- **Thought leadership**: "We built a consumer app where we never see user data" is a story that resonates with healthcare, BFSI, and government clients who care about data sovereignty
- **Talent signal**: Engineers who see this architecture want to work with Vikuna
- **Trust anchor**: If Vikuna can build a product that protects family data this seriously, imagine what they do for enterprise clients

**The product may sell ₹0 or ₹10Cr — either way, Vikuna wins.**

### Implementation Status
The FamilyKnows app is **already built** with core vault functionality. The architectural transition described in this spec (decentralized vault, Google Drive storage, on-device AI, SMS/email proactive intelligence) represents a **strategic pivot** that transforms FamilyKnows from a standard vault app to a fundamentally differentiated product. This is an enhancement of the existing codebase, not a rebuild from scratch.

### Competitive Differentiator:
Unlike vault apps that store your data on their servers, FamilyKnows is a **Decentralized Vault App** — your documents live on YOUR Google Drive, metadata lives on YOUR device. Vikuna provides the AI, the organization, and the family sync. We never see a single document. Even if FamilyKnows shuts down, your files are safe in your Google Drive, exactly where you put them.

### The Three-Layer Trust Story:
1. **Your files** → Your Google Drive (you already trust Google with your email)
2. **Your metadata** → Your phone (never leaves your device)
3. **Our job** → AI classification + family sync + reminders + proactive intelligence (the brain layer)

### The OpenClaw Analogy:
```
Traditional Vault Apps:          FamilyKnows (OpenClaw):

  ┌──────────┐                    ┌──────────┐
  │ THEIR    │                    │ YOUR     │
  │ SERVER   │ ◄── your data      │ PHONE    │ ── your data stays here
  │          │                    │          │
  │ They see │                    │ AI claw  │ ── reaches into SMS, email,
  │ everything│                   │ extracts │    Drive — grabs insights
  │          │                    │ retracts │ ── pulls back, nothing taken
  └──────────┘                    └──────────┘
  You trust them.                 You trust yourself.
```

---

## 12. Subscription Enforcement Model

### 12.1 Core Principle
**"If it costs Vikuna, it stops. If it lives on their device, it always works."**

No grace periods. No tiered degradation. No data hostage. A clean, honest line.

### 12.2 Classification Rule

| Question | If YES | If NO |
|----------|--------|-------|
| Does this feature use Vikuna's infrastructure (relay, cloud, AI models delivery)? | Requires active subscription | Works forever |
| Does this feature create NEW data? | Requires active subscription | Works forever |
| Does this feature use EXISTING local data? | Works forever | N/A |

### 12.3 What ALWAYS Works (Subscription or Not)

| Feature | Reason |
|---------|--------|
| Open the app | Local app, local metadata |
| View all vault items & metadata | Metadata is on-device |
| Search across vault | Local SQLite FTS5 on metadata |
| Open / read any document | Opens from user's own Google Drive |
| View reminders & expiry alerts | Already scheduled locally |
| Export all metadata (encrypted ZIP) | Their data, their right |
| Biometric unlock | Device-level feature |
| View family members (already synced) | Metadata already on-device |
| View AI classifications (already processed) | Results already stored locally |
| View audit/access logs | Local logs |
| Access Google Drive files directly | User's own Drive, independent of FamilyKnows |

**AUDIT RULE SUB-001**: No existing local functionality shall check subscription status. If data exists on device, it is accessible. Period.

**AUDIT RULE SUB-002**: Export functionality must NEVER be gated behind subscription. Users must always be able to extract their complete vault data.

### 12.4 What STOPS on Subscription Expiry

| Feature | Why It Stops | What User Sees |
|---------|-------------|----------------|
| Add new vault items | New content creation is a paid capability | "Renew to add new items" |
| Upload new documents | New content creation is a paid capability | "Renew to upload documents" |
| AI classification (new) | LiquidAI model updates + processing cost | "Renew to classify new documents" |
| AI OCR (new documents) | Processing cost | "Renew to scan new documents" |
| AI smart tagging (new) | Processing cost | "Renew to auto-tag" |
| AI translation | Model delivery + processing cost | "Renew for translation" |
| Family sync | Relay infrastructure costs Vikuna | "Renew to sync with family" |
| Add new family members | Relay infrastructure costs Vikuna | "Renew to invite family" |
| Metadata backup to Drive | Processing + encryption cost | "Renew to enable auto-backup" |
| Push notifications (renewal alerts) | FCM costs Vikuna | Local reminders still work |
| Vault Health Reports | Processing + delivery cost | "Renew for insights" |

**AUDIT RULE SUB-003**: Every feature in the "STOPS" list must check `license_token.is_valid` before execution. No exceptions.

**AUDIT RULE SUB-004**: When a feature is blocked, the UI must show a clear, non-aggressive message explaining WHY and a single "Renew" CTA. No guilt-tripping. No countdown timers. No dark patterns.

### 12.5 License Token Architecture

```
┌─────────────────────────────────────────────┐
│            SUPABASE (Server-side)            │
│                                             │
│  On login / app open (if online):           │
│  1. Check subscription status               │
│  2. Generate license token                  │
│  3. Sign with Ed25519 private key           │
│  4. Return to device                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│            DEVICE (Client-side)              │
│                                             │
│  1. Receive signed license token            │
│  2. Verify signature (Ed25519 public key)   │
│  3. Store in secure local storage           │
│  4. Feature gates check token locally       │
│                                             │
│  If offline:                                │
│  - Use last stored token                    │
│  - If token.expires_at < now → features off │
│  - Existing data access → ALWAYS on         │
└─────────────────────────────────────────────┘
```

#### License Token Schema

```json
{
    "sub": "user_auth_id_hash",
    "plan": "monthly | annual | lifetime | free",
    "status": "active | expired",
    "features": {
        "new_items": true,
        "ai_processing": true,
        "family_sync": true,
        "metadata_backup": true,
        "translation": true,
        "max_family_members": 10,
        "max_vault_items": 500,
        "max_documents": 1000
    },
    "iat": 1740000000,
    "exp": 1771536000,
    "sig": "Ed25519_signature"
}
```

**AUDIT RULE SUB-005**: License token must be signed server-side with Ed25519. Public key embedded in app binary for local verification. Private key NEVER leaves server.

**AUDIT RULE SUB-006**: Token expiry (`exp`) must equal subscription end date. No grace period buffer added server-side.

**AUDIT RULE SUB-007**: If device is offline and token is expired, paid features stop immediately. No offline grace. Existing data access remains unaffected.

### 12.6 Subscription State Machine

```
    ┌─────────┐     Payment      ┌─────────┐
    │  FREE   │ ───────────────> │  ACTIVE  │
    │  TIER   │                  │  (Paid)  │
    └─────────┘                  └────┬─────┘
         ▲                            │
         │                     Subscription
         │                      Expires
         │                            │
         │     Renews            ┌────▼─────┐
         └──────────────────── │  EXPIRED  │
                                │  (Read+)  │
                                └───────────┘
```

**States:**

| State | New Items | AI | Sync | Existing Data |
|-------|-----------|-----|------|---------------|
| FREE | 25 items max | ❌ | ❌ | ✅ Always |
| ACTIVE (Monthly/Annual/Lifetime) | Per plan limit | ✅ | ✅ | ✅ Always |
| EXPIRED | ❌ | ❌ | ❌ | ✅ Always |

### 12.7 Edge Cases

| Scenario | Behavior |
|----------|----------|
| User has 300 items, subscription expires | All 300 items accessible. Cannot add #301. |
| AI classified 200 docs, subscription expires | All 200 classifications visible. New docs won't auto-classify. |
| Family synced 5 devices, subscription expires | All 5 devices keep their local copy. No new sync. Each device is frozen snapshot. |
| User on free tier hits 25 item limit | Prompt to upgrade. Existing 25 fully functional. |
| Lifetime plan user | Token exp set to 2099-12-31. Effectively permanent. |
| User downgrades from annual to free | Existing data above free limit stays accessible. Cannot add new until under limit. |
| Family member (not admin) — admin's sub expires | Family member keeps their local data. Sync stops. They cannot independently renew. |
| Token signature verification fails | Treat as expired. Log anomaly. Existing data still accessible. |
| App update changes feature flags | New token fetched on next online session. Local token refreshed. |
| Monthly user offline for 40 days | Token expired after 30 days. Paid features off. Comes online → renews → new token → features restored. No data lost. |

**AUDIT RULE SUB-008**: When subscription expires, existing item count must NEVER be reduced. If user had 300 items, all 300 remain. The count only gates NEW additions.

**AUDIT RULE SUB-009**: Family members who received synced data retain it permanently on their device, even if the admin's subscription expires. Data already transferred is theirs.

### 12.8 Pricing Tiers

| Feature | Free | Monthly (₹99/mo) | Annual (₹799/yr) | Lifetime (₹2,999) ★ First 50 only |
|---------|------|-------------------|-------------------|-------------------------------------|
| Vault items | 25 | 500 | 500 | Unlimited |
| Documents | 50 | 1,000 | 1,000 | Unlimited |
| Family members | 1 (self only) | 10 | 10 | 10 |
| AI features | ❌ | ✅ | ✅ | ✅ |
| Family sync | ❌ | ✅ | ✅ | ✅ |
| Translation | ❌ | ✅ | ✅ | ✅ |
| Metadata backup to Drive | ❌ | ✅ | ✅ | ✅ |
| Vault Health Report | ❌ | ✅ | ✅ | ✅ |
| Export data | ✅ Always | ✅ | ✅ | ✅ |
| View existing data | ✅ Always | ✅ | ✅ | ✅ |

#### Pricing Psychology
- **₹99/mo** = "chai money" entry point — low commitment, easy trial after free tier
- **₹799/yr** = 33% savings over monthly — nudges annual commitment (₹1,188 vs ₹799)
- **₹2,999 lifetime** = First 50 customers ONLY — creates genuine scarcity, caps long-term cost liability, rewards earliest believers

**AUDIT RULE SUB-010**: Lifetime plan counter must be tracked server-side in `app_config` table. Once 50 lifetime subscriptions are sold, the option must be auto-removed from the pricing UI. No manual override.

### 12.9 Audit Checklist — Subscription

- [ ] **SUB-001**: No existing local feature checks subscription status
- [ ] **SUB-002**: Export never gated behind subscription
- [ ] **SUB-003**: All paid features check `license_token.is_valid`
- [ ] **SUB-004**: Blocked features show clear, non-aggressive messaging
- [ ] **SUB-005**: Token signed server-side with Ed25519
- [ ] **SUB-006**: Token expiry = subscription end date (no grace buffer)
- [ ] **SUB-007**: Offline + expired token = paid features off, existing data on
- [ ] **SUB-008**: Existing item count never reduced on expiry
- [ ] **SUB-009**: Synced family data retained permanently on device
- [ ] **SUB-010**: Lifetime plan capped at 50, auto-removed from UI when sold out

---

## 13. Proactive Intelligence Layer (SMS & Email Monitoring)

### 13.1 Core Principle
**"Your phone watches out for you. We never see a thing."**

LiquidAI runs locally on the device, reads SMS and email with user's explicit permission, extracts actionable insights, and alerts the user. No data leaves the device. No cloud processing. No Vikuna access.

### 13.2 Architecture

```
┌─────────────────────────────────────────────┐
│              USER'S DEVICE                   │
│                                             │
│  SMS Inbox ──┐                              │
│              ├──> LiquidAI Local Engine      │
│  Email ──────┘    (on-device only)          │
│                       │                      │
│                       ▼                      │
│              ┌─────────────────┐            │
│              │ Pattern Matcher  │            │
│              │ + NLP Extractor  │            │
│              │ + Intent Classif.│            │
│              └────────┬────────┘            │
│                       │                      │
│              ┌────────▼────────┐            │
│              │  Action Engine   │            │
│              │  • Create alert  │            │
│              │  • Update vault  │            │
│              │  • Set reminder  │            │
│              │  • Flag anomaly  │            │
│              └────────┬────────┘            │
│                       │                      │
│              ┌────────▼────────┐            │
│              │  Local Notif.    │            │
│              │  + Vault Update  │            │
│              └─────────────────┘            │
│                                             │
│  ❌ NOTHING leaves the device                │
│  ❌ Vikuna has ZERO access to SMS/Email      │
└─────────────────────────────────────────────┘
```

### 13.3 SMS Intelligence Use Cases

| Category | SMS Pattern | Action | Priority |
|----------|------------|--------|----------|
| **Trial Trap Detection** | "Your free trial ends on {date}. ₹{amount} will be charged" | Alert: "Cancel before {date} to avoid ₹{amount} charge" + direct link to cancel | 🔴 High |
| **Forgotten Subscriptions** | Recurring debit SMS from same merchant 3+ months | Alert: "You've paid ₹{total} to {merchant} over {n} months. Still using it?" | 🟡 Medium |
| **Insurance Premium** | "{Insurer} premium of ₹{amount} debited" | Auto-update insurance vault item with payment date. Reset next-reminder. | 🟢 Auto |
| **EMI Bounce** | "EMI of ₹{amount} for loan {id} failed" | Alert: "EMI payment failed. Retry before penalty date." Link to loan vault item. | 🔴 High |
| **FD Maturity** | "Your FD of ₹{amount} maturing on {date}" | Alert: "FD maturing — renew or withdraw?" Link to financial vault. | 🟡 Medium |
| **Bank Balance Low** | "Balance in A/c {number} is ₹{amount}" | Alert if balance < user-set threshold. Context: upcoming EMIs/premiums due. | 🟡 Medium |
| **Credit Card Bill** | "Credit card bill of ₹{amount} due on {date}" | Alert + reminder. Flag if amount is unusually high vs. 3-month average. | 🟡 Medium |
| **Unusual Transaction** | Large debit SMS > user-set threshold | Alert: "₹{amount} debited to {merchant}. Was this you?" | 🔴 High |
| **Loan Closure** | "Congratulations! Your loan {id} is fully repaid" | Auto-update vault: mark loan as closed. Alert: "Request NOC from {lender}" | 🟢 Auto |
| **Property Tax** | "Property tax of ₹{amount} for {property}" | Link to property vault item. Update payment history. | 🟢 Auto |
| **Vehicle Service** | "Service due for vehicle {number}" | Link to vehicle vault item. Set reminder. | 🟡 Medium |
| **Medical Bill** | "Bill of ₹{amount} at {hospital}" | Prompt: "Add to health records?" Link to medical vault. | 🟡 Medium |
| **Government SMS** | IT return filed, Aadhaar update, PAN link | Flag + categorize. Prompt to save related document. | 🟡 Medium |

### 13.4 Email Intelligence Use Cases

| Category | Email Pattern | Action | Priority |
|----------|------------|--------|----------|
| **Policy Renewal** | Insurance renewal notice email with PDF | Extract renewal date, premium amount. Update vault reminder. Prompt to save PDF to Drive. | 🟡 Medium |
| **Bank Statements** | Monthly bank statement email (PDF attached) | Prompt: "Save to Financial vault?" If saved, AI extracts summary. | 🟢 Auto |
| **Investment Updates** | CAMS/KFintech portfolio statement | Extract fund values, returns. Update financial vault. | 🟡 Medium |
| **Warranty Expiring** | Product warranty emails with dates | Extract expiry date. Create reminder 30 days before. Link to service vault. | 🟡 Medium |
| **Bill Receipts** | Utility bills, telecom bills | Auto-categorize. Track spending patterns over time. | 🟢 Auto |
| **Subscription Receipts** | "Your {service} subscription receipt" | Track all active subscriptions. Build subscription dashboard. | 🟡 Medium |
| **Government Notices** | IT dept, municipality, traffic fines | High priority alert. Prompt to save document + set response deadline. | 🔴 High |
| **Travel Bookings** | Flight/hotel/train confirmations | Temporary tracking. Auto-archive after travel date. | 🟢 Auto |
| **Contract/Agreement Emails** | Rental agreements, service contracts | Prompt: "Add to Legal vault?" Extract key dates and terms. | 🟡 Medium |

### 13.5 Permissions & User Consent

#### Android
```
SMS: android.permission.READ_SMS + android.permission.RECEIVE_SMS
Email: Gmail API via OAuth (read-only scope)
```

#### iOS
```
SMS: ❌ NOT AVAILABLE — iOS does not allow third-party SMS reading
     Workaround: User forwards specific SMS to FamilyKnows (manual)
     OR: Use notification access (limited metadata only)
Email: Apple Mail plugin OR Gmail API via OAuth
```

**AUDIT RULE PI-001**: SMS and email access must require EXPLICIT opt-in. Not enabled by default. User must toggle ON in settings with clear explanation of what is accessed and how.

**AUDIT RULE PI-002**: A clear, plain-language consent screen must be shown before enabling:
- "FamilyKnows will read your SMS/email ON THIS DEVICE ONLY to find financial alerts, subscription renewals, and important notices."
- "Your messages are NEVER sent to our servers or any cloud service."
- "You can turn this off anytime in Settings."

**AUDIT RULE PI-003**: User must be able to exclude specific senders, numbers, or categories from monitoring at any time.

**AUDIT RULE PI-004**: Raw SMS/email content must NOT be stored in WatermelonDB. Only extracted metadata (amount, date, merchant, action type) is stored. Original message stays in inbox.

**AUDIT RULE PI-005**: SMS/email monitoring must be a PAID feature. Free tier users do not get access.

### 13.6 Processing Pipeline

```
Incoming SMS / Email arrives
    │
    ├── 1. Relevance Filter (lightweight, rule-based)
    │       └── Is this financial / subscription / service related?
    │       └── If NO → Ignore completely. Not stored. Not processed.
    │       └── If YES → Continue ▼
    │
    ├── 2. Entity Extraction (LiquidAI on-device)
    │       └── Extract: amount, date, merchant, account, policy number
    │       └── Classify: trial_renewal, emi, insurance, tax, medical, etc.
    │
    ├── 3. Vault Matching
    │       └── Does this match an existing vault item?
    │       └── If YES → Update vault item metadata (payment date, status)
    │       └── If NO → Suggest creating new vault item
    │
    ├── 4. Action Decision
    │       └── Alert required? (trial expiry, bounce, unusual transaction)
    │       └── Auto-update? (premium paid, loan closed)
    │       └── Prompt user? (save document, add to vault)
    │
    └── 5. Local Notification / Vault Update
            └── Push local notification for alerts
            └── Update WatermelonDB for auto-actions
            └── Show in "Activity Feed" in app
```

### 13.7 The "Subscription Guardian" Feature (Flagship Use Case)

This deserves special attention — it's the most relatable pain point:

```
SMS Monitor detects recurring payments:
    │
    ├── Build local subscription map:
    │   {
    │       "Netflix": { amount: 649, frequency: "monthly", months: 8, total: 5192 },
    │       "Hotstar": { amount: 299, frequency: "monthly", months: 14, total: 4186 },
    │       "Gym ABC": { amount: 1500, frequency: "monthly", months: 3, total: 4500 },
    │       "App XYZ": { amount: 99, frequency: "monthly", months: 6, total: 594 }
    │   }
    │
    ├── Trial Detection:
    │   └── First charge after "free trial" SMS → Alert immediately
    │   └── "You were charged ₹{amount} by {merchant}. Was this intentional?"
    │
    ├── Spending Summary (Monthly):
    │   └── "You're spending ₹2,547/month on subscriptions"
    │   └── "Highest: Gym ABC at ₹1,500/month"
    │   └── "Longest unused: App XYZ (no login activity in 4 months)"
    │
    └── Smart Alerts:
        └── "Gym ABC charged you 3 months. Based on your activity, you visited 2 times. Worth ₹750/visit."
        └── "Netflix raised price from ₹499 to ₹649 last month. You might not have noticed."
```

### 13.8 Data Retention Rules

| Data Type | Stored? | Where | Retention |
|-----------|---------|-------|-----------|
| Raw SMS text | ❌ Never | N/A | N/A |
| Raw email body | ❌ Never | N/A | N/A |
| Extracted metadata (amount, date, merchant) | ✅ | Local WatermelonDB (encrypted) | Until user deletes |
| Alert history | ✅ | Local WatermelonDB | 12 months rolling |
| Subscription map | ✅ | Local WatermelonDB (encrypted) | Active until cancelled |
| Processing logs | ✅ | Local ai_processing_log | 90 days rolling |

**AUDIT RULE PI-006**: Raw SMS/email content must NEVER persist in any database, cache, or log. Only structured metadata (amount, date, merchant, category) is extracted and stored.

**AUDIT RULE PI-007**: If user turns OFF SMS/email monitoring, all extracted metadata must be retained (it's useful vault data) but no new processing occurs. Clear distinction between "stop monitoring" and "delete all extracted data" — both options available to user.

### 13.9 Local Database Additions

```sql
-- MONITORED SOURCES (User's opt-in preferences)
CREATE TABLE monitor_sources (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,        -- sms, email
    is_enabled BOOLEAN DEFAULT false,
    enabled_at INTEGER,
    disabled_at INTEGER,
    exclude_senders TEXT,             -- Encrypted JSON array of excluded numbers/emails
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- EXTRACTED INSIGHTS
CREATE TABLE extracted_insights (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,         -- sms, email
    insight_type TEXT NOT NULL,        -- trial_renewal, emi, insurance, subscription, tax, medical, unusual_txn
    merchant_encrypted TEXT,           -- Encrypted merchant/sender name
    amount REAL,
    currency TEXT DEFAULT 'INR',
    event_date INTEGER,               -- When the event occurs/occurred
    action_taken TEXT,                 -- alerted, auto_updated, prompted, dismissed
    vault_item_id TEXT REFERENCES vault_items(id),  -- Linked vault item (if matched)
    confidence REAL,
    is_read BOOLEAN DEFAULT false,
    created_at INTEGER NOT NULL,
    _crdt_clock TEXT
);

-- SUBSCRIPTION TRACKER
CREATE TABLE tracked_subscriptions (
    id TEXT PRIMARY KEY,
    merchant_encrypted TEXT NOT NULL,
    amount REAL NOT NULL,
    frequency TEXT,                    -- monthly, quarterly, annual
    first_seen_at INTEGER,
    last_charged_at INTEGER,
    total_charges INTEGER DEFAULT 0,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'active',      -- active, cancelled, trial, flagged
    user_action TEXT,                  -- keep, review, cancel_reminder
    notes_encrypted TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    _crdt_clock TEXT
);
```

### 13.10 Audit Checklist — Proactive Intelligence

- [ ] **PI-001**: SMS/email access requires explicit opt-in toggle
- [ ] **PI-002**: Plain-language consent screen before enabling
- [ ] **PI-003**: User can exclude specific senders/numbers
- [ ] **PI-004**: Raw message content never stored in DB
- [ ] **PI-005**: Feature gated behind active subscription
- [ ] **PI-006**: Only structured metadata extracted and stored
- [ ] **PI-007**: "Stop monitoring" vs "delete data" — both options available
*Created: February 2026*
*Updated: February 2026 — Google Drive as document storage, Lifetime plan capped at first 50 customers*
*Author: Vikuna Technologies*
*Audit Target: Claude Code*

---

*Document Version: 1.5*
*Created: February 2026*
*Updated: February 2026 — Added OpenClaw positioning, Vikuna branding strategy, implementation status*
*Author: Vikuna Technologies*
*Audit Target: Claude Code*
