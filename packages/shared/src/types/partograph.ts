import { ContractionIntensity, GlucoseUnit, MouldingGrade } from '../enums/index.js';

export interface PartographFhrPointDto {
  timestamp: string;
  fhrBpm: number;
  observationId: string;
  isAmended: boolean;
}

export interface PartographLiquorPointDto {
  timestamp: string;
  status: string;
  observationId: string;
}

export interface PartographMouldingPointDto {
  timestamp: string;
  moulding: MouldingGrade;
  observationId: string;
}

export interface PartographCervixPointDto {
  timestamp: string;
  dilationCm: number;
  observationId: string;
  isAmended: boolean;
}

export interface PartographDescentPointDto {
  timestamp: string;
  descentFifths: number | null;
  station: string | null;
  observationId: string;
}

export interface PartographContractionPointDto {
  timestamp: string;
  frequencyPer10Min: number;
  durationSeconds: number | null;
  intensity: ContractionIntensity | null;
  observationId: string;
}

export interface PartographBloodPressurePointDto {
  timestamp: string;
  systolic: number;
  diastolic: number;
  observationId: string;
}

export interface PartographPulsePointDto {
  timestamp: string;
  pulseBpm: number;
  observationId: string;
}

export interface PartographTemperaturePointDto {
  timestamp: string;
  tempCelsius: number;
  observationId: string;
}

export interface PartographGlucosePointDto {
  timestamp: string;
  value: number;
  unit: GlucoseUnit;
  observationId: string;
}

export interface PartographReferenceLinePointDto {
  timestamp: string;
  dilationCm: number;
}

export interface PartographDto {
  admissionId: string;
  admissionReferenceId: string;
  category: string;
  currentCarePlan: string;
  admittedAt: string;
  generatedAt: string;
  timezone: string; // 'Asia/Colombo'
  fetalCondition: {
    fhrSeries: PartographFhrPointDto[];
    liquorSeries: PartographLiquorPointDto[];
    mouldingSeries: PartographMouldingPointDto[];
  };
  labourProgress: {
    cervicalDilationSeries: PartographCervixPointDto[];
    fetalDescentSeries: PartographDescentPointDto[];
    alertLinePoints?: PartographReferenceLinePointDto[];
    actionLinePoints?: PartographReferenceLinePointDto[];
  };
  contractions: PartographContractionPointDto[];
  maternalCondition: {
    bloodPressureSeries: PartographBloodPressurePointDto[];
    pulseRateSeries: PartographPulsePointDto[];
    temperatureSeries: PartographTemperaturePointDto[];
    bloodGlucoseSeries: PartographGlucosePointDto[];
  };
}
