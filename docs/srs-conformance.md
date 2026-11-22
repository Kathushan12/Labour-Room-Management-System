# LRMS SRS conformance report

Checked against the SRS submitted on 12 Nov 2026 (condensed in `docs/requirements-checklist.md`).
Date: 22 Nov 2026. Branch: `feature/ui-shell`.

## How this was checked

- Every item was checked in code and, where an API behaviour exists, against the running API
  (`http://localhost:4000/api/v1`) with the demo accounts.
- The API test script is `docs/evidence/conformance.mjs` (helper `docs/evidence/api.mjs`). Run it with
  `node docs/evidence/conformance.mjs` while the API is running with fresh demo data. The last run is
  saved in `docs/evidence/conformance-run.txt`: **78 / 78 checks passed**.
- The run used a fresh database: schema dropped, 16 migrations applied, reference seed, admin bootstrap,
  demo seed. The demo seed was then run a second time to confirm it is idempotent.
- `pnpm run typecheck`, `pnpm run lint` (0 errors) and `pnpm run build` pass.

Status meanings:

- **PASS**: already met before this audit.
- **FIXED**: was not met and was changed in this audit.
- **PARTIAL**: met in part; the note says what is missing.
- **NOT IMPLEMENTED**: not built.
- **N/A-deployment**: depends on hosting, not on the code.

Score per group: PASS and FIXED count 1, PARTIAL counts 0.5, NOT IMPLEMENTED counts 0. N/A items are
left out.

## Summary

| Group | Items | PASS | FIXED | PARTIAL | Not impl. | Score |
| --- | --- | --- | --- | --- | --- | --- |
| UR-1 Accounts & access | 12 | 7 | 5 | 0 | 0 | 100 % |
| UR-2 Beds | 7 | 5 | 1 | 1 | 0 | 93 % |
| UR-3 Admission & triage | 12 | 4 | 8 | 0 | 0 | 100 % |
| UR-4 Care team | 4 | 2 | 2 | 0 | 0 | 100 % |
| UR-5 Observations | 8 | 2 | 5 | 1 | 0 | 94 % |
| UR-6 Escalation | 7 | 0 | 7 | 0 | 0 | 100 % |
| UR-7 Doctor alerts | 10 | 10 | 0 | 0 | 0 | 100 % |
| UR-8 Delivery & discharge | 4 | 0 | 4 | 0 | 0 | 100 % |
| UR-9 Reports & audit | 6 | 3 | 3 | 0 | 0 | 100 % |
| Non-functional (PER/SAF/SEC) | 16 | 8 | 5 | 3 | 0 | 91 % |
| UI (SRS 3.1) | 8 | 1 | 5 | 2 | 0 | 88 % |
| DB (SRS 6.1) | 3 | 1 | 1 | 1 | 0 | 83 % |
| Deployment / project | 5 | 0 | 0 | 2 | 0 | 50 % (3 N/A) |

The doctor alert path (UR-7), the session rules (REQ-1.4, 1.5, SEC-6) and sidebar filtering were
verified and committed earlier today. They were re-checked quickly here, not rebuilt.

