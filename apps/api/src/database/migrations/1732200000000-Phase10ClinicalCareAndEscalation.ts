import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase10ClinicalCareAndEscalation1732200000000 implements MigrationInterface {
  name = 'Phase10ClinicalCareAndEscalation1732200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // 1. TABLE 33: clinical_care_plans
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_care_plans" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "care_plan_reference_id" VARCHAR(30) UNIQUE NOT NULL,
        "current_state" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        "current_version_number" INTEGER NOT NULL DEFAULT 1,
        "created_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "responsible_doctor_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "approved_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "approved_at" TIMESTAMPTZ,
        "planned_review_at" TIMESTAMPTZ,
        "last_reviewed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_care_plan_state" CHECK (
          "current_state" IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REVIEW_REQUIRED', 'ON_HOLD', 'COMPLETED', 'CANCELLED')
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_clinical_care_plans_admission_id" ON "clinical_care_plans"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_clinical_care_plans_reference_id" ON "clinical_care_plans"("care_plan_reference_id");
      CREATE INDEX IF NOT EXISTS "idx_clinical_care_plans_state" ON "clinical_care_plans"("current_state");
      CREATE INDEX IF NOT EXISTS "idx_clinical_care_plans_doctor_id" ON "clinical_care_plans"("responsible_doctor_id");
    `);

    // ========================================================================
    // 2. TABLE 34: clinical_care_plan_versions
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_care_plan_versions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "care_plan_id" UUID NOT NULL REFERENCES "clinical_care_plans"("id") ON DELETE CASCADE,
        "version_number" INTEGER NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "assessment_summary" TEXT NOT NULL,
        "clinical_concerns" TEXT,
        "objectives" TEXT NOT NULL,
        "planned_actions" TEXT NOT NULL,
        "assigned_staff_roles" JSONB,
        "created_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "change_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "idx_unique_care_plan_version" UNIQUE ("care_plan_id", "version_number")
      );

      CREATE INDEX IF NOT EXISTS "idx_care_plan_versions_plan_id" ON "clinical_care_plan_versions"("care_plan_id");
    `);

    // ========================================================================
    // 3. TABLE 35: clinical_care_plan_reviews
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_care_plan_reviews" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "care_plan_id" UUID NOT NULL REFERENCES "clinical_care_plans"("id") ON DELETE CASCADE,
        "reviewed_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "review_outcome" VARCHAR(50) NOT NULL,
        "review_notes" TEXT NOT NULL,
        "next_review_at" TIMESTAMPTZ,
        "reviewed_version_number" INTEGER NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "idx_care_plan_reviews_plan_id" ON "clinical_care_plan_reviews"("care_plan_id");
      CREATE INDEX IF NOT EXISTS "idx_care_plan_reviews_user_id" ON "clinical_care_plan_reviews"("reviewed_by_user_id");
    `);

    // ========================================================================
    // 4. TABLE 36: clinical_escalations
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_escalations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "escalation_reference_id" VARCHAR(30) UNIQUE NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "priority" VARCHAR(30) NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        "clinical_reason" TEXT NOT NULL,
        "source_observation_type" VARCHAR(50),
        "source_observation_id" UUID,
        "initiated_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "assigned_recipient_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "acknowledged_at" TIMESTAMPTZ,
        "acknowledged_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "assessment_at" TIMESTAMPTZ,
        "resolved_at" TIMESTAMPTZ,
        "resolved_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "clinical_response_notes" TEXT,
        "closure_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_escalation_category" CHECK (
          "category" IN ('MATERNAL', 'FETAL', 'LABOUR_PROGRESSION', 'RISK_FLAG', 'OBSTETRIC_EMERGENCY', 'OTHER')
        ),
        CONSTRAINT "chk_escalation_priority" CHECK (
          "priority" IN ('ROUTINE', 'URGENT', 'EMERGENCY')
        ),
        CONSTRAINT "chk_escalation_status" CHECK (
          "status" IN ('OPEN', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED')
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_admission_id" ON "clinical_escalations"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_reference_id" ON "clinical_escalations"("escalation_reference_id");
      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_status" ON "clinical_escalations"("status");
      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_priority" ON "clinical_escalations"("priority");
      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_initiator" ON "clinical_escalations"("initiated_by_user_id");
      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_assigned_to" ON "clinical_escalations"("assigned_recipient_user_id");
      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_source_obs" ON "clinical_escalations"("source_observation_id");
    `);

    // ========================================================================
    // 5. TABLE 37: clinical_escalation_history
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clinical_escalation_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "escalation_id" UUID NOT NULL REFERENCES "clinical_escalations"("id") ON DELETE CASCADE,
        "from_status" VARCHAR(30) NOT NULL,
        "to_status" VARCHAR(30) NOT NULL,
        "changed_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "previous_assigned_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "new_assigned_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "reason" TEXT,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS "idx_escalation_history_escalation_id" ON "clinical_escalation_history"("escalation_id");
    `);

    // ========================================================================
    // 6. TABLE 38: emergency_responses
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emergency_responses" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "response_reference_id" VARCHAR(30) UNIQUE NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
        "clinical_reason" TEXT NOT NULL,
        "initiated_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "assigned_team" VARCHAR(100),
        "assigned_responder_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "acknowledged_at" TIMESTAMPTZ,
        "acknowledged_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "action_notes" TEXT,
        "resolution_notes" TEXT,
        "resolved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_emergency_response_category" CHECK (
          "category" IN ('MATERNAL_EMERGENCY', 'FETAL_EMERGENCY', 'OBSTETRIC_EMERGENCY', 'LABOUR_EMERGENCY', 'SURGICAL_REVIEW_REQUEST')
        ),
        CONSTRAINT "chk_emergency_response_status" CHECK (
          "status" IN ('INITIATED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED')
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_emergency_responses_admission_id" ON "emergency_responses"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_emergency_responses_reference_id" ON "emergency_responses"("response_reference_id");
      CREATE INDEX IF NOT EXISTS "idx_emergency_responses_status" ON "emergency_responses"("status");
      CREATE INDEX IF NOT EXISTS "idx_emergency_responses_initiator" ON "emergency_responses"("initiated_by_user_id");
      CREATE INDEX IF NOT EXISTS "idx_emergency_responses_responder" ON "emergency_responses"("assigned_responder_user_id");
    `);

    // ========================================================================
    // 7. TABLE 39: surgical_reviews
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "surgical_reviews" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "review_reference_id" VARCHAR(30) UNIQUE NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'REVIEW_REQUESTED',
        "caesarean_decision" VARCHAR(50) NOT NULL DEFAULT 'CONSIDERED',
        "clinical_indication" TEXT NOT NULL,
        "decision_rationale" TEXT,
        "requested_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "consultant_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "consultant_assessed_at" TIMESTAMPTZ,
        "decision_recorded_at" TIMESTAMPTZ,
        "anaesthesia_review_status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        "anaesthesia_notes" TEXT,
        "theatre_readiness_status" VARCHAR(50) NOT NULL DEFAULT 'NOT_INITIATED',
        "theatre_ready_at" TIMESTAMPTZ,
        "handed_over_at" TIMESTAMPTZ,
        "handover_notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_surgical_review_status" CHECK (
          "status" IN ('REVIEW_REQUESTED', 'CONSULTANT_REVIEW', 'DECISION_PENDING', 'DECISION_RECORDED', 'PREPARATION_IN_PROGRESS', 'READY_FOR_HANDOVER', 'CANCELLED')
        ),
        CONSTRAINT "chk_caesarean_decision" CHECK (
          "caesarean_decision" IN ('CONSIDERED', 'NOT_INDICATED', 'APPROVED_FOR_THEATRE', 'DEFERRED')
        ),
        CONSTRAINT "chk_anaesthesia_review_status" CHECK (
          "anaesthesia_review_status" IN ('PENDING', 'REVIEWED_CLEAR', 'HIGH_RISK_CLEAR', 'FURTHER_STABILIZATION_REQUIRED')
        ),
        CONSTRAINT "chk_theatre_readiness_status" CHECK (
          "theatre_readiness_status" IN ('NOT_INITIATED', 'THEATRE_NOTIFIED', 'PRE_OP_CHECKLIST_COMPLETE', 'THEATRE_READY')
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_surgical_reviews_admission_id" ON "surgical_reviews"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_surgical_reviews_reference_id" ON "surgical_reviews"("review_reference_id");
      CREATE INDEX IF NOT EXISTS "idx_surgical_reviews_status" ON "surgical_reviews"("status");
      CREATE INDEX IF NOT EXISTS "idx_surgical_reviews_requested_by" ON "surgical_reviews"("requested_by_user_id");
      CREATE INDEX IF NOT EXISTS "idx_surgical_reviews_consultant" ON "surgical_reviews"("consultant_user_id");
    `);

    // ========================================================================
    // 8. Harden emergency_overrides (Table 15) indexes
    // ========================================================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_emergency_overrides_admission_active"
      ON "emergency_overrides"("admission_id", "staff_id")
      WHERE "revoked_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_emergency_overrides_admission_active";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "surgical_reviews";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emergency_responses";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_escalation_history";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_escalations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_care_plan_reviews";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_care_plan_versions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clinical_care_plans";`);
  }
}
