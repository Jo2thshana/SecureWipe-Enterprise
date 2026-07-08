# SecureWipe - Secure Data Wiping & Verification System

SecureWipe is an enterprise-grade, production-ready, clean architecture application designed for trustworthy IT asset recycling. It enables security compliance officers and asset disposal teams to securely sanitize storage devices (DoD 5220.22-M 3-Pass, single-pass, or Schneier 7-pass), perform real-time verification tests to confirm zero data residue, and export cryptographically signed Certificates of Destruction (PDF formats).

---

## Technical Stack

* **Backend Service:** Node.js, Express, TypeScript, and a custom JSON database client simulating transaction-based SQL query interfaces (bypassing native MSVC build tool requirements on Windows).
* **Frontend Dashboard:** React.js, Tailwind CSS, Framer Motion animations, Lucide React, Axios HTTP client, and React Router DOM.
* **Database & Integrity:** Relational schemas with cryptographically signed logs (HMAC-SHA256) to detect database tampering.

---

## Clean Architecture Directory Layout

The codebase enforces separation of concerns:

```text
SecureWipe/
├── backend/
│   ├── src/
│   │   ├── core/                  # Domain Layer (Entities & Service Contracts)
│   │   │   ├── entities/          # Business rules (User, Device, Job, Certificate)
│   │   │   └── services/          # Wiping, Verification, Certificates interfaces
│   │   ├── use-cases/             # Application Layer (Core business flows)
│   │   │   ├── auth/              # RegisterUser, LoginUser
│   │   │   ├── devices/           # DetectDevices, AnalyzeDevice
│   │   │   ├── wipe/              # StartFullWipe, StartSelectiveWipe, SimulationWipe
│   │   │   └── reports/           # GenerateCertificate, GetAuditLogs
│   │   ├── infrastructure/        # Infrastructure Layer (Frameworks, DB, Filesystem)
│   │   │   ├── database/          # JSON-backed SQLite Client, SQLite repositories
│   │   │   ├── file-system/       # Raw block writing, renaming, and unlinking
│   │   │   └── web/               # App configs, middlewares
│   │   ├── middleware/            # Security JWT guards, request validation, error logs
│   │   ├── routes/                # Express router endpoints
│   │   └── app.ts                 # Bootstrapper Composition root
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable components (Sector Grids, Progress bars)
│   │   ├── context/               # Global states (Auth, Theme, Notifications, Devices)
│   │   ├── layouts/               # AuthLayout, Responsive Sidebar Dashboard Layout
│   │   ├── pages/                 # UI screens (Login, Wipes summary, Cert list)
│   │   ├── services/              # API Client (Axios with Token Expire rotations)
│   │   └── App.jsx                # Router configs
```

---

## Setup & Run Instructions

Ensure [Node.js](https://nodejs.org/) (v18+) is installed.

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. The dependencies are already pre-installed. Create a `.env` file (one has been pre-generated for you):
   ```text
   PORT=5000
   JWT_SECRET=enterprise_grade_security_jwt_secret_key_2026
   HMAC_SECRET=hmac_audit_ledger_secret_protection_key_2026
   DB_PATH=./data/securewipe.db
   TEMP_SHRED_VAULT=./data/shred_vault
   ```
3. Start the TypeScript backend server in hot-reload development mode:
   ```bash
   npm run dev
   ```
   The backend boots, spins up the database client at `backend/data/securewipe_db.json`, runs table seeds, and starts listening on port **5000**.

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. The dependencies are pre-installed. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The frontend starts running on [http://localhost:5173/](http://localhost:5173/). Vite is pre-configured to proxy API requests directly to the backend port.

---

## Seed Test Credentials

Upon first boot, the JSON database client automatically seeds two operational accounts with pre-hashed credentials:

| Role | Username / Email | Password Key | Clearances |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@securewipe.com` | `AdminPass123!` | Users audit, Reports overview, Analytics logs |
| **Disposal Operator** | `operator@securewipe.com` | `OperatorPass123!` | Device analysis, Wiping schedules, Receipts exports |

***

### SSD wear-level caution warning
This system explicitly alerts compliance officers when solid-state drives (SSDs) are targeted. Software-based secure overwriting cannot guarantee physical destruction of specific NAND flash cells due to SSD wear-leveling controllers. Hardware degaussing or physical shredding is recommended for SSD decommissions.