## UR-1 Accounts & access

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-1.1 | Login with unique staff username/number | PASS | `controllers/auth.controller.ts` (case-insensitive unique `username`) | Login uses the unique username. The staff number (`staffId`) is stored on the profile but is not a login key. |
| REQ-1.2 | bcrypt/Argon2id hashes only | PASS | `common/crypto/password.service.ts` (Argon2id, 32 MiB, t=3) | |
| REQ-1.3 | Min 15 chars incl. temporary passwords | FIXED | `PASSWORD_MIN_LENGTH = 15` in `packages/shared/src/constants`; `password.service.ts`, `auth.controller.ts`, `ChangePasswordPage.tsx`. API: 14-char password gets 400, 17-char gets 200, temp password is 16 chars | Was 10, and temporary passwords were 14 chars. |
| REQ-1.4 | Lock 15 min after 5 failures | PASS | commit c77ba18, `services/account-lockout.service.ts` | Re-checked only. |
| REQ-1.5 | 12 h session / 60 min idle | PASS | commit c77ba18/ca20e14, `services/session.service.ts` | Re-checked only. |
| REQ-1.6 | Admin create/edit/deactivate/reactivate; temp password shown once | PASS | API: POST /users returns the temp password once; GET /users/:id has no password; PATCH status false/true gives 200 | |
| REQ-1.7 | Update clinical records only for assigned patients | FIXED | `patient-authorization.service.ts`; added the check to `bed-allocation.service.ts` and `patient-assignment.service.ts`. API: unassigned nurse gets 403 on observation and on adding herself to the care team | Bed allocate/transfer/release and care-team changes had no patient check before. |
| REQ-1.8 | Doctor emergency access with reason, audited | FIXED | `emergency-override.service.ts`; nurse `OVERRIDES_EMERGENCY` removed. API: unassigned doctor 403, then override with reason 201, then GET 200; nurse 403; `EMERGENCY_OVERRIDE_GRANTED` in audit | Nurses could also break glass before. |
| REQ-1.9 | Deactivated account logged out on all devices ≤ 5 s | FIXED | API side existed (`user.service.ts` revokes sessions + `disconnectUserSessions`). Web: `services/realtime.ts` now re-checks the session on a server kick and signs out every tab. API test: socket closed after 44 ms, /auth/me 401 | Before, the web only showed "disconnected" until its next request. |
| REQ-1.10 | Admin cannot view PII or change clinical records | FIXED | Admin lost `BEDS_ALLOCATE/TRANSFER/RELEASE`. API: admin 403 on admission detail, PII, observation, triage | Admin keeps care-team rostering (`ASSIGNMENTS_*`), which is staff management, not a clinical record. |
| REQ-1.11 | No self-registration | PASS | API: POST /auth/register gives 404 | |
| SEC-6 | 15-min access token, refresh in HTTP-only cookie | PASS | `jwt.service.ts`, `auth.controller.ts` cookie options | Re-checked only. |

## UR-2 Beds

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-2.1 | Admin adds bed with unique code | PASS | `bed.service.ts createBed`, unique (ward, bed_number). API: duplicate BED-01 gives 409 | New beds are capped at the ward's physical bed count. |
| REQ-2.2 | Status AVAILABLE / OCCUPIED / CLEANING / OUT_OF_SERVICE only | PARTIAL | API and board expose `displayStatus` with exactly these four values (`BedDisplayStatus`) | Stored as three columns (functioning, occupancy, cleaning) and derived, not as one column. |
| REQ-2.3 | Admin sets/restores OUT_OF_SERVICE | PASS | API: admin 200/200, nurse 403 | |
| REQ-2.4 | Occupied bed cannot go OUT_OF_SERVICE or be removed | PASS | API: 409 `BED_OCCUPIED_CONFLICT`; DB check `chk_bed_functioning_not_occupied`; no delete route (404) | There is no remove-bed function at all; OUT_OF_SERVICE is used instead. |
| REQ-2.5 | Nurse CLEANING → AVAILABLE | PASS | API: cleaning start then complete gives AVAILABLE | |
| REQ-2.6 | Board shows total / functioning / occupied / available | PASS | API: total 7, functioning 5, occupied 3, available 2 | Fixed a 500 on `/analytics/overview` and the daily/monthly reports. The cause was a stale `'MAINTENANCE'` literal that the new PG enum type rejects. |
| REQ-2.7 | Bed changes reach open boards ≤ 2 s | FIXED | New `bed:updated` event (`realtime.server.ts emitBedUpdated`), emitted by bed, allocation, triage and discharge services; `useAlertStateRefresh` reloads on it. API test: event received at ward-room socket in < 1 s | No bed event existed before; boards refreshed only on alert changes. |

