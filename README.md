# CSK Clinic

## Implementation status

The repository now includes a hardened API foundation (refresh-cookie sessions, logout, rate limiting, Swagger/OpenAPI, and audit session storage), a Jest test setup, React/Vite frontend migration scaffolding, Docker compose services, CI verification, and an encrypted-backup-oriented PowerShell helper.

Run the API and React frontend together in development:

```powershell
npm run dev:api
npm run dev:web
```

The React shell is an incremental migration foundation; the existing static dashboard remains available with `npm run dev:prototype`.

Run verification:

```powershell
npm run build
npm run build:web
npm test -- --runInBand
```

CSK Clinic is a clinic-management prototype with a static browser dashboard, a NestJS API, and a PostgreSQL/Prisma data layer. The dashboard can run in local demo mode or connect to the authenticated API. Local demo data is stored in this browser and is not suitable for real patient or financial records.

## Local preview and API setup

### Browser prototype preview

Open the static clinic dashboard in the browser directly or run a local preview server:

```powershell
npm start
```

Then open `http://localhost:8000` in the browser. This serves the front-end prototype and allows the billing/receipt print preview to be used without a backend connection.

### API backend setup

Requirements: Node.js 20+, npm, and Docker Desktop.

1. Copy `.env.example` to `.env` and set a unique PostgreSQL password, a random `JWT_SECRET` of at least 32 characters, and an admin password of at least 12 characters.
2. Install dependencies with `npm install`.
3. Start the database with `docker compose up -d postgres`.
4. Generate the Prisma client and apply the initial migration:

   ```powershell
   npm run db:generate
   npm run db:migrate
   ```

5. Create the initial clinic owner using the credentials from `.env`:

   ```powershell
   npm run db:seed
   ```

6. Start the API with `npm run dev:api`.

The API listens on `http://localhost:3001`; health check: `GET /api/health`.

## Public, shared demo deployment

`render.yaml` describes a free Render Docker service that serves the frontend and API from one URL. The API uses a Neon PostgreSQL database so records survive Render service restarts. The deployment is for a synthetic, shared demo only; it is not suitable for real clinic, patient, or payment data.

This workspace is not connected to a Git remote. To deploy, first create a repository in your own Git provider account and push this project there. Keep `.env` out of source control; `.gitignore` already excludes it. The deployment cannot produce a public URL until the repository and hosting accounts are connected.

1. Create a Neon PostgreSQL project, preferably in Singapore, and copy its connection string with SSL enabled. Do not put this URL in the repository or share it in chat.
2. In Render, create a Blueprint from your repository and select `render.yaml`. Provide the Neon `DATABASE_URL` and a unique `ADMIN_PASSWORD` of at least 12 characters when prompted. Render generates `JWT_SECRET`; the demo account email is `demo@cskclinic.example.com`.
3. Wait for the Render service to deploy. The frontend and API share `https://csk-clinic-demo.onrender.com`; the API health check is at `/api/health`. If Render requires a different service name, update `CORS_ORIGINS` in the Blueprint to match, then redeploy.
4. Open **Clinic settings → Connect to API** and sign in with the demo email and the `ADMIN_PASSWORD` you configured. Share the frontend link and password separately with intended demo viewers.

All API-connected visitors share the same editable database and account; their changes are visible to other visitors and can overwrite or delete demo records. The API database is initialized with the clinic and owner account, not the browser's sample records. Before connecting, each browser displays its own local synthetic sample data; after connecting, create any demo records in the shared database.

Render's free API service can sleep after inactivity and take about a minute to wake. Neon Free has usage and storage limits, and neither free service tier provides production-grade recovery or compliance controls. These services are for previews only; do not enter real or identifiable health information.

## Initial API

