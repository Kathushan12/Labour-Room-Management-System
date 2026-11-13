import { MigrationInterface, QueryRunner } from 'typeorm';
import { encryptionService } from '../../common/crypto/encryption.service.js';

export class HardenStaffProfilesAndEncryptContact1731600000000 implements MigrationInterface {
  name = 'HardenStaffProfilesAndEncryptContact1731600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Replace ON DELETE CASCADE FK on staff_profiles.user_id with ON DELETE RESTRICT
    await queryRunner.query(`
      DO $$
      DECLARE
        fk_record RECORD;
      BEGIN
        FOR fk_record IN
          SELECT con.conname
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
          WHERE nsp.nspname = 'public'
            AND rel.relname = 'staff_profiles'
            AND con.contype = 'f'
            AND att.attname = 'user_id'
        LOOP
          EXECUTE format('ALTER TABLE "staff_profiles" DROP CONSTRAINT %I;', fk_record.conname);
        END LOOP;
      END $$;

      ALTER TABLE "staff_profiles"
      ADD CONSTRAINT "fk_staff_profiles_user_id"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    `);

    // 2. Add AES-256-GCM binary BYTEA columns + key_version matching PatientPii architecture
    await queryRunner.query(`
      ALTER TABLE "staff_profiles"
      ADD COLUMN IF NOT EXISTS "contact_number_ciphertext" BYTEA NULL,
      ADD COLUMN IF NOT EXISTS "contact_number_nonce" BYTEA NULL,
      ADD COLUMN IF NOT EXISTS "contact_number_auth_tag" BYTEA NULL,
      ADD COLUMN IF NOT EXISTS "key_version" VARCHAR(10) NOT NULL DEFAULT 'v1';
    `);

    // 3. Encrypt and migrate any existing plaintext contact_number values without data loss
    const hasPlaintextColumn = (await queryRunner.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff_profiles'
        AND column_name = 'contact_number';
    `)) as Array<{ '?column?': number }>;

    if (hasPlaintextColumn.length > 0) {
      const existingRows = (await queryRunner.query(`
        SELECT "id", "contact_number"
        FROM "staff_profiles"
        WHERE "contact_number" IS NOT NULL AND "contact_number" <> '';
      `)) as Array<{ id: string; contact_number: string }>;

      for (const row of existingRows) {
        const encrypted = encryptionService.encrypt(row.contact_number);
        await queryRunner.query(
          `
            UPDATE "staff_profiles"
            SET "contact_number_ciphertext" = $1,
                "contact_number_nonce" = $2,
                "contact_number_auth_tag" = $3,
                "key_version" = $4
            WHERE "id" = $5;
          `,
          [encrypted.ciphertext, encrypted.nonce, encrypted.authTag, encrypted.keyVersion, row.id],
        );
      }

      // Remove plaintext contact_number column once all rows are encrypted
      await queryRunner.query(`
        ALTER TABLE "staff_profiles"
        DROP COLUMN IF EXISTS "contact_number";
      `);
    }

    // 4. Enforce atomic binary tuple integrity on encrypted contact columns
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_staff_profiles_contact_encryption_tuple'
        ) THEN
          ALTER TABLE "staff_profiles"
          ADD CONSTRAINT "chk_staff_profiles_contact_encryption_tuple" CHECK (
            (
              "contact_number_ciphertext" IS NULL AND
              "contact_number_nonce" IS NULL AND
              "contact_number_auth_tag" IS NULL
            ) OR (
              "contact_number_ciphertext" IS NOT NULL AND
              "contact_number_nonce" IS NOT NULL AND
              "contact_number_auth_tag" IS NOT NULL AND
              octet_length("contact_number_nonce") = 12 AND
              octet_length("contact_number_auth_tag") = 16
            )
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove encrypted tuple constraint and re-add plaintext column reversibly
    await queryRunner.query(`
      ALTER TABLE "staff_profiles"
      DROP CONSTRAINT IF EXISTS "chk_staff_profiles_contact_encryption_tuple";

      ALTER TABLE "staff_profiles"
      ADD COLUMN IF NOT EXISTS "contact_number" VARCHAR(30) NULL;
    `);

    const encryptedRows = (await queryRunner.query(`
      SELECT "id", "contact_number_ciphertext", "contact_number_nonce", "contact_number_auth_tag", "key_version"
      FROM "staff_profiles"
      WHERE "contact_number_ciphertext" IS NOT NULL
        AND "contact_number_nonce" IS NOT NULL
        AND "contact_number_auth_tag" IS NOT NULL;
    `)) as Array<{
      id: string;
      contact_number_ciphertext: Buffer;
      contact_number_nonce: Buffer;
      contact_number_auth_tag: Buffer;
      key_version: string;
    }>;

    for (const row of encryptedRows) {
      const plaintext = encryptionService.decrypt({
        ciphertext: row.contact_number_ciphertext,
        nonce: row.contact_number_nonce,
        authTag: row.contact_number_auth_tag,
        keyVersion: row.key_version,
      });
      await queryRunner.query(
        `UPDATE "staff_profiles" SET "contact_number" = $1 WHERE "id" = $2;`,
        [plaintext, row.id],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "staff_profiles"
      DROP COLUMN IF EXISTS "key_version",
      DROP COLUMN IF EXISTS "contact_number_auth_tag",
      DROP COLUMN IF EXISTS "contact_number_nonce",
      DROP COLUMN IF EXISTS "contact_number_ciphertext";
    `);

    // 2. Restore prior FK behavior cleanly for full rollback compatibility
    await queryRunner.query(`
      ALTER TABLE "staff_profiles" DROP CONSTRAINT IF EXISTS "fk_staff_profiles_user_id";
      ALTER TABLE "staff_profiles"
      ADD CONSTRAINT "staff_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }
}
