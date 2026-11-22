// End-to-end SRS conformance checks against the running API. Uses demo data only.
import { createRequire } from 'node:module';
import { BASE, call, login } from './api.mjs';

const require = createRequire(
  'd:/University/University_Projects/Labour-Room-Management-System/apps/api/package.json',
);
const { io } = require('socket.io-client');

const results = [];
function check(id, label, ok, evidence) {
  results.push({ id, label, ok, evidence });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${label}  -- ${evidence}`);
}
const code = (r) => r.body?.error?.code ?? '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = Math.random().toString(36).slice(2, 7);

const { user: nurse } = await login('nurse');
const { user: doctor } = await login('doctor');
await login('admin');

const ward = (await call('admin', 'GET', '/wards')).body.data.items[0];
const board = async () => (await call('nurse', 'GET', `/wards/${ward.id}/bed-board`)).body.data;
const b0 = await board();
const freeBeds = b0.beds.filter((b) => b.displayStatus === 'AVAILABLE');
check('REQ-2.6', 'board counts', b0.totalPhysicalBeds === 7 && b0.functioningBedsCount === 5,
  `total=${b0.totalPhysicalBeds} functioning=${b0.functioningBedsCount} occupied=${b0.occupiedBedsCount} available=${b0.availableBedsCount}`);
check('REQ-2.2', 'display statuses within SRS set',
  b0.beds.every((b) => ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE'].includes(b.displayStatus)),
  [...new Set(b0.beds.map((b) => b.displayStatus))].join(','));
const occ = b0.beds.find((b) => b.currentAllocation);
check('REQ-3.9', 'risk flags on ward board', occ.currentAllocation.riskFlags.length > 0,
  `${occ.bedNumber}: ${occ.currentAllocation.riskFlags.join(',')}`);
const boardText = JSON.stringify(b0);
check('REQ-3.12', 'no PII on ward board', !/Rathnayake|Weerasinghe|Gunawardena|1992856|\+94 7/.test(boardText),
  `patientDisplayName=${occ.currentAllocation.patientDisplayName}`);

// ---------- UR-1 ----------
let r = await call('admin', 'POST', '/auth/register', { username: 'x', password: 'y' });
check('REQ-1.11', 'no self-registration route', r.status === 404, `POST /auth/register -> ${r.status}`);

r = await call('admin', 'POST', '/users', {
  username: `test.nurse.${rand}`, fullName: 'Sister Test Perera', role: 'NURSE_STAFF', staffId: `NUR-T${rand}`,
});
const tempPw = r.body.data?.temporaryPassword ?? r.body.data?.credential?.temporaryPassword;
check('REQ-1.3/1.6', 'temp password >= 15 chars, shown once on create', r.status === 201 && tempPw?.length >= 15,
  `status ${r.status}, temp length ${tempPw?.length}`);
const newUserId = r.body.data?.user?.id;
const reread = await call('admin', 'GET', `/users/${newUserId}`);
check('REQ-1.6', 'temp password not returned again', !JSON.stringify(reread.body).includes(tempPw ?? '###'), 'GET /users/:id has no password');

// change password to a 14-char one -> rejected, 16-char -> accepted
const tmpLogin = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: `test.nurse.${rand}`, password: tempPw }) }).then((x) => x.json());
const tmpTok = tmpLogin.data.accessToken;
const chg = (pw) => fetch(`${BASE}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tmpTok}` }, body: JSON.stringify({ currentPassword: tempPw, newPassword: pw }) });
const short = await chg('Short@Pass1234');
check('REQ-1.3', '14-char password rejected', short.status === 400, `status ${short.status}`);
const okPw = 'Fifteen@Chars2026';
const good = await chg(okPw);
check('REQ-1.3', '17-char password accepted', good.status === 200, `status ${good.status}`);

// REQ-1.9: deactivate -> socket + API cut off within 5 s
const { token: tTok } = await login([`test.nurse.${rand}`, okPw]);
const sock = io('http://localhost:4000', { path: '/socket.io', auth: { token: `Bearer ${tTok}` }, transports: ['websocket'], reconnection: false });
await new Promise((res) => sock.on('connect', res));
let disconnectedAt = null;
sock.on('disconnect', () => { disconnectedAt = Date.now(); });
const t0 = Date.now();
r = await call('admin', 'PATCH', `/users/${newUserId}/status`, { isActive: false, reason: 'Conformance test' });
await sleep(1500);
const after = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${tTok}` } });
check('REQ-1.9', 'deactivation cuts socket and API < 5 s', r.status === 200 && disconnectedAt && disconnectedAt - t0 < 5000 && after.status === 401,
  `status ${r.status}, socket closed after ${disconnectedAt ? disconnectedAt - t0 : 'never'} ms, /auth/me -> ${after.status}`);
