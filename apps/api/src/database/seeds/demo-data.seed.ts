import { ILike, IsNull } from 'typeorm';
import {
  AdmissionCategory,
  AdmissionStatus,
  BedFunctioningStatus,
  ContractionIntensity,
  FetalPosition,
  GlucoseUnit,
  LiquorAppearance,
  MembraneStatus,
  ProfessionalRegistrationBody,
  ROLE_PERMISSIONS,
  RiskFlagKey,
  ShiftStaffAssignmentStatus,
  ShiftStatus,
  ShiftType,
  StaffAssignmentRole,
  UserRole,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  Bed,
  MaternalObservation,
  PatientStaffAssignment,
  Shift,
  ShiftStaffAssignment,
  StaffWardAssignment,
  User,
  Ward,
} from '../entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { blindIndexService } from '../../common/crypto/blind-index.service.js';
import { generateTemporaryPassword, hashPassword } from '../../common/crypto/password.service.js';
import { createUser } from '../../modules/users/user.service.js';
import { createBed, updateBedMaintenance } from '../../modules/beds/bed.service.js';
import { updateWard } from '../../modules/wards/ward.service.js';
import { wardStaffService } from '../../modules/ward-staff/ward-staff.service.js';
import { shiftService } from '../../modules/shifts/shift.service.js';
import { performRapidTriage } from '../../modules/admissions/admission.service.js';
import { findPatientByNicBlindIndex } from '../../modules/patients/patient.repository.js';
import { patientAssignmentService } from '../../modules/patient-assignments/patient-assignment.service.js';
import {
  allocateBed,
  getActiveAllocationForAdmission,
} from '../../modules/bed-allocations/bed-allocation.service.js';
import { clinicalObservationService } from '../../modules/clinical-observations/clinical-observation.service.js';

const WARD_CODE = 'WARD-18';
const BED_COUNT = 7;
const OUT_OF_SERVICE_BEDS = new Set(['BED-06', 'BED-07']);
const DEMO_SHIFT_NAME = 'Demo Duty Shift';
const PASSWORD_LENGTH = 18;

interface StaffSpec {
  key: string;
  username: string;
  fullName: string;
  role: UserRole;
  staffId: string;
  regBody: ProfessionalRegistrationBody;
  regNumber: string;
  contactNumber: string;
}

const STAFF: StaffSpec[] = [
  {
    key: 'doctor1',
    username: 'dr.perera',
    fullName: 'Dr. Nimal Perera',
    role: UserRole.DOCTOR,
    staffId: 'DOC-0101',
    regBody: ProfessionalRegistrationBody.SLMC,
    regNumber: 'SLMC-DEMO-10231',
    contactNumber: '+94 77 123 4501',
  },
  {
    key: 'doctor2',
    username: 'dr.jayasinghe',
    fullName: 'Dr. Kumari Jayasinghe',
    role: UserRole.DOCTOR,
    staffId: 'DOC-0102',
    regBody: ProfessionalRegistrationBody.SLMC,
    regNumber: 'SLMC-DEMO-10477',
    contactNumber: '+94 71 123 4502',
  },
  {
    key: 'nurse1',
    username: 'nurse.fernando',
    fullName: 'Sister Dilani Fernando',
    role: UserRole.NURSE_STAFF,
    staffId: 'NUR-0201',
    regBody: ProfessionalRegistrationBody.SLNC,
    regNumber: 'SLNC-DEMO-20311',
    contactNumber: '+94 76 123 4503',
  },
  {
    key: 'nurse2',
    username: 'nurse.silva',
    fullName: 'Sister Anoma Silva',
    role: UserRole.NURSE_STAFF,
    staffId: 'NUR-0202',
    regBody: ProfessionalRegistrationBody.SLNC,
    regNumber: 'SLNC-DEMO-20312',
    contactNumber: '+94 75 123 4504',
  },
  {
    key: 'nurse3',
    username: 'nurse.wickrama',
    fullName: 'Sister Chamari Wickramasinghe',
    role: UserRole.NURSE_STAFF,
    staffId: 'NUR-0203',
    regBody: ProfessionalRegistrationBody.SLNC,
    regNumber: 'SLNC-DEMO-20313',
    contactNumber: '+94 70 123 4505',
  },
];

