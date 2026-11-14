import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase12DeliveryNewbornPostpartum1732400000000 implements MigrationInterface {
  name = 'Phase12DeliveryNewbornPostpartum1732400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================================================
    // 1. TABLE 42: deliveries (Maternal Delivery Events)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deliveries" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "delivery_reference_id" VARCHAR(30) UNIQUE NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        "delivery_timestamp" TIMESTAMPTZ NOT NULL,
        "delivery_mode" VARCHAR(50) NOT NULL,
        "delivery_location" VARCHAR(100) NOT NULL,
        "attending_doctor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "responsible_midwife_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "finalized_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "finalized_at" TIMESTAMPTZ,
        "estimated_blood_loss_ml" INTEGER,
        "perineal_trauma_status" VARCHAR(50),
        "placenta_status" VARCHAR(50),
        "placenta_delivery_timestamp" TIMESTAMPTZ,
        "clinical_notes" TEXT,
        "amendment_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_delivery_status" CHECK ("status" IN ('DRAFT', 'FINALIZED')),
        CONSTRAINT "chk_delivery_blood_loss" CHECK (
          "estimated_blood_loss_ml" IS NULL OR 
          ("estimated_blood_loss_ml" >= 0 AND "estimated_blood_loss_ml" <= 10000)
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_deliveries_admission_id" ON "deliveries"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_deliveries_status" ON "deliveries"("status");
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_finalized_delivery_per_admission"
        ON "deliveries"("admission_id") WHERE "status" = 'FINALIZED';
    `);

    // ========================================================================
    // 2. TABLE 43: newborns (Individual Birth Records & Newborn Registration)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "newborns" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "delivery_id" UUID NOT NULL REFERENCES "deliveries"("id") ON DELETE RESTRICT,
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "newborn_reference_id" VARCHAR(40) UNIQUE NOT NULL,
        "birth_order" INTEGER NOT NULL,
        "birth_timestamp" TIMESTAMPTZ NOT NULL,
        "outcome" VARCHAR(30) NOT NULL,
        "sex" VARCHAR(20) NOT NULL,
        "birth_weight_grams" INTEGER NOT NULL,
        "gestational_age_weeks" INTEGER,
        "gestational_age_days" INTEGER,
        "delivered_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "discharge_status" VARCHAR(30) NOT NULL DEFAULT 'IN_CARE',
        "discharged_at" TIMESTAMPTZ,
        "discharged_by_user_id" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
        "provisional_name" VARCHAR(100),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_newborn_birth_order" CHECK ("birth_order" >= 1 AND "birth_order" <= 10),
        CONSTRAINT "chk_newborn_outcome" CHECK (
          "outcome" IN ('LIVE_BIRTH', 'STILLBIRTH_FRESH', 'STILLBIRTH_MACERATED', 'NEONATAL_DEATH')
        ),
        CONSTRAINT "chk_newborn_sex" CHECK ("sex" IN ('MALE', 'FEMALE', 'INDETERMINATE')),
        CONSTRAINT "chk_newborn_birth_weight" CHECK (
          "birth_weight_grams" >= 300 AND "birth_weight_grams" <= 7000
        ),
        CONSTRAINT "chk_newborn_gestational_weeks" CHECK (
          "gestational_age_weeks" IS NULL OR 
          ("gestational_age_weeks" >= 20 AND "gestational_age_weeks" <= 45)
        ),
        CONSTRAINT "chk_newborn_gestational_days" CHECK (
          "gestational_age_days" IS NULL OR 
          ("gestational_age_days" >= 0 AND "gestational_age_days" <= 6)
        ),
        CONSTRAINT "chk_newborn_discharge_status" CHECK (
          "discharge_status" IN ('IN_CARE', 'DISCHARGED_WITH_MOTHER', 'TRANSFERRED_SCBU', 'TRANSFERRED_NICU', 'DECEASED')
        ),
        CONSTRAINT "uq_delivery_birth_order" UNIQUE ("delivery_id", "birth_order")
      );

      CREATE INDEX IF NOT EXISTS "idx_newborns_delivery_id" ON "newborns"("delivery_id");
      CREATE INDEX IF NOT EXISTS "idx_newborns_admission_id" ON "newborns"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_newborns_outcome" ON "newborns"("outcome");
      CREATE INDEX IF NOT EXISTS "idx_newborns_discharge_status" ON "newborns"("discharge_status");
    `);

    // ========================================================================
    // 3. TABLE 44: apgar_assessments (Structured 5-Component Apgar Assessments)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "apgar_assessments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "newborn_id" UUID NOT NULL REFERENCES "newborns"("id") ON DELETE RESTRICT,
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "assessment_minute" VARCHAR(20) NOT NULL,
        "assessed_at" TIMESTAMPTZ NOT NULL,
        "appearance" INTEGER NOT NULL,
        "pulse" INTEGER NOT NULL,
        "grimace" INTEGER NOT NULL,
        "activity" INTEGER NOT NULL,
        "respiration" INTEGER NOT NULL,
        "total_score" INTEGER NOT NULL,
        "assessed_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "notes" TEXT,
        "supersedes_id" UUID REFERENCES "apgar_assessments"("id") ON DELETE RESTRICT,
        "supersede_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_apgar_minute" CHECK (
          "assessment_minute" IN ('1_MIN', '5_MIN', '10_MIN', '15_MIN', '20_MIN')
        ),
        CONSTRAINT "chk_apgar_appearance" CHECK ("appearance" >= 0 AND "appearance" <= 2),
        CONSTRAINT "chk_apgar_pulse" CHECK ("pulse" >= 0 AND "pulse" <= 2),
        CONSTRAINT "chk_apgar_grimace" CHECK ("grimace" >= 0 AND "grimace" <= 2),
        CONSTRAINT "chk_apgar_activity" CHECK ("activity" >= 0 AND "activity" <= 2),
        CONSTRAINT "chk_apgar_respiration" CHECK ("respiration" >= 0 AND "respiration" <= 2),
        CONSTRAINT "chk_apgar_total" CHECK ("total_score" >= 0 AND "total_score" <= 10),
        CONSTRAINT "chk_apgar_total_sum" CHECK (
          "total_score" = "appearance" + "pulse" + "grimace" + "activity" + "respiration"
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_apgar_newborn_id" ON "apgar_assessments"("newborn_id");
      CREATE INDEX IF NOT EXISTS "idx_apgar_admission_id" ON "apgar_assessments"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_apgar_assessed_at" ON "apgar_assessments"("assessed_at");
    `);

    // ========================================================================
    // 4. TABLE 45: postpartum_maternal_assessments (Postpartum Maternal Care)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "postpartum_maternal_assessments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "assessment_timestamp" TIMESTAMPTZ NOT NULL,
        "systolic_bp" INTEGER,
        "diastolic_bp" INTEGER,
        "pulse_rate" INTEGER,
        "respiratory_rate" INTEGER,
        "temperature_celsius" NUMERIC(4, 1),
        "fundal_height_cm" INTEGER,
        "uterine_tone" VARCHAR(30),
        "lochia_amount" VARCHAR(30),
        "lochia_type" VARCHAR(30),
        "perineal_wound_status" VARCHAR(50),
        "pain_score" INTEGER,
        "bladder_status" VARCHAR(30),
        "clinical_review_status" VARCHAR(30) NOT NULL DEFAULT 'ROUTINE',
        "clinical_notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_ppm_systolic" CHECK ("systolic_bp" IS NULL OR ("systolic_bp" >= 50 AND "systolic_bp" <= 280)),
        CONSTRAINT "chk_ppm_diastolic" CHECK ("diastolic_bp" IS NULL OR ("diastolic_bp" >= 30 AND "diastolic_bp" <= 180)),
        CONSTRAINT "chk_ppm_pulse" CHECK ("pulse_rate" IS NULL OR ("pulse_rate" >= 30 AND "pulse_rate" <= 220)),
        CONSTRAINT "chk_ppm_resp" CHECK ("respiratory_rate" IS NULL OR ("respiratory_rate" >= 8 AND "respiratory_rate" <= 60)),
        CONSTRAINT "chk_ppm_temp" CHECK ("temperature_celsius" IS NULL OR ("temperature_celsius" >= 30.0 AND "temperature_celsius" <= 45.0)),
        CONSTRAINT "chk_ppm_fundal" CHECK ("fundal_height_cm" IS NULL OR ("fundal_height_cm" >= 0 AND "fundal_height_cm" <= 40)),
        CONSTRAINT "chk_ppm_uterine_tone" CHECK ("uterine_tone" IS NULL OR "uterine_tone" IN ('WELL_CONTRACTED', 'RELAXED_BOGGY', 'TONIC')),
        CONSTRAINT "chk_ppm_lochia_amount" CHECK ("lochia_amount" IS NULL OR "lochia_amount" IN ('SCANT', 'NORMAL', 'MODERATE', 'HEAVY_EXCESSIVE')),
        CONSTRAINT "chk_ppm_lochia_type" CHECK ("lochia_type" IS NULL OR "lochia_type" IN ('RUBRA', 'SEROSA', 'ALBA')),
        CONSTRAINT "chk_ppm_pain" CHECK ("pain_score" IS NULL OR ("pain_score" >= 0 AND "pain_score" <= 10)),
        CONSTRAINT "chk_ppm_bladder" CHECK ("bladder_status" IS NULL OR "bladder_status" IN ('VOIDED_NORMAL', 'CATHETER_IN_SITU', 'DISTENDED_UNABLE_TO_VOID')),
        CONSTRAINT "chk_ppm_review_status" CHECK ("clinical_review_status" IN ('ROUTINE', 'REVIEW_REQUESTED', 'ESCALATED'))
      );

      CREATE INDEX IF NOT EXISTS "idx_postpartum_maternal_admission_id" ON "postpartum_maternal_assessments"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_postpartum_maternal_timestamp" ON "postpartum_maternal_assessments"("assessment_timestamp");
    `);

    // ========================================================================
    // 5. TABLE 46: postpartum_newborn_assessments (Postpartum Newborn Care)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "postpartum_newborn_assessments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "newborn_id" UUID NOT NULL REFERENCES "newborns"("id") ON DELETE RESTRICT,
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "recorded_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "assessment_timestamp" TIMESTAMPTZ NOT NULL,
        "general_condition" VARCHAR(30) NOT NULL,
        "respiratory_rate" INTEGER,
        "heart_rate" INTEGER,
        "temperature_celsius" NUMERIC(4, 1),
        "feeding_status" VARCHAR(30) NOT NULL,
        "cord_condition" VARCHAR(30) NOT NULL,
        "urine_passed" BOOLEAN NOT NULL DEFAULT false,
        "meconium_passed" BOOLEAN NOT NULL DEFAULT false,
        "jaundice_status" VARCHAR(30) NOT NULL DEFAULT 'NONE',
        "clinical_notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_ppn_general_condition" CHECK (
          "general_condition" IN ('VIGOROUS_ALERT', 'LETHARGIC', 'IRRITABLE', 'CYANOTIC', 'APNEIC')
        ),
        CONSTRAINT "chk_ppn_resp" CHECK ("respiratory_rate" IS NULL OR ("respiratory_rate" >= 10 AND "respiratory_rate" <= 120)),
        CONSTRAINT "chk_ppn_hr" CHECK ("heart_rate" IS NULL OR ("heart_rate" >= 50 AND "heart_rate" <= 240)),
        CONSTRAINT "chk_ppn_temp" CHECK ("temperature_celsius" IS NULL OR ("temperature_celsius" >= 30.0 AND "temperature_celsius" <= 45.0)),
        CONSTRAINT "chk_ppn_feeding" CHECK (
          "feeding_status" IN ('BREASTFEEDING_DIRECT', 'EXPRESSED_BREAST_MILK', 'FORMULA', 'IV_FLUIDS', 'NOT_TOLERATING')
        ),
        CONSTRAINT "chk_ppn_cord" CHECK (
          "cord_condition" IN ('CLEAN_DRY', 'BLEEDING', 'SEROUS_DISCHARGE', 'ODOROUS')
        ),
        CONSTRAINT "chk_ppn_jaundice" CHECK (
          "jaundice_status" IN ('NONE', 'MILD_FACIAL', 'MODERATE_TRUNK', 'SEVERE_DISTAL')
        )
      );

      CREATE INDEX IF NOT EXISTS "idx_postpartum_newborn_newborn_id" ON "postpartum_newborn_assessments"("newborn_id");
      CREATE INDEX IF NOT EXISTS "idx_postpartum_newborn_admission_id" ON "postpartum_newborn_assessments"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_postpartum_newborn_timestamp" ON "postpartum_newborn_assessments"("assessment_timestamp");
    `);

    // ========================================================================
    // 6. TABLE 47: postpartum_discharge_authorizations (Maternal & Newborn Discharge)
    // ========================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "postpartum_discharge_authorizations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "admission_id" UUID NOT NULL REFERENCES "admissions"("id") ON DELETE RESTRICT,
        "newborn_id" UUID REFERENCES "newborns"("id") ON DELETE RESTRICT,
        "discharged_entity_type" VARCHAR(20) NOT NULL,
        "authorized_by_doctor_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "discharged_at" TIMESTAMPTZ NOT NULL,
        "discharge_destination" VARCHAR(100) NOT NULL,
        "maternal_condition" VARCHAR(50),
        "newborn_condition" VARCHAR(50),
        "discharge_summary" TEXT NOT NULL,
        "feeding_plan" TEXT,
        "follow_up_instructions" TEXT NOT NULL,
        "bed_released_id" UUID REFERENCES "bed_allocation_history"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "chk_ppd_entity_type" CHECK ("discharged_entity_type" IN ('MATERNAL', 'NEWBORN'))
      );

      CREATE INDEX IF NOT EXISTS "idx_postpartum_discharge_admission_id" ON "postpartum_discharge_authorizations"("admission_id");
      CREATE INDEX IF NOT EXISTS "idx_postpartum_discharge_newborn_id" ON "postpartum_discharge_authorizations"("newborn_id");
      CREATE INDEX IF NOT EXISTS "idx_postpartum_discharge_entity" ON "postpartum_discharge_authorizations"("admission_id", "discharged_entity_type");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "postpartum_discharge_authorizations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "postpartum_newborn_assessments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "postpartum_maternal_assessments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "apgar_assessments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "newborns" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deliveries" CASCADE;`);
  }
}