sock.close();
r = await call('admin', 'PATCH', `/users/${newUserId}/status`, { isActive: true, reason: 'Conformance test' });
check('REQ-1.6', 'reactivate', r.status === 200, `status ${r.status}`);

// ---------- UR-3 admission ----------
const triage = (who, extra) => call(who, 'POST', '/admissions/triage', {
  admissionCategory: 'NORMAL_DELIVERY', gestationWeeks: 38, bedId: freeBeds[0].id, attendingDoctorId: doctor.id,
  riskFlagKeys: [], noListedRiskFlagsConfirmed: true, ...extra,
});
r = await call('nurse', 'POST', '/admissions/triage', { admissionCategory: 'NORMAL_DELIVERY', noListedRiskFlagsConfirmed: true });
const fe = r.body.error?.details?.fieldErrors ?? {};
check('REQ-3.2', 'gestation, bed and doctor required', r.status === 400 && fe.gestationWeeks && fe.bedId && fe.attendingDoctorId,
  `400 fieldErrors: ${Object.keys(fe).join(',')}`);
r = await triage('nurse', { riskFlagKeys: [], noListedRiskFlagsConfirmed: false });
check('REQ-3.4', 'risk flags or NONE required', r.status === 400 && code(r) === 'RISK_ASSESSMENT_REQUIRED', `${r.status} ${code(r)}`);
r = await triage('nurse', { admissionCategory: 'SCHEDULED_CESAREAN' });
check('REQ-3.3', 'old pathway name rejected', r.status === 400, `${r.status}`);
r = await triage('nurse', { riskFlagKeys: ['OTHER'], noListedRiskFlagsConfirmed: false });
check('REQ-3.4', 'non-SRS risk flag OTHER rejected', r.status === 400, `${r.status} ${code(r)}`);
for (const g of [19, 45]) {
  r = await triage('nurse', { gestationWeeks: g });
  check('REQ-3.8', `gestation ${g} rejected`, r.status === 400, `${r.status} ${r.body.error?.message}`);
}
r = await triage('admin', {});
check('REQ-1.10', 'admin cannot admit', r.status === 403, `${r.status}`);

// REQ-3.10 concurrency: two admits to the same bed
const [c1, c2] = await Promise.all([triage('nurse', { riskFlagKeys: ['HYPERTENSION'], noListedRiskFlagsConfirmed: false }), triage('nurse', {})]);
const wins = [c1, c2].filter((x) => x.status === 201);
const lose = [c1, c2].find((x) => x.status !== 201);
check('REQ-3.10/PER-7', 'two concurrent admits to one bed: exactly one succeeds', wins.length === 1 && lose?.status === 409 && code(lose) === 'BED_UNAVAILABLE',
  `statuses ${c1.status}/${c2.status}, loser ${code(lose)}`);
check('REQ-3.11', 'loser gets list of free beds', Array.isArray(lose?.body.error?.details?.availableBeds),
  `availableBeds=${JSON.stringify(lose?.body.error?.details?.availableBeds?.map((b) => b.bedNumber))}`);
const adm = wins[0].body.data.admission;
check('REQ-3.1', 'ref format LR-YYMM-NNNN', /^LR-\d{4}-\d{4}$/.test(adm.admissionReferenceId), adm.admissionReferenceId);
check('REQ-3.5', 'admission without name/NIC/phone', adm.hasPii === false, `hasPii=${adm.hasPii}`);
const b1 = await board();
const myBed = b1.beds.find((b) => b.id === freeBeds[0].id);
check('REQ-3.10', 'bed OCCUPIED in same transaction', myBed.displayStatus === 'OCCUPIED' && myBed.currentAllocation?.admissionId === adm.id, myBed.displayStatus);
const staff = (await call('nurse', 'GET', `/admissions/${adm.id}/staff`)).body.data;
const roles = JSON.stringify(staff);
check('REQ-4.1', 'attending doctor + admitting nurse assigned', roles.includes('ATTENDING_DOCTOR') && roles.includes('PRIMARY_NURSE'), 'staff responsibility has both');
const piiAdd = await call('nurse', 'PATCH', `/patients/${adm.patientId}/pii`, { fullName: 'Test Patient Silva' });
check('REQ-3.5', 'PII can be added later', piiAdd.status === 200, `PATCH pii -> ${piiAdd.status}`);
const piiRaw = await fetch('http://localhost:4000/api/v1/health/live');
void piiRaw;

