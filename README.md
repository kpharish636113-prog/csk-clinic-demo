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

Then open `http://localhost:8000` in the browser. Use `http://localhost:8000/front-office.html` for the Front Office or `http://localhost:8000/doctor-workspace.html` for the dedicated Doctor Workspace. The general `index.html` dashboard remains available. The Vite build also exposes these short paths and opens the corresponding page under `/prototype/`. The static server allows the billing/receipt print preview to be used without a backend connection.

Older `patient_management.html`, `appointment_management.html`, and `file_admin.html` URLs redirect to the supported clinic workspaces so records and actions use the same application data.

The dashboard notification bell reports medicine and clinical-supply stock/expiry alerts, upcoming appointments within 24 hours, and prescription follow-ups due within seven days. Appointment and follow-up reminders are internal staff prompts only; the app does not contact patients by SMS or email. Reports support on-demand printing and CSV export.

Doctor prescription medicines and injections sync to the nurse workspace. Nurses record administered, partially administered, held, missed, or refused outcomes; actual administrations deduct linked stock once, with idempotent API writes and reason capture for held or missed doses. Prescription quantities are shared across administration, dispensing, and billing, so the same units cannot be fulfilled or charged twice. The prescription Bill action opens pharmacy checkout, and clinic-administered items can be invoiced from the visit after staff review. Custom medicines need a matching active clinic service price before billing.

The Doctor Workspace prescription editor suggests active clinic medicines while typing and supports keyboard selection, individual morning/afternoon/night dose slots, optional evening slots, fractional doses (¼, ½, ¾, 1½, and 2), custom frequencies, durations, routes, food timing, and start dates. Recognized schedules calculate quantity from the daily dose total multiplied by duration, rounding up to whole units; doctors can edit the calculated quantity. Doctors can save without printing, cancel with confirmation when there are unsaved changes, view or print a saved prescription, and edit it as a new revision while preserving the previous version. Prescription previews and print/PDF output use the supplied CSK Clinic sheet as an unchanged A4 image, overlaying available patient, vital, history, investigation, referral, medicine, injection, and instruction data only in the blank areas. Missing values remain blank, and long prescriptions continue on pages with the same template. Standard labels and directions can use English, Tamil, or both; doctor-entered clinical text is kept as entered and is not automatically translated. Save as PDF opens the browser print dialog.

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

### Front office and doctor workstations

The Front Office and Doctor Workspace have separate pages and navigation. The clinic/workspace selector at the top of the sidebar stays available on both pages for quick switching, while opening the other workspace loads its own dedicated page. The selector also links to a read-only Medicines list for doctors and the Pharmacy workspace in Front Office. Pharmacy's dashboard and sales views use clinic invoice and medicine inventory data. Staff can record externally received pharmacy orders, track fulfillment, maintain suppliers and create purchase orders with partial or full goods receipts. Order tracking does not collect payment or deduct stock; invoices remain the billing and stock-decrement source. Procurement receipts update stock, but supplier payments and accounts-payable balances are not tracked. Both pages use the same clinic database when connected to the API. For two computers on a private clinic network, run the web app and API on a trusted clinic server, then open:

- Front Office: `http://<server-ip>:8000/front-office.html`
- Doctor Workspace: `http://<server-ip>:8000/doctor-workspace.html`

The API URL follows the web server's hostname on the local development ports. In the server's `.env`, set `CORS_ORIGINS` to the exact web origin used by both workstations, for example `http://192.168.1.20:8000`, and restart the API. Allow the web and API ports through the clinic server's private-network firewall only. Connect each workstation separately: use **Clinic settings → Connect to API** in Front Office, or **Connect to clinic API** in Doctor Workspace, and sign in with an authorized account. Connected workstations then use the same clinic API; browser-only demo mode stores data separately on each computer and does not synchronize. The Doctor Workspace page hides other modules and displays an access-denied message for connected accounts without doctor-workspace permission. Do not expose the API or real patient data to an untrusted public network.

## Public, shared demo deployment

This project can be deployed as one same-origin Vercel project: Vercel serves the React/Vite shell and routes `/api/*` to the NestJS function. Use Supabase Postgres for persistent demo data. The shared demo is for synthetic data only; do not enter real or identifiable health or payment information.

Vercel Hobby is limited by Vercel's terms to personal or non-commercial use. Use it only for a personal, non-commercial demo. A clinic's business use requires an eligible paid plan. Supabase and Vercel free tiers are not production-ready or suitable for regulated clinic records.

### Deploy from GitHub

