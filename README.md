# Labour Room Management System (LRMS)

**Course:** CO2307 - Software Engineering  
**Group:** Group 07  
**University:** Department of Computer Engineering, Faculty of Engineering, University of Sri Jayewardenepura
**Academic Year:** 2026  
**Clinical Grounding:** Maternity Ward, Colombo South Teaching Hospital (Kalubowila)  
**Standard References:** SLCOG (2026), WHO (2015)

---

> **Disclaimer:** This is an academic project developed for CO2307 Software Engineering. Its workflow is modelled on the maternity ward at Colombo South Teaching Hospital (Kalubowila) for learning purposes only. It is not an official hospital system and is not affiliated with or endorsed by the hospital or the Ministry of Health. All patient and staff data in this repository is fictional.

## 1. Project Introduction

The Labour Room Management System (LRMS) is a centralized, secure, low-latency clinical progression and real-time emergency notification platform designed specifically for hospital labour rooms. Modeled directly on the maternity unit workflow at Colombo South Teaching Hospital (Kalubowila), LRMS replaces error-prone paper Bed Head Tickets (BHTs) and untracked manual telephone calls with a verifiable, auditable digital workflow.

---

## 2. Project Objectives

- **Accountable Emergency Communication:** 3-state proof-of-receipt handshake (`DISPATCHED` → `DELIVERED` → `ACKNOWLEDGED`) with durable persistence and visual timeout warnings.
- **Fast Bedside Triage:** Rapid admission with auto-generated reference IDs (`ADM-YYYYMM-XXXX`), clinical risk toggles, and optional AES-256-GCM encrypted PII.
- **Dynamic Bed Management:** Dynamic inventory configuration with PostgreSQL ACID row locks preventing bed double-booking under clinical pressure.
- **Sequential Clinical Observations:** Immutable time-series logging for maternal blood pressure, blood glucose, and fetal heart rate.
- **Traceable Care-Plan Escalation:** Single-action transition from normal delivery to emergency cesarean with mandatory justification.
- **Hygienic Bed Turnover:** Automatic cycling of beds to `CLEANING` upon discharge, returning to `AVAILABLE` only after authorized cleaning verification.
- **De-Identified Operational Analytics:** Aggregated ward metrics (occupancy, ALOS, cleaning turnaround times, response latency audits).

---

## 3. Technology Stack

| Layer         | Technologies                                                                             |
| :------------ | :--------------------------------------------------------------------------------------- |
| **Frontend**  | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, `vite-plugin-pwa`     |
| **Backend**   | Node.js, Express.js, TypeScript, REST APIs (`/api/v1`), Zod, Pino logging                |
| **Real-Time** | Socket.IO (WebSockets)                                                                   |
| **Database**  | PostgreSQL 16, TypeORM (`synchronize: false`, `migrationsRun: false`), ACID Transactions |
| **Security**  | Argon2id / bcrypt, JWT, Refresh Token Rotation, AES-256-GCM, HMAC-SHA256 Blind Indexing  |
| **DevOps**    | pnpm Workspaces, Docker, Docker Compose, Git, GitHub Actions                             |

---

## 4. Architecture Overview

LRMS follows a **3-Tier Layered MVC Architecture** supported by the **Observer Pattern** (for real-time doctor alerts) and the **State Pattern** (for care-plan transitions and bed hygiene cycles):

1. **Presentation Layer (View):** Unified React.js / Vite web dashboard for desktop administrators/doctors and mobile PWA for bedside nurses.
2. **Application Layer (Controller & Service):** Node.js Express API enforcing RBAC and patient-level ABAC authorization, request ID tracing, and real-time Socket.IO room routing.
3. **Data Layer (Model):** PostgreSQL 16 relational database with TypeORM repositories, migrations, and ValueTransformer crypto hooks.

---

## 5. Repository Monorepo Structure

```
Labour-Room-Management-System/
├── apps/
│   ├── api/                           # Backend Express API Service
│   └── web/                           # Frontend React 18 + Vite Application
├── packages/
│   └── shared/                        # Shared TypeScript types, schemas & constants
├── project-documents/                 # Original Course Proposal PDF & Presentation
├── docs/                              # Software Engineering Documentation Suite
├── docker/                            # Docker configurations
├── .github/workflows/ci.yml           # Automated GitHub Actions CI Pipeline
├── docker-compose.yml                 # Local PostgreSQL 16 development database
├── pnpm-workspace.yaml                # pnpm workspace definition
└── tsconfig.base.json                 # Shared strict TypeScript configuration
```

---

## 6. Prerequisites

To run this project locally, ensure the following tools are installed:

1. **Node.js:** `>= 20.0.0` (Recommended: Node.js 24 LTS). Verify: `node -v`
2. **pnpm:** `>= 9.0.0` (Recommended: 12.18.x). Verify: `pnpm -v` (Install via `npm install -g pnpm`)
3. **Docker & Docker Compose:** Docker Engine v20+ / Docker Desktop. Verify: `docker compose version`
4. **Git:** `>= 2.30.0`. Verify: `git --version`