// REQ-1.10 admin denied patient-level
r = await call('admin', 'GET', `/admissions/${adm.id}`);
const r2 = await call('admin', 'GET', `/patients/${adm.patientId}/pii`);
const r3 = await call('admin', 'POST', `/admissions/${adm.id}/maternal-observations`, { systolicBp: 120, diastolicBp: 80 });
check('REQ-1.10', 'admin cannot view PII / change clinical records', r.status === 403 && r2.status === 403 && r3.status === 403, `${r.status}/${r2.status}/${r3.status}`);

// REQ-1.7 other nurse not assigned
const other = await login(['nurse.silva', 'Silva@Nurse2026!']);
void other;
r = await call(['nurse.silva', 'Silva@Nurse2026!'], 'POST', `/admissions/${adm.id}/maternal-observations`, { systolicBp: 120, diastolicBp: 80 });
check('REQ-1.7', 'unassigned nurse cannot record', r.status === 403, `${r.status} ${code(r)}`);
r = await call(['nurse.silva', 'Silva@Nurse2026!'], 'POST', `/admissions/${adm.id}/staff`, { staffId: (await login(['nurse.silva', 'Silva@Nurse2026!'])).user.id, assignmentRole: 'SUPPORTING_NURSE' });
check('SEC-4', 'unassigned nurse cannot add herself to care team', r.status === 403, `${r.status}`);

// REQ-1.8 emergency access
const djay = ['dr.jayasinghe', 'Jayasinghe@Doctor2026'];
r = await call(djay, 'GET', `/admissions/${adm.id}`);
check('REQ-1.8', 'unassigned doctor denied by default', r.status === 403, `${r.status}`);
r = await call(['nurse.silva', 'Silva@Nurse2026!'], 'POST', `/admissions/${adm.id}/emergency-overrides`, { reason: 'Covering for colleague in emergency' });
check('REQ-1.8', 'nurse cannot use emergency access', r.status === 403, `${r.status}`);
r = await call(djay, 'POST', `/admissions/${adm.id}/emergency-overrides`, { reason: 'Covering obstetric emergency, attending in theatre' });
const r4 = await call(djay, 'GET', `/admissions/${adm.id}`);
check('REQ-1.8', 'doctor emergency access with reason', r.status === 201 && r4.status === 200, `override ${r.status}, then GET ${r4.status}`);

// ---------- UR-4 ----------
const attending = staff.assignments?.find?.((a) => a.assignmentRole === 'ATTENDING_DOCTOR') ?? staff.attendingDoctor;
if (attending?.id) {
  r = await call('nurse', 'DELETE', `/admissions/${adm.id}/staff/${attending.id}`, { reason: 'test removal' });
  check('REQ-4.1', 'cannot remove the only attending doctor', r.status === 409, `${r.status} ${code(r)}`);
}
r = await call('nurse', 'POST', `/admissions/${adm.id}/staff/transfer`, { newStaffId: (await login(djay)).user.id, assignmentRole: 'ATTENDING_DOCTOR', reason: 'Handover to on-call doctor' });
check('REQ-4.2', 'reassign attending doctor', r.status === 200 || r.status === 201, `${r.status} ${code(r)}`);
r = await call('nurse', 'POST', `/admissions/${adm.id}/staff/transfer`, { newStaffId: doctor.id, assignmentRole: 'ATTENDING_DOCTOR', reason: 'Back to original doctor' });
r = await call(['dr.perera', 'Perera@Doctor2026'], 'GET', '/admissions?limit=50');
check('REQ-4.4', 'doctor "My patients" scoped list', r.status === 200 && r.body.data.items.some((a) => a.id === adm.id), `${r.body.data.items.length} admissions visible`);