1. Push this project to the GitHub repository connected to your Vercel account. In Vercel, select **Add New → Project**, import the repository, and keep the **Root Directory** at the repository root. `vercel.json` contains the build and output settings.
2. Create a Supabase project.
   - Open **Connect** in the Supabase project and copy the **Transaction pooler** URI (port `6543`) for the serverless runtime. Replace the database password placeholder and ensure `pgbouncer=true` is present in its query string (use `&pgbouncer=true` if a query string already exists).
   - Copy the **Direct** or **Session pooler** URI (port `5432`) for migrations and local administration.
   - For a shared demo, create the Prisma role only if you want to avoid using the `postgres` role. The role setup script is in the official Supabase Prisma guide; otherwise use the Supabase database password with the standard `postgres` role as documented by Supabase.
   - In Vercel **Project Settings → Environment Variables**, add:
   - `DATABASE_URL`: Supabase transaction-pooler URI, including `pgbouncer=true`. Keep it private.
   - `DIRECT_URL`: Supabase direct or session-pooler URI for migrations. Keep it private.
   - `JWT_SECRET`: a randomly generated secret with at least 32 characters.
   - `ADMIN_EMAIL`: the sign-in email for the demo owner.
   - `ADMIN_PASSWORD`: a unique password of at least 12 characters.
   - `CLINIC_NAME`: `CSK Clinic Demo` (or your chosen demo name).
   - To enable doctor queue Realtime, also set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_JWT_SECRET` from the same Supabase project. Keep the signing secret private and never use the service-role key in the browser. The queue migration adds the doctor-scoped RLS policy and Realtime publication entry when those Supabase features exist; without these values, the doctor workspace keeps its automatic API refresh fallback.
3. Deploy the project. The Vercel build generates Prisma Client and builds both the API and frontend; it does not connect to or migrate the database.
4. Before using the API, apply migrations and create the owner once. On a trusted computer, set `DATABASE_URL` to the Supabase **transaction-pooler** URI and `DIRECT_URL` to the Supabase **direct or session-pooler** URI in the ignored local `.env` file. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLINIC_NAME`, and `JWT_SECRET` to the same values configured in Vercel. Then run:

   ```powershell
   npm run db:deploy
   npm run db:seed
   ```

   The standard seed creates or updates the clinic owner account. To add three idempotent, clearly synthetic patient records to a shared demo database, run `npm run db:seed:demo` after migrations and the standard seed. This does not add inventory, appointments, or the browser's other sample records. `.vercelignore` excludes local environment files from deployment uploads; keep `.env` out of Git and do not paste database URLs or passwords into chat.
5. Confirm the deployment at `/api/health`, then open **Clinic settings → Connect to API** and sign in using `ADMIN_EMAIL` and `ADMIN_PASSWORD`. API-connected visitors share one editable database, so their changes are visible to one another.

The doctor dashboard is calculated from queue records and consultation timestamps. Realtime queue events are scoped to the authenticated doctor's clinic and doctor ID; management workload totals are returned only to clinic managers.

