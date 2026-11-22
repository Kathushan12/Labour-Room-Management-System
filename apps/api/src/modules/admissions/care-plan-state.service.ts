import { EntityManager } from 'typeorm';
import { CarePlanState } from '@lrms/shared';
import { Admission, AuditLog, CarePlanTransition } from '../../database/entities/index.js';

/**
 * Moves an admission to a new SRS care plan state (REQ-6.1) and records the transition and an
 * audit entry. The caller must hold a row lock on the admission inside `tm`.
 */
export async function changeCarePlanState(
  tm: EntityManager,
  admission: Admission,
  newState: CarePlanState,
  actorId: string,
  rationale: string,
  options: { isEmergency?: boolean; ipAddress?: string | null; requestId?: string | null } = {},
): Promise<CarePlanTransition> {
  const previousState = admission.currentCarePlan;
  const transition = await tm.save(
    tm.create(CarePlanTransition, {
      admissionId: admission.id,
      previousState,
      newState,
      transitionedByUserId: actorId,
      clinicalRationale: rationale,
      isEmergency: Boolean(options.isEmergency),
    }),
  );

  admission.currentCarePlan = newState;
  await tm.update(Admission, { id: admission.id }, { currentCarePlan: newState });

  await tm.save(
    tm.create(AuditLog, {
      userId: actorId,
      action: 'CARE_PLAN_STATE_CHANGED',
      entityName: 'Admission',
      entityId: admission.id,
      ipAddress: options.ipAddress ?? null,
      details: {
        requestId: options.requestId ?? null,
        admissionReferenceId: admission.admissionReferenceId,
        previousState,
        newState,
        transitionId: transition.id,
        isEmergency: Boolean(options.isEmergency),
      },
    }),
  );

  return transition;
}
