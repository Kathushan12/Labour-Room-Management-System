import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8StaffShiftsAndPatientAssignments1732000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. staff_ward_assignments
    await queryRunner.query(`
      CREATE TABLE "staff_ward_assignments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "ward_id" UUID NOT NULL REFERENCES "wards"("id") ON DELETE RESTRICT,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ended_at" TIMESTAMPTZ,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "assigned_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "ended_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX "idx_staff_ward_assignments_user_id" ON "staff_ward_assignments"("user_id");
      CREATE INDEX "idx_staff_ward_assignments_ward_id" ON "staff_ward_assignments"("ward_id");
      CREATE INDEX "idx_staff_ward_assignments_ward_active" ON "staff_ward_assignments"("ward_id", "is_active");
      CREATE INDEX "idx_staff_ward_assignments_ended_at" ON "staff_ward_assignments"("ended_at");
      CREATE UNIQUE INDEX "idx_unique_active_staff_ward" ON "staff_ward_assignments"("user_id", "ward_id") WHERE is_active = true AND ended_at IS NULL;
    `);

    // 2. shifts
    await queryRunner.query(`
      CREATE TABLE "shifts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ward_id" UUID NOT NULL REFERENCES "wards"("id") ON DELETE RESTRICT,
        "shift_type" VARCHAR(30) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "starts_at" TIMESTAMPTZ NOT NULL,
        "ends_at" TIMESTAMPTZ NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        "created_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_shifts_time_window" CHECK (ends_at > starts_at),
        CONSTRAINT "chk_shifts_status" CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
        CONSTRAINT "chk_shifts_type" CHECK (shift_type IN ('MORNING', 'EVENING', 'NIGHT', 'CUSTOM'))
      );

      CREATE INDEX "idx_shifts_ward_window" ON "shifts"("ward_id", "starts_at", "ends_at");
      CREATE INDEX "idx_shifts_ward_id" ON "shifts"("ward_id");
      CREATE INDEX "idx_shifts_status" ON "shifts"("status");
    `);

    // 3. shift_staff_assignments
    await queryRunner.query(`
      CREATE TABLE "shift_staff_assignments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "shift_id" UUID NOT NULL REFERENCES "shifts"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "role_in_shift" VARCHAR(50) NOT NULL DEFAULT 'STAFF',
        "status" VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
        "assigned_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "cancelled_at" TIMESTAMPTZ,
        "cancelled_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "cancellation_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_shift_staff_status" CHECK (status IN ('ASSIGNED', 'CONFIRMED', 'CANCELLED'))
      );

      CREATE INDEX "idx_shift_staff_assignments_shift_id" ON "shift_staff_assignments"("shift_id");
      CREATE INDEX "idx_shift_staff_assignments_user_id" ON "shift_staff_assignments"("user_id");
      CREATE INDEX "idx_shift_staff_assignments_status" ON "shift_staff_assignments"("status");
      CREATE UNIQUE INDEX "idx_unique_shift_staff" ON "shift_staff_assignments"("shift_id", "user_id") WHERE status != 'CANCELLED';
    `);

    // 4. shift_handovers
    await queryRunner.query(`
      CREATE TABLE "shift_handovers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "shift_id" UUID NOT NULL REFERENCES "shifts"("id") ON DELETE RESTRICT,
        "outgoing_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "incoming_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "handover_notes" TEXT NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        "acknowledged_at" TIMESTAMPTZ,
        "acknowledgement_notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_shift_handovers_status" CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'REJECTED'))
      );

      CREATE INDEX "idx_shift_handovers_shift_id" ON "shift_handovers"("shift_id");
      CREATE INDEX "idx_shift_handovers_incoming_status" ON "shift_handovers"("incoming_user_id", "status");
      CREATE INDEX "idx_shift_handovers_outgoing_user_id" ON "shift_handovers"("outgoing_user_id");
    `);

    // 5. patient_staff_assignments extensions
    await queryRunner.query(`
      ALTER TABLE "patient_staff_assignments"
        ADD COLUMN IF NOT EXISTS "end_reason" TEXT;

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_active_attending_doctor"
        ON "patient_staff_assignments"("admission_id")
        WHERE assignment_role = 'ATTENDING_DOCTOR' AND unassigned_at IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_active_primary_nurse"
        ON "patient_staff_assignments"("admission_id")
        WHERE assignment_role = 'PRIMARY_NURSE' AND unassigned_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_unique_active_primary_nurse";
      DROP INDEX IF EXISTS "idx_unique_active_attending_doctor";
      ALTER TABLE "patient_staff_assignments" DROP COLUMN IF EXISTS "end_reason";

      DROP TABLE IF EXISTS "shift_handovers" CASCADE;
      DROP TABLE IF EXISTS "shift_staff_assignments" CASCADE;
      DROP TABLE IF EXISTS "shifts" CASCADE;
      DROP TABLE IF EXISTS "staff_ward_assignments" CASCADE;
    `);
  }
}
