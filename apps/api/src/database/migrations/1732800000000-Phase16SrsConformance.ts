import { MigrationInterface, QueryRunner } from 'typeorm';

// Aligns stored values with the SRS (12 Nov 2026): enum names, Admission Ref ID format,
// gestation on admission, escalation reasons, discharge destinations, PostgreSQL enum types
// and immutability of clinical, alert and audit records.
export class Phase16SrsConformance1732800000000 implements MigrationInterface {
  name = 'Phase16SrsConformance1732800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "admissions" SET "admission_category" = 'PLANNED_CESAREAN' WHERE "admission_category" = 'SCHEDULED_CESAREAN';
      UPDATE "admissions" SET "admission_category" = 'OBSERVATION_20PLUS' WHERE "admission_category" = 'OBSERVATION_20_PLUS_WEEKS';
      UPDATE "admissions" SET "current_care_plan" = 'PLANNED_CESAREAN' WHERE "current_care_plan" = 'SCHEDULED_CESAREAN';
      UPDATE "admissions" SET "current_care_plan" = 'OBSERVATION_20PLUS' WHERE "current_care_plan" = 'OBSERVATION_20_PLUS_WEEKS';
      UPDATE "care_plan_transitions" SET "previous_state" = 'PLANNED_CESAREAN' WHERE "previous_state" = 'SCHEDULED_CESAREAN';
      UPDATE "care_plan_transitions" SET "previous_state" = 'OBSERVATION_20PLUS' WHERE "previous_state" = 'OBSERVATION_20_PLUS_WEEKS';
      UPDATE "care_plan_transitions" SET "new_state" = 'PLANNED_CESAREAN' WHERE "new_state" = 'SCHEDULED_CESAREAN';
      UPDATE "care_plan_transitions" SET "new_state" = 'OBSERVATION_20PLUS' WHERE "new_state" = 'OBSERVATION_20_PLUS_WEEKS';

      UPDATE "risk_flag_definitions" SET "key" = 'PRIOR_CESAREAN', "label" = 'Prior Cesarean Section' WHERE "key" = 'PREVIOUS_CESAREAN';
      UPDATE "risk_flag_definitions" SET "key" = 'OBSERVATION_20PLUS' WHERE "key" = 'OBSERVATION_20_PLUS_WEEKS';
      UPDATE "risk_flag_definitions" SET "is_active" = false WHERE "key" = 'OTHER';

      -- REQ-3.1: ADM-YYYYMM-NNNN becomes LR-YYMM-NNNN.
      UPDATE "admissions"
        SET "admission_reference_id" = 'LR-' || substr("admission_reference_id", 7, 4) || '-' || substr("admission_reference_id", 12)
        WHERE "admission_reference_id" ~ '^ADM-[0-9]{6}-[0-9]+$';
      ALTER TABLE "admissions"
        ADD CONSTRAINT "chk_admission_reference_format" CHECK ("admission_reference_id" ~ '^LR-[0-9]{4}-[0-9]{4,}$');

      UPDATE "deliveries" SET "delivery_mode" = CASE
          WHEN "delivery_mode" IN ('SPONTANEOUS_VAGINAL', 'BREECH_VAGINAL', 'VAGINAL_BREECH') THEN 'NORMAL'
          WHEN "delivery_mode" IN ('ASSISTED_VACUUM', 'ASSISTED_FORCEPS') THEN 'ASSISTED'
          WHEN "delivery_mode" IN ('EMERGENCY_CESAREAN', 'ELECTIVE_CESAREAN') THEN 'CESAREAN'
          ELSE "delivery_mode" END;

      UPDATE "fetal_observations" SET "liquor_status" = CASE
          WHEN upper("liquor_status") IN ('INTACT', 'CLEAR') THEN upper("liquor_status")
          WHEN upper("liquor_status") LIKE 'MECONIUM%' THEN 'MECONIUM'
          WHEN upper("liquor_status") LIKE 'BLOOD%' THEN 'BLOOD'
          ELSE NULL END
        WHERE "liquor_status" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TYPE "lrms_care_pathway" AS ENUM ('NORMAL_DELIVERY', 'PLANNED_CESAREAN', 'OBSERVATION_20PLUS');
      CREATE TYPE "lrms_care_plan_state" AS ENUM ('OBSERVATION_20PLUS', 'NORMAL_DELIVERY', 'PLANNED_CESAREAN', 'EMERGENCY_CESAREAN', 'DELIVERED', 'DISCHARGED');
      CREATE TYPE "lrms_admission_status" AS ENUM ('ADMITTED', 'TRANSFERRED', 'DISCHARGED');
      CREATE TYPE "lrms_bed_functioning_status" AS ENUM ('FUNCTIONING', 'OUT_OF_SERVICE');
      CREATE TYPE "lrms_bed_occupancy_status" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING');
      CREATE TYPE "lrms_escalation_reason" AS ENUM ('FETAL_DISTRESS', 'FAILURE_TO_PROGRESS', 'MATERNAL_COMPLICATION', 'OTHER');
      CREATE TYPE "lrms_delivery_mode" AS ENUM ('NORMAL', 'ASSISTED', 'CESAREAN');
      CREATE TYPE "lrms_amniotic_fluid" AS ENUM ('INTACT', 'CLEAR', 'MECONIUM', 'BLOOD');

