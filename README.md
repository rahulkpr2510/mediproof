# MediProof

MediProof is an anti-counterfeit medicine trust platform that combines:

- blockchain anchoring for critical supply-chain events,
- unit-level serialization with QR payload integrity checks,
- role-based custody workflows (manufacturer -> distributor -> pharmacy -> buyer),
- cold-chain monitoring, and
- anomaly intelligence for counterfeit/fraud detection.

It is built as a full-stack Next.js application with Prisma/PostgreSQL, Solidity smart contracts, and wallet-based actor identity.

## The Problem It Solves

Counterfeit and mishandled medicines can enter the supply chain through cloned packaging, broken custody trails, unauthorized actors, or cold-chain breaches. Traditional batch-level tracking is often too coarse and too mutable.

MediProof addresses this by tracking at the individual medicine unit level and enforcing a verifiable event trail:

- each unit has a unique cryptographic identity,
- each custody transition is role-gated and logged,
- verification returns clear GREEN/AMBER/RED trust verdicts with reasoning,
- suspicious patterns are automatically detected and recorded.

## What the Project Does

Core capabilities:

1. Role management

- ADMIN can assign/revoke MANUFACTURER, DISTRIBUTOR, PHARMACY, ADMIN.
- Roles are stored in DB and mirrored to on-chain `RoleManager`.

2. Manufacturer workflows

- Register medicine batches.
- Serialize units with unique `unitId`, secret reference, checksum.
- Optionally export QR payloads in bulk.
- Mark batches recalled/suspicious/expired.
- Track reputation score from operational outcomes.

3. Shipment lifecycle

- Distributor/pharmacy requests shipment.
- Sender approves then dispatches.
- Receiver confirms delivery.
- State machine: `REQUESTED -> APPROVED -> DISPATCHED -> DELIVERED`.

4. Cold-chain logging

- Temperature logs per shipment (`2C-8C` safe range).
- Unsafe readings auto-flag batch as `SUSPICIOUS`.

5. Pharmacy operations

- View in-custody stock.
- Confirm incoming shipments.
- Dispense/sell units with sale records.
- Dual-signature sale endpoint supported (`pharmacy + buyer` signatures).

6. Public verification

- Verify by unit QR payload or unit ID.
- Checks registry existence, QR integrity, batch safety, shipment history, cold-chain status, anomaly rules.
- Returns transparent verdict reasoning and timeline.

7. Anomaly detection

- Unauthorized actor usage
- Duplicate scan flood
- Device pattern anomalies
- Impossible geo movement
- Pre-sale public scan
- Shipment range mismatch

8. Health and observability

- Blockchain health endpoint and scan logs for auditability.

## High-Level Architecture

- Frontend: Next.js App Router + React (role dashboards + public verify UI)
- Backend API: Next.js route handlers in `app/api/*`
- Database: PostgreSQL with Prisma schema/migrations
- Blockchain: Solidity contracts deployed via Hardhat
- Wallet/Auth: MetaMask wallet identity + nonce-signature auth endpoints
- Verification intelligence: deterministic verification + anomaly engine + optional Gemini medicine info enrichment

### Key Smart Contracts

- `RoleManager.sol`: on-chain role authority
- `BatchRegistry.sol`: batch registration + unit serialization anchoring
- `ShipmentLedger.sol`: shipment and supply event anchoring
- `SaleRegistry.sol`: sale finalization anchoring

## Tech Stack

- Next.js 16, React 19, TypeScript
- Prisma 6 + PostgreSQL
- Ethers 6, Hardhat, Solidity 0.8.24
- Zod for route-level validation
- ZXing for browser QR scanning

## Prerequisites

Install before setup:

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- MetaMask (for dashboard workflows)

Optional:

- Gemini API key for medicine info enrichment during verification

## Project Structure (Important Paths)

- `app/`: Next.js app pages, dashboards, and API routes
- `app/api/`: backend route handlers for auth, roles, manufacturer, distributor, pharmacy, verify, cold-chain
- `contracts/`: Solidity contracts
- `scripts/`: bootstrap, deploy, and full-flow scripts
- `prisma/`: schema + migrations
- `lib/server/`: verification, anomaly, blockchain, auth, role, and utility services

## Environment Variables

Create `.env` in repository root.

Minimum required for app + DB:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/medi_guard?schema=public"
AUTH_SESSION_SECRET="replace-with-a-random-secret-at-least-32-characters"
```

Required for blockchain-enabled workflows:

```env
SERVER_RPC_URL="http://127.0.0.1:8545"
SERVER_SIGNER_PRIVATE_KEY="0x..."

ROLE_MANAGER_ADDRESS="0x..."
BATCH_REGISTRY_ADDRESS="0x..."
SHIPMENT_LEDGER_ADDRESS="0x..."
SALE_REGISTRY_ADDRESS="0x..."
```

Optional bootstrap/deploy helpers:

```env
ADMIN_WALLET="0x..."
SAMPLE_MANUFACTURERS="0x...,0x..."
SAMPLE_DISTRIBUTORS="0x...,0x..."
SAMPLE_PHARMACIES="0x...,0x..."

