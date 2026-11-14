import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9ClinicalObservationsPartograph1732100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. labour_assessments
    await queryRunner.query(`
      CREATE TABLE "labour_assessments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "cervical_dilation_cm" NUMERIC(4, 1),
        "cervical_effacement_percent" INTEGER,
        "fetal_station" VARCHAR(20),
        "fetal_descent_fifths" INTEGER,
        "membrane_status" VARCHAR(30),
        "liquor_appearance" VARCHAR(50),
        "fetal_position" VARCHAR(30),
        "caput" VARCHAR(30),
        "moulding" VARCHAR(30),
        "clinical_notes" TEXT,
        "observation_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "supersedes_id" UUID REFERENCES "labour_assessments"("id"),
        "supersede_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_labour_dilation" CHECK (cervical_dilation_cm IS NULL OR (cervical_dilation_cm >= 0 AND cervical_dilation_cm <= 10.0)),
        CONSTRAINT "chk_labour_effacement" CHECK (cervical_effacement_percent IS NULL OR (cervical_effacement_percent >= 0 AND cervical_effacement_percent <= 100)),
        CONSTRAINT "chk_labour_descent" CHECK (fetal_descent_fifths IS NULL OR (fetal_descent_fifths >= 0 AND fetal_descent_fifths <= 5)),
        CONSTRAINT "chk_labour_supersedes_has_reason" CHECK (
          (supersedes_id IS NULL AND supersede_reason IS NULL) OR
          (supersedes_id IS NOT NULL AND supersede_reason IS NOT NULL)
        )
      );

      CREATE INDEX "idx_labour_assessments_admission_id" ON "labour_assessments"("admission_id");
      CREATE INDEX "idx_labour_assessments_timestamp" ON "labour_assessments"("observation_timestamp");
      CREATE INDEX "idx_labour_assessments_supersedes_id" ON "labour_assessments"("supersedes_id");
    `);

    // 2. contraction_observations
    await queryRunner.query(`
      CREATE TABLE "contraction_observations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "contractions_count" INTEGER NOT NULL,
        "observation_window_minutes" INTEGER NOT NULL DEFAULT 10,
        "duration_seconds" INTEGER,
        "intensity" VARCHAR(30),
        "clinical_notes" TEXT,
        "observation_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "supersedes_id" UUID REFERENCES "contraction_observations"("id"),
        "supersede_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_contractions_count_positive" CHECK (contractions_count >= 0),
        CONSTRAINT "chk_contractions_window_positive" CHECK (observation_window_minutes > 0),
        CONSTRAINT "chk_contractions_supersedes_has_reason" CHECK (
          (supersedes_id IS NULL AND supersede_reason IS NULL) OR
          (supersedes_id IS NOT NULL AND supersede_reason IS NOT NULL)
        ),
        CONSTRAINT "chk_contractions_intensity" CHECK (intensity IS NULL OR intensity IN ('MILD', 'MODERATE', 'STRONG'))
      );

      CREATE INDEX "idx_contraction_observations_admission_id" ON "contraction_observations"("admission_id");
      CREATE INDEX "idx_contraction_observations_timestamp" ON "contraction_observations"("observation_timestamp");
      CREATE INDEX "idx_contraction_observations_supersedes_id" ON "contraction_observations"("supersedes_id");
    `);

    // 3. clinical_observation_amendments
    await queryRunner.query(`
      CREATE TABLE "clinical_observation_amendments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "observation_type" VARCHAR(50) NOT NULL,
        "original_observation_id" UUID NOT NULL,
        "amended_observation_id" UUID NOT NULL,
        "amended_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "amendment_reason" TEXT NOT NULL,
        "previous_values" JSONB NOT NULL,
        "amended_values" JSONB NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_amendments_type" CHECK (observation_type IN ('MATERNAL', 'FETAL', 'LABOUR_ASSESSMENT', 'CONTRACTION'))
      );

      CREATE INDEX "idx_amendments_admission_id" ON "clinical_observation_amendments"("admission_id");
      CREATE INDEX "idx_amendments_original_id" ON "clinical_observation_amendments"("original_observation_id");
      CREATE INDEX "idx_amendments_amended_id" ON "clinical_observation_amendments"("amended_observation_id");
      CREATE INDEX "idx_amendments_type" ON "clinical_observation_amendments"("observation_type");
      CREATE INDEX "idx_amendments_created_at" ON "clinical_observation_amendments"("created_at");
    `);

    // 4. Harden foreign key constraints on maternal_observations and fetal_observations to prevent CASCADE deletion
    await queryRunner.query(`
      ALTER TABLE "maternal_observations" DROP CONSTRAINT IF EXISTS "maternal_observations_admission_id_fkey";
      ALTER TABLE "maternal_observations" ADD CONSTRAINT "maternal_observations_admission_id_fkey"
        FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT;

      ALTER TABLE "fetal_observations" DROP CONSTRAINT IF EXISTS "fetal_observations_admission_id_fkey";
      ALTER TABLE "fetal_observations" ADD CONSTRAINT "fetal_observations_admission_id_fkey"
        FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore CASCADE on maternal/fetal observations
    await queryRunner.query(`
      ALTER TABLE "fetal_observations" DROP CONSTRAINT IF EXISTS "fetal_observations_admission_id_fkey";
      ALTER TABLE "fetal_observations" ADD CONSTRAINT "fetal_observations_admission_id_fkey"
        FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE;

      ALTER TABLE "maternal_observations" DROP CONSTRAINT IF EXISTS "maternal_observations_admission_id_fkey";
      ALTER TABLE "maternal_observations" ADD CONSTRAINT "maternal_observations_admission_id_fkey"
        FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query('DROP TABLE IF EXISTS "clinical_observation_amendments" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "contraction_observations" CASCADE;');
    await queryRunner.query('DROP TABLE IF EXISTS "labour_assessments" CASCADE;');
  }
}
