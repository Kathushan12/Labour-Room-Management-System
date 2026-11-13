import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceUniqueNicBlindIndex1731800000000 implements MigrationInterface {
  name = 'EnforceUniqueNicBlindIndex1731800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the non-unique index if it exists, and replace with a partial unique index
    // enforcing at most one patient per non-null NIC blind index at the database engine level.
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_patient_pii_nic_blind_index";
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_patient_pii_nic_blind_index"
      ON "patient_pii" ("nic_blind_index")
      WHERE "nic_blind_index" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "uq_patient_pii_nic_blind_index";
      CREATE INDEX IF NOT EXISTS "idx_patient_pii_nic_blind_index"
      ON "patient_pii" ("nic_blind_index");
    `);
  }
}