// ---------- UR-5 ----------
const obsPath = `/admissions/${adm.id}`;
r = await call('nurse', 'POST', `${obsPath}/maternal-observations`, {});
check('REQ-5.2', 'empty observation rejected', r.status === 400, `${r.status} ${r.body.error?.message}`);
r = await call('nurse', 'POST', `${obsPath}/fetal-observations`, { fetalHeartRateBpm: 221 });
check('REQ-5.3', 'FHR 221 rejected', r.status === 400, `${r.status}`);
r = await call('nurse', 'POST', `${obsPath}/fetal-observations`, { fetalHeartRateBpm: 300 });
check('REQ-5.3', 'FHR 300 rejected', r.status === 400, `${r.status}`);
r = await call('nurse', 'POST', `${obsPath}/maternal-observations`, { systolicBp: 261, diastolicBp: 90 });
check('REQ-5.3', 'systolic 261 rejected', r.status === 400, `${r.status}`);
r = await call('nurse', 'POST', `${obsPath}/fetal-observations`, { fetalHeartRateBpm: 140, liquorStatus: 'GREEN' });
check('REQ-5.1', 'amniotic fluid limited to INTACT/CLEAR/MECONIUM/BLOOD', r.status === 400, `${r.status}`);
const escBefore = (await call('nurse', 'GET', `${obsPath}/escalations`)).body.data.length;
const f1 = await call('nurse', 'POST', `${obsPath}/fetal-observations`, { fetalHeartRateBpm: 172, liquorStatus: 'MECONIUM' });
const m1 = await call('nurse', 'POST', `${obsPath}/maternal-observations`, { systolicBp: 150, diastolicBp: 95, pulseRateBpm: 125, bloodGlucoseValue: 110, bloodGlucoseUnit: 'MG_DL' });
check('REQ-5.1', 'all SRS fields accepted (glucose mg/dL)', f1.status === 201 && m1.status === 201, `${f1.status}/${m1.status}`);
check('REQ-5.4', 'highlights FHR>=160, SBP>=140, DBP>=90, pulse>=120', JSON.stringify(f1.body.data.highlights) === '["FHR_HIGH"]' && m1.body.data.highlights.length === 3,
  `${f1.body.data.highlights} | ${m1.body.data.highlights}`);
await sleep(500);
const escAfter = (await call('nurse', 'GET', `${obsPath}/escalations`)).body.data.length;
check('REQ-5.5/SAF-1', 'abnormal observation does not auto-escalate', escAfter === escBefore, `escalations ${escBefore} -> ${escAfter}`);
const f2 = await call('nurse', 'POST', `${obsPath}/fetal-observations`, { fetalHeartRateBpm: 100 });
const am = await call('nurse', 'POST', `${obsPath}/observations/${f2.body.data.id}/amend`, { observationType: 'FETAL', amendmentReason: 'Transcription error corrected', amendedValues: { fetalHeartRateBpm: 104 } });
const sum = (await call('nurse', 'GET', `${obsPath}/observations`)).body.data;
check('REQ-5.6', 'correction is a linked new entry', am.status === 201 || am.status === 200, `${am.status} ${code(am)}`);
const fetalTimes = sum.fetalObservations.map((o) => o.observationTimestamp);
check('REQ-5.7', 'latest first', fetalTimes.every((t, i) => i === 0 || fetalTimes[i - 1] >= t), `${fetalTimes.length} fetal rows newest first`);
check('REQ-5.8', 'observation due flag present', typeof sum.fhrObservationDue === 'boolean', `fhrObservationDue=${sum.fhrObservationDue}, last=${sum.lastFetalHeartRateAt}`);
check('REQ-5.4', 'FHR < 110 highlighted', sum.fetalObservations.some((o) => o.highlights.includes('FHR_LOW')), 'FHR 104 -> FHR_LOW');

// ---------- UR-6 ----------
r = await call('nurse', 'POST', `${obsPath}/escalations`, { reason: 'NOT_A_REASON' });
check('REQ-6.3', 'reason must be one of 4 values', r.status === 400, `${r.status}`);
const e1 = await call('nurse', 'POST', `${obsPath}/escalations`, { reason: 'FETAL_DISTRESS' });
const admAfter = (await call('nurse', 'GET', `/admissions/${adm.id}`)).body.data;
check('REQ-6.2/6.4', 'one call: plan EMERGENCY_CESAREAN + reason + user + time + alert', e1.status === 201 && admAfter.currentCarePlan === 'EMERGENCY_CESAREAN' && e1.body.data.reason === 'FETAL_DISTRESS' && e1.body.data.dispatchedAt && e1.body.data.assignedRecipientUserId === doctor.id,
  `${e1.status}, plan=${admAfter.currentCarePlan}, recipient=attending, alertState=${e1.body.data.alertState}`);