## UR-3 Admission & triage

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-3.1 | Ref ID LR-YYMM-NNNN | FIXED | `admission.service.ts generateAdmissionReferenceId`; migration converts old `ADM-YYYYMM-NNNN` refs and adds `chk_admission_reference_format`. API: `LR-2611-0004` | NNNN comes from a global sequence, so it does not restart each month. It is still unique. |
| REQ-3.2 | Required only pathway, gestation, risk flags, bed, attending doctor | FIXED | `admission.schemas.ts`, `RapidTriageDialog.tsx`. API: missing fields give 400 with fieldErrors gestationWeeks, bedId, attendingDoctorId | Triage previously took no gestation, bed or doctor. |
| REQ-3.3 | Pathways NORMAL_DELIVERY, PLANNED_CESAREAN, OBSERVATION_20PLUS | FIXED | `AdmissionCategory` renamed; data migrated. API: old `SCHEDULED_CESAREAN` gives 400 | |
| REQ-3.4 | Risk flags HYPERTENSION, GESTATIONAL_DIABETES, PRIOR_CESAREAN, OBSERVATION_20PLUS or NONE | FIXED | Keys renamed; non-SRS `OTHER` deactivated. API: none and no confirmation gives 400 `RISK_ASSESSMENT_REQUIRED`; `OTHER` gives 400 | "NONE" is the explicit `noListedRiskFlagsConfirmed` flag, not a fifth key. |
| REQ-3.5 | Name/NIC/phone optional, addable later | PASS | API: admitted with `hasPii=false`, then PATCH /patients/:id/pii gives 200 | |
| REQ-3.6 | AES-256-GCM, new IV per value, key from env | PASS | `common/crypto/encryption.service.ts`, `key-manager.ts`; separate nonce/auth-tag columns | |
| REQ-3.7 | HMAC-SHA256 NIC index | PASS | `common/crypto/blind-index.service.ts`, unique `nic_blind_index` | |
| REQ-3.8 | Gestation 20-44, reject outside | FIXED | zod 20-44 and DB `chk_admission_gestation_weeks`. API: 19 and 45 give 400 | Admissions created before this migration have no gestation (NULL). |
| REQ-3.9 | Risk flags on ward board | PASS | API board: `BED-01: Hypertension` | |
| REQ-3.10 | Admission + bed OCCUPIED in one locked transaction | FIXED | `performRapidTriage` locks the bed row (`pessimistic_write`), creates the admission, allocation and doctor assignment, and sets OCCUPIED in one transaction. API: 2 concurrent admits to one bed gave 201 and 409 | |
| REQ-3.11 | Bed taken → keep form data, show free beds | FIXED | 409 `BED_UNAVAILABLE` with `details.availableBeds`; dialog keeps all fields and refills the bed list | |
| REQ-3.12 | No PII on ward board or reports | FIXED | `bed.dto.ts`, `ward.service.ts` no longer decrypt names; board shows the ref ID. API: regex for demo names/NIC/phone over board and exports found nothing | Before, nurses and doctors saw patient full names on the board. |

## UR-4 Care team

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-4.1 | One attending doctor + ≥ 1 nurse (default admitting nurse) | FIXED | Triage assigns ATTENDING_DOCTOR and PRIMARY_NURSE. Removing the attending doctor or the last nurse gives 409 | |
| REQ-4.2 | Reassign doctor or nurse | PASS | API transfer gives 200 | Fixed a 500 on the second handover: active-assignment lookups did not filter `unassigned_at`. |
| REQ-4.3 | Only active staff of the correct role listed | FIXED | `ward-staff.service.ts` (activeOnly now excludes deactivated accounts); triage picker lists DOCTOR only; server rejects inactive or wrong-role doctors | |
| REQ-4.4 | Doctor "My patients" | PASS | API: doctor's admission list is scoped to assigned patients | |

