import { DataSource } from 'typeorm';
import {
  Admission,
  Bed,
  BedAllocationHistory,
  BedCleaningRecord,
  Delivery,
  Newborn,
  ApgarAssessment,
  AlertRecipient,
  EmergencyAlert,
  ClinicalEscalation,
  EmergencyResponse,
  SurgicalReview,
  NotificationOutbox,
  User,
  Role,
  Shift,
  ShiftStaffAssignment,
  StaffWardAssignment,
  PatientStaffAssignment,
} from '../../database/entities/index.js';
import {
  AdmissionAnalyticsDto,
  AlosAnalyticsDto,
  BedUtilizationAnalyticsDto,
  ClinicalAlertAnalyticsDto,
  DeliveryAnalyticsDto,
  NewbornAnalyticsDto,
  OperationalOverviewDto,
  StaffingAnalyticsDto,
} from '@lrms/shared';
import { ResolvedDateRange, calculateKpiComparison } from './analytics.date-range.js';

export class AnalyticsRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 1. Overview KPIs
   */
  async getOverviewKpis(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<OperationalOverviewDto> {
    const { current, previous } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // 1. Total Admissions (Current & Previous)
      const admissionsCurRes = await qRunner.query(
        `SELECT COUNT(id)::int as count FROM admissions WHERE admitted_at >= $1 AND admitted_at < $2 ${
          wardId ? 'AND ward_id = $3' : ''
        }`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const admissionsPrevRes = await qRunner.query(
        `SELECT COUNT(id)::int as count FROM admissions WHERE admitted_at >= $1 AND admitted_at < $2 ${
          wardId ? 'AND ward_id = $3' : ''
        }`,
        wardId
          ? [previous.startDate, previous.endDate, wardId]
          : [previous.startDate, previous.endDate],
      );
      const admissionsCountCur = admissionsCurRes[0]?.count ?? 0;
      const admissionsCountPrev = admissionsPrevRes[0]?.count ?? 0;

      // 2. Current Active Admissions
      const activeAdmRes = await qRunner.query(
        `SELECT COUNT(id)::int as count FROM admissions WHERE status = 'ADMITTED' AND discharged_at IS NULL ${
          wardId ? 'AND ward_id = $1' : ''
        }`,
        wardId ? [wardId] : [],
      );
      const currentActiveAdmissions = activeAdmRes[0]?.count ?? 0;

      // 3. Finalized Deliveries (Current & Previous)
      const delCurRes = await qRunner.query(
        `SELECT COUNT(d.id)::int as count FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED' AND d.delivery_timestamp >= $1 AND d.delivery_timestamp < $2 ${
           wardId ? 'AND a.ward_id = $3' : ''
         }`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const delPrevRes = await qRunner.query(
        `SELECT COUNT(d.id)::int as count FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED' AND d.delivery_timestamp >= $1 AND d.delivery_timestamp < $2 ${
           wardId ? 'AND a.ward_id = $3' : ''
         }`,
        wardId
          ? [previous.startDate, previous.endDate, wardId]
          : [previous.startDate, previous.endDate],
      );
      const deliveriesCountCur = delCurRes[0]?.count ?? 0;
      const deliveriesCountPrev = delPrevRes[0]?.count ?? 0;

      // 4. Registered Newborns (Current & Previous)
      const nbCurRes = await qRunner.query(
        `SELECT COUNT(n.id)::int as count FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2 ${
           wardId ? 'AND a.ward_id = $3' : ''
         }`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const nbPrevRes = await qRunner.query(
        `SELECT COUNT(n.id)::int as count FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2 ${
           wardId ? 'AND a.ward_id = $3' : ''
         }`,
        wardId
          ? [previous.startDate, previous.endDate, wardId]
          : [previous.startDate, previous.endDate],
      );
      const newbornsCountCur = nbCurRes[0]?.count ?? 0;
      const newbornsCountPrev = nbPrevRes[0]?.count ?? 0;

      // 5. Beds Snapshot
      const bedSnapshot = await qRunner.query(
        `SELECT 
           COUNT(id)::int as total_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING')::int as functioning_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'OUT_OF_SERVICE')::int as maintenance_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND occupancy_status = 'OCCUPIED')::int as occupied_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND occupancy_status = 'AVAILABLE')::int as available_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND (occupancy_status = 'CLEANING' OR cleaning_status != 'CLEAN'))::int as cleaning_beds
         FROM beds ${wardId ? 'WHERE ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const bSnap = bedSnapshot[0] || {};
      const functioningBeds = bSnap.functioning_beds ?? 0;
      const occupiedBeds = bSnap.occupied_beds ?? 0;
      const availableBeds = bSnap.available_beds ?? 0;
      const cleaningBeds = bSnap.cleaning_beds ?? 0;
      const maintenanceBeds = bSnap.maintenance_beds ?? 0;
      const currentOccupancyRate =
        functioningBeds > 0 ? Math.round((occupiedBeds / functioningBeds) * 1000) / 10 : null;

      // 6. Time-weighted Occupancy Rate in current period
      let timeWeightedOccupancyRate: number | null = null;
      const windowHours = (current.endDate.getTime() - current.startDate.getTime()) / (3600 * 1000);
      if (functioningBeds > 0 && windowHours > 0) {
        const allocOverlapRes = await qRunner.query(
          `SELECT COALESCE(SUM(
             EXTRACT(EPOCH FROM (
               LEAST(COALESCE(bah.released_at, NOW()), $2) - GREATEST(bah.assigned_at, $1)
             )) / 3600.0
           ), 0) as occupied_hours
           FROM bed_allocation_history bah
           JOIN beds b ON bah.bed_id = b.id
           WHERE bah.assigned_at < $2 
             AND (bah.released_at IS NULL OR bah.released_at > $1)
             AND b.functioning_status = 'FUNCTIONING'
             ${wardId ? 'AND b.ward_id = $3' : ''}`,
          wardId
            ? [current.startDate, current.endDate, wardId]
            : [current.startDate, current.endDate],
        );
        const totalOccupiedHours = Number(allocOverlapRes[0]?.occupied_hours ?? 0);
        const totalBedHours = functioningBeds * windowHours;
        timeWeightedOccupancyRate =
          totalBedHours > 0
            ? Math.min(100, Math.round((totalOccupiedHours / totalBedHours) * 1000) / 10)
            : null;
      }

      // 7. Average Bed Cleaning Turnaround (minutes)
      const cleaningRes = await qRunner.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (bcr.completed_at - bcr.started_at)) / 60.0)::numeric(10,1) as avg_mins
         FROM bed_cleaning_records bcr
         JOIN beds b ON bcr.bed_id = b.id
         WHERE bcr.status = 'COMPLETED' 
           AND bcr.completed_at >= $1 
           AND bcr.completed_at < $2
           AND bcr.completed_at > bcr.started_at
           ${wardId ? 'AND b.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const avgCleaningTurnaround =
        cleaningRes[0]?.avg_mins != null ? Number(cleaningRes[0].avg_mins) : null;

      // 8. Completed Maternal ALOS (Days)
      const maternalAlosRes = await qRunner.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0)::numeric(10,2) as alos_days
         FROM admissions
         WHERE status = 'DISCHARGED' 
           AND discharged_at >= $1 
           AND discharged_at < $2
           AND discharged_at >= admitted_at
           ${wardId ? 'AND ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const maternalAlosDays =
        maternalAlosRes[0]?.alos_days != null ? Number(maternalAlosRes[0].alos_days) : null;

      // 9. Completed Newborn ALOS (Days)
      const newbornAlosRes = await qRunner.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (n.discharged_at - n.birth_timestamp)) / 86400.0)::numeric(10,2) as alos_days
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.discharge_status != 'IN_CARE'
           AND n.discharged_at >= $1 
           AND n.discharged_at < $2
           AND n.discharged_at >= n.birth_timestamp
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const newbornAlosDays =
        newbornAlosRes[0]?.alos_days != null ? Number(newbornAlosRes[0].alos_days) : null;

      // 10. Alert Proof-of-Receipt Latency (Seconds)
      const alertLatencyRes = await qRunner.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (ar.acknowledged_at - ar.dispatched_at)))::numeric(10,1) as avg_latency
         FROM alert_recipients ar
         WHERE ar.receipt_state = 'ACKNOWLEDGED'
           AND ar.acknowledged_at >= $1 
           AND ar.acknowledged_at < $2
           AND ar.acknowledged_at >= ar.dispatched_at`,
        [current.startDate, current.endDate],
      );
      const alertProofOfReceiptLatencySeconds =
        alertLatencyRes[0]?.avg_latency != null ? Number(alertLatencyRes[0].avg_latency) : null;

      // 11. Active On-Duty Doctors & Nurses (Real-time dynamic derivation)
      const onDutyStaffRes = await qRunner.query(
        `SELECT 
           COUNT(DISTINCT u.id) FILTER (WHERE r.name = 'DOCTOR')::int as doctor_count,
           COUNT(DISTINCT u.id) FILTER (WHERE r.name = 'NURSE_STAFF')::int as nurse_count
         FROM users u
         JOIN roles r ON u.role_id = r.id
         JOIN staff_ward_assignments swa ON swa.user_id = u.id AND swa.is_active = true
         JOIN shift_staff_assignments ssa ON ssa.user_id = u.id AND ssa.status != 'CANCELLED'
         JOIN shifts s ON ssa.shift_id = s.id
         WHERE u.is_active = true
           AND s.status = 'IN_PROGRESS'
           AND NOW() >= s.starts_at 
           AND NOW() <= s.ends_at
           ${wardId ? 'AND s.ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const activeOnDutyDoctors = onDutyStaffRes[0]?.doctor_count ?? 0;
      const activeOnDutyNurses = onDutyStaffRes[0]?.nurse_count ?? 0;

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalAdmissions: calculateKpiComparison(admissionsCountCur, admissionsCountPrev),
        currentActiveAdmissions,
        totalDeliveries: calculateKpiComparison(deliveriesCountCur, deliveriesCountPrev),
        totalNewborns: calculateKpiComparison(newbornsCountCur, newbornsCountPrev),
        totalFunctioningBeds: functioningBeds,
        currentlyOccupiedBeds: occupiedBeds,
        availableBeds,
        cleaningBeds,
        maintenanceBeds,
        currentOccupancyRate,
        timeWeightedOccupancyRate,
        averageBedCleaningTurnaroundMins: avgCleaningTurnaround,
        maternalAlosDays,
        newbornAlosDays,
        alertProofOfReceiptLatencySeconds,
        activeOnDutyDoctors,
        activeOnDutyNurses,
        generatedAt: new Date().toISOString(),
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 2. Admission Analytics
   */
  async getAdmissionAnalytics(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<AdmissionAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Counts by category
      const catRes = await qRunner.query(
        `SELECT admission_category, COUNT(id)::int as count
         FROM admissions
         WHERE admitted_at >= $1 AND admitted_at < $2 ${wardId ? 'AND ward_id = $3' : ''}
         GROUP BY admission_category
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      // Counts by status
      const statusRes = await qRunner.query(
        `SELECT status, COUNT(id)::int as count
         FROM admissions
         WHERE admitted_at >= $1 AND admitted_at < $2 ${wardId ? 'AND ward_id = $3' : ''}
         GROUP BY status
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      // Total count
      const total = catRes.reduce((acc: number, r: { count: number }) => acc + r.count, 0);

      const admissionsByCategory = catRes.map(
        (r: { admission_category: string; count: number }) => ({
          category: r.admission_category,
          count: r.count,
          percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
        }),
      );

      const admissionsByStatus = statusRes.map((r: { status: string; count: number }) => ({
        status: r.status,
        count: r.count,
      }));

      const activeCount =
        admissionsByStatus.find((s: { status: string }) => s.status === 'ADMITTED')?.count ?? 0;
      const dischargedCount =
        admissionsByStatus.find((s: { status: string }) => s.status === 'DISCHARGED')?.count ?? 0;
      const transferredCount =
        admissionsByStatus.find((s: { status: string }) => s.status === 'TRANSFERRED')?.count ?? 0;

      // Daily trends (grouped by Asia/Colombo date)
      const trendRes = await qRunner.query(
        `SELECT 
           TO_CHAR(admitted_at AT TIME ZONE 'Asia/Colombo', 'YYYY-MM-DD') as day,
           COUNT(id)::int as admissions,
           COUNT(id) FILTER (WHERE discharged_at IS NOT NULL)::int as discharges
         FROM admissions
         WHERE admitted_at >= $1 AND admitted_at < $2 ${wardId ? 'AND ward_id = $3' : ''}
         GROUP BY day
         ORDER BY day ASC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      const dailyTrends = trendRes.map(
        (r: { day: string; admissions: number; discharges: number }) => ({
          date: r.day,
          admissions: r.admissions,
          discharges: r.discharges,
        }),
      );

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalAdmissions: total,
        activeAdmissionsCount: activeCount,
        dischargedAdmissionsCount: dischargedCount,
        transferredAdmissionsCount: transferredCount,
        admissionsByCategory,
        admissionsByStatus,
        dailyTrends,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 3. Delivery Analytics
   */
  async getDeliveryAnalytics(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<DeliveryAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Finalized delivery counts by mode
      const modeRes = await qRunner.query(
        `SELECT d.delivery_mode, COUNT(d.id)::int as count
         FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED' 
           AND d.delivery_timestamp >= $1 
           AND d.delivery_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY d.delivery_mode
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      const total = modeRes.reduce((acc: number, r: { count: number }) => acc + r.count, 0);

      const deliveriesByMode = modeRes.map((r: { delivery_mode: string; count: number }) => ({
        mode: r.delivery_mode,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
      }));

      // Multiple birth frequency (deliveries with > 1 newborn)
      const mbRes = await qRunner.query(
        `SELECT COUNT(DISTINCT d.id)::int as mb_count
         FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         JOIN newborns n ON n.delivery_id = d.id
         WHERE d.status = 'FINALIZED'
           AND d.delivery_timestamp >= $1 
           AND d.delivery_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY d.id
         HAVING COUNT(n.id) > 1`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const multipleBirthDeliveriesCount = mbRes.length;
      const multipleBirthRatioPercentage =
        total > 0 ? Math.round((multipleBirthDeliveriesCount / total) * 1000) / 10 : 0;

      // Average estimated blood loss (ml)
      const eblRes = await qRunner.query(
        `SELECT AVG(d.estimated_blood_loss_ml)::numeric(10,1) as avg_ebl
         FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED'
           AND d.delivery_timestamp >= $1 
           AND d.delivery_timestamp < $2
           AND d.estimated_blood_loss_ml IS NOT NULL
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const averageBloodLossMl = eblRes[0]?.avg_ebl != null ? Number(eblRes[0].avg_ebl) : null;

      // Perineal trauma breakdown
      const traumaRes = await qRunner.query(
        `SELECT d.perineal_trauma_status, COUNT(d.id)::int as count
         FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED'
           AND d.delivery_timestamp >= $1 
           AND d.delivery_timestamp < $2
           AND d.perineal_trauma_status IS NOT NULL
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY d.perineal_trauma_status
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const perinealTraumaDistribution = traumaRes.map(
        (r: { perineal_trauma_status: string; count: number }) => ({
          status: r.perineal_trauma_status,
          count: r.count,
        }),
      );

      // Placenta delivery status breakdown
      const placentaRes = await qRunner.query(
        `SELECT d.placenta_status, COUNT(d.id)::int as count
         FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED'
           AND d.delivery_timestamp >= $1 
           AND d.delivery_timestamp < $2
           AND d.placenta_status IS NOT NULL
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY d.placenta_status
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const placentaDeliveryStatusDistribution = placentaRes.map(
        (r: { placenta_status: string; count: number }) => ({
          status: r.placenta_status,
          count: r.count,
        }),
      );

      // Daily trends
      const dailyRes = await qRunner.query(
        `SELECT 
           TO_CHAR(d.delivery_timestamp AT TIME ZONE 'Asia/Colombo', 'YYYY-MM-DD') as day,
           COUNT(d.id) FILTER (WHERE d.delivery_mode = 'NORMAL')::int as vaginal,
           COUNT(d.id) FILTER (WHERE d.delivery_mode = 'CESAREAN')::int as cesarean,
           COUNT(d.id) FILTER (WHERE d.delivery_mode = 'ASSISTED')::int as assisted
         FROM deliveries d
         JOIN admissions a ON d.admission_id = a.id
         WHERE d.status = 'FINALIZED'
           AND d.delivery_timestamp >= $1 
           AND d.delivery_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY day
         ORDER BY day ASC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      const dailyTrends = dailyRes.map(
        (r: { day: string; vaginal: number; cesarean: number; assisted: number }) => ({
          date: r.day,
          vaginal: r.vaginal,
          cesarean: r.cesarean,
          assisted: r.assisted,
        }),
      );

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalDeliveries: total,
        deliveriesByMode,
        multipleBirthDeliveriesCount,
        multipleBirthRatioPercentage,
        averageBloodLossMl,
        perinealTraumaDistribution,
        placentaDeliveryStatusDistribution,
        dailyTrends,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 4. Newborn Analytics
   */
  async getNewbornAnalytics(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<NewbornAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Outcome breakdown
      const outcomeRes = await qRunner.query(
        `SELECT n.outcome, COUNT(n.id)::int as count
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY n.outcome
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      const total = outcomeRes.reduce((acc: number, r: { count: number }) => acc + r.count, 0);

      const outcomeDistribution = outcomeRes.map((r: { outcome: string; count: number }) => ({
        outcome: r.outcome,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
      }));

      const liveBirthCount =
        outcomeDistribution.find((o: { outcome: string }) => o.outcome === 'LIVE_BIRTH')?.count ??
        0;
      const stillbirthFreshCount =
        outcomeDistribution.find((o: { outcome: string }) => o.outcome === 'STILLBIRTH_FRESH')
          ?.count ?? 0;
      const stillbirthMaceratedCount =
        outcomeDistribution.find((o: { outcome: string }) => o.outcome === 'STILLBIRTH_MACERATED')
          ?.count ?? 0;
      const neonatalDeathCount =
        outcomeDistribution.find((o: { outcome: string }) => o.outcome === 'NEONATAL_DEATH')
          ?.count ?? 0;

      // Sex distribution
      const sexRes = await qRunner.query(
        `SELECT n.sex, COUNT(n.id)::int as count
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY n.sex
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const sexDistribution = sexRes.map((r: { sex: string; count: number }) => ({
        sex: r.sex,
        count: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0,
      }));

      // Weight statistics and brackets
      const weightStatsRes = await qRunner.query(
        `SELECT 
           AVG(n.birth_weight_grams)::numeric(10,0) as avg_weight,
           COUNT(n.id) FILTER (WHERE n.birth_weight_grams < 1500)::int as vlbw,
           COUNT(n.id) FILTER (WHERE n.birth_weight_grams >= 1500 AND n.birth_weight_grams < 2500)::int as lbw,
           COUNT(n.id) FILTER (WHERE n.birth_weight_grams >= 2500 AND n.birth_weight_grams < 4000)::int as normal,
           COUNT(n.id) FILTER (WHERE n.birth_weight_grams >= 4000)::int as macrosomia
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const ws = weightStatsRes[0] || {};
      const averageBirthWeightGrams = ws.avg_weight != null ? Number(ws.avg_weight) : null;
      const weightBrackets = [
        {
          bracket: '< 1500g (VLBW)',
          count: ws.vlbw ?? 0,
          percentage: total > 0 ? Math.round(((ws.vlbw ?? 0) / total) * 1000) / 10 : 0,
        },
        {
          bracket: '1500g – 2499g (LBW)',
          count: ws.lbw ?? 0,
          percentage: total > 0 ? Math.round(((ws.lbw ?? 0) / total) * 1000) / 10 : 0,
        },
        {
          bracket: '2500g – 3999g (Normal)',
          count: ws.normal ?? 0,
          percentage: total > 0 ? Math.round(((ws.normal ?? 0) / total) * 1000) / 10 : 0,
        },
        {
          bracket: '>= 4000g (Macrosomia)',
          count: ws.macrosomia ?? 0,
          percentage: total > 0 ? Math.round(((ws.macrosomia ?? 0) / total) * 1000) / 10 : 0,
        },
      ];

      // Singleton vs Multiple birth count
      const birthOrderRes = await qRunner.query(
        `SELECT 
           COUNT(n.id) FILTER (WHERE n.birth_order = 1 AND NOT EXISTS (
             SELECT 1 FROM newborns n2 WHERE n2.delivery_id = n.delivery_id AND n2.birth_order > 1
           ))::int as singletons,
           COUNT(n.id) FILTER (WHERE n.birth_order > 1 OR EXISTS (
             SELECT 1 FROM newborns n2 WHERE n2.delivery_id = n.delivery_id AND n2.birth_order > 1
           ))::int as multiples
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const singletonCount = birthOrderRes[0]?.singletons ?? 0;
      const multipleBirthCount = birthOrderRes[0]?.multiples ?? 0;

      // Discharge status distribution
      const dsRes = await qRunner.query(
        `SELECT n.discharge_status, COUNT(n.id)::int as count
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.birth_timestamp >= $1 AND n.birth_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY n.discharge_status
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const dischargeStatusDistribution = dsRes.map(
        (r: { discharge_status: string; count: number }) => ({
          status: r.discharge_status,
          count: r.count,
        }),
      );

      // Apgar score distribution (excluding superseded scores)
      const apgarRes = await qRunner.query(
        `SELECT 
           ap.assessment_minute,
           AVG(ap.total_score)::numeric(10,1) as avg_score,
           COUNT(ap.id)::int as count
         FROM apgar_assessments ap
         JOIN newborns n ON ap.newborn_id = n.id
         JOIN admissions a ON n.admission_id = a.id
         WHERE ap.supersedes_id IS NULL
           AND n.birth_timestamp >= $1 AND n.birth_timestamp < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY ap.assessment_minute
         ORDER BY 
           CASE ap.assessment_minute
             WHEN '1_MIN' THEN 1
             WHEN '5_MIN' THEN 2
             WHEN '10_MIN' THEN 3
             WHEN '15_MIN' THEN 4
             WHEN '20_MIN' THEN 5
             ELSE 6
           END ASC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const apgarScoreDistribution = apgarRes.map(
        (r: { assessment_minute: string; avg_score: string; count: number }) => ({
          minute: r.assessment_minute,
          averageScore: Number(r.avg_score),
          count: r.count,
        }),
      );

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalNewborns: total,
        outcomeDistribution,
        liveBirthCount,
        stillbirthFreshCount,
        stillbirthMaceratedCount,
        neonatalDeathCount,
        sexDistribution,
        weightBrackets,
        averageBirthWeightGrams,
        singletonCount,
        multipleBirthCount,
        dischargeStatusDistribution,
        apgarScoreDistribution,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 5. Bed Utilization Analytics
   */
  async getBedUtilizationAnalytics(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<BedUtilizationAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Bed counts
      const bedSnapshot = await qRunner.query(
        `SELECT 
           COUNT(id)::int as total_installed_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING')::int as functioning_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'OUT_OF_SERVICE')::int as out_of_service_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND occupancy_status = 'OCCUPIED')::int as occupied_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND occupancy_status = 'AVAILABLE')::int as available_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND cleaning_status = 'DIRTY')::int as cleaning_req_beds,
           COUNT(id) FILTER (WHERE functioning_status = 'FUNCTIONING' AND (cleaning_status = 'IN_PROGRESS' OR occupancy_status = 'CLEANING'))::int as cleaning_prog_beds
         FROM beds ${wardId ? 'WHERE ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );

      const bs = bedSnapshot[0] || {};
      const totalInstalledBeds = bs.total_installed_beds ?? 0;
      const functioningBeds = bs.functioning_beds ?? 0;
      const outOfServiceBeds = bs.out_of_service_beds ?? 0;
      const occupiedBeds = bs.occupied_beds ?? 0;
      const availableBeds = bs.available_beds ?? 0;
      const cleaningRequiredBeds = bs.cleaning_req_beds ?? 0;
      const cleaningInProgressBeds = bs.cleaning_prog_beds ?? 0;
      const currentOccupancyRate =
        functioningBeds > 0 ? Math.round((occupiedBeds / functioningBeds) * 1000) / 10 : null;

      // Time-weighted occupancy
      let timeWeightedOccupancyRate: number | null = null;
      const windowHours = (current.endDate.getTime() - current.startDate.getTime()) / (3600 * 1000);
      if (functioningBeds > 0 && windowHours > 0) {
        const allocOverlapRes = await qRunner.query(
          `SELECT COALESCE(SUM(
             EXTRACT(EPOCH FROM (
               LEAST(COALESCE(bah.released_at, NOW()), $2) - GREATEST(bah.assigned_at, $1)
             )) / 3600.0
           ), 0) as occupied_hours
           FROM bed_allocation_history bah
           JOIN beds b ON bah.bed_id = b.id
           WHERE bah.assigned_at < $2 
             AND (bah.released_at IS NULL OR bah.released_at > $1)
             AND b.functioning_status = 'FUNCTIONING'
             ${wardId ? 'AND b.ward_id = $3' : ''}`,
          wardId
            ? [current.startDate, current.endDate, wardId]
            : [current.startDate, current.endDate],
        );
        const totalOccupiedHours = Number(allocOverlapRes[0]?.occupied_hours ?? 0);
        const totalBedHours = functioningBeds * windowHours;
        timeWeightedOccupancyRate =
          totalBedHours > 0
            ? Math.min(100, Math.round((totalOccupiedHours / totalBedHours) * 1000) / 10)
            : null;
      }

      // Cleaning turnaround stats
      const cleaningStatsRes = await qRunner.query(
        `SELECT 
           COUNT(bcr.id)::int as total_cycles,
           AVG(EXTRACT(EPOCH FROM (bcr.completed_at - bcr.started_at)) / 60.0)::numeric(10,1) as avg_mins,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (bcr.completed_at - bcr.started_at)) / 60.0))::numeric(10,1) as median_mins,
           MIN(EXTRACT(EPOCH FROM (bcr.completed_at - bcr.started_at)) / 60.0)::numeric(10,1) as min_mins,
           MAX(EXTRACT(EPOCH FROM (bcr.completed_at - bcr.started_at)) / 60.0)::numeric(10,1) as max_mins
         FROM bed_cleaning_records bcr
         JOIN beds b ON bcr.bed_id = b.id
         WHERE bcr.status = 'COMPLETED'
           AND bcr.completed_at >= $1 
           AND bcr.completed_at < $2
           AND bcr.completed_at > bcr.started_at
           ${wardId ? 'AND b.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const cs = cleaningStatsRes[0] || {};
      const cleaningTurnaroundStats = {
        totalCleaningCyclesCompleted: cs.total_cycles ?? 0,
        averageCleaningTurnaroundMins: cs.avg_mins != null ? Number(cs.avg_mins) : null,
        medianCleaningTurnaroundMins: cs.median_mins != null ? Number(cs.median_mins) : null,
        minCleaningTurnaroundMins: cs.min_mins != null ? Number(cs.min_mins) : null,
        maxCleaningTurnaroundMins: cs.max_mins != null ? Number(cs.max_mins) : null,
      };

      // Individual bed utilization in period
      const bedListRes = await qRunner.query(
        `SELECT 
           b.id as bed_id,
           b.bed_number,
           (b.functioning_status = 'FUNCTIONING') as is_active,
           b.occupancy_status as current_status,
           COUNT(bah.id)::int as allocations_count,
           COALESCE(SUM(
             EXTRACT(EPOCH FROM (
               LEAST(COALESCE(bah.released_at, NOW()), $2) - GREATEST(bah.assigned_at, $1)
             )) / 3600.0
           ), 0)::numeric(10,1) as occupied_hours
         FROM beds b
         LEFT JOIN bed_allocation_history bah ON bah.bed_id = b.id 
           AND bah.assigned_at < $2 
           AND (bah.released_at IS NULL OR bah.released_at > $1)
         ${wardId ? 'WHERE b.ward_id = $3' : ''}
         GROUP BY b.id, b.bed_number, b.functioning_status, b.occupancy_status
         ORDER BY b.bed_number ASC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );

      const bedUtilizationList = bedListRes.map(
        (r: {
          bed_id: string;
          bed_number: string;
          is_active: boolean;
          current_status: string;
          allocations_count: number;
          occupied_hours: string;
        }) => {
          const occHours = Number(r.occupied_hours);
          const bedPct =
            windowHours > 0 ? Math.min(100, Math.round((occHours / windowHours) * 1000) / 10) : 0;
          return {
            bedId: r.bed_id,
            bedNumber: r.bed_number,
            isActive: r.is_active,
            currentStatus: r.current_status,
            totalAllocationsInPeriod: r.allocations_count,
            occupiedHours: occHours,
            occupancyPercentage: bedPct,
          };
        },
      );

      // Daily occupancy trends
      const dailyTrendRes = await qRunner.query(
        `SELECT 
           TO_CHAR(d::date, 'YYYY-MM-DD') as day,
           COALESCE(
             COUNT(DISTINCT bah.id) FILTER (WHERE bah.assigned_at <= d + interval '1 day' AND (bah.released_at IS NULL OR bah.released_at >= d)),
             0
           )::int as occupied_count
         FROM generate_series($1::timestamptz, $2::timestamptz - interval '1 second', interval '1 day') d
         LEFT JOIN bed_allocation_history bah ON bah.assigned_at <= d + interval '1 day' 
           AND (bah.released_at IS NULL OR bah.released_at >= d)
         GROUP BY day
         ORDER BY day ASC`,
        [current.startDate, current.endDate],
      );

      const dailyOccupancyTrends = dailyTrendRes.map(
        (r: { day: string; occupied_count: number }) => ({
          date: r.day,
          occupancyRate:
            functioningBeds > 0
              ? Math.min(100, Math.round((r.occupied_count / functioningBeds) * 1000) / 10)
              : 0,
        }),
      );

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalInstalledBeds,
        functioningBeds,
        outOfServiceBeds,
        currentlyOccupiedBeds: occupiedBeds,
        availableBeds,
        cleaningRequiredBeds,
        cleaningInProgressBeds,
        currentOccupancyRate,
        timeWeightedOccupancyRate,
        cleaningTurnaroundStats,
        bedUtilizationList,
        dailyOccupancyTrends,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 6. Average Length of Stay (ALOS) Analytics
   */
  async getAlosAnalytics(range: ResolvedDateRange, wardId?: string): Promise<AlosAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Completed Maternal ALOS statistics
      const matAlosRes = await qRunner.query(
        `SELECT 
           COUNT(id)::int as completed_count,
           AVG(EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0)::numeric(10,2) as avg_days,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0))::numeric(10,2) as median_days,
           MIN(EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0)::numeric(10,2) as min_days,
           MAX(EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0)::numeric(10,2) as max_days
         FROM admissions
         WHERE status = 'DISCHARGED'
           AND discharged_at >= $1 AND discharged_at < $2
           AND discharged_at >= admitted_at
           ${wardId ? 'AND ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const ma = matAlosRes[0] || {};
      const completedMaternalAdmissionsCount = ma.completed_count ?? 0;
      const maternalAlosDays = ma.avg_days != null ? Number(ma.avg_days) : null;
      const maternalMedianLosDays = ma.median_days != null ? Number(ma.median_days) : null;
      const maternalMinLosDays = ma.min_days != null ? Number(ma.min_days) : null;
      const maternalMaxLosDays = ma.max_days != null ? Number(ma.max_days) : null;

      // Ongoing Maternal Stays (admitted, not discharged yet)
      const matOngoingRes = await qRunner.query(
        `SELECT 
           COUNT(id)::int as ongoing_count,
           AVG(EXTRACT(EPOCH FROM (NOW() - admitted_at)) / 86400.0)::numeric(10,2) as avg_days
         FROM admissions
         WHERE status = 'ADMITTED' AND discharged_at IS NULL
           ${wardId ? 'AND ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const ongoingMaternalStaysCount = matOngoingRes[0]?.ongoing_count ?? 0;
      const ongoingMaternalAvgDays =
        matOngoingRes[0]?.avg_days != null ? Number(matOngoingRes[0].avg_days) : null;

      // Maternal ALOS by Admission Category
      const matCatAlosRes = await qRunner.query(
        `SELECT 
           admission_category,
           COUNT(id)::int as count,
           AVG(EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0)::numeric(10,2) as alos_days
         FROM admissions
         WHERE status = 'DISCHARGED'
           AND discharged_at >= $1 AND discharged_at < $2
           AND discharged_at >= admitted_at
           ${wardId ? 'AND ward_id = $3' : ''}
         GROUP BY admission_category
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const maternalAlosByCategory = matCatAlosRes.map(
        (r: { admission_category: string; count: number; alos_days: string }) => ({
          category: r.admission_category,
          count: r.count,
          alosDays: r.alos_days != null ? Number(r.alos_days) : null,
        }),
      );

      // Maternal ALOS by Delivery Mode
      const matModeAlosRes = await qRunner.query(
        `SELECT 
           d.delivery_mode,
           COUNT(a.id)::int as count,
           AVG(EXTRACT(EPOCH FROM (a.discharged_at - a.admitted_at)) / 86400.0)::numeric(10,2) as alos_days
         FROM admissions a
         JOIN deliveries d ON d.admission_id = a.id AND d.status = 'FINALIZED'
         WHERE a.status = 'DISCHARGED'
           AND a.discharged_at >= $1 AND a.discharged_at < $2
           AND a.discharged_at >= a.admitted_at
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY d.delivery_mode
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const maternalAlosByDeliveryMode = matModeAlosRes.map(
        (r: { delivery_mode: string; count: number; alos_days: string }) => ({
          mode: r.delivery_mode,
          count: r.count,
          alosDays: r.alos_days != null ? Number(r.alos_days) : null,
        }),
      );

      // Completed Newborn ALOS statistics
      const nbAlosRes = await qRunner.query(
        `SELECT 
           COUNT(n.id)::int as completed_count,
           AVG(EXTRACT(EPOCH FROM (n.discharged_at - n.birth_timestamp)) / 86400.0)::numeric(10,2) as avg_days,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (n.discharged_at - n.birth_timestamp)) / 86400.0))::numeric(10,2) as median_days,
           MIN(EXTRACT(EPOCH FROM (n.discharged_at - n.birth_timestamp)) / 86400.0)::numeric(10,2) as min_days,
           MAX(EXTRACT(EPOCH FROM (n.discharged_at - n.birth_timestamp)) / 86400.0)::numeric(10,2) as max_days
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.discharge_status != 'IN_CARE'
           AND n.discharged_at >= $1 AND n.discharged_at < $2
           AND n.discharged_at >= n.birth_timestamp
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const na = nbAlosRes[0] || {};
      const completedNewbornStaysCount = na.completed_count ?? 0;
      const newbornAlosDays = na.avg_days != null ? Number(na.avg_days) : null;
      const newbornMedianLosDays = na.median_days != null ? Number(na.median_days) : null;
      const newbornMinLosDays = na.min_days != null ? Number(na.min_days) : null;
      const newbornMaxLosDays = na.max_days != null ? Number(na.max_days) : null;

      // Ongoing Newborn stays
      const nbOngoingRes = await qRunner.query(
        `SELECT COUNT(n.id)::int as ongoing_count
         FROM newborns n
         JOIN admissions a ON n.admission_id = a.id
         WHERE n.discharge_status = 'IN_CARE' ${wardId ? 'AND a.ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const ongoingNewbornStaysCount = nbOngoingRes[0]?.ongoing_count ?? 0;

      // Monthly ALOS Trends (last 6 months)
      const monthlyRes = await qRunner.query(
        `SELECT 
           m.month,
           m.mat_alos,
           (
             SELECT AVG(EXTRACT(EPOCH FROM (n.discharged_at - n.birth_timestamp)) / 86400.0)::numeric(10,2)
             FROM newborns n
             JOIN admissions na ON n.admission_id = na.id
             WHERE TO_CHAR(n.discharged_at AT TIME ZONE 'Asia/Colombo', 'YYYY-MM') = m.month
               AND n.discharge_status != 'IN_CARE'
               ${wardId ? 'AND na.ward_id = $1' : ''}
           ) as nb_alos
         FROM (
           SELECT 
             TO_CHAR(discharged_at AT TIME ZONE 'Asia/Colombo', 'YYYY-MM') as month,
             AVG(EXTRACT(EPOCH FROM (discharged_at - admitted_at)) / 86400.0)::numeric(10,2) as mat_alos
           FROM admissions
           WHERE status = 'DISCHARGED' 
             AND discharged_at >= (NOW() - interval '6 months')
             AND discharged_at >= admitted_at
             ${wardId ? 'AND ward_id = $1' : ''}
           GROUP BY TO_CHAR(discharged_at AT TIME ZONE 'Asia/Colombo', 'YYYY-MM')
         ) m
         ORDER BY m.month ASC`,
        wardId ? [wardId] : [],
      );

      const monthlyAlosTrends = monthlyRes.map(
        (r: { month: string; mat_alos: string; nb_alos: string }) => ({
          month: r.month,
          maternalAlos: r.mat_alos != null ? Number(r.mat_alos) : null,
          newbornAlos: r.nb_alos != null ? Number(r.nb_alos) : null,
        }),
      );

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        completedMaternalAdmissionsCount,
        maternalAlosDays,
        maternalMedianLosDays,
        maternalMinLosDays,
        maternalMaxLosDays,
        ongoingMaternalStaysCount,
        ongoingMaternalAvgDays,
        maternalAlosByCategory,
        maternalAlosByDeliveryMode,
        completedNewbornStaysCount,
        newbornAlosDays,
        newbornMedianLosDays,
        newbornMinLosDays,
        newbornMaxLosDays,
        ongoingNewbornStaysCount,
        monthlyAlosTrends,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 7. Staffing & Shift Coverage Analytics
   */
  async getStaffingAnalytics(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<StaffingAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Active doctors and nurses count
      const staffCountRes = await qRunner.query(
        `SELECT 
           COUNT(DISTINCT u.id) FILTER (WHERE r.name = 'DOCTOR')::int as total_doctors,
           COUNT(DISTINCT u.id) FILTER (WHERE r.name = 'NURSE_STAFF')::int as total_nurses,
           COUNT(DISTINCT swa.id) FILTER (WHERE swa.is_active = true)::int as active_affiliations
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN staff_ward_assignments swa ON swa.user_id = u.id AND swa.is_active = true
         WHERE u.is_active = true ${wardId ? 'AND swa.ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const sc = staffCountRes[0] || {};
      const totalActiveDoctors = sc.total_doctors ?? 0;
      const totalActiveNurses = sc.total_nurses ?? 0;
      const activeWardAffiliations = sc.active_affiliations ?? 0;

      // Shifts scheduled in period
      const shiftRes = await qRunner.query(
        `SELECT 
           COUNT(id)::int as total_shifts,
           COUNT(id) FILTER (WHERE shift_type = 'MORNING')::int as morning_count,
           COUNT(id) FILTER (WHERE shift_type = 'EVENING')::int as evening_count,
           COUNT(id) FILTER (WHERE shift_type = 'NIGHT')::int as night_count,
           COUNT(id) FILTER (WHERE status = 'SCHEDULED')::int as scheduled_count,
           COUNT(id) FILTER (WHERE status = 'IN_PROGRESS')::int as in_prog_count,
           COUNT(id) FILTER (WHERE status = 'COMPLETED')::int as completed_count,
           COUNT(id) FILTER (WHERE status = 'CANCELLED')::int as cancelled_count
         FROM shifts
         WHERE starts_at >= $1 AND starts_at < $2 ${wardId ? 'AND ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const sr = shiftRes[0] || {};
      const totalScheduledShifts = sr.total_shifts ?? 0;
      const shiftsByType = [
        { shiftType: 'MORNING', count: sr.morning_count ?? 0 },
        { shiftType: 'EVENING', count: sr.evening_count ?? 0 },
        { shiftType: 'NIGHT', count: sr.night_count ?? 0 },
      ];
      const shiftsByStatus = [
        { status: 'SCHEDULED', count: sr.scheduled_count ?? 0 },
        { status: 'IN_PROGRESS', count: sr.in_prog_count ?? 0 },
        { status: 'COMPLETED', count: sr.completed_count ?? 0 },
        { status: 'CANCELLED', count: sr.cancelled_count ?? 0 },
      ];

      // On-duty doctors and nurses currently
      const onDutyRes = await qRunner.query(
        `SELECT 
           COUNT(DISTINCT u.id) FILTER (WHERE r.name = 'DOCTOR')::int as on_duty_doctors,
           COUNT(DISTINCT u.id) FILTER (WHERE r.name = 'NURSE_STAFF')::int as on_duty_nurses
         FROM users u
         JOIN roles r ON u.role_id = r.id
         JOIN staff_ward_assignments swa ON swa.user_id = u.id AND swa.is_active = true
         JOIN shift_staff_assignments ssa ON ssa.user_id = u.id AND ssa.status != 'CANCELLED'
         JOIN shifts s ON ssa.shift_id = s.id
         WHERE u.is_active = true
           AND s.status = 'IN_PROGRESS'
           AND NOW() >= s.starts_at 
           AND NOW() <= s.ends_at
           ${wardId ? 'AND s.ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const currentOnDutyDoctorsCount = onDutyRes[0]?.on_duty_doctors ?? 0;
      const currentOnDutyNursesCount = onDutyRes[0]?.on_duty_nurses ?? 0;

      // Unassigned active admissions
      const unassignedRes = await qRunner.query(
        `SELECT COUNT(a.id)::int as count
         FROM admissions a
         WHERE a.status = 'ADMITTED' AND a.discharged_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM patient_staff_assignments psa 
             WHERE psa.admission_id = a.id AND psa.unassigned_at IS NULL
           )
           ${wardId ? 'AND a.ward_id = $1' : ''}`,
        wardId ? [wardId] : [],
      );
      const unassignedActiveAdmissionsCount = unassignedRes[0]?.count ?? 0;

      // Doctor workload
      const docWorkloadRes = await qRunner.query(
        `SELECT 
           u.id as staff_id,
           u.full_name as staff_name,
           sp.professional_registration_number as reg_no,
           COUNT(DISTINCT psa.admission_id) FILTER (WHERE a.status = 'ADMITTED' AND psa.unassigned_at IS NULL)::int as active_admissions,
           COUNT(DISTINCT psa.admission_id) FILTER (WHERE psa.unassigned_at IS NOT NULL OR a.status = 'DISCHARGED')::int as completed_admissions,
           COUNT(DISTINCT ssa.shift_id)::int as shifts_count
         FROM users u
         JOIN roles r ON u.role_id = r.id AND r.name = 'DOCTOR'
         LEFT JOIN staff_profiles sp ON sp.user_id = u.id
         LEFT JOIN patient_staff_assignments psa ON psa.staff_id = u.id AND psa.assignment_role = 'ATTENDING_DOCTOR'
         LEFT JOIN admissions a ON psa.admission_id = a.id
         LEFT JOIN shift_staff_assignments ssa ON ssa.user_id = u.id AND ssa.status != 'CANCELLED'
         WHERE u.is_active = true
         GROUP BY u.id, u.full_name, sp.professional_registration_number
         ORDER BY active_admissions DESC, u.full_name ASC`,
      );
      const doctorWorkload = docWorkloadRes.map(
        (r: {
          staff_id: string;
          staff_name: string;
          reg_no: string | null;
          active_admissions: number;
          completed_admissions: number;
          shifts_count: number;
        }) => ({
          staffId: r.staff_id,
          staffName: r.staff_name,
          staffRegistrationId: r.reg_no,
          activeAssignedAdmissions: r.active_admissions,
          completedAssignedAdmissions: r.completed_admissions,
          scheduledShiftsCount: r.shifts_count,
        }),
      );

      // Nurse workload
      const nurseWorkloadRes = await qRunner.query(
        `SELECT 
           u.id as staff_id,
           u.full_name as staff_name,
           sp.professional_registration_number as reg_no,
           COUNT(DISTINCT psa.admission_id) FILTER (WHERE a.status = 'ADMITTED' AND psa.unassigned_at IS NULL)::int as active_admissions,
           COUNT(DISTINCT psa.admission_id) FILTER (WHERE psa.unassigned_at IS NOT NULL OR a.status = 'DISCHARGED')::int as completed_admissions,
           COUNT(DISTINCT ssa.shift_id)::int as shifts_count
         FROM users u
         JOIN roles r ON u.role_id = r.id AND r.name = 'NURSE_STAFF'
         LEFT JOIN staff_profiles sp ON sp.user_id = u.id
         LEFT JOIN patient_staff_assignments psa ON psa.staff_id = u.id AND psa.assignment_role = 'PRIMARY_NURSE'
         LEFT JOIN admissions a ON psa.admission_id = a.id
         LEFT JOIN shift_staff_assignments ssa ON ssa.user_id = u.id AND ssa.status != 'CANCELLED'
         WHERE u.is_active = true
         GROUP BY u.id, u.full_name, sp.professional_registration_number
         ORDER BY active_admissions DESC, u.full_name ASC`,
      );
      const nurseWorkload = nurseWorkloadRes.map(
        (r: {
          staff_id: string;
          staff_name: string;
          reg_no: string | null;
          active_admissions: number;
          completed_admissions: number;
          shifts_count: number;
        }) => ({
          staffId: r.staff_id,
          staffName: r.staff_name,
          staffRegistrationId: r.reg_no,
          activeAssignedAdmissions: r.active_admissions,
          completedAssignedAdmissions: r.completed_admissions,
          scheduledShiftsCount: r.shifts_count,
        }),
      );

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalActiveDoctors,
        totalActiveNurses,
        activeWardAffiliations,
        totalScheduledShifts,
        shiftsByStatus,
        shiftsByType,
        currentOnDutyDoctorsCount,
        currentOnDutyNursesCount,
        unassignedActiveAdmissionsCount,
        doctorWorkload,
        nurseWorkload,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 8. Clinical Alert & Escalation Response Analytics
   */
  async getClinicalAlertAnalytics(
    range: ResolvedDateRange,
    wardId?: string,
  ): Promise<ClinicalAlertAnalyticsDto> {
    const { current } = range;
    const qRunner = this.dataSource.createQueryRunner();

    try {
      // Total emergency alerts & breakdown by severity
      const alertSeverityRes = await qRunner.query(
        `SELECT ea.severity, COUNT(ea.id)::int as count
         FROM emergency_alerts ea
         JOIN admissions a ON ea.admission_id = a.id
         WHERE ea.created_at >= $1 AND ea.created_at < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         GROUP BY ea.severity
         ORDER BY count DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const totalEmergencyAlerts = alertSeverityRes.reduce(
        (acc: number, r: { count: number }) => acc + r.count,
        0,
      );
      const alertsBySeverity = alertSeverityRes.map((r: { severity: string; count: number }) => ({
        severity: r.severity,
        count: r.count,
      }));

      // Total escalations
      const escRes = await qRunner.query(
        `SELECT COUNT(ce.id)::int as count
         FROM clinical_escalations ce
         JOIN admissions a ON ce.admission_id = a.id
         WHERE ce.created_at >= $1 AND ce.created_at < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const totalClinicalEscalations = escRes[0]?.count ?? 0;

      // Emergency responses
      const erRes = await qRunner.query(
        `SELECT COUNT(er.id)::int as count
         FROM emergency_responses er
         JOIN admissions a ON er.admission_id = a.id
         WHERE er.created_at >= $1 AND er.created_at < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const totalEmergencyResponses = erRes[0]?.count ?? 0;

      // Surgical reviews
      const srRes = await qRunner.query(
        `SELECT COUNT(sr.id)::int as count
         FROM surgical_reviews sr
         JOIN admissions a ON sr.admission_id = a.id
         WHERE sr.created_at >= $1 AND sr.created_at < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const totalSurgicalReviews = srRes[0]?.count ?? 0;

      // Acknowledged latencies from the doctor alert receipts (REQ-7.x / REQ-9.3)
      const ackStatsRes = await qRunner.query(
        `SELECT
           COUNT(ce.id)::int as ack_count,
           AVG(EXTRACT(EPOCH FROM (ce.acknowledged_at - ce.dispatched_at)))::numeric(10,1) as avg_latency,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (ce.acknowledged_at - ce.dispatched_at))))::numeric(10,1) as median_latency,
           COUNT(ce.id) FILTER (WHERE EXTRACT(EPOCH FROM (ce.acknowledged_at - ce.dispatched_at)) <= 180)::int as under_3_min_count
         FROM clinical_escalations ce
         JOIN admissions a ON ce.admission_id = a.id
         WHERE ce.acknowledged_at IS NOT NULL
           AND ce.dispatched_at >= $1 AND ce.dispatched_at < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const ackData = ackStatsRes[0] || {};
      const acknowledgedAlertsCount = ackData.ack_count ?? 0;
      const averageAcknowledgementLatencySeconds =
        ackData.avg_latency != null ? Number(ackData.avg_latency) : null;
      const medianAcknowledgementLatencySeconds =
        ackData.median_latency != null ? Number(ackData.median_latency) : null;
      const slaUnder3MinutesPercentage =
        acknowledgedAlertsCount > 0
          ? Math.round(((ackData.under_3_min_count ?? 0) / acknowledgedAlertsCount) * 1000) / 10
          : null;

      const receiptRows: Array<{
        escalation_reference_id: string;
        admission_reference_id: string;
        bed_number: string | null;
        reason_code: string | null;
        dispatched_at: Date;
        delivered_at: Date | null;
        acknowledged_at: Date | null;
        timed_out_at: Date | null;
        to_delivered: string | null;
        to_ack: string | null;
      }> = await qRunner.query(
        `SELECT ce.escalation_reference_id, a.admission_reference_id, bed.bed_number,
                ce.reason_code::text AS reason_code,
                ce.dispatched_at, ce.delivered_at, ce.acknowledged_at, ce.timed_out_at,
                EXTRACT(EPOCH FROM (ce.delivered_at - ce.dispatched_at))::numeric(10,1) AS to_delivered,
                EXTRACT(EPOCH FROM (ce.acknowledged_at - ce.dispatched_at))::numeric(10,1) AS to_ack
         FROM clinical_escalations ce
         JOIN admissions a ON ce.admission_id = a.id
         LEFT JOIN LATERAL (
           SELECT b.bed_number FROM bed_allocation_history h
           JOIN beds b ON b.id = h.bed_id
           WHERE h.admission_id = a.id AND h.assigned_at <= ce.dispatched_at
           ORDER BY h.assigned_at DESC LIMIT 1
         ) bed ON true
         WHERE ce.dispatched_at >= $1 AND ce.dispatched_at < $2
           ${wardId ? 'AND a.ward_id = $3' : ''}
         ORDER BY ce.dispatched_at DESC`,
        wardId
          ? [current.startDate, current.endDate, wardId]
          : [current.startDate, current.endDate],
      );
      const toNum = (v: string | null) => (v == null ? null : Number(v));
      const avg = (vals: Array<number | null>) => {
        const present = vals.filter((v): v is number => v != null);
        return present.length > 0
          ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10
          : null;
      };
      const receiptAlerts = receiptRows.map((row) => ({
        escalationReferenceId: row.escalation_reference_id,
        admissionReferenceId: row.admission_reference_id,
        bedNumber: row.bed_number,
        reason: row.reason_code,
        dispatchedAt: new Date(row.dispatched_at).toISOString(),
        deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
        acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : null,
        timedOutAt: row.timed_out_at ? new Date(row.timed_out_at).toISOString() : null,
        secondsToDelivered: toNum(row.to_delivered),
        secondsToAcknowledged: toNum(row.to_ack),
      }));
      const alertReceipts = {
        totalAlerts: receiptAlerts.length,
        deliveredCount: receiptAlerts.filter((a) => a.deliveredAt).length,
        acknowledgedCount: receiptAlerts.filter((a) => a.acknowledgedAt).length,
        timedOutCount: receiptAlerts.filter((a) => a.timedOutAt).length,
        averageSecondsToDelivered: avg(receiptAlerts.map((a) => a.secondsToDelivered)),
        averageSecondsToAcknowledged: avg(receiptAlerts.map((a) => a.secondsToAcknowledged)),
        alerts: receiptAlerts,
      };

      // Notification Outbox Stats
      const outboxRes = await qRunner.query(
        `SELECT 
           COUNT(id)::int as total_events,
           COUNT(id) FILTER (WHERE processing_status = 'PROCESSED')::int as processed_events,
           COUNT(id) FILTER (WHERE processing_status IN ('PENDING', 'PROCESSING'))::int as pending_events,
           COUNT(id) FILTER (WHERE processing_status = 'DEAD_LETTER')::int as dead_letter_events
         FROM notification_outbox
         WHERE created_at >= $1 AND created_at < $2`,
        [current.startDate, current.endDate],
      );
      const ob = outboxRes[0] || {};
      const notificationOutboxStats = {
        totalEvents: ob.total_events ?? 0,
        processedEvents: ob.processed_events ?? 0,
        pendingEvents: ob.pending_events ?? 0,
        deadLetterEvents: ob.dead_letter_events ?? 0,
      };

      return {
        period: {
          startDate: current.startDate.toISOString(),
          endDate: current.endDate.toISOString(),
          preset: current.preset,
          timezone: current.timezone,
        },
        totalEmergencyAlerts,
        totalClinicalEscalations,
        totalEmergencyResponses,
        totalSurgicalReviews,
        alertsBySeverity,
        acknowledgedAlertsCount,
        averageAcknowledgementLatencySeconds,
        medianAcknowledgementLatencySeconds,
        slaUnder3MinutesPercentage,
        alertReceipts,
        notificationOutboxStats,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * 9. System Health & Infrastructure Telemetry
   */
  async getSystemHealth(): Promise<Record<string, unknown>> {
    const qRunner = this.dataSource.createQueryRunner();
    try {
      const pingStart = Date.now();
      await qRunner.query('SELECT 1');
      const pingLatencyMs = Date.now() - pingStart;

      const mem = process.memoryUsage();
      const uptimeSec = Math.floor(process.uptime());

      const outboxPendingRes = await qRunner.query(
        `SELECT COUNT(id)::int as pending_count FROM notification_outbox WHERE processing_status IN ('PENDING', 'PROCESSING')`,
      );

      return {
        status: 'UP',
        database: {
          status: 'CONNECTED',
          latencyMs: pingLatencyMs,
          engine: 'PostgreSQL 18',
        },
        system: {
          nodeVersion: process.version,
          uptimeSeconds: uptimeSec,
          memoryUsageMb: {
            rss: Math.round(mem.rss / 1024 / 1024),
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          },
        },
        telemetry: {
          notificationOutboxBacklog: outboxPendingRes[0]?.pending_count ?? 0,
        },
        timestamp: new Date().toISOString(),
      };
    } finally {
      await qRunner.release();
    }
  }
}
