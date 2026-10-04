# Quater | Automated Indian Court Case Update Notifications

A modern, production-friendly Next.js web application and data pipeline for automated Indian court case tracking, snapshot diffing, change detection, and WhatsApp notification dispatching for lawyers and litigants.

---

## Architecture Overview

```text
       LAWYER / USER
            │
            ▼
    [ Enter CNR & Phone ] (Next.js App Router /cases/new)
            │
            ▼
 [ eCourtsIndia Partner API v4 ] ──(GET /api/partner/case/{cnr})
            │
            ▼
   [ Normalize Important Fields ] (Status, Next Hearing, Stage, Orders, Hearings)
            │
            ▼
   [ Store Initial Snapshot ] (CaseSnapshot with SHA-256 Hash in PostgreSQL via Prisma)
            │
            ▼
    [ Scheduled / Manual Monitor ] (monitorCase worker)
            │
            ▼
 [ Asynchronous Re-scrape ] (POST /api/partner/case/{cnr}/refresh + Exponential Polling)
            │
            ▼
   [ Change Detection Engine ] (detectCaseChanges: Next Hearing Date, Order, Stage, Status)
            │
            ├─────────────── No Change ───────────────► Update lastCheckedAt
            ▼
    [ Changes Detected! ]
            │
            ▼
    [ Create CaseEvent ] ────► [ Notification Records ]
            │
            ▼
 [ WhatsAppNotificationService ]
            │
   ┌────────┴──────────────────────────┐
   ▼                                   ▼
[ WHATSAPP_ENABLED=false ]   [ WHATSAPP_ENABLED=true ]
(Safe Masked Mock Logger)    (Meta WhatsApp Cloud API)
```

---

## Features

1. **eCourtsIndia Partner API Integration:**
   - Real `GET /api/partner/case/{cnr}` client with Bearer token authentication.
   - Asynchronous `POST /api/partner/case/{cnr}/refresh` trigger with exponential backoff polling.
   - Comprehensive error handling (400 Invalid CNR, 401 Unauthorized, 402 Credits, 429 Rate Limits, 500 upstream judicial outage).
   - High-fidelity offline mock mode for instant local testing without consuming credits.

2. **Normalized Change Detection Engine (`lib/case-monitor/detectChanges.ts`):**
   - Normalizes complex nested judicial structures into stable important fields:
     - `caseStatus`
     - `nextHearingDate`
     - `lastHearingDate`
     - `decisionDate`
     - `stage`
     - `orderCount` & `latestOrder`
     - `hearingCount` & `latestHearing`
     - `latestProceeding`
   - Computes deterministic SHA-256 snapshot hashes.
   - Detects structured event types:
     - `CASE_STATUS_CHANGED`
     - `NEXT_HEARING_DATE_CHANGED`
     - `NEW_HEARING`
     - `NEW_ORDER`
     - `NEW_PROCEEDING`
     - `CASE_STAGE_CHANGED`
     - `CASE_DECIDED`
     - `GENERAL_CASE_UPDATE`
   - Zero duplicate event noise.

3. **First Test Mode (Interactive Simulation):**
   - "Test Update Detection" modal on `/cases/[id]`.
   - Allows instant simulation of hearing date shifts (e.g. 14 Oct 2026 → 21 Oct 2026), stage changes, or order uploads without waiting for real court diaries or external API delays.

4. **Notification Service Abstraction (`lib/notifications/service.ts`):**
   - Clean `NotificationService` interface decoupled from transport channels.
   - `WhatsAppNotificationService` built for Meta WhatsApp Cloud API.
   - Configurable template message payload generation (`WHATSAPP_CASE_UPDATE_TEMPLATE=case_update`).
   - Mock logger mode (`WHATSAPP_ENABLED=false`) creating database records and secure masked console previews (`9198****3210`).

5. **Security & Privacy:**
   - Server-side only API calls (keys never leaked to client bundle).
   - Zod validation for 16-character alphanumeric CNRs and Indian E.164 phone numbers.
   - Parameterized PostgreSQL queries via Prisma ORM.
   - Sensitive phone masking in all application logs.

---

## Prerequisites

- **Node.js**: v18+ (tested on Node v22.x)
- **PostgreSQL**: v14+ (installed and running locally on port 5432 or via Docker/cloud provider)

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure PostgreSQL Database

If using local Homebrew PostgreSQL on macOS:

```bash
# Start PostgreSQL service if not already started
brew services start postgresql@16

# Create database for the project
createdb quater_dev
```

If using Docker:

```bash
docker run --name quater-postgres -e POSTGRES_DB=quater_dev -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

### 3. Configure `.env`

Copy the sample environment file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```ini
# PostgreSQL Database URL
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/quater_dev?schema=public"

