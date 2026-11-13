import { AppDataSource } from '../../config/database.js';
import { PatientStaffAssignment } from '../../database/entities/PatientStaffAssignment.js';
import { Admission } from '../../database/entities/Admission.js';
import { User } from '../../database/entities/User.js';
import { StaffWardAssignment } from '../../database/entities/StaffWardAssignment.js';
import { AuditLog } from '../../database/entities/AuditLog.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/auth.errors.js';
import { AdmissionStatus, StaffAssignmentRole, UserRole } from '@lrms/shared';
import {
  AssignPatientStaffInput,
  TransferPatientStaffInput,
  EndPatientStaffAssignmentInput,
} from './patient-assignment.schemas.js';
import {
  serializePatientStaffAssignment,
  serializeAdmissionStaffResponsibility,
} from './patient-assignment.dto.js';
import {
  PatientStaffAssignmentDto,
  AdmissionStaffResponsibilityDto,
  UnassignedAdmissionSummaryDto,
} from '@lrms/shared';

export class PatientAssignmentService {
  public async getAdmissionStaffResponsibility(
    admissionId: string,
  ): Promise<AdmissionStaffResponsibilityDto> {
    const admission = await AppDataSource.getRepository(Admission).findOne({
      where: { id: admissionId },
    });
    if (!admission) {
      throw new NotFoundError('Admission record not found', 'ADMISSION_NOT_FOUND');
    }

    const assignments = await AppDataSource.getRepository(PatientStaffAssignment)
      .createQueryBuilder('psa')
      .leftJoinAndSelect('psa.staff', 'staff')
      .leftJoinAndSelect('staff.role', 'role')
      .leftJoinAndSelect('psa.assignedByUser', 'assignedByUser')
      .leftJoinAndSelect('psa.unassignedByUser', 'unassignedByUser')
      .where('psa.admissionId = :admissionId', { admissionId })
      .orderBy('psa.assignedAt', 'DESC')
      .getMany();

    return serializeAdmissionStaffResponsibility(
      admission.id,
      admission.admissionReferenceId,
      assignments,
    );
  }