## UR-5 Observations

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-5.1 | Systolic, diastolic, pulse, glucose, FHR, amniotic fluid (INTACT/CLEAR/MECONIUM/BLOOD) | FIXED | `observation.schemas.ts`, `AmnioticFluid` enum and PG type. API: `GREEN` gives 400; all fields give 201 | Glucose in mg/dL was wrongly capped at 50; it now has per-unit ranges. |
| REQ-5.2 | At least one value | PARTIAL | Maternal entry: empty gives 400 | Maternal and fetal values are entered on separate forms. A fetal entry always needs an FHR, so amniotic fluid cannot be recorded alone. |
| REQ-5.3 | Reject impossible values | FIXED | `OBSERVATION_LIMITS`. API: FHR 221 and 300 give 400; systolic 261 gives 400 | Limits were FHR 260 and systolic 300 before. |
| REQ-5.4 | Highlight FHR < 110 / ≥ 160, SBP ≥ 140, DBP ≥ 90, pulse < 60 / ≥ 120 | FIXED | `observation-highlights.ts`, `highlights` in DTO, badges in `ClinicalObservationPanel.tsx`. API: FHR 172 gives FHR_HIGH, FHR 104 gives FHR_LOW | |
| REQ-5.5 | Never auto-escalate/alert | PASS | API: abnormal values left escalation count unchanged | |
| REQ-5.6 | Immutable; corrections as linked entry | PASS | `supersedes_id`; new DB triggers block UPDATE/DELETE. API: amend gives a linked row | Fixed amend failing on rows with glucose/temperature (NUMERIC came back as string). |
| REQ-5.7 | Latest first | FIXED | Summary lists reversed. API: fetal rows newest first | |
| REQ-5.8 | "Observation due" if no FHR for 30 min in active labour | FIXED | `isFhrObservationDue` (NORMAL_DELIVERY or EMERGENCY_CESAREAN, ADMITTED); banner in panel. API returns `fhrObservationDue` | The test checked the flag after a fresh FHR (false). The 30-minute rule was checked in code only. |

## UR-6 Escalation

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-6.1 | Plan states OBSERVATION_20PLUS, NORMAL_DELIVERY, PLANNED_CESAREAN, EMERGENCY_CESAREAN, DELIVERED, DISCHARGED | FIXED | `CarePlanState` and `lrms_care_plan_state` PG type; `care-plan-state.service.ts` records every change | Before, nothing ever changed the plan after admission. |
| REQ-6.2 | One action + one confirmation by assigned nurse/doctor | FIXED | `EscalationCreateDialog.tsx`, `EmergencyAlertsPage.tsx`: choose reason, Escalate, then Confirm (shows ref ID + bed) | |
| REQ-6.3 | Reasons FETAL_DISTRESS, FAILURE_TO_PROGRESS, MATERNAL_COMPLICATION, OTHER | FIXED | `EscalationReason`, `reason_code` PG enum. API: unknown reason gives 400 | |
| REQ-6.4 | Plan + reason + user + time + alert in one transaction | FIXED | `createEscalation` locks the admission and writes the transition, escalation (dispatched_at) and outbox in one transaction. API: plan EMERGENCY_CESAREAN, reason FETAL_DISTRESS, recipient = attending doctor | |
| REQ-6.5 | No re-escalation; show current alert status | FIXED | 409 `ALREADY_ESCALATED` with `alertState`; dialog shows it (or TIMED OUT, phone the doctor) | |
| REQ-6.6 | Only doctor reverses, with reason | FIXED | POST `/admissions/:id/escalations/:eid/reverse`. API: nurse 403, no reason 400, doctor 200 returns plan to NORMAL_DELIVERY | |
| UR-6 extra | assign/transition/resolve/get check the escalation belongs to the URL admission | FIXED | Service queries use `{ id, admissionId }`. API: other admission gives 404 | |