interface ObservationSpec {
  minutesAgo: number;
  maternal?: Parameters<typeof clinicalObservationService.recordMaternalObservation>[2];
  fetal?: Parameters<typeof clinicalObservationService.recordFetalObservation>[2];
  contraction?: Parameters<typeof clinicalObservationService.recordContractionObservation>[2];
  labour?: Parameters<typeof clinicalObservationService.recordLabourAssessment>[2];
}

interface AdmissionSpec {
  fullName: string;
  nic: string;
  contactPhone: string;
  category: AdmissionCategory;
  riskFlags: RiskFlagKey[];
  riskNotes?: Partial<Record<RiskFlagKey, string>>;
  nurse: string;
  doctor: string;
  bedNumber: string;
  observations: ObservationSpec[];
}

const ADMISSIONS: AdmissionSpec[] = [
  {
    fullName: 'Kamani Rathnayake',
    nic: '199285601234',
    contactPhone: '+94 77 555 0101',
    category: AdmissionCategory.NORMAL_DELIVERY,
    riskFlags: [RiskFlagKey.HYPERTENSION],
    riskNotes: { [RiskFlagKey.HYPERTENSION]: 'BP trending up since 34 weeks' },
    nurse: 'nurse1',
    doctor: 'doctor1',
    bedNumber: 'BED-01',
    observations: [
      {
        minutesAgo: 95,
        maternal: { systolicBp: 148, diastolicBp: 96, pulseRateBpm: 94, temperatureCelsius: 37.0 },
        fetal: { fetalHeartRateBpm: 150, variability: 'Moderate', liquorStatus: 'Clear' },
      },
      {
        minutesAgo: 50,
        maternal: {
          systolicBp: 156,
          diastolicBp: 100,
          pulseRateBpm: 101,
          temperatureCelsius: 37.2,
        },
        fetal: { fetalHeartRateBpm: 163, variability: 'Moderate', liquorStatus: 'Clear' },
        contraction: {
          contractionsCount: 4,
          observationWindowMinutes: 10,
          durationSeconds: 45,
          intensity: ContractionIntensity.MODERATE,
        },
      },
      {
        minutesAgo: 10,
        maternal: {
          systolicBp: 160,
          diastolicBp: 104,
          pulseRateBpm: 106,
          temperatureCelsius: 37.3,
          oxygenSaturationPercent: 97,
        },
        fetal: {
          fetalHeartRateBpm: 172,
          variability: 'Reduced',
          decelerations: 'Variable',
          liquorStatus: 'Clear',
          clinicalNotes: 'FHR sustained above 160 bpm, doctor review requested',
        },
        labour: {
          cervicalDilationCm: 5,
          cervicalEffacementPercent: 70,
          fetalDescentFifths: 3,
          membraneStatus: MembraneStatus.INTACT,
          fetalPosition: FetalPosition.OA,
        },
      },
    ],
  },
  {
    fullName: 'Sanduni Weerasinghe',
    nic: '199547802345',
    contactPhone: '+94 71 555 0102',
    category: AdmissionCategory.SCHEDULED_CESAREAN,
    riskFlags: [RiskFlagKey.GESTATIONAL_DIABETES, RiskFlagKey.PREVIOUS_CESAREAN],
    nurse: 'nurse2',
    doctor: 'doctor2',
    bedNumber: 'BED-02',
    observations: [
      {
        minutesAgo: 80,
        maternal: {
          systolicBp: 118,
          diastolicBp: 76,
          pulseRateBpm: 82,
          bloodGlucoseValue: 7.4,
          bloodGlucoseUnit: GlucoseUnit.MMOL_L,
        },
        fetal: { fetalHeartRateBpm: 142, variability: 'Moderate' },
      },
      {
        minutesAgo: 35,
        maternal: {
          systolicBp: 122,
          diastolicBp: 78,
          pulseRateBpm: 85,
          bloodGlucoseValue: 6.8,
          bloodGlucoseUnit: GlucoseUnit.MMOL_L,
        },
        fetal: { fetalHeartRateBpm: 146, variability: 'Moderate' },
      },
    ],
  },
  {
    fullName: 'Nadeesha Gunawardena',
    nic: '200065403456',
    contactPhone: '+94 76 555 0103',
    category: AdmissionCategory.NORMAL_DELIVERY,
    riskFlags: [],
    nurse: 'nurse3',
    doctor: 'doctor1',
    bedNumber: 'BED-03',
    observations: [
      {
        minutesAgo: 70,
        maternal: { systolicBp: 112, diastolicBp: 70, pulseRateBpm: 78, temperatureCelsius: 36.8 },
        fetal: { fetalHeartRateBpm: 138, variability: 'Moderate', liquorStatus: 'Clear' },
        contraction: {
          contractionsCount: 2,
          observationWindowMinutes: 10,
          durationSeconds: 30,
          intensity: ContractionIntensity.MILD,
        },
      },
      {
        minutesAgo: 25,
        maternal: { systolicBp: 114, diastolicBp: 72, pulseRateBpm: 80, temperatureCelsius: 36.9 },
        fetal: { fetalHeartRateBpm: 140, variability: 'Moderate', liquorStatus: 'Clear' },
        labour: {
          cervicalDilationCm: 3,
          cervicalEffacementPercent: 50,
          fetalDescentFifths: 4,
          membraneStatus: MembraneStatus.RUPTURED,
          liquorAppearance: LiquorAppearance.CLEAR,
          fetalPosition: FetalPosition.LOA,
        },
      },
    ],
  },
];