The browser-only demo records remain local to each browser until **Connect to API** is used. Vercel deployments require the GitHub changes to be committed and pushed; no public URL exists until Vercel completes the deployment.

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
- `GET /api/patients/prescriptions` — clinic owner/admin, doctor, or nurse; returns clinic-scoped prescriptions and patient details, limiting doctors to their assigned visits and auditing the read.
- `POST /api/patients/:id/records` and `PATCH /api/patients/:id/records/:encounterId` — clinic owner/admin or doctor; create a manual OPD/IPD encounter or update an open encounter. IPD stays open until discharged.
- `GET /api/patients/:id/intakes` — clinic owner/admin, doctor, or nurse; returns archived intake records and their historical visit/author details as read-only history.
- `GET /api/patients/:id/external-records`, `POST /api/patients/:id/external-records`, and `PATCH /api/patients/:id/external-records/:recordId` — clinic owner/admin, doctor, or nurse; list, add, and edit patient-level history from outside providers. These records are separate from CSK Clinic encounters and support structured clinical details plus one optional report attachment.
- `GET /api/appointments/slots?doctorId=<uuid>&from=<ISO date>&to=<ISO date>` — list available clinic slots over a maximum 31-day range.
- `GET /api/appointments/doctors` — list active doctors in the authenticated clinic for appointment booking.
- `POST /api/appointments/slots` — create a future availability slot for an active clinic doctor; a doctor may only create their own slots.
- `GET /api/appointments` — clinic-scoped, paginated staff appointment list; doctors only see their own appointments.
- `POST /api/appointments` — book an active clinic patient into an available slot. Slot reservation is atomic to prevent double booking.
- `PATCH /api/appointments/:id/status` — apply a permitted appointment status transition; cancelling a future booking releases its slot.
- `GET /api/appointments/queue` — list the authenticated clinic's daily check-in queue; doctors only see their own queue.
- `POST /api/appointments/check-ins` — check in a booked appointment or walk-in. The queue token, open visit, and optional vitals are created together; a booked appointment is linked and checked in atomically.
- `PATCH /api/appointments/queue/:id/status` — call, return, start, complete, or cancel a queue entry according to the caller's role. Linked appointment and visit statuses stay in sync; cancelling a future linked booking releases its slot.
- `GET /api/nursing/queue/:queueTokenId/intake` and `PATCH /api/nursing/queue/:queueTokenId/intake` — nurses and authorized clinic staff load, save, resume, or submit queue-linked intake.
- `POST /api/nursing/queue/:queueTokenId/intake/acknowledge` — the assigned doctor marks a submitted intake as reviewed.
- `GET /api/medicines` — authenticated clinic staff inventory list; supports `search`, `active`, `page`, and `limit`; each result includes a low-stock flag.
- `POST /api/medicines` — clinic owner/admin/pharmacist creates a medicine batch, including product metadata, expiry and optional opening stock.
- `PATCH /api/medicines/:id` — clinic owner/admin/pharmacist updates medicine and batch metadata or archives it by setting `active` to false.
- `POST /api/medicines/:id/stock` — clinic owner/admin/pharmacist records `RECEIVE`, `DISPENSE`, or manager-only `SET` stock operations with an audit history; dispensing cannot create negative stock or dispense an expired batch.
- `GET /api/medicines/:id/stock-movements` — paginated, clinic-scoped stock movement history.
- `GET /api/procurement/suppliers`, `POST /api/procurement/suppliers`, and `PATCH /api/procurement/suppliers/:id` — clinic-scoped supplier directory and activation.
- `GET /api/procurement/purchase-orders`, `POST /api/procurement/purchase-orders`, `POST /api/procurement/purchase-orders/:id/receive`, and `POST /api/procurement/purchase-orders/:id/cancel` — create orders for active medicines, record idempotent partial/full goods receipts that update inventory, or cancel an unreceived order.
- `GET /api/pharmacy/orders`, `POST /api/pharmacy/orders`, and `PATCH /api/pharmacy/orders/:id/status` — staff-entered channel orders with patient and medicine lines, and guarded `RECEIVED → CONFIRMED → READY → COMPLETED` fulfillment transitions. Orders do not reserve stock or record payment; clinic billing handles invoicing and inventory deduction.
- `GET /api/consumables?search=<text>&categoryId=<uuid>&active=true&page=1&limit=20` — clinic-scoped non-medicine inventory with low-stock flags.
- `GET /api/consumables/categories` — active clinic supply categories.
- `POST /api/consumables` and `PATCH /api/consumables/:id` — owner/admin/pharmacist create or update supply details; a first stock quantity creates an audited opening receipt.
- `POST /api/consumables/:id/stock` — owner/admin/pharmacist or nurse records receipts, usage, damage, expiry, or an admin-only stock adjustment. Stock cannot become negative; each movement and audit record is atomic.
- `GET /api/consumables/:id/stock-movements` — paginated, clinic-scoped consumables stock history.
- `GET /api/billing/invoices` — clinic-scoped, paginated invoices with patient, item and payment details; supports `search`, `patientId`, `encounterId`, `from`, and `to`.
- `GET /api/billing/invoices/:id` — retrieve a clinic-scoped invoice with itemized charges and payment/receipt history.
- `POST /api/billing/invoices` — create an invoice for an active patient in the same clinic, optionally linked by `encounterId`, with service items, optional medicine items, discount, tax rate, print template and optional initial payment. A medicine item may include a `prescriptionItemId` from that patient's encounter; the API validates the prescription, records the billed quantity, decrements inventory, and writes the stock movement in the same transaction.
- `POST /api/billing/invoices/:id/payments` — record a partial or final payment and receive a unique receipt number; payment cannot exceed the remaining invoice balance.
- `POST /api/nursing/encounters/:encounterId/sync` — synchronize the latest finalized prescription into nursing orders and create completed-investigation nursing records.
- `GET /api/nursing/encounters/:encounterId` — retrieve medication and treatment orders for a patient visit.
- `POST /api/nursing/orders/:orderId/administrations` — explicitly record administered, partial, missed, refused or cancelled medication; medication status and quantity require idempotency and stock is deducted only for administered quantities.
- `POST /api/billing/visits/:encounterId/preview` — preview one non-duplicated visit invoice from actual nursing administrations and completed billable lab/procedure orders.
- `POST /api/billing/visits/:encounterId/generate` — generate the visit invoice once and mark the included nursing and order items billed.
- `POST /api/billing/invoices/:id/refunds` — manager-only authorized refund records for paid invoices.
- `POST /api/billing/invoices/:id/void` — clinic owner/admin voids an unpaid invoice with a required reason. The invoice and audit history are retained; invoices with payments cannot be voided. This action does not reverse inventory movements, and paid refunds are not supported.