---

## 7. Quick Start & Setup Guide

### 7.1 Clone Repository & Setup Environment

```bash
# Clone repository
git clone <repo-url>
cd Labour-Room-Management-System

# Copy environment template
# Windows PowerShell:
Copy-Item .env.example .env
# Linux / macOS:
cp .env.example .env
```

### 7.2 Start PostgreSQL Database via Docker Compose

```bash
docker compose up -d
```

Verify container is healthy:

```bash
docker compose ps
```

### 7.3 Install Workspace Dependencies

```bash
pnpm install
```

### 7.4 Build Shared Library

```bash
pnpm --filter @lrms/shared build
```

---

## 8. Running Applications

### Run Full Stack (Frontend + Backend Concurrently)

```bash
pnpm run dev
```

### Run Backend API Only

```bash
pnpm run dev:api
```

- Base API: `http://localhost:4000/api/v1`
- Liveness Probe: `http://localhost:4000/api/v1/health/live`
- Readiness Probe: `http://localhost:4000/api/v1/health/ready`

### Run Frontend Only

```bash
pnpm run dev:web
```

- Web Application: `http://localhost:5173`

---

## 9. Running Verification Checks & Tests

```bash
# Run PostgreSQL migrations & baseline reference data seed
pnpm --filter @lrms/api db:migrate
pnpm --filter @lrms/api db:seed

# Bootstrap the first hospital administrator account via secure CLI
pnpm --filter @lrms/api auth:bootstrap-admin

# Run all unit and integration tests across API (Real PostgreSQL) and Web (414 tests passing)
pnpm run test

# Run TypeScript type check across all monorepo packages
pnpm run typecheck

# Run ESLint
pnpm run lint

# Check Prettier formatting
pnpm run format:check

# Run production build
pnpm run build
```

---

## 10. Troubleshooting Common Errors

1. **Port 5432 conflict (EADDRINUSE):** If you have a local PostgreSQL server already running, set `POSTGRES_PORT=5433` in `.env` and update the port in `DATABASE_URL`.
2. **Database Unavailable (HTTP 503):** If `/api/v1/health/ready` returns 503, verify the database container status with `docker compose ps` and logs with `docker compose logs postgres`.
3. **Cannot find module `@lrms/shared`:** Run `pnpm --filter @lrms/shared build` to generate the compiled TypeScript artifacts in `packages/shared/dist`.

---

## 11. Documentation Links