## UR-7 Doctor alerts (re-checked)

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-7.1 | Saved DISPATCHED with time before sending | PASS | `dispatched_at` default inside the transaction; API alertState DISPATCHED | |
| REQ-7.2 | Only attending doctor, private room | PASS | `resolveRecipient`, `user:<id>` room. API: recipient = attending | |
| REQ-7.3 | Receipt → DELIVERED with time | PASS | `alert-socket.handlers.ts markDelivered` | Earlier commit 9ffb7f7. |
| REQ-7.4 | Full-screen alert with ref ID, bed, risk flags, reason | PASS | `DoctorAlertOverlay.tsx` | |
| REQ-7.5 | One-tap Acknowledge with time | PASS | API: attending doctor acknowledge gives ACKNOWLEDGED | |
| REQ-7.6 | Resend every 15 s and on reconnect | PASS | `escalation-alert.service.ts` monitor, `resendForDoctor` on connect | |
| REQ-7.7 | Timeout → "TIMED-OUT – call doctor" + phone | PASS | `BedAlertStatus.tsx`, `timed_out_at`, `recipientContactNumber` | |
| REQ-7.8 | Admin timeout 30-600 s | PASS | `chk_wards_alert_timeout_seconds`, `AlertTimeoutCard.tsx` | |
| REQ-7.9 | Status to nurse + board ≤ 2 s | PASS | `alert:state` to admission and ward rooms | |
| REQ-7.10 | Alert records not editable or deletable | PASS | No PATCH/PUT/DELETE routes (404); times trigger (Phase 14); new no-delete triggers on escalations, alerts and recipients | |

## UR-8 Delivery, discharge, turnover

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-8.1 | Mode NORMAL/ASSISTED/CESAREAN + time → DELIVERED | FIXED | `DeliveryMode` reduced to the 3 SRS values (old values migrated); `createDelivery` sets DELIVERED. API: old mode 400, new 201 then DELIVERED | The finer detail (vacuum, forceps, elective vs emergency) is no longer stored. |
| REQ-8.2 | Destinations POSTNATAL, ANTENATAL, THEATRE, ICU, OTHER | FIXED | zod enum, DB check `chk_maternal_discharge_destination`, select in `MaternalDischargeModal.tsx`. API: `HOME` gives 400 | It was free text before. |
| REQ-8.3 | Discharge closes admission, bed → CLEANING | FIXED | Nurse (assigned) can discharge; bed is always released; plan DISCHARGED; `bed:updated` emitted. API: status DISCHARGED, plan DISCHARGED, bed CLEANING | It was doctor-only before, and the bed release could be skipped. |
| REQ-8.4 | Closed admissions read-only except doctor corrections | FIXED | `assertAdmissionAccessible` blocks anything not ADMITTED; amend allowed for DOCTOR. API: nurse observation 409, doctor amend 200 | |

## UR-9 Reports & audit

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| REQ-9.1 | Daily/monthly admissions by pathway | PASS | `/analytics/admissions` (`admissionsByCategory`, `dailyTrends`) | |
| REQ-9.2 | Occupancy, ALOS, avg cleaning time | PASS | `/analytics/beds`, `/analytics/alos` | |
| REQ-9.3 | Alert counts, avg to delivered/ack, timed-out, per-alert times | FIXED | `alertReceipts` in `/analytics/clinical-alerts` from escalation receipts; per-alert table (ref, bed, times, seconds, timed out) on `ClinicalAlertAnalyticsPage.tsx`; rows in the CSV/PDF export | Before, it read the legacy `alert_recipients` table, so it showed 0 acknowledged. The 3-minute SLA wording was replaced with the ward timeout. |
| REQ-9.4 | No names/NIC/phone in reports | PASS | Regex over CSV/PDF/ALOS output found nothing | |
| REQ-9.5 | CSV and PDF export | FIXED | All 13 report types × CSV/PRINT_PDF give 200 (print-to-PDF HTML); doctor 403 | Doctor lost `ANALYTICS_EXPORT`. Daily/monthly reports returned 500 (see REQ-2.6). |
| REQ-9.6 | Immutable audit log; admin-only | FIXED | New GET `/audit-logs` (admin + `REPORTS_VIEW_AUDIT_LOGS`), `AuditLogsPage.tsx` on real data, `/audit` admin-only, triggers block UPDATE/DELETE. API: doctor/nurse 403; log contains login, deactivation, emergency access, plan change, alert ack, discharge | The page showed hard-coded preview data before, and doctors had access. |

