import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase13OperationalAnalyticsIndexes1732500000000 implements MigrationInterface {
  name = 'Phase13OperationalAnalyticsIndexes1732500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Indexes to optimize Phase 13 Hospital Operational Analytics, ALOS & Performance queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_admissions_discharged_at" 
        ON "admissions" ("discharged_at");

      CREATE INDEX IF NOT EXISTS "idx_deliveries_delivery_timestamp" 
        ON "deliveries" ("delivery_timestamp");

      CREATE INDEX IF NOT EXISTS "idx_newborns_birth_timestamp" 
        ON "newborns" ("birth_timestamp");

      CREATE INDEX IF NOT EXISTS "idx_bed_cleaning_records_completed_at" 
        ON "bed_cleaning_records" ("completed_at");

      CREATE INDEX IF NOT EXISTS "idx_postpartum_discharge_authorizations_discharged_at" 
        ON "postpartum_discharge_authorizations" ("discharged_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_postpartum_discharge_authorizations_discharged_at";
      DROP INDEX IF EXISTS "idx_bed_cleaning_records_completed_at";
      DROP INDEX IF EXISTS "idx_newborns_birth_timestamp";
      DROP INDEX IF EXISTS "idx_deliveries_delivery_timestamp";
      DROP INDEX IF EXISTS "idx_admissions_discharged_at";
    `);
  }
}