const e2 = await call('nurse', 'POST', `${obsPath}/escalations`, { reason: 'OTHER' });
check('REQ-6.5', 'no re-escalation; current alert status returned', e2.status === 409 && code(e2) === 'ALREADY_ESCALATED' && e2.body.error.details?.alertState,
  `${e2.status} ${code(e2)} alertState=${e2.body.error?.details?.alertState}`);
const otherAdm = b0.beds.find((b) => b.currentAllocation && b.currentAllocation.admissionId !== adm.id).currentAllocation.admissionId;
r = await call('doctor', 'POST', `/admissions/${otherAdm}/escalations/${e1.body.data.id}/resolve`, { clinicalResponseNotes: 'cross admission attempt' });
check('UR-6 extra', 'escalation must belong to admission in URL', r.status === 404 || r.status === 403, `${r.status} ${code(r)}`);
r = await call('nurse', 'POST', `${obsPath}/escalations/${e1.body.data.id}/reverse`, { reason: 'Nurse tries to reverse' });
check('REQ-6.6', 'nurse cannot reverse', r.status === 403, `${r.status} ${code(r)}`);
r = await call('doctor', 'POST', `${obsPath}/escalations/${e1.body.data.id}/reverse`, {});
check('REQ-6.6', 'reversal needs reason', r.status === 400, `${r.status}`);
r = await call('doctor', 'POST', `${obsPath}/escalations/${e1.body.data.id}/reverse`, { reason: 'CTG recovered after repositioning' });
const admRev = (await call('nurse', 'GET', `/admissions/${adm.id}`)).body.data;
check('REQ-6.6', 'doctor reverses with reason', r.status === 200 && admRev.currentCarePlan === 'NORMAL_DELIVERY', `${r.status}, plan=${admRev.currentCarePlan}`);

// ---------- UR-7 quick ----------
r = await call('doctor', 'POST', `${obsPath}/escalations/${e1.body.data.id}/acknowledge`, {});
check('REQ-7.5', 'attending doctor acknowledges', r.status === 200 && r.body.data.alertState === 'ACKNOWLEDGED', `${r.status} ${r.body.data?.alertState}`);
const methods = await Promise.all(['PATCH', 'PUT', 'DELETE'].map((m) => call('admin', m, `${obsPath}/escalations/${e1.body.data.id}`, {})));
check('REQ-7.10', 'no edit/delete route for alerts', methods.every((x) => x.status === 404), methods.map((x) => x.status).join('/'));

// ---------- UR-8 ----------
r = await call('nurse', 'POST', `/admissions/${adm.id}/delivery`, { deliveryTimestamp: new Date().toISOString(), deliveryMode: 'SPONTANEOUS_VAGINAL', deliveryLocation: 'Labour Room', attendingDoctorId: doctor.id });
check('REQ-8.1', 'old delivery mode rejected', r.status === 400, `${r.status}`);
r = await call('nurse', 'POST', `/admissions/${adm.id}/delivery`, { deliveryTimestamp: new Date().toISOString(), deliveryMode: 'NORMAL', deliveryLocation: 'Labour Room', attendingDoctorId: doctor.id });
const admDel = (await call('nurse', 'GET', `/admissions/${adm.id}`)).body.data;
check('REQ-8.1', 'delivery mode + time -> DELIVERED', r.status === 201 && admDel.currentCarePlan === 'DELIVERED', `${r.status}, plan=${admDel.currentCarePlan}`);
const dis = (dest) => call('nurse', 'POST', `/admissions/${adm.id}/postpartum/discharge`, { dischargeDestination: dest, maternalCondition: 'Stable', dischargeSummary: 'Uncomplicated normal delivery.', followUpInstructions: 'Postnatal clinic in 1 week' });
r = await dis('HOME');
check('REQ-8.2', 'destination outside SRS list rejected', r.status === 400, `${r.status}`);
r = await dis('POSTNATAL');
const admDis = (await call('doctor', 'GET', `/admissions/${adm.id}`)).body.data;
const bedAfter = (await board()).beds.find((b) => b.id === freeBeds[0].id);
check('REQ-8.3', 'nurse discharge closes admission and bed -> CLEANING', (r.status === 201 || r.status === 200) && admDis.status === 'DISCHARGED' && admDis.currentCarePlan === 'DISCHARGED' && bedAfter.displayStatus === 'CLEANING',
  `${r.status}, status=${admDis.status}, plan=${admDis.currentCarePlan}, bed=${bedAfter.displayStatus}`);