export interface DemoCredential {
  username: string;
  fullName: string;
  role: UserRole;
  password: string | null;
}

export interface DemoSeedResult {
  credentials: DemoCredential[];
  admissionReferenceIds: string[];
}

function toRequestUser(user: User): RequestUser {
  const role = user.role.name as UserRole;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role,
    sessionId: 'demo-seed',
    email: user.email,
    staffRegistrationId: null,
    staffId: null,
    mustChangePassword: false,
    passwordChangedAt: null,
    staffProfile: null,
    permissions: ROLE_PERMISSIONS[role] ?? [],
  };
}

async function loadAdmin(): Promise<User> {
  const admin = await AppDataSource.getRepository(User)
    .createQueryBuilder('u')
    .innerJoinAndSelect('u.role', 'role')
    .where('role.name = :name AND u.isActive = true', { name: UserRole.ADMIN })
    .orderBy('u.createdAt', 'ASC')
    .getOne();
  if (!admin) {
    throw new Error(
      'No active administrator found. Run "pnpm --filter @lrms/api auth:bootstrap-admin" first.',
    );
  }
  return admin;
}

async function ensureStaff(
  spec: StaffSpec,
  admin: User,
): Promise<{ user: User; password: string | null }> {
  const repo = AppDataSource.getRepository(User);
  const existing = await repo.findOne({
    where: { username: ILike(spec.username) },
    relations: ['role'],
  });
  if (existing) {
    return { user: existing, password: null };
  }

  const created = await createUser(
    admin.id,
    {
      username: spec.username,
      fullName: spec.fullName,
      role: spec.role,
      staffId: spec.staffId,
      professionalRegistrationBody: spec.regBody,
      professionalRegistrationNumber: spec.regNumber,
      contactNumber: spec.contactNumber,
    },
    null,
    null,
  );

  // createUser issues a 14-char temporary password that forces a change on first login;
  // replace it with a longer one the demo can log in with directly.
  const password = generateTemporaryPassword(PASSWORD_LENGTH);
  await repo.update(created.user.id, {
    passwordHash: await hashPassword(password),
    mustChangePassword: false,
    passwordChangedAt: new Date(),
    temporaryPasswordExpiresAt: null,
  });

  const user = await repo.findOneOrFail({ where: { id: created.user.id }, relations: ['role'] });
  return { user, password };
}

