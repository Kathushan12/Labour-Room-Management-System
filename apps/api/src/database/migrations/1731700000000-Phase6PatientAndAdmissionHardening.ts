import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6PatientAndAdmissionHardening1731700000000 implements MigrationInterface {
  name = 'Phase6PatientAndAdmissionHardening1731700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Concurrency-safe monotonic PostgreSQL sequence for ADM-YYYYMM-XXXX Reference IDs
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "seq_admission_reference_number"
      START WITH 1
      INCREMENT BY 1
      NO MINVALUE
      NO MAXVALUE
      NO CYCLE;
    `);

    // 2. Prevent accidental deletion of historical patient records (ON DELETE RESTRICT)
    await queryRunner.query(`
      DO $$
      DECLARE
        fk_rec RECORD;
      BEGIN
        FOR fk_rec IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
          WHERE nsp.nspname = 'public'
            AND rel.relname = 'admissions'
            AND con.contype = 'f'
            AND att.attname = 'patient_id'
        LOOP
          EXECUTE format('ALTER TABLE "admissions" DROP CONSTRAINT %I;', fk_rec.conname);
        END LOOP;

        FOR fk_rec IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
          WHERE nsp.nspname = 'public'
            AND rel.relname = 'patient_pii'
            AND con.contype = 'f'
            AND att.attname = 'patient_id'
        LOOP
          EXECUTE format('ALTER TABLE "patient_pii" DROP CONSTRAINT %I;', fk_rec.conname);
        END LOOP;
      END $$;

      ALTER TABLE "admissions"
      ADD CONSTRAINT "fk_admissions_patient_id"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

      ALTER TABLE "patient_pii"
      ADD CONSTRAINT "fk_patient_pii_patient_id"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    `);

    // 3. Triage risk assessment confirmation columns + admitted_at index on admissions
    await queryRunner.query(`
      ALTER TABLE "admissions"
      ADD COLUMN IF NOT EXISTS "no_listed_risk_flags_confirmed" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "risk_assessment_completed_at" TIMESTAMPTZ NULL;

      CREATE INDEX IF NOT EXISTS "idx_admissions_admitted_at" ON "admissions"("admitted_at");
    `);

    // 4. Historical risk-flag deactivation provenance on admission_risk_flags
    await queryRunner.query(`
      ALTER TABLE "admission_risk_flags"
      ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS "deactivated_by_user_id" UUID NULL REFERENCES "users"("id");
    `);

    // 5. Contact phone blind-index lookup index and binary AES-256-GCM tuple constraints on patient_pii
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_patient_pii_contact_blind_index"
      ON "patient_pii"("contact_phone_blind_index");

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_pii_full_name_tuple'
        ) THEN
          ALTER TABLE "patient_pii"
          ADD CONSTRAINT "chk_patient_pii_full_name_tuple" CHECK (
            ("full_name_ciphertext" IS NULL AND "full_name_nonce" IS NULL AND "full_name_auth_tag" IS NULL) OR
            ("full_name_ciphertext" IS NOT NULL AND "full_name_nonce" IS NOT NULL AND "full_name_auth_tag" IS NOT NULL AND octet_length("full_name_nonce") = 12 AND octet_length("full_name_auth_tag") = 16)
          );
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_pii_nic_tuple'
        ) THEN
          ALTER TABLE "patient_pii"
          ADD CONSTRAINT "chk_patient_pii_nic_tuple" CHECK (
            ("nic_ciphertext" IS NULL AND "nic_nonce" IS NULL AND "nic_auth_tag" IS NULL) OR
            ("nic_ciphertext" IS NOT NULL AND "nic_nonce" IS NOT NULL AND "nic_auth_tag" IS NOT NULL AND octet_length("nic_nonce") = 12 AND octet_length("nic_auth_tag") = 16)
          );
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_pii_contact_tuple'
        ) THEN
          ALTER TABLE "patient_pii"
          ADD CONSTRAINT "chk_patient_pii_contact_tuple" CHECK (
            ("contact_phone_ciphertext" IS NULL AND "contact_phone_nonce" IS NULL AND "contact_phone_auth_tag" IS NULL) OR
            ("contact_phone_ciphertext" IS NOT NULL AND "contact_phone_nonce" IS NOT NULL AND "contact_phone_auth_tag" IS NOT NULL AND octet_length("contact_phone_nonce") = 12 AND octet_length("contact_phone_auth_tag") = 16)
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patient_pii"
      DROP CONSTRAINT IF EXISTS "chk_patient_pii_contact_tuple",
      DROP CONSTRAINT IF EXISTS "chk_patient_pii_nic_tuple",
      DROP CONSTRAINT IF EXISTS "chk_patient_pii_full_name_tuple";
      DROP INDEX IF EXISTS "idx_patient_pii_contact_blind_index";
    `);

    await queryRunner.query(`
      ALTER TABLE "admission_risk_flags"
      DROP COLUMN IF EXISTS "deactivated_by_user_id",
      DROP COLUMN IF EXISTS "deactivated_at";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_admissions_admitted_at";
      ALTER TABLE "admissions"
      DROP COLUMN IF EXISTS "risk_assessment_completed_at",
      DROP COLUMN IF EXISTS "no_listed_risk_flags_confirmed";
    `);

    await queryRunner.query(`
      ALTER TABLE "patient_pii" DROP CONSTRAINT IF EXISTS "fk_patient_pii_patient_id";
      ALTER TABLE "patient_pii"
      ADD CONSTRAINT "patient_pii_patient_id_fkey"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE;

      ALTER TABLE "admissions" DROP CONSTRAINT IF EXISTS "fk_admissions_patient_id";
      ALTER TABLE "admissions"
      ADD CONSTRAINT "admissions_patient_id_fkey"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      DROP SEQUENCE IF EXISTS "seq_admission_reference_number";
    `);
  }
}
