import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffProfilesAndPasswordLifecycle1731500000000 implements MigrationInterface {
  name = 'AddStaffProfilesAndPasswordLifecycle1731500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add credential lifecycle columns to existing users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS "temporary_password_expires_at" TIMESTAMPTZ NULL;
    `);

    // 2. Replace unique email constraint with non-unique index (Part 5 policy) and add full_name index
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
      CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
      CREATE INDEX IF NOT EXISTS "idx_users_full_name" ON "users"("full_name");
    `);

    // 3. Create normalized 1:1 staff_profiles table (reusing full_name & email on users without duplication)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_profiles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "staff_id" VARCHAR(50) NULL,
        "professional_registration_body" VARCHAR(30) NULL,
        "professional_registration_number" VARCHAR(50) NULL,
        "contact_number" VARCHAR(30) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_staff_profiles_reg_body" CHECK (
          "professional_registration_body" IS NULL OR
          "professional_registration_body" IN ('SLMC', 'SLNC', 'OTHER')
        )
      );
      CREATE INDEX IF NOT EXISTS "idx_staff_profiles_staff_id" ON "staff_profiles"("staff_id");
      CREATE INDEX IF NOT EXISTS "idx_staff_profiles_reg_number" ON "staff_profiles"("professional_registration_number");
    `);

    // 4. Migrate existing staff_registration_id cleanly into staff_profiles with zero data loss
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'staff_registration_id'
        ) THEN
          INSERT INTO "staff_profiles" ("user_id", "professional_registration_number")
          SELECT "id", "staff_registration_id"
          FROM "users"
          ON CONFLICT ("user_id") DO UPDATE
          SET "professional_registration_number" = COALESCE(
            "staff_profiles"."professional_registration_number",
            EXCLUDED."professional_registration_number"
          );

          ALTER TABLE "users" DROP COLUMN IF EXISTS "staff_registration_id";
        ELSE
          INSERT INTO "staff_profiles" ("user_id")
          SELECT "id" FROM "users"
          ON CONFLICT ("user_id") DO NOTHING;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-add staff_registration_id and restore data from staff_profiles
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staff_registration_id" VARCHAR(50) NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'staff_profiles'
        ) THEN
          UPDATE "users" u
          SET "staff_registration_id" = sp."professional_registration_number"
          FROM "staff_profiles" sp
          WHERE sp."user_id" = u."id" AND sp."professional_registration_number" IS NOT NULL;
        END IF;
      END $$;
    `);

    // 2. Drop staff_profiles
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_staff_profiles_reg_number";
      DROP INDEX IF EXISTS "idx_staff_profiles_staff_id";
      DROP TABLE IF EXISTS "staff_profiles";
    `);

    // 3. Remove Phase 5 columns and indexes from users
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_full_name";
      DROP INDEX IF EXISTS "idx_users_email";
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "temporary_password_expires_at",
      DROP COLUMN IF EXISTS "password_changed_at",
      DROP COLUMN IF EXISTS "must_change_password";
    `);

    // 4. Safely restore unique constraint on email if no duplicates exist
    await queryRunner.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
        EXCEPTION
          WHEN unique_violation THEN NULL;
          WHEN duplicate_object THEN NULL;
        END;
      END $$;
    `);
  }
}
