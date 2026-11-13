import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase7WardBedCleaningAndTurnover1731900000000 implements MigrationInterface {
  name = 'Phase7WardBedCleaningAndTurnover1731900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend beds table with decoupled cleaning_status and check constraint
    await queryRunner.query(`
      ALTER TABLE "beds" ADD COLUMN IF NOT EXISTS "cleaning_status" VARCHAR(30) NOT NULL DEFAULT 'CLEAN';
      CREATE INDEX IF NOT EXISTS "idx_beds_cleaning_status" ON "beds" ("cleaning_status");
      
      ALTER TABLE "beds" DROP CONSTRAINT IF EXISTS "chk_bed_cleaning_status";
      ALTER TABLE "beds" ADD CONSTRAINT "chk_bed_cleaning_status" 
        CHECK ("cleaning_status" IN ('CLEAN', 'CLEANING_REQUIRED', 'IN_PROGRESS'));
    `);

    // 2. Create bed_cleaning_records table for audited turnover tracking
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bed_cleaning_records" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "bed_id" UUID NOT NULL REFERENCES "beds"("id") ON DELETE CASCADE,
        "started_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completed_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "completed_at" TIMESTAMPTZ,
        "status" VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_bed_cleaning_status_values" CHECK ("status" IN ('IN_PROGRESS', 'COMPLETED')),
        CONSTRAINT "chk_bed_cleaning_completed_after_started" CHECK ("completed_at" IS NULL OR "completed_at" >= "started_at")
      );

      CREATE INDEX IF NOT EXISTS "idx_bed_cleaning_records_bed_id" ON "bed_cleaning_records" ("bed_id");
      CREATE INDEX IF NOT EXISTS "idx_bed_cleaning_records_status" ON "bed_cleaning_records" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "bed_cleaning_records";
      ALTER TABLE "beds" DROP CONSTRAINT IF EXISTS "chk_bed_cleaning_status";
      DROP INDEX IF EXISTS "idx_beds_cleaning_status";
      ALTER TABLE "beds" DROP COLUMN IF EXISTS "cleaning_status";
    `);
  }
}
