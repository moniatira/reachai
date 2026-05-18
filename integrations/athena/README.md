# Athenahealth — Appointments API integration

Server-side helpers for the **classic Athena REST API** (OAuth 2.0 + `/v1/{practiceId}/appointments/...`). Use this from a secure backend or CLI—never expose client secrets in the browser.

Official reference (sandbox): [Athena API — Appointments](https://docs.athenahealth.com/api/sandbox#/Appointments).

## How you get Client ID and Secret (Preview / sandbox)

You **do not generate** these locally (they are not random keys you create yourself). Athena **issues** a **Client ID** and **Client Secret** when you **register an application** in their developer tooling and tie it to the **Preview (sandbox)** environment.

Typical flow (labels vary by portal version—follow what your screen shows):

1. **Sign up / log in** to athenahealth developer access (start from [Developer resources](https://www.athenahealth.com/developer-portal); documentation often links to the **Developer Portal** / console where apps are managed).
2. **Create a new application** (sometimes called an “API client” or “integration”).
3. Choose the **Preview / sandbox / non-production** environment for testing against sandbox APIs.
4. Choose an OAuth flow appropriate for **server-to-server** use (often described as **two-legged OAuth** or **client credentials**—machine calls without an interactive user login). Select **secret-based** credentials when offered so you receive a **Client Secret**.
5. **Finish registration.** The portal will show your **Client ID** and **Client Secret**.
   - **Copy the secret immediately** and store it in a password manager or secret store. Many portals **show the secret only once**; if you lose it, use **Regenerate secret** (old secret stops working).
6. In the same app (or linked screens), note the **OAuth token URL** and **API base URL** for Preview—copy them into `.env` exactly as shown (**do not guess** hostnames).
7. Ensure your app is allowed to call the endpoints you need (e.g. **Appointments**). Some programs require approving **API access** or submitting a **technical / scope** request for non-certified APIs—follow [Athena’s API documentation](https://docs.athenahealth.com/api/sandbox#/Appointments) and portal prompts.

**Preview URLs often look like** (confirm in your app settings):

| Purpose | Example host (verify in portal) |
|--------|-----------------------------------|
| OAuth token | `https://api.preview.platform.athenahealth.com/oauth2/v1/token` |
| REST API | `https://api.preview.athenahealth.com/v1` or paths under `api.preview.platform.athenahealth.com` |

You still need a **practice ID** (and usually **department ID**) from sandbox practice context—these are identifiers in Athena, not something OAuth generates.

## Prerequisites

1. **Client ID**, **Client Secret**, **token URL**, and **API base URL** from your **Preview app** (steps above).
2. **`ATHENA_SCOPE`** — Preview often returns *“scope must be provided”* until you set a scope your app is entitled to (example used in many guides: `athena/service/Athenanet.MDP.*`). Copy the exact scope(s) from your Developer Portal if that fails.
3. **Practice ID** and **department ID** for discovering slots (`departmentid` on open/booked APIs). Department ID and patient ID are **different numbers**—do not confuse them.
4. To **book** a slot: **`appointmentid`** from `GET …/appointments/open`, plus **`patientid`** (e.g. `ATHENA_PATIENT_ID` in `.env`).

## Why department ID still matters (even with a patient ID)

Athena ties much of scheduling and patient context to **department** inside a practice. Their workflow guide explains how **department-based patient information** fits together when calling APIs—when to pass **`departmentid`**, how patient records relate to departments, and related sequencing.

Read: **[Department-based patient information (workflow)](https://docs.athenahealth.com/api/workflows/department-based-patient-information)**.

For this repo:

- **`ATHENA_DEPARTMENT_ID`** — required for **`npm run open`** / **`npm run booked`** (Athena expects `departmentid` on those appointment endpoints).
- **`ATHENA_PATIENT_ID`** — used when **booking** an open slot (`PUT …/appointments/{appointmentId}` with `patientid`), after you’ve resolved the patient in the right practice (and usually understood department rules per that workflow).

If something fails with “wrong department” or missing context, compare your calls to that workflow doc and your sandbox department list—not every numeric ID in the portal maps the same way.

## Configure

Put **real credentials only in `.env`** (same folder). Keep `.env.example` as blank placeholders so nothing secret is committed.

```bash
cd integrations/athena
# Windows: copy .env.example .env
cp .env.example .env
# Edit .env — client ID, secret, token URL, API base from Developer Portal; practice + department IDs from sandbox context
npm run check-env
```

## Dashboard (BookRing live demo)

The demo **automatically** calls `GET /api/athena/booked` for the **current calendar month** when you open **Dashboard** (no form inputs). Bridge URL defaults to `http://127.0.0.1:3847`; department **82** is sent unless `ATHENA_DEPARTMENT_ID` is set in `.env`.

```bash
cd integrations/athena
npm run portal
```

Default bind: `http://127.0.0.1:3847` (override with `CP_ATHENA_BRIDGE_HOST` / `CP_ATHENA_BRIDGE_PORT` in `.env`).

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Bridge alive |
| `GET /api/athena/status` | OAuth + practice/dept/patient readiness (no secrets) |
| `GET /api/athena/open-slots?departmentid=` | Open slots |
| `GET /api/athena/booked?startdate=&enddate=&departmentid=` | Booked appointments; **`patientid` sent automatically** from **`ATHENA_PATIENT_ID`** when set (override with `?patientid=`). **Practice ID** for URLs comes only from **`ATHENA_PRACTICE_ID`**. |
| `POST /api/athena/book` | Body `{ "appointmentId": "..." }` — **`patientid` defaults to `ATHENA_PATIENT_ID`** |

## Scripts

From `integrations/athena`:

```bash
# Pipe-friendly OAuth token (for debugging only — do not log in production)
npm run token

# Booked appointments (requires ATHENA_DEPARTMENT_ID and date range)
npm run booked -- 05/01/2026 05/31/2026

# Open appointment slots (department required)
npm run open

# Book a slot for ATHENA_PATIENT_ID (get appointmentId from `npm run open`)
npm run book-slot -- <appointmentId>
```

Date parameters typically use **MM/DD/YYYY** per Athena conventions—confirm in the [API reference](https://docs.athenahealth.com/api/sandbox#/Appointments).

## Programmatic use

```javascript
import { loadConfig } from './lib/config.js';
import { listBookedAppointments, bookAppointment } from './lib/appointments.js';

const cfg = loadConfig();
if (cfg.missing.length) throw new Error(cfg.missing.join(', '));

const booked = await listBookedAppointments(cfg, {
  startDate: '05/01/2026',
  endDate: '05/31/2026',
});

// await bookAppointment(cfg, appointmentId, patientId, { /* optional fields */ });
```

## BookRing wiring

- The static **live demo** continues to use CSV for local prototyping.
- Production BookRing should call these helpers from your API layer after OAuth, map Athena appointments into the internal schedule model, and write confirmed bookings back via `bookAppointment` (or your workflow-approved endpoint).

## Disclaimer

API paths and OAuth details vary by Athena product and registration. If requests fail with 401/403, verify **scopes**, **practice ID**, and **environment URLs** in the Developer Portal against the latest documentation.
