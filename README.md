# SecureCloud — Secure Cloud File Sharing & Management System

> B.Tech CSE Final-Year Mini Project: Zero-Knowledge Client-Side Encrypted Cloud Storage & Controlled File Sharing

---

## 🌟 Overview

**SecureCloud** is an end-to-end secure cloud storage and file management web application. It combines high-performance object storage with browser-level AES-256-GCM client-side encryption, granular link sharing, and complete tamper-evident audit logging.

Built exclusively using free-tier cloud infrastructure (MongoDB Atlas M0 + Supabase Storage Private Bucket) and standard web security standards (Web Crypto API, HttpOnly SameSite cookies, Argon2id, and Helmet).

```
   [Browser] ──(AES-256-GCM Encrypted Blob)──> [Express Backend] ──(Service Role)──> [Supabase Private Bucket]
       │                                              │
(Master Key derived                               (Audit Logs,
from Passphrase via                               Sessions,
PBKDF2 in Web Crypto)                            File Metadata)
                                                      │
                                                      ▼
                                            [MongoDB Atlas M0]
```

---

## 🔐 Key Security Features

1. **Zero-Knowledge Client-Side Encryption**:
   - Files can be encrypted locally in the browser with AES-256-GCM (256-bit FEK) before leaving the machine.
   - The backend and Supabase object store only receive raw ciphertext blobs (`application/octet-stream`). The server **never** receives the FEK, master key, or passphrase.
2. **Encrypted Link Sharing via URL Fragment**:
   - Shared encrypted links carry the unwrapped FEK inside the URL fragment (`#k=<base64url FEK>`).
   - Browsers never transmit URL fragments to backend servers (`RFC 3986`). The recipient browser downloads the ciphertext and decrypts locally.
3. **Controlled Access & Revocation**:
   - Access expiration (1 hour, 24 hours, 7 days, or custom).
   - Optional share password.
   - Atomic download limits enforced via MongoDB `$inc` concurrency checks.
   - Immediate one-click revocation.
4. **Hardened Authentication**:
   - Short-lived JWT access tokens (15m) + rotating refresh tokens (7d) stored in `httpOnly`, `SameSite=Lax`, `Secure` cookies.
   - Refresh token reuse detection invalidates compromised session families.
   - Argon2id password hashing with anti-enumeration login rate limiting.
5. **Auditing & Privacy**:
   - Structured audit logging via Pino with automated redaction of sensitive credentials and tokens.
   - Quota enforcement (default 100 MB per user, 25 MB per file).

---

## 🏗️ Repository Architecture

```text
├── README.md                      # Project documentation & overview
├── package.json                   # Root scripts for multi-package management
├── docs/
│   ├── SETUP_WINDOWS.md           # Step-by-step Windows 11, Atlas & Supabase guide
│   ├── ARCHITECTURE.md            # Detailed system design & Mermaid diagrams (Phase 6)
│   ├── SECURITY.md                # Threat model, assets, and limitations (Phase 6)
│   ├── API.md                     # REST API reference (Phase 6)
│   ├── TESTING.md                 # Test suite documentation & coverage (Phase 6)
│   ├── DEMO_SCRIPT.md             # Viva demo walkthrough scenario (Phase 6)
│   └── SYNOPSIS_NOTES.md          # Project synopsis & viva Q&A (Phase 6)
├── server/                        # Express.js REST API backend
│   ├── package.json
│   ├── .env.example
│   ├── eslint.config.js
│   ├── src/
│   │   ├── app.js                 # Express app & security middleware
│   │   ├── server.js              # Server bootstrapper & shutdown handlers
│   │   ├── config/                # env, db, supabase, logger
│   │   ├── middleware/            # auth, csrf, rateLimiting, errorHandler
│   │   ├── models/                # User, RefreshToken, FileMeta, Share, AuditLog
│   │   ├── routes/                # auth, files, shares, public, activity, keys
│   │   └── utils/
│   └── tests/                     # Vitest + Supertest automated tests
└── client/                        # React (Vite) + Tailwind CSS frontend
    ├── package.json
    ├── .env.example
    ├── vite.config.js
    └── src/
        ├── api/                   # Axios client with credentials & CSRF
        ├── crypto/                # Web Crypto API utilities (AES-GCM, PBKDF2)
        ├── components/            # UI components
        └── pages/                 # Login, Register, Dashboard, Files, Share, etc.
```

---

## 🚀 Quick Start (Development)

Follow the complete step-by-step setup in [`docs/SETUP_WINDOWS.md`](docs/SETUP_WINDOWS.md).

```powershell
# 1. Install dependencies
cd server; npm install; cd ../client; npm install; cd ..

# 2. Configure .env files
# Copy server/.env.example to server/.env and fill in MongoDB & Supabase values
# Copy client/.env.example to client/.env

# 3. Test Database Connection
npm run test:db

# 4. Start Development Servers
npm run dev:server   # Backend on http://localhost:5000
npm run dev:client   # Frontend on http://localhost:5173
```