async function ensureBeds(ward: Ward, adminReq: RequestUser): Promise<Map<string, Bed>> {
  if (ward.totalPhysicalBeds < BED_COUNT) {
    await updateWard(ward.id, { totalPhysicalBeds: BED_COUNT }, adminReq, null, null);
  }

  const bedRepo = AppDataSource.getRepository(Bed);
  for (let n = 1; n <= BED_COUNT; n++) {
    const bedNumber = `BED-${String(n).padStart(2, '0')}`;
    let bed = await bedRepo.findOne({ where: { wardId: ward.id, bedNumber } });
    if (!bed) {
      await createBed(ward.id, { bedNumber }, adminReq, null, null);
      bed = await bedRepo.findOneOrFail({ where: { wardId: ward.id, bedNumber } });
    }
    if (
      OUT_OF_SERVICE_BEDS.has(bedNumber) &&
      bed.functioningStatus !== BedFunctioningStatus.OUT_OF_SERVICE
    ) {
      await updateBedMaintenance(
        bed.id,
        {
          functioningStatus: BedFunctioningStatus.OUT_OF_SERVICE,
          reason: 'Scheduled maintenance (demo data)',
        },
        adminReq,
        null,
        null,
      );
    }
  }

  const beds = await bedRepo.find({ where: { wardId: ward.id } });
  return new Map(beds.map((b) => [b.bedNumber, b]));
}

async function ensureWardRoster(ward: Ward, staff: User[], adminReq: RequestUser): Promise<void> {
  const repo = AppDataSource.getRepository(StaffWardAssignment);
  for (const user of staff) {
    const active = await repo.findOne({
      where: { userId: user.id, wardId: ward.id, isActive: true, endedAt: IsNull() },
    });
    if (!active) {
      await wardStaffService.assignStaffToWard(
        ward.id,
        { userId: user.id, notes: 'Demo roster' },
        adminReq,
        null,
        null,
      );
    }
  }
}

async function ensureOnDutyShift(ward: Ward, staff: User[], adminReq: RequestUser): Promise<void> {
  const shiftRepo = AppDataSource.getRepository(Shift);
  const now = new Date();

  let shift = await shiftRepo
    .createQueryBuilder('s')
    .where('s.wardId = :wardId AND s.name = :name', { wardId: ward.id, name: DEMO_SHIFT_NAME })
    .andWhere('s.status IN (:...statuses)', {
      statuses: [ShiftStatus.SCHEDULED, ShiftStatus.IN_PROGRESS],
    })
    .andWhere('s.startsAt <= :now AND s.endsAt > :now', { now })
    .getOne();

  if (!shift) {
    const previous = await shiftRepo.findOne({
      where: { wardId: ward.id, name: DEMO_SHIFT_NAME },
      order: { endsAt: 'DESC' },
    });
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const startsAt = previous && previous.endsAt > twoHoursAgo ? previous.endsAt : twoHoursAgo;
    const endsAt = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    const created = await shiftService.createShift(
      ward.id,
      {
        shiftType: ShiftType.CUSTOM,
        name: DEMO_SHIFT_NAME,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes: 'Demo data',
      },
      adminReq,
      null,
      null,
    );
    await shiftService.updateShift(
      ward.id,
      created.id,
      { status: ShiftStatus.IN_PROGRESS },
      adminReq,
      null,
      null,
    );
    shift = await shiftRepo.findOneOrFail({ where: { id: created.id } });
  }

  const assignmentRepo = AppDataSource.getRepository(ShiftStaffAssignment);
  for (const user of staff) {
    const assigned = await assignmentRepo
      .createQueryBuilder('a')
      .where('a.shiftId = :shiftId AND a.userId = :userId', {
        shiftId: shift.id,
        userId: user.id,
      })
      .andWhere('a.status != :cancelled', { cancelled: ShiftStaffAssignmentStatus.CANCELLED })
      .getOne();
    if (!assigned) {
      await shiftService.assignStaffToShift(
        ward.id,
        shift.id,
        { userId: user.id },
        adminReq,
        null,
        null,
      );
    }
  }
}