## Non-functional

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| PER-1 | Alerts delivered ≤ 2 s | PASS | Socket push after commit (`dispatchNow`) | Not re-timed in this pass. |
| PER-3 | Boards updated ≤ 2 s | FIXED | `bed:updated` < 1 s in test | |
| PER-6 | Reconnect + missed alerts ≤ 5 s | PASS | Resend on connect, reload on reconnect | |
| PER-7 | No double booking | PASS | Bed row lock + unique partial index `idx_one_active_allocation_per_bed`; concurrency test | |
| SAF-1 | No automatic clinical action | PASS | See REQ-5.5 | |
| SAF-2 | Timeout asks to phone doctor | PASS | `BedAlertStatus.tsx` | |
| SAF-3 | Offline banner disables clinical input | FIXED | `AppLayout.tsx` banner + `<fieldset disabled>`; `apiFetch` refuses non-GET when offline | Offline = browser offline or API health unreachable. There is no offline data cache. |
| SAF-4 | Confirmations show patient/account name | PARTIAL | Deactivation shows account name + username. Escalation and discharge confirm with Admission Ref ID + bed | The patient name is optional, so confirmations use the ref ID instead of a name. |
| SAF-5 | Ref ID + bed on every clinical screen | PARTIAL | Admission detail, doctor alert overlay, escalation dialogs, board | The maternal/fetal observation pages pick a patient by ref ID but do not show the bed. |
| SAF-6 | Symbol + text, never colour only | FIXED | Observation highlight badges (icon + text), Live/Reconnecting/Offline icons + text, timed-out marker | |
| SEC-3 | Keys only in env | PASS | `config/env.ts`, `key-manager.ts` | |
| SEC-4 | Server-side role + patient checks on every route and socket event | FIXED | See REQ-1.7, UR-6 extra; admission-room join fixed to ignore ended assignments | |
| SEC-5 | Server validation, parameterised queries | PASS | zod on all inputs; TypeORM/`$n` params. API: bad UUID gives 400 | |
| SEC-7 | No passwords/tokens/PII in logs | PASS | pino redaction list in `logger.ts` | |
| SEC-8 | No stack traces to users | FIXED | `error-handler.ts`: 5xx returns a generic message; DB error codes and text are no longer sent; zod gives field errors | Before, 500s outside production returned the raw error message and pg error code. |
| SEC-9 | pnpm audit high/critical | PARTIAL | See below | Not upgraded (majors). |
| SEC-6 | Token lifetime | PASS | Listed under UR-1 | Counted once, in UR-1. |

`pnpm audit` (22 Nov 2026): 20 findings (1 low, 14 moderate, 2 high, 3 critical). High/critical:

| Severity | Package | Fixed in | Path | Risk here |
| --- | --- | --- | --- | --- |
| critical | vitest < 3.2.6 (UI server file read) | 3.2.6 | dev: `apps/web > vitest` | Dev/test only; the Vitest UI server is not used. |
| critical | tinypool ≤ 2.1.0 (prototype pollution) | 2.1.1 | dev: `vitest > tinypool` | Dev/test only. |
| critical | tinypool < 2.1.2 (prototype pollution → RCE) | 2.1.2 | dev: `vitest > tinypool` | Dev/test only. |
| high | vite ≤ 6.4.3 (launch-editor on Windows) | 6.4.4 | dev: `apps/web > vite` | Dev server only; not in the production bundle. |
| high | zod < 4.6.6 (memory on oversized collections) | 4.6.6 | runtime: `apps/api`, `packages/shared` | Fix needs zod 4 (major). Bodies are capped at 1 MB by `express.json`. |

