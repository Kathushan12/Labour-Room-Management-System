import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase14EscalationAlertReceipt1732600000000 implements MigrationInterface {
  name = 'Phase14EscalationAlertReceipt1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clinical_escalations"
        ADD COLUMN IF NOT EXISTS "dispatched_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "timed_out_at" TIMESTAMPTZ;

      UPDATE "clinical_escalations" SET "dispatched_at" = "created_at" WHERE "dispatched_at" IS NULL;

      ALTER TABLE "clinical_escalations"
        ALTER COLUMN "dispatched_at" SET DEFAULT now(),
        ALTER COLUMN "dispatched_at" SET NOT NULL;

      ALTER TABLE "clinical_escalations"
        ADD CONSTRAINT "chk_clinical_escalations_delivered_after_dispatch"
          CHECK ("delivered_at" IS NULL OR "delivered_at" >= "dispatched_at"),
        ADD CONSTRAINT "chk_clinical_escalations_ack_after_dispatch"
          CHECK ("acknowledged_at" IS NULL OR "acknowledged_at" >= "dispatched_at");

      CREATE INDEX IF NOT EXISTS "idx_clinical_escalations_open_dispatched"
        ON "clinical_escalations" ("dispatched_at") WHERE "status" = 'OPEN';
    `);

    // Alert receipt times are proof of receipt: once written they can never change (REQ-7.10).
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "fn_clinical_escalations_alert_times_immutable"()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at
          OR (OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS DISTINCT FROM OLD.delivered_at)
          OR (OLD.acknowledged_at IS NOT NULL AND NEW.acknowledged_at IS DISTINCT FROM OLD.acknowledged_at)
          OR (OLD.timed_out_at IS NOT NULL AND NEW.timed_out_at IS DISTINCT FROM OLD.timed_out_at)
        THEN
          RAISE EXCEPTION 'Alert receipt times are immutable once recorded'
            USING ERRCODE = 'check_violation';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS "trg_clinical_escalations_alert_times_immutable" ON "clinical_escalations";
      CREATE TRIGGER "trg_clinical_escalations_alert_times_immutable"
        BEFORE UPDATE ON "clinical_escalations"
        FOR EACH ROW EXECUTE FUNCTION "fn_clinical_escalations_alert_times_immutable"();
    `);

    await queryRunner.query(`
      ALTER TABLE "wards"
        ADD COLUMN IF NOT EXISTS "alert_timeout_seconds" INTEGER NOT NULL DEFAULT 120;

      ALTER TABLE "wards"
        ADD CONSTRAINT "chk_wards_alert_timeout_seconds"
          CHECK ("alert_timeout_seconds" BETWEEN 30 AND 600);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wards" DROP CONSTRAINT IF EXISTS "chk_wards_alert_timeout_seconds";
      ALTER TABLE "wards" DROP COLUMN IF EXISTS "alert_timeout_seconds";

      DROP TRIGGER IF EXISTS "trg_clinical_escalations_alert_times_immutable" ON "clinical_escalations";
      DROP FUNCTION IF EXISTS "fn_clinical_escalations_alert_times_immutable"();

      DROP INDEX IF EXISTS "idx_clinical_escalations_open_dispatched";
      ALTER TABLE "clinical_escalations"
        DROP CONSTRAINT IF EXISTS "chk_clinical_escalations_ack_after_dispatch",
        DROP CONSTRAINT IF EXISTS "chk_clinical_escalations_delivered_after_dispatch",
        DROP COLUMN IF EXISTS "timed_out_at",
        DROP COLUMN IF EXISTS "delivered_at",
        DROP COLUMN IF EXISTS "dispatched_at";
    `);
  }
}
