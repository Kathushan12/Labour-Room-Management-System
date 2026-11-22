import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase15SessionLifetimeAndLockout1732700000000 implements MigrationInterface {
  name = 'Phase15SessionLifetimeAndLockout1732700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMPTZ NULL;

      ALTER TABLE "refresh_sessions"
        ADD COLUMN IF NOT EXISTS "session_started_at" TIMESTAMPTZ NULL;

      -- The absolute lifetime (REQ-1.5) is measured from the login that started the family.
      UPDATE "refresh_sessions" rs
        SET "session_started_at" = f.started_at
        FROM (
          SELECT "family_id", MIN("created_at") AS started_at
          FROM "refresh_sessions"
          GROUP BY "family_id"
        ) f
        WHERE rs."family_id" = f."family_id" AND rs."session_started_at" IS NULL;

      ALTER TABLE "refresh_sessions"
        ALTER COLUMN "session_started_at" SET DEFAULT now(),
        ALTER COLUMN "session_started_at" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_sessions" DROP COLUMN IF EXISTS "session_started_at";
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "locked_until",
        DROP COLUMN IF EXISTS "failed_login_attempts";
    `);
  }
}