## UI (SRS 3.1)

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| UI-1 | Top bar: user, role, Live/Reconnecting/Offline, help, logout | FIXED | `AppHeader.tsx`, `NetworkStatusIndicator.tsx` (state from socket + health) | Before, it showed browser Online/Offline only, and user/role only at ≥ 1280 px. Role now shows on every size; the name from 640 px up. |
| UI-2 | Help icon per screen | FIXED | `components/layout/HelpButton.tsx` (help text per route) | |
| UI-3 | Field errors inline without clearing data | PARTIAL | Triage dialog: inline errors under gestation/bed/doctor, data kept | Most other forms show one error box above the form. Data is kept. |
| UI-4 | Times Asia/Colombo, 24-hour | FIXED | `lib/datetime.ts`; ~60 `toLocaleString()` calls replaced; report export uses Colombo `h23` | |
| UI-5 | Privacy notice link on login (SRS 6.2) | FIXED | `PrivacyNoticePage.tsx`, `/privacy`, link on `LoginPage.tsx` | |
| UI-6 | Confirm dialogs for escalation, discharge, revocation | FIXED | Escalation and discharge now two-step; deactivation dialog existed | |
| UI-7 | Status = colour + text | PASS | Bed board pills, alert stepper | |
| UI-8 | WCAG 2.2 AA contrast, ≥ 44 px touch targets, mobile single column | PARTIAL | New controls use `min-h-[44px]` | No contrast or touch-target audit across all screens in this pass. |

## DB (SRS 6.1)

| ID | Requirement | Status | Evidence | Note |
| --- | --- | --- | --- | --- |
| DB-1 | Enums as PostgreSQL enum types | PARTIAL | Phase 16 adds `lrms_care_pathway`, `lrms_care_plan_state`, `lrms_admission_status`, `lrms_bed_functioning_status`, `lrms_bed_occupancy_status`, `lrms_escalation_reason`, `lrms_delivery_mode`, `lrms_amniotic_fluid` | Other status columns (escalation status, shifts, notifications, etc.) still use VARCHAR + CHECK. |
| DB-2 | Clinical/alert/audit records not deletable by users | FIXED | `fn_lrms_block_change` triggers: no UPDATE/DELETE on audit_logs, observations (4 tables), care_plan_transitions; no DELETE on admissions, escalations, alerts, recipients, deliveries, discharge authorisations | |
| DB-3 | Changes only via migrations | PASS | `synchronize: false`; `Phase16SrsConformance1732800000000` | |

## Deployment / project

| ID | Requirement | Status | Note |
| --- | --- | --- | --- |
| DEP-1 | Hospital hosting | N/A-deployment | Runs locally with Docker Postgres. |
| DEP-2 | Backups | N/A-deployment | No backup job in the repo. |
| DEP-3 | 99.5 % availability | N/A-deployment | Cannot be shown from code. |
| DEP-4 | 70 % service-layer test coverage | PARTIAL | Vitest is set up, but test folders are gitignored and coverage was not measured. The conformance script above is an API-level check, not unit coverage. |
| DEP-5 | README (install, env, deploy) + Postman collection | PARTIAL | README exists with setup steps. No Postman collection was found. |

## Known follow-ups

1. SAF-5: show the bed next to the ref ID on the maternal/fetal observation pages.
2. REQ-5.2: allow amniotic fluid to be recorded without an FHR, or document the split forms as a design decision.
3. DB-1: convert the remaining status columns to PostgreSQL enum types.
4. UI-3 / UI-8: inline field errors on the remaining forms, plus a contrast and touch-target pass.
5. SEC-9: plan the zod 4 and vitest 3 upgrades.

## Reset and re-seed the dev database

Run from the repo root in PowerShell. This drops all dev data.

```powershell
docker exec lrms-postgres-dev psql -U postgres -d lrms_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm --filter @lrms/shared build
pnpm --filter @lrms/api db:migrate
pnpm --filter @lrms/api db:seed
"LabourRoom@Admin2026" | pnpm --filter @lrms/api auth:bootstrap-admin --username admin_csth --name "Ward Administrator" --staff-id ADM001 --password-stdin
pnpm --filter @lrms/api db:seed:demo
```

Demo logins after seeding: `admin_csth / LabourRoom@Admin2026`, `dr.perera / Perera@Doctor2026`,
`nurse.fernando / Fernando@Nurse2026` (others are printed by the demo seed).