async function ensureAdmission(
  spec: AdmissionSpec,
  staff: Map<string, User>,
  beds: Map<string, Bed>,
  adminReq: RequestUser,
): Promise<Admission> {
  const nurse = staff.get(spec.nurse);
  const doctor = staff.get(spec.doctor);
  const bed = beds.get(spec.bedNumber);
  if (!nurse || !doctor || !bed) {
    throw new Error(
      `Demo admission for ${spec.fullName} references an unknown nurse, doctor or bed`,
    );
  }
  const nurseReq = toRequestUser(nurse);

  const nicIndex = blindIndexService.computeBlindIndex(spec.nic, 'nic');
  const match = nicIndex ? await findPatientByNicBlindIndex(nicIndex) : null;
  const admissionRepo = AppDataSource.getRepository(Admission);

  let admission = match
    ? await admissionRepo.findOne({
        where: { patientId: match.patient.id, status: AdmissionStatus.ADMITTED },
      })
    : null;

  if (!admission) {
    const triage = await performRapidTriage(
      nurseReq,
      {
        admissionCategory: spec.category,
        riskFlagKeys: spec.riskFlags,
        noListedRiskFlagsConfirmed: spec.riskFlags.length === 0,
        riskFlagNotes: spec.riskNotes,
        optionalPii: {
          fullName: spec.fullName,
          nic: spec.nic,
          contactPhone: spec.contactPhone,
        },
        linkExistingPatient: Boolean(match),
      },
      null,
      null,
    );
    admission = await admissionRepo.findOneOrFail({ where: { id: triage.admission.id } });
  }

  const doctorAssigned = await AppDataSource.getRepository(PatientStaffAssignment).findOne({
    where: {
      admissionId: admission.id,
      assignmentRole: StaffAssignmentRole.ATTENDING_DOCTOR,
      unassignedAt: IsNull(),
    },
  });
  if (!doctorAssigned) {
    await patientAssignmentService.assignPatientStaff(
      admission.id,
      { staffId: doctor.id, assignmentRole: StaffAssignmentRole.ATTENDING_DOCTOR },
      adminReq,
      null,
      null,
    );
  }

  const allocation = await getActiveAllocationForAdmission(admission.id);
  if (!allocation) {
    await allocateBed(admission.id, bed.id, nurseReq, null, null, 'Demo allocation');
  }

  const hasObservations = await AppDataSource.getRepository(MaternalObservation).count({
    where: { admissionId: admission.id },
  });
  if (hasObservations === 0) {
    for (const obs of [...spec.observations].sort((a, b) => b.minutesAgo - a.minutesAgo)) {
      const observationTimestamp = new Date(Date.now() - obs.minutesAgo * 60 * 1000).toISOString();
      if (obs.maternal) {
        await clinicalObservationService.recordMaternalObservation(admission.id, nurseReq, {
          ...obs.maternal,
          observationTimestamp,
        });
      }
      if (obs.fetal) {
        await clinicalObservationService.recordFetalObservation(admission.id, nurseReq, {
          ...obs.fetal,
          observationTimestamp,
        });
      }
      if (obs.contraction) {
        await clinicalObservationService.recordContractionObservation(admission.id, nurseReq, {
          ...obs.contraction,
          observationTimestamp,
        });
      }
      if (obs.labour) {
        await clinicalObservationService.recordLabourAssessment(admission.id, nurseReq, {
          ...obs.labour,
          observationTimestamp,
        });
      }
    }
  }

  return admissionRepo.findOneOrFail({ where: { id: admission.id } });
}

export async function seedDemoData(): Promise<DemoSeedResult> {
  const admin = await loadAdmin();
  const adminReq = toRequestUser(admin);

  const ward = await AppDataSource.getRepository(Ward).findOne({ where: { code: WARD_CODE } });
  if (!ward) {
    throw new Error(`Ward ${WARD_CODE} not found. Run "pnpm --filter @lrms/api db:seed" first.`);
  }

  const beds = await ensureBeds(ward, adminReq);

  const credentials: DemoCredential[] = [];
  const staff = new Map<string, User>();
  for (const spec of STAFF) {
    const { user, password } = await ensureStaff(spec, admin);
    staff.set(spec.key, user);
    credentials.push({
      username: user.username,
      fullName: user.fullName,
      role: spec.role,
      password,
    });
  }

  const freshWard = await AppDataSource.getRepository(Ward).findOneOrFail({
    where: { id: ward.id },
  });
  await ensureWardRoster(freshWard, [...staff.values()], adminReq);
  await ensureOnDutyShift(freshWard, [...staff.values()], adminReq);

  const admissionReferenceIds: string[] = [];
  for (const spec of ADMISSIONS) {
    const admission = await ensureAdmission(spec, staff, beds, adminReq);
    admissionReferenceIds.push(admission.admissionReferenceId);
  }

  return { credentials, admissionReferenceIds };
}