      ALTER TABLE "admissions"
        ALTER COLUMN "admission_category" TYPE "lrms_care_pathway" USING "admission_category"::"lrms_care_pathway",
        ALTER COLUMN "current_care_plan" TYPE "lrms_care_plan_state" USING "current_care_plan"::"lrms_care_plan_state",
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE "lrms_admission_status" USING "status"::"lrms_admission_status",
        ALTER COLUMN "status" SET DEFAULT 'ADMITTED';

      ALTER TABLE "care_plan_transitions"
        ALTER COLUMN "previous_state" TYPE "lrms_care_plan_state" USING "previous_state"::"lrms_care_plan_state",
        ALTER COLUMN "new_state" TYPE "lrms_care_plan_state" USING "new_state"::"lrms_care_plan_state";

      ALTER TABLE "beds"
        ALTER COLUMN "functioning_status" DROP DEFAULT,
        ALTER COLUMN "functioning_status" TYPE "lrms_bed_functioning_status" USING "functioning_status"::"lrms_bed_functioning_status",
        ALTER COLUMN "functioning_status" SET DEFAULT 'FUNCTIONING',
        ALTER COLUMN "occupancy_status" DROP DEFAULT,
        ALTER COLUMN "occupancy_status" TYPE "lrms_bed_occupancy_status" USING "occupancy_status"::"lrms_bed_occupancy_status",
        ALTER COLUMN "occupancy_status" SET DEFAULT 'AVAILABLE';

      ALTER TABLE "deliveries"
        ALTER COLUMN "delivery_mode" TYPE "lrms_delivery_mode" USING "delivery_mode"::"lrms_delivery_mode";

      ALTER TABLE "fetal_observations"
        ALTER COLUMN "liquor_status" TYPE "lrms_amniotic_fluid" USING "liquor_status"::"lrms_amniotic_fluid";
    `);

    await queryRunner.query(`
      -- REQ-3.2 / REQ-3.8: gestation recorded at admission, 20-44 weeks. Older rows have none.
      ALTER TABLE "admissions"
        ADD COLUMN "gestation_weeks" SMALLINT,
        ADD CONSTRAINT "chk_admission_gestation_weeks" CHECK ("gestation_weeks" IS NULL OR "gestation_weeks" BETWEEN 20 AND 44);

      -- REQ-6.3: escalation reason. Older escalations have none.
      ALTER TABLE "clinical_escalations"
        ADD COLUMN "reason_code" "lrms_escalation_reason";

      -- REQ-6.6: reversal of an emergency escalation by a doctor.
      ALTER TABLE "clinical_escalations"
        ADD COLUMN "care_plan_transition_id" UUID REFERENCES "care_plan_transitions"("id"),
        ADD COLUMN "reversed_at" TIMESTAMPTZ,
        ADD COLUMN "reversed_by_user_id" UUID REFERENCES "users"("id"),
        ADD COLUMN "reversal_reason" TEXT,
        ADD CONSTRAINT "chk_escalation_reversal_has_reason" CHECK (
          "reversed_at" IS NULL OR ("reversed_by_user_id" IS NOT NULL AND "reversal_reason" IS NOT NULL)
        );