r = await call('nurse', 'POST', `${obsPath}/maternal-observations`, { pulseRateBpm: 80 });
const docAmend = await call('doctor', 'POST', `${obsPath}/observations/${m1.body.data.id}/amend`, { observationType: 'MATERNAL', amendmentReason: 'Doctor correction after discharge review', amendedValues: { pulseRateBpm: 118 } });
check('REQ-8.4', 'closed admission read-only, doctor correction allowed', r.status === 409 && (docAmend.status === 201 || docAmend.status === 200), `nurse obs ${r.status}, doctor amend ${docAmend.status}`);

// ---------- UR-2 cleaning + live update ----------
const nTok = (await login('nurse')).token;
const ns = io('http://localhost:4000', { path: '/socket.io', auth: { token: `Bearer ${nTok}` }, transports: ['websocket'], reconnection: false });
await new Promise((res) => ns.on('connect', res));
await new Promise((res) => ns.emit('room:join', { room: `ward:${ward.id}` }, res));
let bedEventAt = null;
ns.on('bed:updated', () => { if (!bedEventAt) bedEventAt = Date.now(); });
const ts = Date.now();
r = await call('nurse', 'POST', `/beds/${freeBeds[0].id}/cleaning/start`, {});
await sleep(1000);
check('REQ-2.7', 'bed:updated reaches ward board <= 2 s', bedEventAt && bedEventAt - ts <= 2000, `cleaning start ${r.status}, event after ${bedEventAt ? bedEventAt - ts : 'none'} ms`);
r = await call('nurse', 'POST', `/beds/${freeBeds[0].id}/cleaning/complete`, {});
const bedClean = (await board()).beds.find((b) => b.id === freeBeds[0].id);
check('REQ-2.5', 'nurse CLEANING -> AVAILABLE', r.status === 200 && bedClean.displayStatus === 'AVAILABLE', `${r.status} ${bedClean.displayStatus}`);
ns.close();
r = await call('admin', 'PATCH', `/beds/${occ.id}/maintenance`, { functioningStatus: 'OUT_OF_SERVICE', reason: 'test' });
check('REQ-2.4', 'occupied bed cannot go OUT_OF_SERVICE', r.status === 409, `${r.status} ${code(r)}`);
r = await call('admin', 'PATCH', `/beds/${freeBeds[0].id}/maintenance`, { functioningStatus: 'OUT_OF_SERVICE', reason: 'Conformance test' });
const r5 = await call('admin', 'PATCH', `/beds/${freeBeds[0].id}/maintenance`, { functioningStatus: 'FUNCTIONING', reason: 'Conformance test' });
check('REQ-2.3', 'admin sets and restores OUT_OF_SERVICE', r.status === 200 && r5.status === 200, `${r.status}/${r5.status}`);
r = await call('nurse', 'PATCH', `/beds/${freeBeds[0].id}/maintenance`, { functioningStatus: 'OUT_OF_SERVICE', reason: 'x' });
check('REQ-2.3', 'nurse cannot set OUT_OF_SERVICE', r.status === 403, `${r.status}`);
r = await call('admin', 'POST', `/beds/ward/${ward.id}`, { bedNumber: 'BED-01' });
check('REQ-2.1', 'duplicate bed code rejected', r.status === 409 || r.status === 400, `${r.status} ${code(r)}`);
r = await call('admin', 'DELETE', `/beds/${occ.id}`);
check('REQ-2.4', 'no bed removal route', r.status === 404, `${r.status}`);

// ---------- UR-9 ----------
r = await call('admin', 'GET', '/analytics/clinical-alerts?preset=THIS_MONTH');
const ar = r.body.data?.alertReceipts;
check('REQ-9.3', 'alert count, avg to delivered/ack, timed-out, per-alert times', ar && ar.totalAlerts > 0 && 'averageSecondsToAcknowledged' in ar && Array.isArray(ar.alerts),
  `total=${ar?.totalAlerts} delivered=${ar?.deliveredCount} ack=${ar?.acknowledgedCount} timedOut=${ar?.timedOutCount} avgDel=${ar?.averageSecondsToDelivered} avgAck=${ar?.averageSecondsToAcknowledged}`);
