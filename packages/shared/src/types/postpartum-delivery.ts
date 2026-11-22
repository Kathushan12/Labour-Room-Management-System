import {
  ApgarMinute,
  BirthOutcome,
  DeliveryMode,
  DeliveryStatus,
  DischargeDestination,
  DischargedEntityType,
  LochiaAmount,
  LochiaType,
  MaternalReviewStatus,
  NewbornCordCondition,
  NewbornDischargeStatus,
  NewbornFeedingStatus,
  NewbornGeneralCondition,
  NewbornJaundiceStatus,
  NewbornSex,
  UterineTone,
} from '../enums/index.js';

// ==========================================
// Delivery Event Contracts
// ==========================================

export interface DeliveryDto {
  id: string;
  admissionId: string;
  deliveryReferenceId: string;
  status: DeliveryStatus;
  deliveryTimestamp: string;
  deliveryMode: DeliveryMode;
  deliveryLocation: string;
  attendingDoctorId: string;
  attendingDoctorFullName?: string | null;
  responsibleMidwifeId: string | null;
  responsibleMidwifeFullName?: string | null;
  recordedByUserId: string;
  recordedByFullName?: string | null;
  finalizedByUserId: string | null;
  finalizedByFullName?: string | null;
  finalizedAt: string | null;
  estimatedBloodLossMl: number | null;
  perinealTraumaStatus: string | null;
  placentaStatus: string | null;
  placentaDeliveryTimestamp: string | null;
  clinicalNotes: string | null;
  amendmentReason: string | null;
  newborns?: NewbornDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryInput {
  deliveryTimestamp: string;
  deliveryMode: DeliveryMode;
  deliveryLocation: string;
  attendingDoctorId: string;
  responsibleMidwifeId?: string | null;
  estimatedBloodLossMl?: number | null;
  perinealTraumaStatus?: string | null;
  placentaStatus?: string | null;
  placentaDeliveryTimestamp?: string | null;
  clinicalNotes?: string | null;
}

export interface UpdateDeliveryInput {
  deliveryTimestamp?: string;
  deliveryMode?: DeliveryMode;
  deliveryLocation?: string;
  attendingDoctorId?: string;
  responsibleMidwifeId?: string | null;
  estimatedBloodLossMl?: number | null;
  perinealTraumaStatus?: string | null;
  placentaStatus?: string | null;
  placentaDeliveryTimestamp?: string | null;
  clinicalNotes?: string | null;
  amendmentReason?: string | null;
}

export interface FinalizeDeliveryInput {
  clinicalSummary?: string | null;
}

// ==========================================
// Newborn & Birth Record Contracts
// ==========================================

export interface NewbornDto {
  id: string;
  deliveryId: string;
  admissionId: string;
  newbornReferenceId: string;
  birthOrder: number;
  birthTimestamp: string;
  outcome: BirthOutcome;
  sex: NewbornSex;
  birthWeightGrams: number;
  gestationalAgeWeeks: number | null;
  gestationalAgeDays: number | null;
  deliveredByUserId: string;
  deliveredByFullName?: string | null;
  dischargeStatus: NewbornDischargeStatus;
  dischargedAt: string | null;
  dischargedByUserId: string | null;
  provisionalName: string | null;
  apgarAssessments?: ApgarAssessmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RegisterNewbornInput {
  birthOrder: number;
  birthTimestamp: string;
  outcome: BirthOutcome;
  sex: NewbornSex;
  birthWeightGrams: number;
  gestationalAgeWeeks?: number | null;
  gestationalAgeDays?: number | null;
  deliveredByUserId: string;
  provisionalName?: string | null;
}

// ==========================================
// Apgar Assessment Contracts
// ==========================================

export interface ApgarAssessmentDto {
  id: string;
  newbornId: string;
  admissionId: string;
  assessmentMinute: ApgarMinute;
  assessedAt: string;
  appearance: number;
  pulse: number;
  grimace: number;
  activity: number;
  respiration: number;
  totalScore: number;
  assessedByUserId: string;
  assessedByFullName?: string | null;
  notes: string | null;
  supersedesId: string | null;
  supersedeReason: string | null;
  createdAt: string;
}

export interface RecordApgarInput {
  assessmentMinute: ApgarMinute;
  assessedAt?: string;
  appearance: number;
  pulse: number;
  grimace: number;
  activity: number;
  respiration: number;
  notes?: string | null;
  supersedesId?: string | null;
  supersedeReason?: string | null;
}

// ==========================================
// Postpartum Maternal Care Contracts
// ==========================================

export interface PostpartumMaternalAssessmentDto {
  id: string;
  admissionId: string;
  recordedByUserId: string;
  recordedByFullName?: string | null;
  assessmentTimestamp: string;
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseRate: number | null;
  respiratoryRate: number | null;
  temperatureCelsius: number | null;
  fundalHeightCm: number | null;
  uterineTone: UterineTone | null;
  lochiaAmount: LochiaAmount | null;
  lochiaType: LochiaType | null;
  perinealWoundStatus: string | null;
  painScore: number | null;
  bladderStatus: string | null;
  clinicalReviewStatus: MaternalReviewStatus;
  clinicalNotes: string | null;
  createdAt: string;
}

export interface CreatePostpartumMaternalAssessmentInput {
  assessmentTimestamp?: string;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  respiratoryRate?: number | null;
  temperatureCelsius?: number | null;
  fundalHeightCm?: number | null;
  uterineTone?: UterineTone | null;
  lochiaAmount?: LochiaAmount | null;
  lochiaType?: LochiaType | null;
  perinealWoundStatus?: string | null;
  painScore?: number | null;
  bladderStatus?: string | null;
  clinicalReviewStatus?: MaternalReviewStatus;
  clinicalNotes?: string | null;
}

// ==========================================
// Postpartum Newborn Care Contracts
// ==========================================

export interface PostpartumNewbornAssessmentDto {
  id: string;
  newbornId: string;
  admissionId: string;
  recordedByUserId: string;
  recordedByFullName?: string | null;
  assessmentTimestamp: string;
  generalCondition: NewbornGeneralCondition;
  respiratoryRate: number | null;
  heartRate: number | null;
  temperatureCelsius: number | null;
  feedingStatus: NewbornFeedingStatus;
  cordCondition: NewbornCordCondition;
  urinePassed: boolean;
  meconiumPassed: boolean;
  jaundiceStatus: NewbornJaundiceStatus;
  clinicalNotes: string | null;
  createdAt: string;
}

export interface CreatePostpartumNewbornAssessmentInput {
  assessmentTimestamp?: string;
  generalCondition: NewbornGeneralCondition;
  respiratoryRate?: number | null;
  heartRate?: number | null;
  temperatureCelsius?: number | null;
  feedingStatus: NewbornFeedingStatus;
  cordCondition: NewbornCordCondition;
  urinePassed?: boolean;
  meconiumPassed?: boolean;
  jaundiceStatus?: NewbornJaundiceStatus;
  clinicalNotes?: string | null;
}

// ==========================================
// Postpartum Discharge Authorization Contracts
// ==========================================

export interface PostpartumDischargeAuthorizationDto {
  id: string;
  admissionId: string;
  newbornId: string | null;
  dischargedEntityType: DischargedEntityType;
  authorizedByDoctorId: string;
  authorizedByDoctorFullName?: string | null;
  dischargedAt: string;
  dischargeDestination: string;
  maternalCondition: string | null;
  newbornCondition: string | null;
  dischargeSummary: string;
  feedingPlan: string | null;
  followUpInstructions: string;
  bedReleasedId: string | null;
  createdAt: string;
}

export interface AuthorizeMaternalDischargeInput {
  dischargedAt?: string;
  dischargeDestination: DischargeDestination;
  maternalCondition: string;
  dischargeSummary: string;
  followUpInstructions: string;
  releaseBed?: boolean;
}

export interface AuthorizeNewbornDischargeInput {
  dischargedAt?: string;
  dischargeDestination: string;
  newbornCondition: string;
  dischargeStatus: NewbornDischargeStatus;
  dischargeSummary: string;
  feedingPlan?: string | null;
  followUpInstructions: string;
}
