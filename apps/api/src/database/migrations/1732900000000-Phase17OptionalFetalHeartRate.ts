import { MigrationInterface, QueryRunner } from 'typeorm';

// REQ-5.2: an entry needs at least one value, so amniotic fluid can be recorded without a fetal heart rate.
export class Phase17OptionalFetalHeartRate1732900000000 implements MigrationInterface {
  name = 'Phase17OptionalFetalHeartRate1732900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fetal_observations" ALTER COLUMN "fetal_heart_rate_bpm" DROP NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "fetal_observations"
        ADD CONSTRAINT "chk_fetal_observation_has_value"
        CHECK ("fetal_heart_rate_bpm" IS NOT NULL OR "liquor_status" IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fetal_observations" DROP CONSTRAINT IF EXISTS "chk_fetal_observation_has_value"`,
    );
    // Fails if fluid-only entries exist; clinical records are never deleted by a rollback.
    await queryRunner.query(
      `ALTER TABLE "fetal_observations" ALTER COLUMN "fetal_heart_rate_bpm" SET NOT NULL`,
    );
  }
}