      -- REQ-8.2: maternal discharge destinations.
      ALTER TABLE "postpartum_discharge_authorizations"
        ADD CONSTRAINT "chk_maternal_discharge_destination" CHECK (
          "discharged_entity_type" <> 'MATERNAL'
          OR "discharge_destination" IN ('POSTNATAL', 'ANTENATAL', 'THEATRE', 'ICU', 'OTHER')
        );
    `);

    // DB 6.1 / REQ-5.6 / REQ-7.10 / REQ-9.6: users can never delete clinical, alert or audit
    // records; observations and audit entries can never be edited either.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "fn_lrms_block_change"()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION '% on % is not permitted', TG_OP, TG_TABLE_NAME
          USING ERRCODE = 'insufficient_privilege';
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER "trg_audit_logs_immutable" BEFORE UPDATE OR DELETE ON "audit_logs"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_maternal_observations_immutable" BEFORE UPDATE OR DELETE ON "maternal_observations"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_fetal_observations_immutable" BEFORE UPDATE OR DELETE ON "fetal_observations"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_labour_assessments_immutable" BEFORE UPDATE OR DELETE ON "labour_assessments"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_contraction_observations_immutable" BEFORE UPDATE OR DELETE ON "contraction_observations"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_admissions_no_delete" BEFORE DELETE ON "admissions"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_clinical_escalations_no_delete" BEFORE DELETE ON "clinical_escalations"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_care_plan_transitions_immutable" BEFORE UPDATE OR DELETE ON "care_plan_transitions"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_emergency_alerts_no_delete" BEFORE DELETE ON "emergency_alerts"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_alert_recipients_no_delete" BEFORE DELETE ON "alert_recipients"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_deliveries_no_delete" BEFORE DELETE ON "deliveries"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
      CREATE TRIGGER "trg_discharge_auth_no_delete" BEFORE DELETE ON "postpartum_discharge_authorizations"
        FOR EACH ROW EXECUTE FUNCTION "fn_lrms_block_change"();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_audit_logs_immutable" ON "audit_logs";
      DROP TRIGGER IF EXISTS "trg_maternal_observations_immutable" ON "maternal_observations";
      DROP TRIGGER IF EXISTS "trg_fetal_observations_immutable" ON "fetal_observations";
      DROP TRIGGER IF EXISTS "trg_labour_assessments_immutable" ON "labour_assessments";
      DROP TRIGGER IF EXISTS "trg_contraction_observations_immutable" ON "contraction_observations";
      DROP TRIGGER IF EXISTS "trg_admissions_no_delete" ON "admissions";
      DROP TRIGGER IF EXISTS "trg_clinical_escalations_no_delete" ON "clinical_escalations";
      DROP TRIGGER IF EXISTS "trg_care_plan_transitions_immutable" ON "care_plan_transitions";
      DROP TRIGGER IF EXISTS "trg_emergency_alerts_no_delete" ON "emergency_alerts";
      DROP TRIGGER IF EXISTS "trg_alert_recipients_no_delete" ON "alert_recipients";
      DROP TRIGGER IF EXISTS "trg_deliveries_no_delete" ON "deliveries";
      DROP TRIGGER IF EXISTS "trg_discharge_auth_no_delete" ON "postpartum_discharge_authorizations";
      DROP FUNCTION IF EXISTS "fn_lrms_block_change"();

      ALTER TABLE "postpartum_discharge_authorizations" DROP CONSTRAINT IF EXISTS "chk_maternal_discharge_destination";
      ALTER TABLE "clinical_escalations"
        DROP CONSTRAINT IF EXISTS "chk_escalation_reversal_has_reason",
        DROP COLUMN IF EXISTS "reversal_reason",
        DROP COLUMN IF EXISTS "reversed_by_user_id",
        DROP COLUMN IF EXISTS "reversed_at",
        DROP COLUMN IF EXISTS "care_plan_transition_id",
        DROP COLUMN IF EXISTS "reason_code";
      ALTER TABLE "admissions"
        DROP CONSTRAINT IF EXISTS "chk_admission_gestation_weeks",
        DROP COLUMN IF EXISTS "gestation_weeks",
        DROP CONSTRAINT IF EXISTS "chk_admission_reference_format";

      ALTER TABLE "fetal_observations" ALTER COLUMN "liquor_status" TYPE VARCHAR(50);
      ALTER TABLE "deliveries" ALTER COLUMN "delivery_mode" TYPE VARCHAR(50);
      ALTER TABLE "beds"
        ALTER COLUMN "functioning_status" DROP DEFAULT,
        ALTER COLUMN "functioning_status" TYPE VARCHAR(30),
        ALTER COLUMN "functioning_status" SET DEFAULT 'FUNCTIONING',
        ALTER COLUMN "occupancy_status" DROP DEFAULT,
        ALTER COLUMN "occupancy_status" TYPE VARCHAR(30),
        ALTER COLUMN "occupancy_status" SET DEFAULT 'AVAILABLE';
      ALTER TABLE "care_plan_transitions"
        ALTER COLUMN "previous_state" TYPE VARCHAR(50),
        ALTER COLUMN "new_state" TYPE VARCHAR(50);
      ALTER TABLE "admissions"
        ALTER COLUMN "admission_category" TYPE VARCHAR(50),
        ALTER COLUMN "current_care_plan" TYPE VARCHAR(50),
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE VARCHAR(30),
        ALTER COLUMN "status" SET DEFAULT 'ADMITTED';

      DROP TYPE IF EXISTS "lrms_amniotic_fluid";
      DROP TYPE IF EXISTS "lrms_delivery_mode";
      DROP TYPE IF EXISTS "lrms_escalation_reason";
      DROP TYPE IF EXISTS "lrms_bed_occupancy_status";
      DROP TYPE IF EXISTS "lrms_bed_functioning_status";
      DROP TYPE IF EXISTS "lrms_admission_status";
      DROP TYPE IF EXISTS "lrms_care_plan_state";
      DROP TYPE IF EXISTS "lrms_care_pathway";

      UPDATE "risk_flag_definitions" SET "key" = 'PREVIOUS_CESAREAN' WHERE "key" = 'PRIOR_CESAREAN';
      UPDATE "risk_flag_definitions" SET "key" = 'OBSERVATION_20_PLUS_WEEKS' WHERE "key" = 'OBSERVATION_20PLUS';
      UPDATE "admissions" SET "admission_category" = 'SCHEDULED_CESAREAN' WHERE "admission_category" = 'PLANNED_CESAREAN';
      UPDATE "admissions" SET "admission_category" = 'OBSERVATION_20_PLUS_WEEKS' WHERE "admission_category" = 'OBSERVATION_20PLUS';
    `);
  }
}