- [Development Setup Guide](docs/development-setup.md)
- [Requirements & Scope](docs/requirements.md)
- [Role & Permission Matrix](docs/role-permission-matrix.md)
- [Functional Requirements](docs/functional-requirements.md)
- [Non-Functional Requirements](docs/non-functional-requirements.md)
- [Architecture Overview](docs/architecture-overview.md)
- [Database Planning](docs/database-planning.md)
- [Security Architecture](docs/security-architecture.md)
- [Notification Workflow](docs/notification-workflow.md)
- [System Workflow](docs/system-workflow.md)
- [Assumptions & Open Questions](docs/assumptions-and-open-questions.md)
- [Development Roadmap](docs/development-roadmap.md)
- [Requirements Traceability Matrix (RTM)](docs/requirement-traceability-matrix.md)
- [Risk Register](docs/risk-register.md)
- [Folder Structure](docs/proposed-folder-structure.md)
- [Phase 1 Implementation Report](docs/phase-1-report.md)
- [Phase 2 Database Report](docs/phase-2-report.md)
- [Phase 2.1 Gap Analysis & Verification](docs/phase-2.1-gap-analysis.md)
- [UI/UX Clinical Design System](docs/design-system.md)
- [Frontend Architecture](docs/frontend-architecture.md)
- [Frontend Navigation & Route Map](docs/frontend-navigation.md)
- [Phase 3 Implementation Report](docs/phase-3-report.md)
- [Authentication Architecture](docs/authentication-architecture.md)
- [Session Security & Token Rotation](docs/session-security.md)
- [JWT Configuration & Key Management](docs/jwt-configuration.md)
- [RBAC Implementation & Matrix](docs/rbac-implementation.md)
- [Administrator CLI Bootstrap Guide](docs/admin-bootstrap.md)
- [Phase 4 Implementation Report](docs/phase-4-report.md)
- [User Management Architecture](docs/user-management-architecture.md)
- [Staff Profile & Password Lifecycle Schema](docs/staff-profile-schema.md)
- [Account Provisioning & Temporary Credentials](docs/account-provisioning.md)
- [Account Lifecycle & Concurrency Controls](docs/account-lifecycle.md)
- [Phase 5 Implementation Report](docs/phase-5-report.md)
- [Phase 5.1 Final Verification Report](docs/phase-5.1-final-verification.md)
- [Patient Management Architecture](docs/patient-management-architecture.md)
- [Admission Management Architecture](docs/admission-management-architecture.md)
- [Rapid Triage Workflow](docs/rapid-triage-workflow.md)
- [Patient PII Encryption & Audit](docs/patient-pii-encryption.md)
- [Patient-Level Authorization](docs/patient-level-authorization.md)
- [Admission Reference ID Generation](docs/admission-reference-generation.md)
- [Phase 6 Implementation Report](docs/phase-6-report.md)
- [Ward Management Architecture](docs/ward-management-architecture.md)
- [Bed Management Architecture](docs/bed-management-architecture.md)
- [Bed Allocation Workflow](docs/bed-allocation-workflow.md)
- [Bed Transfer Workflow](docs/bed-transfer-workflow.md)
- [Bed Cleaning and Turnover Architecture](docs/bed-cleaning-and-turnover.md)
- [Bed Maintenance Management](docs/bed-maintenance-management.md)
- [Phase 7 Implementation Report](docs/phase-7-report.md)
- [Staff Assignment Architecture](docs/staff-assignment-architecture.md)
- [Shift Management Architecture](docs/shift-management-architecture.md)
- [Ward Staff Management](docs/ward-staff-management.md)
- [Patient Staff Responsibility](docs/patient-staff-responsibility.md)
- [Patient Assignment Authorization](docs/patient-assignment-authorization.md)
- [Phase 8 Implementation Report](docs/phase-8-report.md)
- [Clinical Observation Architecture](docs/clinical-observation-architecture.md)
- [Maternal Observation Workflow](docs/maternal-observation-workflow.md)
- [Fetal Observation Workflow](docs/fetal-observation-workflow.md)
- [Labour Progression Management](docs/labour-progression-management.md)
- [Partograph Architecture](docs/partograph-architecture.md)
- [Clinical Record Amendment](docs/clinical-record-amendment.md)
- [Clinical Data Security](docs/clinical-data-security.md)
- [Phase 9 Implementation Report](docs/phase-9-report.md)
- [Clinical Care Plan Architecture](docs/clinical-care-plan-architecture.md)
- [Care Plan State Machine Specification](docs/care-plan-state-machine.md)
- [Clinical Escalation Architecture](docs/clinical-escalation-architecture.md)
- [Emergency Response Workflow](docs/emergency-response-workflow.md)
- [Surgical Review & Theatre Readiness Workflow](docs/surgical-review-workflow.md)
- [Emergency Access Override ("Break-Glass")](docs/emergency-access-override.md)
- [Clinical Care & Escalation Security](docs/clinical-escalation-security.md)
- [Phase 10 Implementation Report](docs/phase-10-report.md)
- [Real-Time WebSocket Architecture](docs/realtime-architecture.md)
- [Socket.IO & WebSocket Security](docs/socket-io-security.md)
- [Notification Inbox Architecture](docs/notification-architecture.md)
- [Clinical Notification Event Catalog](docs/notification-event-catalog.md)
- [Notification Delivery Reliability & Fault Tolerance](docs/notification-delivery-reliability.md)
- [Notification Authorization & Caldicott Data Protection](docs/notification-authorization.md)
- [Clinical Alert Workflow & Decision-Support Boundaries](docs/clinical-alert-workflow.md)
- [Transactional Outbox Pattern in Healthcare Architecture](docs/transactional-outbox-pattern.md)
- [Phase 11 Implementation Report](docs/phase-11-report.md)
- [Delivery Management Architecture](docs/delivery-management-architecture.md)
- [Delivery Outcome Workflow](docs/delivery-outcome-workflow.md)
- [Birth Record Management](docs/birth-record-management.md)
- [Newborn Registration](docs/newborn-registration.md)
- [Multiple Birth Management](docs/multiple-birth-management.md)
- [Apgar Assessment Architecture](docs/apgar-assessment-architecture.md)
- [Postpartum Maternal Care](docs/postpartum-maternal-care.md)
- [Postpartum Newborn Care](docs/postpartum-newborn-care.md)
- [Postpartum Discharge Workflow](docs/postpartum-discharge-workflow.md)
- [Delivery Clinical Security](docs/delivery-clinical-security.md)
- [Phase 12 Implementation Report](docs/phase-12-report.md)
- [Operational Analytics Architecture](docs/operational-analytics-architecture.md)
- [Analytics Metric Definitions & Formulations](docs/analytics-metric-definitions.md)
- [Admission & Clinical Triage Analytics](docs/admission-analytics.md)
- [Delivery Outcomes & Maternal Health Analytics](docs/delivery-analytics.md)
- [Bed Utilization, Turnover & Sanitation Analytics](docs/bed-utilization-analytics.md)
- [ALOS Calculation Methodology](docs/alos-calculation-methodology.md)
- [Clinical Staffing & Workload Analytics](docs/staffing-analytics.md)
- [Emergency Escalations & Clinical Alert Response Analytics](docs/clinical-response-analytics.md)
- [Official Report Generation & Export Architecture](docs/report-generation-and-export.md)
- [Analytics Security & Authorization Architecture](docs/analytics-security-and-authorization.md)
- [Analytics Performance Optimization & Database Indexing](docs/analytics-performance-optimization.md)
- [Phase 13 Implementation Report](docs/phase-13-report.md)
