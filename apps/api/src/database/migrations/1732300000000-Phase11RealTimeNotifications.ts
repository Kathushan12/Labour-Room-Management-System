import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase11RealTimeNotifications1732300000000 implements MigrationInterface {
  name = 'Phase11RealTimeNotifications1732300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // 1. HARDEN HISTORICAL INTEGRITY ON PHASE 10 CHILD TABLES (CASCADE -> RESTRICT)
    // ========================================================================
    // In obstetrics clinical care, parent deletions must never cascade to delete
    // historical clinical decisions, version snapshots, or escalation audits.
    await queryRunner.query(`
      ALTER TABLE "clinical_care_plan_versions"
        DROP CONSTRAINT IF EXISTS "clinical_care_plan_versions_care_plan_id_fkey",
        DROP CONSTRAINT IF EXISTS "fk_care_plan_versions_care_plan_id";
      ALTER TABLE "clinical_care_plan_versions"
        ADD CONSTRAINT "fk_care_plan_versions_care_plan_id"
        FOREIGN KEY ("care_plan_id") REFERENCES "clinical_care_plans"("id") ON DELETE RESTRICT;

      ALTER TABLE "clinical_care_plan_reviews"
        DROP CONSTRAINT IF EXISTS "clinical_care_plan_reviews_care_plan_id_fkey",
        DROP CONSTRAINT IF EXISTS "fk_care_plan_reviews_care_plan_id";
      ALTER TABLE "clinical_care_plan_reviews"
        ADD CONSTRAINT "fk_care_plan_reviews_care_plan_id"
        FOREIGN KEY ("care_plan_id") REFERENCES "clinical_care_plans"("id") ON DELETE RESTRICT;

      ALTER TABLE "clinical_escalation_history"
        DROP CONSTRAINT IF EXISTS "clinical_escalation_history_escalation_id_fkey",
        DROP CONSTRAINT IF EXISTS "fk_escalation_history_escalation_id";
      ALTER TABLE "clinical_escalation_history"
        ADD CONSTRAINT "fk_escalation_history_escalation_id"
        FOREIGN KEY ("escalation_id") REFERENCES "clinical_escalations"("id") ON DELETE RESTRICT;
    `);

    // ========================================================================
    // 2. ENHANCE TABLE 21: notification_outbox (Phase 11 Transactional Event Bus)
    // ========================================================================
    await queryRunner.query(`
      ALTER TABLE "notification_outbox"
        ADD COLUMN IF NOT EXISTS "aggregate_type" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "aggregate_id" UUID,
        ADD COLUMN IF NOT EXISTS "admission_id" UUID REFERENCES "admissions"("id") ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS "idx_notification_outbox_aggregate"
        ON "notification_outbox"("aggregate_type", "aggregate_id");

      CREATE INDEX IF NOT EXISTS "idx_notification_outbox_admission_id"
        ON "notification_outbox"("admission_id");
    `);

    // ========================================================================
    // 3. TABLE 40: notifications (Persistent User Clinical Inbox)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipient_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "outbox_event_id" UUID REFERENCES "notification_outbox"("id") ON DELETE SET NULL,
        "notification_type" VARCHAR(50) NOT NULL,
        "priority" VARCHAR(20) NOT NULL DEFAULT 'ROUTINE',
        "title" VARCHAR(200) NOT NULL,
        "safe_message" TEXT NOT NULL,
        "resource_type" VARCHAR(50) NOT NULL,
        "resource_id" UUID NOT NULL,
        "admission_id" UUID REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "read_at" TIMESTAMPTZ,
        "expires_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_notification_priority" CHECK (
          "priority" IN ('ROUTINE', 'URGENT', 'EMERGENCY')
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_read"
        ON "notifications"("recipient_user_id", "read_at", "created_at" DESC);

      CREATE INDEX IF NOT EXISTS "idx_notifications_priority"
        ON "notifications"("priority", "created_at" DESC);

      CREATE INDEX IF NOT EXISTS "idx_notifications_admission_id"
        ON "notifications"("admission_id");

      CREATE INDEX IF NOT EXISTS "idx_notifications_resource"
        ON "notifications"("resource_type", "resource_id");
    `);

    // ========================================================================
    // 4. TABLE 41: notification_delivery_attempts (Delivery Audit Ledger)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_delivery_attempts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "notification_id" UUID NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
        "recipient_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "delivery_channel" VARCHAR(30) NOT NULL DEFAULT 'SOCKET_IO',
        "status" VARCHAR(30) NOT NULL DEFAULT 'DELIVERED',
        "attempted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "delivered_at" TIMESTAMPTZ,
        "error_code" VARCHAR(50),
        "error_message" TEXT
      );

      CREATE INDEX IF NOT EXISTS "idx_notif_delivery_attempts_notif_id"
        ON "notification_delivery_attempts"("notification_id");

      CREATE INDEX IF NOT EXISTS "idx_notif_delivery_attempts_user_id"
        ON "notification_delivery_attempts"("recipient_user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Phase 11 delivery tracking & inbox tables
    await queryRunner.query('DROP TABLE IF EXISTS "notification_delivery_attempts" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "notifications" CASCADE;');

    // Revert outbox additions
    await queryRunner.query('DROP INDEX IF EXISTS "idx_notification_outbox_admission_id";');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_notification_outbox_aggregate";');
    await queryRunner.query(`
      ALTER TABLE "notification_outbox"
        DROP COLUMN IF EXISTS "admission_id",
        DROP COLUMN IF EXISTS "aggregate_id",
        DROP COLUMN IF EXISTS "aggregate_type";
    `);

    // Revert FK constraints on Phase 10 child tables back to CASCADE
    await queryRunner.query(`
      ALTER TABLE "clinical_care_plan_versions"
        DROP CONSTRAINT IF EXISTS "fk_care_plan_versions_care_plan_id";
      ALTER TABLE "clinical_care_plan_versions"
        ADD CONSTRAINT "clinical_care_plan_versions_care_plan_id_fkey"
        FOREIGN KEY ("care_plan_id") REFERENCES "clinical_care_plans"("id") ON DELETE CASCADE;

      ALTER TABLE "clinical_care_plan_reviews"
        DROP CONSTRAINT IF EXISTS "fk_care_plan_reviews_care_plan_id";
      ALTER TABLE "clinical_care_plan_reviews"
        ADD CONSTRAINT "clinical_care_plan_reviews_care_plan_id_fkey"
        FOREIGN KEY ("care_plan_id") REFERENCES "clinical_care_plans"("id") ON DELETE CASCADE;

      ALTER TABLE "clinical_escalation_history"
        DROP CONSTRAINT IF EXISTS "fk_escalation_history_escalation_id";
      ALTER TABLE "clinical_escalation_history"
        ADD CONSTRAINT "clinical_escalation_history_escalation_id_fkey"
        FOREIGN KEY ("escalation_id") REFERENCES "clinical_escalations"("id") ON DELETE CASCADE;
    `);
  }
}