# eCourtsIndia Partner API Key (Get from https://ecourtsindia.com)
ECOURTS_API_KEY=

# Meta WhatsApp Cloud API Credentials
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=

# WhatsApp mode (false = mock/log mode, true = live Meta API)
WHATSAPP_ENABLED=false

# Meta WhatsApp Template Name
WHATSAPP_CASE_UPDATE_TEMPLATE=case_update
```

### 4. Run Prisma Migrations

Sync your database schema with Prisma:

```bash
npx prisma db push
```

To view or manage the database interactively in your browser:

```bash
npx prisma studio
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing Workflows

### 1. Test Onboarding a CNR
1. Visit `http://localhost:3000/cases/new`.
2. Click **"Autofill Sample Case"** (or enter a CNR like `DLND020047882015`, Lawyer name and phone, Client name and phone).
3. Click **"Add & Fetch Case"**.
4. The system validates the CNR, contacts the eCourtsIndia client, extracts normalized fields, and stores the initial snapshot.
5. You will be redirected to the case details dashboard at `/cases/[id]`.

### 2. Test Simulated Case Updates (First Test Mode)
1. On the case details page (`/cases/[id]`), click the purple **"Test Update Detection"** button.
2. Select a new Next Hearing Date (e.g. `2026-10-21`), update the stage, or toggle "Simulate New Court Order Upload".
3. Click **"Trigger Simulation"**.
4. Observe the green banner: **"NEW CASE UPDATE (SIMULATED)"**.
5. Check the **Detected Updates** timeline for the diff and the **WhatsApp Dispatch** logs showing masked recipient numbers and delivery status.

### 3. Test Manual Update Check (Monitor Case Worker)
1. Click **"Check for Updates"** on `/cases/[id]`.
2. This runs `monitorCase(caseId)`, which queries eCourts, polls for refreshed data, compares with the active snapshot, and dispatches alerts only if changes occurred.

---

## Enabling Live WhatsApp Sending

To connect the application to the live Meta WhatsApp Cloud API:

1. Obtain your Meta WhatsApp Cloud API credentials from the [Meta for Developers Portal](https://developers.facebook.com/apps/):
   - `WHATSAPP_ACCESS_TOKEN`: System User Permanent Access Token
   - `WHATSAPP_PHONE_NUMBER_ID`: Phone Number ID from WhatsApp Getting Started
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`: WhatsApp Business Account ID
2. Create and approve the message template in WhatsApp Business Manager:
   - Template Name: `case_update`
   - Body format:
     ```text
     ⚖️ Case Update

     Case: {{1}}
     CNR: {{2}}

     {{3}}

     Next hearing: {{4}}

     Please check the case details or contact your advocate for further information.
     ```
3. Update your `.env`:
   ```ini
   WHATSAPP_ENABLED=true
   WHATSAPP_ACCESS_TOKEN=your_meta_token_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
   WHATSAPP_CASE_UPDATE_TEMPLATE=case_update
   ```
4. Restart your development server. All detected updates will now dispatch live WhatsApp messages to both lawyer and client.

---

## Directory Structure

```text
/app
  /api
    /cases
      route.ts                # GET / POST case onboarding
      /[id]
        route.ts              # GET case details
        /refresh/route.ts     # POST eCourts refresh
        /simulate/route.ts    # POST First Test Mode simulation
        /monitor/route.ts     # POST monitorCase() manual check
  /cases
    /[id]/page.tsx            # Case details, events, raw JSON inspector
    /new/page.tsx             # Case onboarding form with CNR validation
  layout.tsx                  # Global layout with branding & navbar
  page.tsx                    # Case monitoring dashboard
/components
  Navbar.tsx                  # Header navigation & system status
/lib
  prisma.ts                   # Prisma client singleton
  /ecourts
    client.ts                 # eCourtsIndia Partner API client (retry, backoff, 429)
    normalize.ts              # Normalizes case response into stable fields & hash
    types.ts                  # Official eCourts API types
    mockData.ts               # Realistic local offline test data generator
  /case-monitor
    detectChanges.ts          # Structured snapshot comparison & event detection
    monitorCase.ts            # Core monitorCase worker and simulation runner
    types.ts                  # Event types (NEXT_HEARING_DATE_CHANGED, etc.)
  /whatsapp
    client.ts                 # Meta WhatsApp Cloud API client
    templates.ts              # Template parameter builder & message formatting
    types.ts                  # Meta Cloud API types
  /notifications
    service.ts                # NotificationService abstraction & WhatsApp implementation
  /validations
    case.ts                   # Zod schemas for CNR and Indian phone numbers
/prisma
  schema.prisma               # Lawyer, Client, Case, Snapshot, Event, Notification models
.env.example                  # Environment template
```
