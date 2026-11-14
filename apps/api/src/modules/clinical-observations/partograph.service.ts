import {
  MouldingGrade,
  PartographBloodPressurePointDto,
  PartographCervixPointDto,
  PartographContractionPointDto,
  PartographDescentPointDto,
  PartographDto,
  PartographFhrPointDto,
  PartographGlucosePointDto,
  PartographLiquorPointDto,
  PartographMouldingPointDto,
  PartographPulsePointDto,
  PartographReferenceLinePointDto,
  PartographTemperaturePointDto,
} from '@lrms/shared';
import { AppDataSource } from '../../config/database.js';
import {
  Admission,
  AuditLog,
  ContractionObservation,
  FetalObservation,
  LabourAssessment,
  MaternalObservation,
} from '../../database/entities/index.js';
import { NotFoundError } from '../../common/errors/auth.errors.js';
import { RequestUser } from '../../common/middleware/auth.middleware.js';
import { patientAuthorizationService } from '../admissions/patient-authorization.service.js';

export class PartographService {
  public async getPartograph(admissionId: string, actor: RequestUser): Promise<PartographDto> {
    await patientAuthorizationService.assertCanAccessAdmission(actor, admissionId);

    const admission = await AppDataSource.getRepository(Admission).findOne({
      where: { id: admissionId },
    });

    if (!admission) {
      throw new NotFoundError('Admission not found');
    }

    // Query active (non-superseded) observations chronologically
    const [maternalList, fetalList, labourList, contractionList] = await Promise.all([
      AppDataSource.getRepository(MaternalObservation)
        .createQueryBuilder('mo')
        .where('mo.admissionId = :admissionId', { admissionId })
        .andWhere(
          'mo.id NOT IN (SELECT sub.supersedes_id FROM maternal_observations sub WHERE sub.supersedes_id IS NOT NULL)',
        )
        .orderBy('mo.observationTimestamp', 'ASC')
        .getMany(),

      AppDataSource.getRepository(FetalObservation)
        .createQueryBuilder('fo')
        .where('fo.admissionId = :admissionId', { admissionId })
        .andWhere(
          'fo.id NOT IN (SELECT sub.supersedes_id FROM fetal_observations sub WHERE sub.supersedes_id IS NOT NULL)',
        )
        .orderBy('fo.observationTimestamp', 'ASC')
        .getMany(),

      AppDataSource.getRepository(LabourAssessment)
        .createQueryBuilder('la')
        .where('la.admissionId = :admissionId', { admissionId })
        .andWhere(
          'la.id NOT IN (SELECT sub.supersedes_id FROM labour_assessments sub WHERE sub.supersedes_id IS NOT NULL)',
        )
        .orderBy('la.observationTimestamp', 'ASC')
        .getMany(),

      AppDataSource.getRepository(ContractionObservation)
        .createQueryBuilder('co')
        .where('co.admissionId = :admissionId', { admissionId })
        .andWhere(
          'co.id NOT IN (SELECT sub.supersedes_id FROM contraction_observations sub WHERE sub.supersedes_id IS NOT NULL)',
        )
        .orderBy('co.observationTimestamp', 'ASC')
        .getMany(),
    ]);

    // 1. Fetal condition series
    const fhrSeries: PartographFhrPointDto[] = fetalList
      .filter((f) => f.fetalHeartRateBpm != null)
      .map((f) => ({
        timestamp: new Date(f.observationTimestamp).toISOString(),
        fhrBpm: Number(f.fetalHeartRateBpm),
        observationId: f.id,
        isAmended: f.supersedesId != null,
      }));

    const liquorSeries: PartographLiquorPointDto[] = [];
    fetalList.forEach((f) => {
      if (f.liquorStatus) {
        liquorSeries.push({
          timestamp: new Date(f.observationTimestamp).toISOString(),
          status: f.liquorStatus,
          observationId: f.id,
        });
      }
    });
    labourList.forEach((l) => {
      if (l.liquorAppearance) {
        liquorSeries.push({
          timestamp: new Date(l.observationTimestamp).toISOString(),
          status: l.liquorAppearance,
          observationId: l.id,
        });
      }
    });
    liquorSeries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const mouldingSeries: PartographMouldingPointDto[] = labourList
      .filter((l) => l.moulding != null)
      .map((l) => ({
        timestamp: new Date(l.observationTimestamp).toISOString(),
        moulding: l.moulding as MouldingGrade,
        observationId: l.id,
      }));

    // 2. Labour progress series
    const cervicalDilationSeries: PartographCervixPointDto[] = labourList
      .filter((l) => l.cervicalDilationCm != null)
      .map((l) => ({
        timestamp: new Date(l.observationTimestamp).toISOString(),
        dilationCm: Number(l.cervicalDilationCm),
        observationId: l.id,
        isAmended: l.supersedesId != null,
      }));

    const fetalDescentSeries: PartographDescentPointDto[] = labourList
      .filter((l) => l.fetalDescentFifths != null || l.fetalStation != null)
      .map((l) => ({
        timestamp: new Date(l.observationTimestamp).toISOString(),
        descentFifths: l.fetalDescentFifths != null ? Number(l.fetalDescentFifths) : null,
        station: l.fetalStation || null,
        observationId: l.id,
      }));

    // Reference Alert and Action lines (standard WHO active labour guide: 1cm/hour from >=4cm)
    let alertLinePoints: PartographReferenceLinePointDto[] | undefined;
    let actionLinePoints: PartographReferenceLinePointDto[] | undefined;

    const firstActiveDilation = cervicalDilationSeries.find((p) => p.dilationCm >= 4.0);
    if (firstActiveDilation) {
      const startTime = new Date(firstActiveDilation.timestamp).getTime();
      const sixHoursMs = 6 * 60 * 60 * 1000;
      const fourHoursMs = 4 * 60 * 60 * 1000;
      const tenHoursMs = 10 * 60 * 60 * 1000;

      alertLinePoints = [
        {
          timestamp: new Date(startTime).toISOString(),
          dilationCm: 4.0,
        },
        {
          timestamp: new Date(startTime + sixHoursMs).toISOString(),
          dilationCm: 10.0,
        },
      ];

      actionLinePoints = [
        {
          timestamp: new Date(startTime + fourHoursMs).toISOString(),
          dilationCm: 4.0,
        },
        {
          timestamp: new Date(startTime + tenHoursMs).toISOString(),
          dilationCm: 10.0,
        },
      ];
    }

    // 3. Contractions series
    const contractions: PartographContractionPointDto[] = contractionList.map((c) => ({
      timestamp: new Date(c.observationTimestamp).toISOString(),
      frequencyPer10Min: Number(c.contractionsCount),
      durationSeconds: c.durationSeconds != null ? Number(c.durationSeconds) : null,
      intensity: c.intensity || null,
      observationId: c.id,
    }));

    // 4. Maternal condition series
    const bloodPressureSeries: PartographBloodPressurePointDto[] = maternalList
      .filter((m) => m.systolicBp != null && m.diastolicBp != null)
      .map((m) => ({
        timestamp: new Date(m.observationTimestamp).toISOString(),
        systolic: Number(m.systolicBp),
        diastolic: Number(m.diastolicBp),
        observationId: m.id,
      }));

    const pulseRateSeries: PartographPulsePointDto[] = maternalList
      .filter((m) => m.pulseRateBpm != null)
      .map((m) => ({
        timestamp: new Date(m.observationTimestamp).toISOString(),
        pulseBpm: Number(m.pulseRateBpm),
        observationId: m.id,
      }));

    const temperatureSeries: PartographTemperaturePointDto[] = maternalList
      .filter((m) => m.temperatureCelsius != null)
      .map((m) => ({
        timestamp: new Date(m.observationTimestamp).toISOString(),
        tempCelsius: Number(m.temperatureCelsius),
        observationId: m.id,
      }));

    const bloodGlucoseSeries: PartographGlucosePointDto[] = maternalList
      .filter((m) => m.bloodGlucoseValue != null && m.bloodGlucoseUnit != null)
      .map((m) => ({
        timestamp: new Date(m.observationTimestamp).toISOString(),
        value: Number(m.bloodGlucoseValue),
        unit: m.bloodGlucoseUnit!,
        observationId: m.id,
      }));

    // Audit log
    await AppDataSource.getRepository(AuditLog).save({
      userId: actor.id,
      action: 'PARTOGRAPH_ACCESSED',
      entityName: 'Admission',
      entityId: admission.id,
      details: {
        admissionReferenceId: admission.admissionReferenceId,
        fhrCount: fhrSeries.length,
        dilationCount: cervicalDilationSeries.length,
        contractionCount: contractions.length,
        maternalBpCount: bloodPressureSeries.length,
      },
    });

    return {
      admissionId: admission.id,
      admissionReferenceId: admission.admissionReferenceId,
      category: admission.admissionCategory,
      currentCarePlan: admission.currentCarePlan,
      admittedAt: new Date(admission.admittedAt).toISOString(),
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Colombo',
      fetalCondition: {
        fhrSeries,
        liquorSeries,
        mouldingSeries,
      },
      labourProgress: {
        cervicalDilationSeries,
        fetalDescentSeries,
        alertLinePoints,
        actionLinePoints,
      },
      contractions,
      maternalCondition: {
        bloodPressureSeries,
        pulseRateSeries,
        temperatureSeries,
        bloodGlucoseSeries,
      },
    };
  }
}

export const partographService = new PartographService();
