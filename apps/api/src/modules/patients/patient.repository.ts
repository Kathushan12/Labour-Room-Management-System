import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/database.js';
import { Admission, AuditLog, Patient, PatientPii } from '../../database/entities/index.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { applyAdmissionVisibilityScope } from '../admissions/patient-authorization.service.js';

export async function findPatientByNicBlindIndex(
  nicBlindIndex: Buffer,
  tm?: EntityManager,
): Promise<{ patient: Patient; pii: PatientPii } | null> {
  const manager = tm ?? AppDataSource.manager;
  const pii = await manager.findOne(PatientPii, {
    where: { nicBlindIndex },
    relations: ['patient'],
  });

  if (!pii || !pii.patient) {
    return null;
  }

  pii.patient.pii = pii;
  return { patient: pii.patient, pii };
}

export async function findAuthorizedPatientAdmissions(
  patientId: string,
  actor: RequestUser,
  tm?: EntityManager,
): Promise<Admission[]> {
  const manager = tm ?? AppDataSource.manager;
  const qb = manager
    .createQueryBuilder(Admission, 'admission')
    .leftJoinAndSelect('admission.admittedByUser', 'admittedByUser')
    .leftJoinAndSelect('admission.patient', 'patient')
    .leftJoinAndSelect('patient.pii', 'pii')
    .leftJoinAndSelect('admission.riskFlags', 'riskFlags')
    .leftJoinAndSelect('riskFlags.definition', 'definition')
    .leftJoinAndSelect('riskFlags.flaggedByUser', 'flaggedByUser')
    .where('admission.patientId = :patientId', { patientId })
    .orderBy('admission.admittedAt', 'DESC');

  applyAdmissionVisibilityScope(qb, actor, 'admission');

  return qb.getMany();
}

export async function findPatientRelatedAudits(
  patientId: string,
  admissionIds: string[],
  limit = 40,
): Promise<AuditLog[]> {
  const entityIds = [patientId, ...admissionIds];
  const auditRepo = AppDataSource.getRepository(AuditLog);

  return auditRepo
    .createQueryBuilder('log')
    .leftJoin('log.user', 'actor')
    .addSelect(['actor.id', 'actor.username'])
    .where('log.entityId IN (:...entityIds) AND log.entityName IN (:...entityNames)', {
      entityIds,
      entityNames: ['Patient', 'Admission'],
    })
    .orderBy('log.createdAt', 'DESC')
    .take(limit)
    .getMany();
}