Prescription entries are structured by medicine, dose, frequency, duration, quantity, and instructions. Writing a prescription does not reserve or reduce stock. Selecting **Invoice remaining** on the encounter prepares the available unbilled quantity for the invoice; completing that invoice is the single dispense/stock-decrement event. The invoice stores the directions as a snapshot for printing, and the prescription tracks billed versus remaining units so the same units cannot be billed twice. Do not separately dispense those units through the manual stock-adjustment control.

Invoice creation and payment entry require an authenticated owner, clinic admin, receptionist or accountant. Invoice voiding requires a clinic owner/admin; invoice charges, void metadata, prescription fulfillment, payment entries, and stock movement entries are retained as records rather than hard-deleted. Apply the checked-in migrations before using these endpoints.

Appointment workflow: `BOOKED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED`. Booking reserves a future doctor slot; checking in that appointment creates exactly one queue token and one open visit. Walk-ins enter the same queue and visit workflow without an appointment. Nurses can save and resume intake drafts, submit the intake to the doctor, and doctors can acknowledge the handoff. Queue and appointment status changes are synchronized, and cancelling a future linked appointment releases its slot. Booked appointments can also become `CANCELLED` or `NO_SHOW`. Create future doctor availability through `POST /api/appointments/slots` before booking.

Patient records are deliberately not hard-deleted. All patient routes require a bearer token; patient access to staff endpoints is not granted. Configure `CORS_ORIGINS` to the exact web origins in use.

For a deployed environment, apply the checked-in migrations with `npm run db:deploy`; do not run development migration generation against production.

The browser dashboard can connect from **Clinic settings → Connect to API**. In connected mode, patient create/edit, check-in and queue status changes, queue-linked intake and doctor acknowledgement, manual OPD/IPD encounter entry, doctor consultations and prescriptions, archived intake history, outside-provider history, medicine and consumables create/edit/stock history, supplier and purchase-order management, pharmacy order fulfillment, appointment booking/cancellation, invoices, payment receipts, and clinic print settings use the authenticated API. Clinic settings are saved locally only in disconnected demo mode; connected settings are persisted by the API and shared across workstations. Patient history fetched from the API is kept in memory rather than copied to the browser's persisted demo records. Use a valid local seeded account; keep the API disconnected for the sample-data demo.

Local demo mode provides synthetic patients, appointments, visit history, archived intake history, invoices, medicines, and clinical supplies. A versioned seed adds the new sample records to older browser demo data without duplicating matching demo IDs. All added names, contact details, and records are fictional and for testing only.

The patient directory supports search by name, Patient ID, or formatted/unformatted mobile number. Separate **Clinic visit records** and **Previous / outside history** columns each show only a button that opens the corresponding record history. Registration is organized into personal, contact, and health-background steps, with calculated age, duplicate-match warnings and explicit confirmation, emergency contact, occupation, marital status, preferred language, insurance context, allergy details, medical and surgical history, family history, current medications, and resumable drafts. **Save & Continue** opens the patient's profile; profile tabs summarize the patient, chronological clinical visits, appointments, and invoices/payments. The profile overview includes a recent-visit summary with known case, latest diagnosis, investigation plan, follow-up, latest vitals, care-gap flags, demographics, and coverage context. Registration drafts and new patient context fields require the checked-in migrations to be applied before connected use.

In the patient profile, **Visits** contains dated CSK Clinic encounters, while **Outside records** contains previous-provider history. The directory's **Outside history** button opens that separate profile tab; outside-provider records are not shown in the **View visits** history. Outside entries support record type/date, provider/facility, diagnosis, treatment, medicines, investigations, notes, an optional file, and editing. These records never count as clinic encounters. Authorized staff can add OPD or IPD visits from patient history; IPD visits remain open until discharged. Queue-linked nursing intake supports draft/resume and doctor handoff. Visit history can be searched and filtered by visit date; the visible filtered visits can be printed or exported to CSV. The CSV includes visit and report metadata, not report-file contents.

The left-side **Prescriptions** workspace lists saved prescriptions with patient/doctor/date filters, details, revision editing, print/PDF export, and CSV export. **Bill** opens the pharmacy POS with inventory-matched prescribed items preloaded; collection uses the existing clinic invoice flow, so stock changes and payments remain recorded against the patient encounter.

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