- `POST /api/auth/login` — exchange clinic-owner/staff email and password for a short-lived access token.
- `GET /api/patients` — authenticated clinic staff; supports `search`, `status`, `page`, and `limit`.
- `GET /api/patients/:id` — authenticated clinic staff; only returns records belonging to the caller's clinic.
- `POST /api/patients` — clinic owner/admin/receptionist/nurse.
- `PATCH /api/patients/:id` — clinic owner/admin/receptionist/nurse.
- `GET /api/patients/drafts` — list unfinished patient registrations for authorized staff in the clinic.
- `POST /api/patients/drafts` and `PATCH /api/patients/drafts/:id` — save or resume a clinic-scoped registration draft.
- `DELETE /api/patients/drafts/:id` — delete a draft; draft mutations are audit logged.
- `GET /api/patients/:id/records` — clinic owner/admin, doctor, or nurse; returns the patient's OPD/IPD encounter history.
- `GET /api/patients/:id/intakes` — clinic owner/admin, doctor, or nurse; returns archived intake records and their historical visit/author details as read-only history.
- `GET /api/patients/:id/external-records`, `POST /api/patients/:id/external-records`, and `PATCH /api/patients/:id/external-records/:recordId` — clinic owner/admin, doctor, or nurse; list, add, and edit patient-level history from outside providers. These records are separate from CSK Clinic encounters and support structured clinical details plus one optional report attachment.
- `GET /api/appointments/slots?doctorId=<uuid>&from=<ISO date>&to=<ISO date>` — list available clinic slots over a maximum 31-day range.
- `GET /api/appointments/doctors` — list active doctors in the authenticated clinic for appointment booking.
- `POST /api/appointments/slots` — create a future availability slot for an active clinic doctor; a doctor may only create their own slots.
- `GET /api/appointments` — clinic-scoped, paginated staff appointment list; doctors only see their own appointments.
- `POST /api/appointments` — book an active clinic patient into an available slot. Slot reservation is atomic to prevent double booking.
- `PATCH /api/appointments/:id/status` — apply a permitted appointment status transition; cancelling a future booking releases its slot.
- `GET /api/medicines` — authenticated clinic staff inventory list; supports `search`, `active`, `page`, and `limit`; each result includes a low-stock flag.
- `POST /api/medicines` — clinic owner/admin/pharmacist creates a medicine batch, including product metadata, expiry and optional opening stock.
- `PATCH /api/medicines/:id` — clinic owner/admin/pharmacist updates medicine and batch metadata or archives it by setting `active` to false.
- `POST /api/medicines/:id/stock` — clinic owner/admin/pharmacist records `RECEIVE`, `DISPENSE`, or manager-only `SET` stock operations with an audit history; dispensing cannot create negative stock or dispense an expired batch.
- `GET /api/medicines/:id/stock-movements` — paginated, clinic-scoped stock movement history.
- `GET /api/consumables?search=<text>&categoryId=<uuid>&active=true&page=1&limit=20` — clinic-scoped non-medicine inventory with low-stock flags.
- `GET /api/consumables/categories` — active clinic supply categories.
- `POST /api/consumables` and `PATCH /api/consumables/:id` — owner/admin/pharmacist create or update supply details; a first stock quantity creates an audited opening receipt.
- `POST /api/consumables/:id/stock` — owner/admin/pharmacist or nurse records receipts, usage, damage, expiry, or an admin-only stock adjustment. Stock cannot become negative; each movement and audit record is atomic.
- `GET /api/consumables/:id/stock-movements` — paginated, clinic-scoped consumables stock history.
- `GET /api/billing/invoices` — clinic-scoped, paginated invoices with patient, item and payment details; supports `search`, `patientId`, `encounterId`, `from`, and `to`.
- `GET /api/billing/invoices/:id` — retrieve a clinic-scoped invoice with itemized charges and payment/receipt history.
- `POST /api/billing/invoices` — create an invoice for an active patient in the same clinic, optionally linked by `encounterId`, with service items, optional medicine items, discount, tax rate, print template and optional initial payment. A medicine item may include a `prescriptionItemId` from that patient's encounter; the API validates the prescription, records the billed quantity, decrements inventory, and writes the stock movement in the same transaction.
- `POST /api/billing/invoices/:id/payments` — record a partial or final payment and receive a unique receipt number; payment cannot exceed the remaining invoice balance.

Prescription entries are structured by medicine, dose, frequency, duration, quantity, and instructions. Writing a prescription does not reserve or reduce stock. Selecting **Invoice remaining** on the encounter prepares the available unbilled quantity for the invoice; completing that invoice is the single dispense/stock-decrement event. The invoice stores the directions as a snapshot for printing, and the prescription tracks billed versus remaining units so the same units cannot be billed twice. Do not separately dispense those units through the manual stock-adjustment control.

Invoice creation and payment entry require an authenticated owner, clinic admin, receptionist or accountant. Invoice charges, prescription fulfillment, payment entries, and stock movement entries are retained as records rather than hard-deleted. Apply the checked-in migrations before using these endpoints.

Appointment workflow: `BOOKED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED`. Booked appointments can also become `CANCELLED` or `NO_SHOW`; checked-in appointments may be cancelled. Appointments are managed independently of a token queue. When connected to the API, the dashboard books patients into a doctor's available slot and sends cancellation/status changes to the API. Create future doctor availability through `POST /api/appointments/slots` before booking.

The token queue and its operational API have been removed. Existing queue-token and nurse-intake rows are retained in the database so past visit context is not lost; archived intake details are available only through the read-only patient-history route. The browser demo also preserves legacy local queue records solely to render archived intake history.

Patient records are deliberately not hard-deleted. All patient routes require a bearer token; patient access to staff endpoints is not granted. Configure `CORS_ORIGINS` to the exact web origins in use.

For a deployed environment, apply the checked-in migrations with `npm run db:deploy`; do not run development migration generation against production.

The browser dashboard can connect from **Clinic settings → Connect to API**. In connected mode, patient create/edit, read-only clinic visit and archived intake history, outside-provider history, medicine and consumables create/edit/stock history, appointment booking/cancellation, invoices, and payment receipts use the authenticated API. Patient history fetched from the API is kept in memory rather than copied to the browser's persisted demo records. Clinic print settings remain browser-local because clinic branding and tax/registration fields do not yet have a backend settings endpoint. Use a valid local seeded account; keep the API disconnected for the sample-data demo.

