import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PatientDto, PatientPiiDto, Permission } from '@lrms/shared';
import {
  fetchPatientMasterRecord,
  revealPatientPii,
  updatePatientPii,
} from '../../services/patients.api.js';
import { PermissionGuard } from '../../components/auth/PermissionGuard.js';
import { PageHeader, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { AdmissionCategoryBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { Badge } from '../../components/ui/badge.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.js';
import {
  AlertCircle,
  ArrowLeft,
  ClipboardList,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { formatColomboDateTime } from '../../lib/datetime.js';
import { humanizeEnum } from '../../lib/labels.js';

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<PatientDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ephemeral decrypted PII (populated ONLY after audited server GET /patients/:id/pii)
  const [disclosedPii, setDisclosedPii] = useState<PatientPiiDto | null>(null);
  const [revealingPii, setRevealingPii] = useState(false);
  const [piiError, setPiiError] = useState<string | null>(null);

  // Edit PII dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editNic, setEditNic] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [savingPii, setSavingPii] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadPatient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchPatientMasterRecord(id);
      if (!res.success || !res.data) {
        setErrorMsg(res.error?.message || 'Unable to load patient master record.');
      } else {
        setPatient(res.data);
      }
    } catch {
      setErrorMsg('Network error loading patient master record.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setDisclosedPii(null);
    loadPatient();
  }, [loadPatient]);

  const handleRevealPii = async () => {
    if (!patient) return;
    if (disclosedPii) {
      setDisclosedPii(null);
      return;
    }

    setRevealingPii(true);
    setPiiError(null);
    try {
      const res = await revealPatientPii(patient.id);
      if (!res.success || !res.data) {
        setPiiError(res.error?.message || 'You are not allowed to view identity details.');
        return;
      }
      setDisclosedPii(res.data);
      await loadPatient(); // Refresh audit history to show PATIENT_PII_ACCESSED event
    } catch {
      setPiiError('Unable to load identity details. Please try again.');
    } finally {
      setRevealingPii(false);
    }
  };

  const handleOpenEdit = async () => {
    if (!patient) return;
    setEditError(null);
    if (disclosedPii) {
      setEditFullName(disclosedPii.fullName || '');
      setEditNic(disclosedPii.nic || '');
      setEditContactPhone(disclosedPii.contactPhone || '');
    } else {
      setEditFullName('');
      setEditNic('');
      setEditContactPhone('');
    }
    setEditOpen(true);
  };

  const handleSavePii = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setEditError(null);
    setSavingPii(true);
    try {
      const res = await updatePatientPii(patient.id, {
        fullName: editFullName.trim() || null,
        nic: editNic.trim() || null,
        contactPhone: editContactPhone.trim() || null,
      });

      if (!res.success || !res.data) {
        setEditError(res.error?.message || 'Unable to update patient identity details.');
        return;
      }

      setEditOpen(false);
      setDisclosedPii(null);
      await loadPatient();
    } catch {
      setEditError('Network error saving patient identity.');
    } finally {
      setSavingPii(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-xs text-slate-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin text-teal-600" />
        Loading patient master record...
      </div>
    );
  }

  if (errorMsg || !patient) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <Link to="/admissions">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Admissions
          </Button>
        </Link>
        <EmptyState
          title="Patient Master Record Unavailable"
          description={
            errorMsg || 'You do not have permission or this patient record does not exist.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Patient Master Record"
        description="Patient reference, identity details, and admission history."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', href: '/admissions' },
          { label: 'Patient record', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-700" />
            IDENTITY DETAILS PROTECTED
          </span>
        }
        action={
          <Link to="/admissions">
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back to Admissions
            </Button>
          </Link>
        }
      />

      {/* Audited PII Disclosure Control */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-teal-800 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-teal-950">Patient identity details</h3>
              <p className="text-xs text-teal-800 mt-0.5">
                Name, NIC, and contact number are optional and shown only to the care team. Each
                time they are viewed, the access is recorded in the audit log.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <PermissionGuard permission={Permission.PATIENTS_VIEW_PII}>
              <Button
                size="sm"
                variant="outline"
                disabled={revealingPii}
                onClick={handleRevealPii}
                className="text-xs bg-white text-teal-900 border-teal-300 hover:bg-teal-50 min-h-[40px]"
              >
                {revealingPii ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Authorizing...
                  </>
                ) : disclosedPii ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                    Mask Personal Information
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                    Decrypt Personal Information
                  </>
                )}
              </Button>
            </PermissionGuard>

            <PermissionGuard permission={Permission.ADMISSIONS_UPDATE_PII}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenEdit}
                className="text-xs bg-white text-slate-800 border-slate-300 min-h-[40px]"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                {patient.hasPii ? 'Update Identity' : 'Add Identity Details'}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {piiError && (
          <div role="alert" className="mt-3 text-xs text-red-700 font-medium flex items-center">
            <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
            {piiError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Patient Identity" description="Patient reference and identity details">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Patient reference:</span>
              <span className="font-mono text-[11px] font-semibold text-slate-900">
                {patient.id}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Full Name:</span>
              <span className="font-semibold text-slate-900">
                {disclosedPii
                  ? disclosedPii.fullName || 'Not recorded'
                  : patient.hasFullName
                    ? '•••••••• (Hidden)'
                    : 'Not recorded'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">National ID (NIC):</span>
              <span className="font-mono font-semibold text-slate-900">
                {disclosedPii
                  ? disclosedPii.nic || 'Not recorded'
                  : patient.hasNic
                    ? '•••••••• (Hidden)'
                    : 'Not recorded'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Contact Number:</span>
              <span className="font-mono font-semibold text-slate-900">
                {disclosedPii
                  ? disclosedPii.contactPhone || 'Not recorded'
                  : patient.hasContactPhone
                    ? '•••••••• (Hidden)'
                    : 'Not recorded'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Record Created:</span>
              <span className="text-slate-700">{formatColomboDateTime(patient.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Total Admissions:</span>
              <span className="font-bold text-slate-900">{patient.admissionCount}</span>
            </div>
          </div>
        </SectionCard>

        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Authorized Admission History"
            description="Labour room episodes linked to this patient"
          >
            {patient.admissions && patient.admissions.length > 0 ? (
              <div className="space-y-3">
                {patient.admissions.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold font-mono text-teal-900">
                          {adm.admissionReferenceId}
                        </span>
                        <AdmissionCategoryBadge category={adm.admissionCategory} />
                        <Badge variant="outline" className="text-[10px]">
                          {humanizeEnum(adm.status)}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Admitted {formatColomboDateTime(adm.admittedAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {adm.riskFlags.length > 0 ? (
                        adm.riskFlags.map((flag) => (
                          <Badge
                            key={flag.id}
                            variant="outline"
                            className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                          >
                            {flag.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          {adm.noListedRiskFlagsConfirmed
                            ? 'Confirmed: No listed risk flags'
                            : 'No active risk flags'}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Link to={`/admissions/${adm.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Open Admission Detail →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No admissions found"
                description="No authorized admission records are linked to this patient."
              />
            )}
          </SectionCard>

          <SectionCard
            title="Patient Access & Audit History"
            description="Security and clinical audit log (contains no identity details)"
          >
            {patient.auditHistory && patient.auditHistory.length > 0 ? (
              <div className="space-y-2 text-xs">
                {patient.auditHistory.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <div className="flex items-center space-x-2">
                      <ClipboardList className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      <span className="font-mono font-semibold text-slate-900">{log.action}</span>
                      <span className="text-slate-500">by {log.actorUsername || 'system'}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatColomboDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No audit entries available.</p>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Edit Optional PII Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Update Optional Patient Identity
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              All fields are optional. Details are stored securely and shown only to the care team.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700"
            >
              {editError}
            </div>
          )}

          <form onSubmit={handleSavePii} className="space-y-3 text-xs">
            <div>
              <Label htmlFor="edit-patient-name" className="text-xs font-semibold text-slate-700">
                Full Legal Name (Optional)
              </Label>
              <Input
                id="edit-patient-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Enter full name"
                className="mt-1 h-9 text-xs"
                disabled={savingPii}
              />
            </div>

            <div>
              <Label htmlFor="edit-patient-nic" className="text-xs font-semibold text-slate-700">
                National Identity Card (NIC) (Optional)
              </Label>
              <Input
                id="edit-patient-nic"
                value={editNic}
                onChange={(e) => setEditNic(e.target.value)}
                placeholder="e.g. 199450102450 or 945012450V"
                className="mt-1 h-9 text-xs"
                disabled={savingPii}
              />
            </div>

            <div>
              <Label htmlFor="edit-patient-phone" className="text-xs font-semibold text-slate-700">
                Contact Phone Number (Optional)
              </Label>
              <Input
                id="edit-patient-phone"
                value={editContactPhone}
                onChange={(e) => setEditContactPhone(e.target.value)}
                placeholder="e.g. +94771234567"
                className="mt-1 h-9 text-xs"
                disabled={savingPii}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(false)}
                disabled={savingPii}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingPii}
                className="bg-teal-700 hover:bg-teal-800 text-white"
              >
                {savingPii ? 'Saving...' : 'Save Identity Details'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