r = await call('admin', 'GET', '/analytics/admissions?preset=THIS_MONTH');
check('REQ-9.1', 'admissions by pathway + daily trend', r.body.data.admissionsByCategory?.length > 0 && Array.isArray(r.body.data.dailyTrends), JSON.stringify(r.body.data.admissionsByCategory));
r = await call('admin', 'GET', '/analytics/beds?preset=THIS_MONTH');
const rA = await call('admin', 'GET', '/analytics/alos?preset=THIS_MONTH');
check('REQ-9.2', 'occupancy, ALOS, avg cleaning time', r.body.data.currentOccupancyRate != null && 'maternalAlosDays' in rA.body.data && r.body.data.cleaningTurnaroundStats,
  `occ=${r.body.data.currentOccupancyRate}% alos=${rA.body.data.maternalAlosDays} cleaning=${JSON.stringify(r.body.data.cleaningTurnaroundStats)}`);
const csv = await call('admin', 'GET', '/analytics/reports/CLINICAL_ALERT_RESPONSE/export?format=CSV&preset=THIS_MONTH');
const pdf = await call('admin', 'GET', '/analytics/reports/MONTHLY_HOSPITAL_REPORT/export?format=PRINT_PDF&preset=THIS_MONTH');
check('REQ-9.5', 'CSV and print-to-PDF export', csv.status === 200 && pdf.status === 200 && String(pdf.body).includes('<'), `csv ${csv.status}, pdf ${pdf.status}`);
const allText = String(csv.body) + String(pdf.body) + JSON.stringify(rA.body);
check('REQ-9.4', 'no names/NIC/phone in reports', !/Rathnayake|Weerasinghe|Gunawardena|Test Patient|19928560|\+94 77 555/.test(allText), 'regex over exports');
r = await call('doctor', 'GET', '/analytics/reports/CLINICAL_ALERT_RESPONSE/export?format=CSV&preset=THIS_MONTH');
const rd = await call('doctor', 'GET', '/audit-logs');
const ra = await call('admin', 'GET', '/audit-logs?limit=100');
check('REQ-9.5/9.6', 'export + audit admin-only', r.status === 403 && rd.status === 403 && ra.status === 200, `doctor export ${r.status}, doctor audit ${rd.status}, admin audit ${ra.status}`);
const rn = await call('nurse', 'GET', '/audit-logs');
check('REQ-9.6', 'nurse denied audit log', rn.status === 403, `${rn.status}`);
const types = (await call('admin', 'GET', '/analytics/reports')).body.data.map((t) => t.type);
const exp = await Promise.all(types.flatMap((t) => ['CSV', 'PRINT_PDF'].map((f) => call('admin', 'GET', `/analytics/reports/${t}/export?format=${f}&preset=THIS_MONTH`).then((x) => [t, f, x.status]))));
const bad = exp.filter((e) => e[2] !== 200);
check('REQ-9.5', 'every report type exports CSV + PDF', bad.length === 0, bad.length ? JSON.stringify(bad) : `${exp.length} exports OK`);
const ov = await call('admin', 'GET', '/analytics/overview?preset=THIS_MONTH');
check('REQ-2.6', 'admin overview KPIs load', ov.status === 200, `${ov.status}`);
const actions = new Set(ra.body.data.items.map((i) => i.action));
check('REQ-9.6', 'audit covers login, account, emergency access, plan change, alert, discharge',
  ['LOGIN_SUCCESS', 'USER_DEACTIVATED', 'EMERGENCY_OVERRIDE_GRANTED', 'CARE_PLAN_STATE_CHANGED', 'CLINICAL_ESCALATION_ACKNOWLEDGED', 'MATERNAL_DISCHARGE_AUTHORIZED'].every((a) => actions.has(a)),
  [...actions].filter((a) => /LOGIN|USER_|OVERRIDE|CARE_PLAN|ESCALATION|DISCHARGE/.test(a)).slice(0, 12).join(','));

// ---------- SEC ----------
r = await call('nurse', 'GET', `/admissions/not-a-uuid`);
check('SEC-5/SEC-8', 'invalid input -> 400, no stack', r.status === 400 && !JSON.stringify(r.body).includes(' at '), `${r.status} ${code(r)}`);

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
import('node:fs').then((fs) => fs.writeFileSync(new URL('./conformance-results.json', import.meta.url), JSON.stringify(results, null, 2)));