SEPOLIA_RPC_URL="https://..."
DEPLOYER_PRIVATE_KEY="0x..."
```

Optional medicine-info enrichment:

```env
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-2.5-flash"
```

Optional rate-limit tuning for verify API:

```env
AI_RATE_LIMIT_SHORT_WINDOW_MS=60000
AI_RATE_LIMIT_SHORT_LIMIT=12
AI_RATE_LIMIT_LONG_WINDOW_MS=3600000
AI_RATE_LIMIT_LONG_LIMIT=120
AI_RATE_LIMIT_COOLDOWN_MS=900000
```

## Setup Guide (Local Development)

1. Install dependencies

```bash
npm install
```

2. Configure environment

- Create `.env` with values shown above.

3. Start PostgreSQL and run migrations

```bash
npm run prisma:migrate
npm run prisma:generate
```

4. Compile smart contracts

```bash
npm run hardhat:compile
```

5. Start local Hardhat node (new terminal)

```bash
npx hardhat node
```

6. Deploy contracts to local chain (new terminal)

```bash
npm run hardhat:deploy:local
```

- Copy printed contract addresses into `.env`:
  - `ROLE_MANAGER_ADDRESS`
  - `BATCH_REGISTRY_ADDRESS`
  - `SHIPMENT_LEDGER_ADDRESS`
  - `SALE_REGISTRY_ADDRESS`

7. Bootstrap initial roles (optional but recommended)

```bash
npm run bootstrap:roles
```

8. Run application

```bash
npm run dev
```

9. Open app

- `http://localhost:3000`

## MetaMask Local Chain Configuration

To use dashboards with real role gating:

- Network name: Hardhat Local
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: ETH

Import accounts using private keys from Hardhat node output.

## How to Use the System

### 1) Admin flow

- Connect admin wallet.
- Go to Dashboard -> Admin.
- Assign MANUFACTURER / DISTRIBUTOR / PHARMACY roles.

### 2) Manufacturer flow

- Register a batch with medicine details and quantity.
- System serializes units and creates QR payload data.
- Export QR batch payloads for packaging/printing.
- Approve/dispatch incoming shipment requests.

### 3) Distributor flow

- Request shipment from manufacturer.
- Approve/dispatch shipments where distributor is sender.
- Log cold-chain telemetry for shipments.
- Confirm receipt when distributor is receiver.

### 4) Pharmacy flow

- Request stock from distributor.
- Confirm delivered shipments.
- View available stock.
- Dispense/sell unit and maintain traceability.

### 5) Public verification flow

- Go to Verify page.
- Scan QR payload or enter unit ID.
- Receive verdict:
  - `GREEN`: authentic / safe indicators
  - `AMBER`: caution / warning signals
  - `RED`: unsafe / counterfeit or critical risk

## Available Scripts

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - run ESLint
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - apply development migrations
- `npm run hardhat:compile` - compile contracts
- `npm run hardhat:deploy:local` - deploy contracts to local Hardhat network
- `npm run hardhat:deploy:sepolia` - deploy contracts to Sepolia network
- `npm run bootstrap:roles` - seed DB roles and optionally mirror to chain
- `npm run flow:test` - run synthetic end-to-end DB flow test script

## Core API Surface (Summary)

Authentication:

- `POST /api/auth/nonce` - issue wallet sign-in nonce
- `POST /api/auth/verify` - verify signature + set session cookie
- `POST /api/auth/logout` - clear session

Role and admin:

- `GET /api/roles/me` - fetch caller role
- `GET|POST|DELETE /api/admin/roles` - list/assign/revoke roles

Manufacturer:

- `GET|POST|PATCH /api/manufacturer/batches`
- `GET /api/manufacturer/qr` (single unit payload)
- `GET /api/manufacturer/qr-batch` (bulk payload export)
- `GET /api/manufacturer/reputation`
- `GET /api/manufacturer/shipments`

Distributor:

- `GET|POST|PATCH /api/distributor/shipments`
- `GET /api/distributor/stock`

Pharmacy:

- `GET /api/pharmacy/inbound`
- `GET|POST /api/pharmacy/stock`
- `GET|POST /api/pharmacy/sales`
- `GET /api/pharmacy/shipments`

Verification and checks:

- `POST /api/verify`
- `POST /api/random-check`
- `GET|POST /api/cold-chain/logs`
- `GET /api/health`

## Security Notes

- Strict schema validation and regex constraints at API boundaries (Zod).
- Role-based authorization for all actor-sensitive endpoints.
- Rate-limiting on verification endpoint.
- Diagnostic text sanitization before persistence.
- Session tokens via signed JWT cookie (`HttpOnly`, `SameSite=Strict`).

## Testing and Validation

Quick checks:

```bash
npm run lint
npm run flow:test
```

Manual validation:

- call `GET /api/health` to verify blockchain connectivity,
- perform one full custody flow (manufacturer -> distributor -> pharmacy -> verify),
- confirm anomaly flags by simulating duplicate scans or unsafe cold-chain temperature.

## Current Scope and Caveats

- Designed as a strong prototype/reference implementation.
- Some flows are optimistic in local mode (background chain serialization and mixed DB/chain anchoring).
- Production rollout should add queue workers, stronger monitoring, and comprehensive automated integration tests.

## Roadmap Suggestions

- Job queue for chain writes and retries
- Event indexer for contract events back to DB
- Rich audit dashboards and alerting
- Multi-tenant deployment model
- Stronger cryptographic proof packaging for QR exports

## License

Add your preferred license (MIT/Apache-2.0/etc.) in this repository.