  public async assignPatientStaff(
    admissionId: string,
    input: AssignPatientStaffInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PatientStaffAssignmentDto> {
    return await AppDataSource.transaction(async (tm) => {
      // 1. Lock admission
      const admission = await tm.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!admission) {
        throw new NotFoundError('Admission record not found', 'ADMISSION_NOT_FOUND');
      }
      if (admission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestError(
          'Cannot assign staff to an admission that is no longer active',
          'ADMISSION_NOT_ACTIVE',
        );
      }

      // 2. Verify staff user
      const staff = await tm.findOne(User, {
        where: { id: input.staffId },
        relations: ['role'],
      });
      if (!staff) {
        throw new NotFoundError('Clinician staff user not found', 'USER_NOT_FOUND');
      }
      if (!staff.isActive) {
        throw new BadRequestError('Cannot assign a deactivated staff member', 'USER_INACTIVE');
      }

      const roleName = staff.role?.name;
      const isDoctorRole =
        input.assignmentRole === StaffAssignmentRole.ATTENDING_DOCTOR ||
        input.assignmentRole === StaffAssignmentRole.CONSULTANT_ON_CALL ||
        input.assignmentRole === StaffAssignmentRole.SUPPORTING_DOCTOR;

      const isNurseRole =
        input.assignmentRole === StaffAssignmentRole.PRIMARY_NURSE ||
        input.assignmentRole === StaffAssignmentRole.SUPPORTING_NURSE;

      if (isDoctorRole && roleName !== UserRole.DOCTOR) {
        throw new BadRequestError(
          'Only users with DOCTOR role can be assigned doctor responsibility',
          'INVALID_STAFF_ROLE',
        );
      }
      if (isNurseRole && roleName !== UserRole.NURSE_STAFF) {
        throw new BadRequestError(
          'Only users with NURSE_STAFF role can be assigned nurse responsibility',
          'INVALID_STAFF_ROLE',
        );
      }

      // 3. Verify active ward assignment
      const wardAssignment = await tm.findOne(StaffWardAssignment, {
        where: {
          userId: staff.id,
          wardId: admission.wardId,
          isActive: true,
        },
      });
      if (!wardAssignment || wardAssignment.endedAt) {
        throw new BadRequestError(
          'Clinician does not hold an active ward assignment for this admission episode ward',
          'STAFF_NOT_ASSIGNED_TO_WARD',
        );
      }

      // 4. Check single primary responsibility invariant
      if (input.assignmentRole === StaffAssignmentRole.ATTENDING_DOCTOR) {
        const existingPrimary = await tm.findOne(PatientStaffAssignment, {
          where: {
            admissionId: admission.id,
            assignmentRole: StaffAssignmentRole.ATTENDING_DOCTOR,
          },
        });
        if (existingPrimary && !existingPrimary.unassignedAt) {
          throw new ConflictError(
            'An active attending doctor is already assigned to this admission episode. Use the responsibility transfer workflow to reassign.',
            'ACTIVE_ATTENDING_DOCTOR_EXISTS',
          );
        }
      }

      if (input.assignmentRole === StaffAssignmentRole.PRIMARY_NURSE) {
        const existingPrimary = await tm.findOne(PatientStaffAssignment, {
          where: {
            admissionId: admission.id,
            assignmentRole: StaffAssignmentRole.PRIMARY_NURSE,
          },
        });
        if (existingPrimary && !existingPrimary.unassignedAt) {
          throw new ConflictError(
            'An active primary nurse is already assigned to this admission episode. Use the responsibility transfer workflow to reassign.',
            'ACTIVE_PRIMARY_NURSE_EXISTS',
          );
        }
      }

      // 5. Prevent duplicate active assignment for the same staff member
      const existingUserAssignment = await tm.findOne(PatientStaffAssignment, {
        where: {
          admissionId: admission.id,
          staffId: staff.id,
          assignmentRole: input.assignmentRole,
        },
      });
      if (existingUserAssignment && !existingUserAssignment.unassignedAt) {
        throw new ConflictError(
          'Staff member is already actively assigned to this admission with this role',
          'STAFF_ALREADY_ASSIGNED',
        );
      }

      const now = new Date();
      const newAssignment = tm.create(PatientStaffAssignment, {
        admissionId: admission.id,
        staffId: staff.id,
        assignmentRole: input.assignmentRole,
        assignedByUserId: actor.id,
        assignedAt: now,
      });
      await tm.save(newAssignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'PATIENT_STAFF_ASSIGNED',
          entityName: 'PatientStaffAssignment',
          entityId: newAssignment.id,
          ipAddress,
          details: {
            requestId,
            admissionId: admission.id,
            admissionReferenceId: admission.admissionReferenceId,
            staffId: staff.id,
            assignmentRole: input.assignmentRole,
          },
        }),
      );

      const reloaded = await tm.findOneOrFail(PatientStaffAssignment, {
        where: { id: newAssignment.id },
        relations: ['staff', 'staff.role', 'assignedByUser'],
      });

      return serializePatientStaffAssignment(reloaded);
    });
  }

  public async transferPatientStaff(
    admissionId: string,
    input: TransferPatientStaffInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PatientStaffAssignmentDto> {
    return await AppDataSource.transaction(async (tm) => {
      // 1. Lock admission
      const admission = await tm.findOne(Admission, {
        where: { id: admissionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!admission) {
        throw new NotFoundError('Admission record not found', 'ADMISSION_NOT_FOUND');
      }
      if (admission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestError(
          'Cannot transfer staff for an admission that is no longer active',
          'ADMISSION_NOT_ACTIVE',
        );
      }

      // 2. Verify new clinician
      const newStaff = await tm.findOne(User, {
        where: { id: input.newStaffId },
        relations: ['role'],
      });
      if (!newStaff) {
        throw new NotFoundError('New clinician staff user not found', 'USER_NOT_FOUND');
      }
      if (!newStaff.isActive) {
        throw new BadRequestError(
          'Cannot transfer responsibility to a deactivated staff member',
          'USER_INACTIVE',
        );
      }

      const roleName = newStaff.role?.name;
      if (
        input.assignmentRole === StaffAssignmentRole.ATTENDING_DOCTOR &&
        roleName !== UserRole.DOCTOR
      ) {
        throw new BadRequestError(
          'Only users with DOCTOR role can receive Attending Doctor responsibility',
          'INVALID_STAFF_ROLE',
        );
      }
      if (
        input.assignmentRole === StaffAssignmentRole.PRIMARY_NURSE &&
        roleName !== UserRole.NURSE_STAFF
      ) {
        throw new BadRequestError(
          'Only users with NURSE_STAFF role can receive Primary Nurse responsibility',
          'INVALID_STAFF_ROLE',
        );
      }

      // 3. Verify active ward assignment
      const wardAssignment = await tm.findOne(StaffWardAssignment, {
        where: {
          userId: newStaff.id,
          wardId: admission.wardId,
          isActive: true,
        },
      });
      if (!wardAssignment || wardAssignment.endedAt) {
        throw new BadRequestError(
          'New clinician does not hold an active ward assignment for this admission episode ward',
          'STAFF_NOT_ASSIGNED_TO_WARD',
        );
      }

      // 4. Locate current active assignment for this primary role
      const currentActive = await tm.findOne(PatientStaffAssignment, {
        where: {
          admissionId: admission.id,
          assignmentRole: input.assignmentRole,
        },
      });

      const now = new Date();
      let outgoingStaffId: string | null = null;

      if (currentActive && !currentActive.unassignedAt) {
        if (currentActive.staffId === newStaff.id) {
          throw new ConflictError(
            'The selected clinician is already the active responsible staff member for this role',
            'STAFF_ALREADY_ASSIGNED',
          );
        }

        outgoingStaffId = currentActive.staffId;
        currentActive.unassignedAt = now;
        currentActive.unassignedByUserId = actor.id;
        currentActive.endReason = input.reason ?? 'RESPONSIBILITY_TRANSFER';
        await tm.save(currentActive);
      }

      // 5. Create new primary assignment
      const newAssignment = tm.create(PatientStaffAssignment, {
        admissionId: admission.id,
        staffId: newStaff.id,
        assignmentRole: input.assignmentRole,
        assignedByUserId: actor.id,
        assignedAt: now,
      });
      await tm.save(newAssignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'PATIENT_STAFF_TRANSFERRED',
          entityName: 'PatientStaffAssignment',
          entityId: newAssignment.id,
          ipAddress,
          details: {
            requestId,
            admissionId: admission.id,
            admissionReferenceId: admission.admissionReferenceId,
            assignmentRole: input.assignmentRole,
            outgoingStaffId,
            incomingStaffId: newStaff.id,
            reason: input.reason ?? 'RESPONSIBILITY_TRANSFER',
          },
        }),
      );

      const reloaded = await tm.findOneOrFail(PatientStaffAssignment, {
        where: { id: newAssignment.id },
        relations: ['staff', 'staff.role', 'assignedByUser'],
      });

      return serializePatientStaffAssignment(reloaded);
    });
  }

  public async endPatientStaffAssignment(
    admissionId: string,
    assignmentId: string,
    input: EndPatientStaffAssignmentInput,
    actor: RequestUser,
    ipAddress: string | null,
    requestId: string | null,
  ): Promise<PatientStaffAssignmentDto> {
    return await AppDataSource.transaction(async (tm) => {
      const assignment = await tm.findOne(PatientStaffAssignment, {
        where: { id: assignmentId, admissionId },
        relations: ['staff', 'staff.role', 'assignedByUser', 'unassignedByUser'],
      });
      if (!assignment) {
        throw new NotFoundError('Patient staff assignment not found', 'ASSIGNMENT_NOT_FOUND');
      }
      if (assignment.unassignedAt) {
        throw new BadRequestError('Assignment is already ended', 'ASSIGNMENT_ALREADY_ENDED');
      }

      const now = new Date();
      assignment.unassignedAt = now;
      assignment.unassignedByUserId = actor.id;
      assignment.endReason = input.reason;
      await tm.save(assignment);

      await tm.save(
        tm.create(AuditLog, {
          userId: actor.id,
          action: 'PATIENT_STAFF_UNASSIGNED',
          entityName: 'PatientStaffAssignment',
          entityId: assignment.id,
          ipAddress,
          details: {
            requestId,
            admissionId,
            staffId: assignment.staffId,
            assignmentRole: assignment.assignmentRole,
            reason: input.reason,
          },
        }),
      );

      return serializePatientStaffAssignment(assignment);
    });
  }

  public async listUnassignedAdmissions(wardId?: string): Promise<UnassignedAdmissionSummaryDto[]> {
    const qb = AppDataSource.getRepository(Admission)
      .createQueryBuilder('admission')
      .leftJoinAndSelect('admission.patient', 'patient')
      .leftJoinAndSelect('patient.pii', 'pii')
      .leftJoinAndSelect('admission.riskFlags', 'riskFlags')
      .leftJoinAndSelect('riskFlags.definition', 'definition')
      .where('admission.status = :status', { status: AdmissionStatus.ADMITTED })
      .orderBy('admission.admittedAt', 'DESC');

    if (wardId) {
      qb.andWhere('admission.wardId = :wardId', { wardId });
    }

    const admissions = await qb.getMany();
    const results: UnassignedAdmissionSummaryDto[] = [];

    for (const adm of admissions) {
      const activeAssignments = await AppDataSource.getRepository(PatientStaffAssignment)
        .createQueryBuilder('psa')
        .where('psa.admissionId = :admId AND psa.unassignedAt IS NULL', { admId: adm.id })
        .getMany();

      const hasDoctor = activeAssignments.some(
        (a) => a.assignmentRole === StaffAssignmentRole.ATTENDING_DOCTOR,
      );
      const hasNurse = activeAssignments.some(
        (a) => a.assignmentRole === StaffAssignmentRole.PRIMARY_NURSE,
      );

      if (!hasDoctor || !hasNurse) {
        const activeFlags = (adm.riskFlags ?? [])
          .filter((f) => f.isActive && f.definition)
          .map((f) => f.definition.key);

        results.push({
          admissionId: adm.id,
          admissionReferenceId: adm.admissionReferenceId,
          patientId: adm.patientId ?? adm.patient?.id ?? '',
          admissionCategory: adm.admissionCategory,
          currentCarePlan: adm.currentCarePlan,
          admittedAt: adm.admittedAt.toISOString(),
          hasPii: Boolean(adm.patient?.pii),
          missingAttendingDoctor: !hasDoctor,
          missingPrimaryNurse: !hasNurse,
          activeRiskFlagKeys: activeFlags,
        });
      }
    }

    return results;
  }
}

export const patientAssignmentService = new PatientAssignmentService();
