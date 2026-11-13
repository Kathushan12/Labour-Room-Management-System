import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCleanSchema1731300000000 implements MigrationInterface {
  name = 'InitialCleanSchema1731300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // 2. Roles
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(50) UNIQUE NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_roles_name" ON "roles"("name");
    `);

    // 3. Risk Flag Definitions Catalog
    await queryRunner.query(`
      CREATE TABLE "risk_flag_definitions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR(50) UNIQUE NOT NULL,
        "label" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_risk_flag_definitions_key" ON "risk_flag_definitions"("key");
      CREATE INDEX "idx_risk_flag_definitions_is_active" ON "risk_flag_definitions"("is_active");
    `);

    // 4. Patients (Independent Identity Record)
    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Patient PII (Separate Binary BYTEA Columns for AES-256-GCM & HMAC Blind Indexes)
    await queryRunner.query(`
      CREATE TABLE "patient_pii" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "patient_id" UUID UNIQUE NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
        "full_name_ciphertext" BYTEA,
        "full_name_nonce" BYTEA,
        "full_name_auth_tag" BYTEA,
        "nic_ciphertext" BYTEA,
        "nic_nonce" BYTEA,
        "nic_auth_tag" BYTEA,
        "contact_phone_ciphertext" BYTEA,
        "contact_phone_nonce" BYTEA,
        "contact_phone_auth_tag" BYTEA,
        "key_version" VARCHAR(10) NOT NULL DEFAULT 'v1',
        "nic_blind_index" BYTEA,
        "contact_phone_blind_index" BYTEA,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_patient_pii_nic_blind_index" ON "patient_pii"("nic_blind_index");
    `);

    // 6. Wards
    await queryRunner.query(`
      CREATE TABLE "wards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "code" VARCHAR(20) UNIQUE NOT NULL,
        "total_physical_beds" INTEGER NOT NULL DEFAULT 7,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_wards_code" ON "wards"("code");
    `);

    // 7. Users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "email" VARCHAR(255) UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "full_name" VARCHAR(150) NOT NULL,
        "role_id" UUID NOT NULL REFERENCES "roles"("id"),
        "staff_registration_id" VARCHAR(50),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_users_username" ON "users"("username");
      CREATE INDEX "idx_users_role_id" ON "users"("role_id");
      CREATE INDEX "idx_users_is_active" ON "users"("is_active");
    `);

    // 8. Refresh Sessions
    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" VARCHAR(255) UNIQUE NOT NULL,
        "family_id" UUID NOT NULL,
        "is_revoked" BOOLEAN NOT NULL DEFAULT FALSE,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_refresh_sessions_user_id" ON "refresh_sessions"("user_id");
      CREATE INDEX "idx_refresh_sessions_family_id" ON "refresh_sessions"("family_id");
      CREATE INDEX "idx_refresh_sessions_is_revoked" ON "refresh_sessions"("is_revoked");
    `);

    // 9. Beds (Separated Functioning Status vs Occupancy Status)
    await queryRunner.query(`
      CREATE TABLE "beds" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ward_id" UUID NOT NULL REFERENCES "wards"("id"),
        "bed_number" VARCHAR(20) NOT NULL,
        "functioning_status" VARCHAR(30) NOT NULL DEFAULT 'FUNCTIONING',
        "occupancy_status" VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_beds_ward_bed_number" UNIQUE ("ward_id", "bed_number"),
        CONSTRAINT "chk_bed_functioning_not_occupied" CHECK (NOT (functioning_status = 'OUT_OF_SERVICE' AND occupancy_status = 'OCCUPIED'))
      );
      CREATE INDEX "idx_beds_ward_id" ON "beds"("ward_id");
      CREATE INDEX "idx_beds_functioning_status" ON "beds"("functioning_status");
      CREATE INDEX "idx_beds_occupancy_status" ON "beds"("occupancy_status");
    `);

    // 10. Admissions (Nullable patient_id for rapid admissions)
    await queryRunner.query(`
      CREATE TABLE "admissions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_reference_id" VARCHAR(30) UNIQUE NOT NULL,
        "ward_id" UUID NOT NULL REFERENCES "wards"("id"),
        "patient_id" UUID REFERENCES "patients"("id") ON DELETE SET NULL,
        "admitted_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "admission_category" VARCHAR(50) NOT NULL,
        "current_care_plan" VARCHAR(50) NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'ADMITTED',
        "admitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "discharged_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_admissions_reference_id" ON "admissions"("admission_reference_id");
      CREATE INDEX "idx_admissions_ward_id" ON "admissions"("ward_id");
      CREATE INDEX "idx_admissions_patient_id" ON "admissions"("patient_id");
      CREATE INDEX "idx_admissions_category" ON "admissions"("admission_category");
      CREATE INDEX "idx_admissions_care_plan" ON "admissions"("current_care_plan");
      CREATE INDEX "idx_admissions_status" ON "admissions"("status");
    `);

    // 11. Bed Allocation History (PostgreSQL Partial Unique Indexes for strict Concurrency Safety)
    await queryRunner.query(`
      CREATE TABLE "bed_allocation_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "bed_id" UUID NOT NULL REFERENCES "beds"("id"),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id"),
        "assigned_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "released_by_user_id" UUID REFERENCES "users"("id"),
        "released_at" TIMESTAMPTZ,
        "release_reason" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_released_after_assigned" CHECK (released_at IS NULL OR released_at >= assigned_at)
      );
      CREATE INDEX "idx_bed_allocation_bed_id" ON "bed_allocation_history"("bed_id");
      CREATE INDEX "idx_bed_allocation_admission_id" ON "bed_allocation_history"("admission_id");
      CREATE INDEX "idx_bed_allocation_released_at" ON "bed_allocation_history"("released_at");
      CREATE UNIQUE INDEX "idx_one_active_allocation_per_bed" ON "bed_allocation_history"("bed_id") WHERE released_at IS NULL;
      CREATE UNIQUE INDEX "idx_one_active_bed_per_admission" ON "bed_allocation_history"("admission_id") WHERE released_at IS NULL;
    `);

    // 12. Bed Status History
    await queryRunner.query(`
      CREATE TABLE "bed_status_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "bed_id" UUID NOT NULL REFERENCES "beds"("id"),
        "previous_functioning_status" VARCHAR(30),
        "new_functioning_status" VARCHAR(30) NOT NULL,
        "previous_occupancy_status" VARCHAR(30),
        "new_occupancy_status" VARCHAR(30) NOT NULL,
        "changed_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "reason" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_bed_status_history_bed_id" ON "bed_status_history"("bed_id");
    `);

    // 13. Admission Risk Flags (With partial unique index preventing duplicate active flags)
    await queryRunner.query(`
      CREATE TABLE "admission_risk_flags" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "risk_flag_definition_id" UUID NOT NULL REFERENCES "risk_flag_definitions"("id"),
        "flagged_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "notes" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_admission_risk_flags_admission_id" ON "admission_risk_flags"("admission_id");
      CREATE INDEX "idx_admission_risk_flags_def_id" ON "admission_risk_flags"("risk_flag_definition_id");
      CREATE UNIQUE INDEX "idx_unique_active_admission_risk_flag" ON "admission_risk_flags"("admission_id", "risk_flag_definition_id") WHERE is_active = TRUE;
    `);

    // 14. Patient-Staff Assignments (Partial unique index preventing duplicate active assignments)
    await queryRunner.query(`
      CREATE TABLE "patient_staff_assignments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "staff_id" UUID NOT NULL REFERENCES "users"("id"),
        "assignment_role" VARCHAR(50) NOT NULL,
        "assigned_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "unassigned_at" TIMESTAMPTZ,
        "unassigned_by_user_id" UUID REFERENCES "users"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_unassigned_after_assigned" CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at)
      );
      CREATE INDEX "idx_patient_staff_assignments_admission_id" ON "patient_staff_assignments"("admission_id");
      CREATE INDEX "idx_patient_staff_assignments_staff_id" ON "patient_staff_assignments"("staff_id");
      CREATE UNIQUE INDEX "idx_unique_active_staff_assignment" ON "patient_staff_assignments"("admission_id", "staff_id", "assignment_role") WHERE unassigned_at IS NULL;
    `);

    // 15. Emergency Overrides
    await queryRunner.query(`
      CREATE TABLE "emergency_overrides" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "staff_id" UUID NOT NULL REFERENCES "users"("id"),
        "reason" TEXT NOT NULL,
        "override_duration_minutes" INTEGER,
        "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMPTZ,
        "revoked_at" TIMESTAMPTZ,
        "revoked_by_user_id" UUID REFERENCES "users"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_emergency_overrides_admission_id" ON "emergency_overrides"("admission_id");
      CREATE INDEX "idx_emergency_overrides_staff_id" ON "emergency_overrides"("staff_id");
    `);

    // 16. Maternal Observations (Append-only with structured BP, glucose unit, and audit check constraints)
    await queryRunner.query(`
      CREATE TABLE "maternal_observations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "systolic_bp" INTEGER,
        "diastolic_bp" INTEGER,
        "blood_glucose_value" NUMERIC(6, 2),
        "blood_glucose_unit" VARCHAR(20),
        "temperature_celsius" NUMERIC(4, 2),
        "pulse_rate_bpm" INTEGER,
        "respiratory_rate" INTEGER,
        "oxygen_saturation_percent" INTEGER,
        "clinical_notes" TEXT,
        "observation_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "supersedes_id" UUID REFERENCES "maternal_observations"("id"),
        "supersede_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_bp_systolic_greater_diastolic" CHECK (
          (systolic_bp IS NULL AND diastolic_bp IS NULL) OR
          (systolic_bp IS NOT NULL AND diastolic_bp IS NOT NULL AND systolic_bp > diastolic_bp)
        ),
        CONSTRAINT "chk_glucose_value_and_unit" CHECK (
          (blood_glucose_value IS NULL AND blood_glucose_unit IS NULL) OR
          (blood_glucose_value IS NOT NULL AND blood_glucose_unit IS NOT NULL)
        ),
        CONSTRAINT "chk_maternal_supersedes_has_reason" CHECK (
          (supersedes_id IS NULL AND supersede_reason IS NULL) OR
          (supersedes_id IS NOT NULL AND supersede_reason IS NOT NULL)
        )
      );
      CREATE INDEX "idx_maternal_observations_admission_id" ON "maternal_observations"("admission_id");
      CREATE INDEX "idx_maternal_observations_timestamp" ON "maternal_observations"("observation_timestamp");
    `);

    // 17. Fetal Observations (Append-only with explicit unit and audit check constraints)
    await queryRunner.query(`
      CREATE TABLE "fetal_observations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "fetal_heart_rate_bpm" INTEGER NOT NULL,
        "fetal_heart_rate_unit" VARCHAR(20) NOT NULL DEFAULT 'BPM',
        "variability" VARCHAR(50),
        "decelerations" VARCHAR(50),
        "accelerations" VARCHAR(50),
        "liquor_status" VARCHAR(50),
        "clinical_notes" TEXT,
        "observation_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "supersedes_id" UUID REFERENCES "fetal_observations"("id"),
        "supersede_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_fetal_supersedes_has_reason" CHECK (
          (supersedes_id IS NULL AND supersede_reason IS NULL) OR
          (supersedes_id IS NOT NULL AND supersede_reason IS NOT NULL)
        )
      );
      CREATE INDEX "idx_fetal_observations_admission_id" ON "fetal_observations"("admission_id");
      CREATE INDEX "idx_fetal_observations_timestamp" ON "fetal_observations"("observation_timestamp");
    `);

    // 18. Care Plan Transitions
    await queryRunner.query(`
      CREATE TABLE "care_plan_transitions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "previous_state" VARCHAR(50) NOT NULL,
        "new_state" VARCHAR(50) NOT NULL,
        "transitioned_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "clinical_rationale" TEXT NOT NULL,
        "is_emergency" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_care_plan_transitions_admission_id" ON "care_plan_transitions"("admission_id");
      CREATE INDEX "idx_care_plan_transitions_new_state" ON "care_plan_transitions"("new_state");
      CREATE INDEX "idx_care_plan_transitions_is_emergency" ON "care_plan_transitions"("is_emergency");
    `);

    // 19. Emergency Alerts
    await queryRunner.query(`
      CREATE TABLE "emergency_alerts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "care_plan_transition_id" UUID REFERENCES "care_plan_transitions"("id"),
        "initiated_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "alert_type" VARCHAR(50) NOT NULL,
        "severity" VARCHAR(30) NOT NULL DEFAULT 'EMERGENCY',
        "idempotency_key" VARCHAR(100) UNIQUE NOT NULL,
        "alert_message" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_emergency_alerts_admission_id" ON "emergency_alerts"("admission_id");
      CREATE INDEX "idx_emergency_alerts_idempotency_key" ON "emergency_alerts"("idempotency_key");
    `);

    // 20. Alert Recipients (Multi-recipient proof-of-receipt tracking with timestamp check constraints)
    await queryRunner.query(`
      CREATE TABLE "alert_recipients" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "alert_id" UUID NOT NULL REFERENCES "emergency_alerts"("id") ON DELETE CASCADE,
        "recipient_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "receipt_state" VARCHAR(30) NOT NULL DEFAULT 'DISPATCHED',
        "dispatched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "delivered_at" TIMESTAMPTZ,
        "acknowledged_at" TIMESTAMPTZ,
        "acknowledged_by_user_id" UUID REFERENCES "users"("id"),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_alert_recipients_alert_user" UNIQUE ("alert_id", "recipient_user_id"),
        CONSTRAINT "chk_alert_recipient_delivery_order" CHECK (delivered_at IS NULL OR delivered_at >= dispatched_at),
        CONSTRAINT "chk_alert_recipient_ack_order" CHECK (acknowledged_at IS NULL OR (delivered_at IS NOT NULL AND acknowledged_at >= delivered_at)),
        CONSTRAINT "chk_alert_recipient_ack_user" CHECK (acknowledged_at IS NULL OR acknowledged_by_user_id IS NOT NULL)
      );
      CREATE INDEX "idx_alert_recipients_alert_id" ON "alert_recipients"("alert_id");
      CREATE INDEX "idx_alert_recipients_user_id" ON "alert_recipients"("recipient_user_id");
      CREATE INDEX "idx_alert_recipients_receipt_state" ON "alert_recipients"("receipt_state");
    `);

    // 21. Alert Delivery Attempts
    await queryRunner.query(`
      CREATE TABLE "alert_delivery_attempts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "alert_id" UUID NOT NULL REFERENCES "emergency_alerts"("id") ON DELETE CASCADE,
        "recipient_id" UUID REFERENCES "alert_recipients"("id") ON DELETE SET NULL,
        "user_id" UUID NOT NULL REFERENCES "users"("id"),
        "attempt_number" INTEGER NOT NULL,
        "delivery_channel" VARCHAR(30) NOT NULL DEFAULT 'WEBSOCKET',
        "status" VARCHAR(30) NOT NULL,
        "error_message" TEXT,
        "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_alert_delivery_attempts_alert_id" ON "alert_delivery_attempts"("alert_id");
      CREATE INDEX "idx_alert_delivery_attempts_user_id" ON "alert_delivery_attempts"("user_id");
    `);

    // 22. Transactional Notification Outbox (PII-free payload, durable event bus)
    await queryRunner.query(`
      CREATE TABLE "notification_outbox" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "idempotency_key" VARCHAR(100) UNIQUE NOT NULL,
        "event_type" VARCHAR(100) NOT NULL,
        "event_payload" JSONB NOT NULL,
        "processing_status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "attempt_count" INTEGER NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMPTZ,
        "processed_at" TIMESTAMPTZ,
        "last_error_code" VARCHAR(100),
        "last_error_message" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_notification_outbox_idempotency_key" ON "notification_outbox"("idempotency_key");
      CREATE INDEX "idx_notification_outbox_event_type" ON "notification_outbox"("event_type");
      CREATE INDEX "idx_notification_outbox_status_attempt" ON "notification_outbox"("processing_status", "next_attempt_at");
    `);

    // 23. Discharge Records
    await queryRunner.query(`
      CREATE TABLE "discharge_records" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID UNIQUE NOT NULL REFERENCES "admissions"("id") ON DELETE CASCADE,
        "discharged_by_user_id" UUID NOT NULL REFERENCES "users"("id"),
        "maternal_outcome" VARCHAR(100) NOT NULL,
        "neonatal_outcome" VARCHAR(100) NOT NULL,
        "delivery_mode" VARCHAR(50) NOT NULL,
        "delivery_timestamp" TIMESTAMPTZ,
        "discharge_summary" TEXT,
        "discharge_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_discharge_records_admission_id" ON "discharge_records"("admission_id");
    `);

    // 24. Audit Logs (Immutability guarantee, zero cascade deletion of clinical audit trail)
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "action" VARCHAR(100) NOT NULL,
        "entity_name" VARCHAR(100) NOT NULL,
        "entity_id" VARCHAR(100),
        "details" JSONB,
        "ip_address" VARCHAR(45),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");
      CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
      CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "audit_logs" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "discharge_records" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "notification_outbox" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "alert_delivery_attempts" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "alert_recipients" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "emergency_alerts" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "care_plan_transitions" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "fetal_observations" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "maternal_observations" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "emergency_overrides" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "patient_staff_assignments" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "admission_risk_flags" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "bed_status_history" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "bed_allocation_history" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "admissions" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "beds" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "refresh_sessions" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "users" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "wards" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "patient_pii" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "patients" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "risk_flag_definitions" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "roles" CASCADE;');
  }
}
