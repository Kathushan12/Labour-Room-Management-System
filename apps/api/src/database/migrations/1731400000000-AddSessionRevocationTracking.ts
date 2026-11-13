import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionRevocationTracking1731400000000 implements MigrationInterface {
  name = 'AddSessionRevocationTracking1731400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_sessions
      ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS replaced_by_session_id UUID NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE refresh_sessions
          ADD CONSTRAINT fk_refresh_sessions_replaced_by
          FOREIGN KEY (replaced_by_session_id)
          REFERENCES refresh_sessions(id)
          ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_sessions_replaced_by
      ON refresh_sessions(replaced_by_session_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_refresh_sessions_replaced_by;
      ALTER TABLE refresh_sessions DROP CONSTRAINT IF EXISTS fk_refresh_sessions_replaced_by;
      ALTER TABLE refresh_sessions DROP COLUMN IF EXISTS replaced_by_session_id;
      ALTER TABLE refresh_sessions DROP COLUMN IF EXISTS revoked_at;
    `);
  }
}