Local demo mode provides synthetic patients, appointments, visit history, archived intake history, invoices, medicines, and clinical supplies. A versioned seed adds the new sample records to older browser demo data without duplicating matching demo IDs. All added names, contact details, and records are fictional and for testing only.

The patient directory supports search by name, Patient ID, or formatted/unformatted mobile number. Separate **Clinic visit records** and **Previous / outside history** columns each show only a button that opens the corresponding record history. Registration is organized into personal, contact, and health-background steps, with calculated age, duplicate-match warnings and explicit confirmation, emergency contact, occupation, marital status, preferred language, insurance context, allergy details, medical and surgical history, family history, current medications, and resumable drafts. **Save & Continue** opens the patient's profile; profile tabs summarize the patient, chronological clinical visits, appointments, and invoices/payments. The profile overview includes a recent-visit summary with known case, latest diagnosis, investigation plan, follow-up, latest vitals, care-gap flags, demographics, and coverage context. Registration drafts and new patient context fields require the checked-in migrations to be applied before connected use.

In the patient profile, **Visits** contains dated CSK Clinic encounters, while **Outside records** contains previous-provider history. The directory's **Outside history** button opens that separate profile tab; outside-provider records are not shown in the **View visits** history. Outside entries support record type/date, provider/facility, diagnosis, treatment, medicines, investigations, notes, an optional file, and editing. These records never count as clinic encounters. Existing clinic OPD/IPD encounters and archived intake details are shown as read-only history; new encounter and intake entry are not available in the dashboard. Visit history can be searched and filtered by visit date; the visible filtered visits can be printed or exported to CSV. The CSV includes visit and report metadata, not report-file contents.

Report attachments are limited to 2 MB and PDF, PNG, JPEG, WebP, GIF, or UTF-8 plain text. The browser checks the extension, MIME type, and basic file signature; the API repeats these checks for clinic reports and outside-provider attachments. This is input validation, not malware scanning. Demo-mode attachments are stored in browser storage, while API attachments are currently stored inline in the database. Neither mode is a substitute for production document storage with malware scanning, encryption, retention controls, and audited access. Use synthetic data until those controls are deployed. Apply the checked-in migrations before using encounter, prescription, or outside-provider history workflows.

An initial audit trail now records patient-list and patient-record access, clinical-history access and encounter changes, appointment scheduling and status changes, medicine and stock changes/history access, invoice access and creation, payments, clinic settings changes, staff changes, logins, and password changes. Domain changes and their audit records are written in the same database transaction. Audit metadata is limited to operational identifiers and summaries rather than clinical note contents.

This is not a production-ready medical records system. Audit coverage, audit-log review and retention controls are still incomplete. Before real patient data is used, complete secure session/token handling, comprehensive audit logging, encrypted and tested backups, deployment secrets, operational monitoring, and a security/compliance review appropriate to the deployment jurisdiction.

For a local PostgreSQL backup, use a protected folder outside the workspace and test restores into an isolated database. For example, in PowerShell after configuring `DATABASE_URL` and installing PostgreSQL command-line tools:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\clinic-backups"
pg_dump --format=custom --file="$env:USERPROFILE\clinic-backups\cskclinic-$(Get-Date -Format yyyyMMdd-HHmmss).dump" "$env:DATABASE_URL"
```

Backups contain sensitive health information: encrypt them, restrict access, retain them according to clinic policy, and verify restore procedures regularly. Do not store production backups in this source workspace or commit them.

## Billing print templates

The supplied CSK Clinic logo is stored at `assets/csk-clinic-logo.png` and appears in the dashboard and navigation pages, as the browser favicon, and on printed invoices and receipts. The browser prototype provides three invoice layouts: professional invoice, detailed clinic bill, and compact 80 mm receipt. Each printed document includes the clinic logo, clinic details from Settings, patient contact/demographic details, invoice items and quantities, medicine batch/expiry where available, discount/tax entries, totals, payment status/history, reference numbers, balance due, amount in words, notes, and authorization/footer fields. Set clinic registration, contact and footer details in **Clinic settings** before printing.

The initial print settings use the supplied CSK CLINIC details: Muthu Gounder Street, Veethi, Thammampatti, Tamil Nadu 636113; 093638 79235; Dr. C. Selvakumar, MBBS, MD; general and diabetes treatment; daily hours 6:00 PM–8:00 PM. Verify these details and enter the clinic's medical registration number in **Clinic settings** before using printed documents.

Billing supports cash, UPI, card, bank transfer, insurance, and other payments. Partial payments create numbered receipts; use **Invoice** or **Receipt** in the billing table to reprint documents. Tax/GST is optional and must be entered according to the clinic's applicable rules; the prototype does not determine tax eligibility or rates.

Choosing **Invoice** or **Receipt** opens an on-screen print preview. Use **Print document** in the preview to open the browser's print dialog; select the clinic's regular printer for A4 invoice templates or an 80 mm thermal printer for receipts. This prototype still stores records in browser local storage and is not suitable for real patient or financial records until connected to secure backend storage.
