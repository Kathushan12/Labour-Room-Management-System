import { OBSERVATION_HIGHLIGHT as H, ObservationHighlight } from '@lrms/shared';

// REQ-5.4 / REQ-5.5: markers are for display only and never raise an alert or escalation.
export function maternalHighlights(obs: {
  systolicBp: number | null;
  diastolicBp: number | null;
  pulseRateBpm: number | null;
}): ObservationHighlight[] {
  const out: ObservationHighlight[] = [];
  if (obs.systolicBp != null && obs.systolicBp >= H.systolicHigh) out.push('SYSTOLIC_HIGH');
  if (obs.diastolicBp != null && obs.diastolicBp >= H.diastolicHigh) out.push('DIASTOLIC_HIGH');
  if (obs.pulseRateBpm != null && obs.pulseRateBpm < H.pulseLow) out.push('PULSE_LOW');
  if (obs.pulseRateBpm != null && obs.pulseRateBpm >= H.pulseHigh) out.push('PULSE_HIGH');
  return out;
}

export function fetalHighlights(obs: { fetalHeartRateBpm: number }): ObservationHighlight[] {
  if (obs.fetalHeartRateBpm < H.fetalHeartRateLow) return ['FHR_LOW'];
  if (obs.fetalHeartRateBpm >= H.fetalHeartRateHigh) return ['FHR_HIGH'];
  return [];
}
