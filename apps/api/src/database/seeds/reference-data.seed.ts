import { DataSource } from 'typeorm';
import { UserRole, RiskFlagKey } from '@lrms/shared';

export async function seedReferenceData(dataSource: DataSource): Promise<void> {
  // 1. Seed Roles idempotently (ADMIN, DOCTOR, NURSE_STAFF)
  // Strictly no hardcoded user credentials
  const defaultRoles = [
    {
      name: UserRole.ADMIN,
      description:
        'System Administrator: Configures wards, physical beds, manages staff accounts, reviews audit trails and reports.',
    },
    {
      name: UserRole.DOCTOR,
      description:
        'Attending Obstetrician / Medical Doctor: Reviews observations, acknowledges emergency alerts, transitions care plans, escalates to surgery.',
    },
    {
      name: UserRole.NURSE_STAFF,
      description:
        'Labour Room Midwife / Nursing Staff: Admits patients, logs maternal/fetal observations, manages bed allocation, manages discharge and hygiene.',
    },
  ];

  for (const roleData of defaultRoles) {
    await dataSource.query(
      `INSERT INTO roles (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING;`,
      [roleData.name, roleData.description],
    );
  }

  // 2. Seed Risk Flag Definitions idempotently
  const defaultRiskFlags = [
    {
      key: RiskFlagKey.HYPERTENSION,
      label: 'Hypertension',
      description: 'Pre-existing or gestational high blood pressure requiring close monitoring.',
      isActive: true,
    },
    {
      key: RiskFlagKey.GESTATIONAL_DIABETES,
      label: 'Gestational Diabetes',
      description:
        'Glucose intolerance diagnosed during pregnancy requiring maternal blood glucose tracking.',
      isActive: true,
    },
    {
      key: RiskFlagKey.PRIOR_CESAREAN,
      label: 'Prior Cesarean Section',
      description:
        'Patient has had one or more prior cesarean deliveries; clinical vigilance for uterine rupture.',
      isActive: true,
    },
    {
      key: RiskFlagKey.OBSERVATION_20PLUS,
      label: 'Observation (>= 20 Weeks)',
      description:
        'Antepartum observation admission at or beyond 20 gestational weeks requiring maternal/fetal monitoring.',
      isActive: true,
    },
    {
      key: RiskFlagKey.OTHER,
      label: 'Other High-Risk Condition',
      description:
        'Other clinically significant maternal or fetal condition documented by admitting staff.',
      // Not one of the SRS risk flags (REQ-3.4); kept only so historical rows still resolve.
      isActive: false,
    },
  ];

  for (const flagData of defaultRiskFlags) {
    await dataSource.query(
      `INSERT INTO risk_flag_definitions (key, label, description, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO NOTHING;`,
      [flagData.key, flagData.label, flagData.description, flagData.isActive],
    );
  }

  // 3. Seed baseline Labour Ward row idempotently (schema FK prerequisite for admissions without hardcoding capacity rules)
  await dataSource.query(
    `INSERT INTO wards (name, code, is_active)
     VALUES ($1, $2, $3)
     ON CONFLICT (code) DO NOTHING;`,
    ['Ward 18 — Labour Room', 'WARD-18', true],
  );
}
