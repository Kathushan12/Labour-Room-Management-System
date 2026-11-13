import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AdmissionCategory,
  CreateTriageResponse,
  Permission,
  RiskFlagDefinitionDto,
  RiskFlagKey,
} from '@lrms/shared';
import { submitRapidTriage } from '../../../services/admissions.api.js';
import { PermissionGuard } from '../../../components/auth/PermissionGuard.js';
import { AdmissionCategoryBadge } from '../../../components/status/Badges.js';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Badge } from '../../../components/ui/badge.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.js';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';

interface RapidTriageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riskFlagDefinitions: RiskFlagDefinitionDto[];
  onSuccess: (created: CreateTriageResponse) => void;
}

const CORE_PROPOSAL_FLAGS: RiskFlagKey[] = [
  RiskFlagKey.HYPERTENSION,
  RiskFlagKey.GESTATIONAL_DIABETES,
  RiskFlagKey.PREVIOUS_CESAREAN,
  RiskFlagKey.OBSERVATION_20_PLUS_WEEKS,
];

const NIC_FORMAT_REGEX = /^(?:\d{9}[VX]|\d{12})$/i;

export const RapidTriageDialog: React.FC<RapidTriageDialogProps> = ({
  open,
  onOpenChange,
  riskFlagDefinitions,
  onSuccess,
}) => {
  const [admissionCategory, setAdmissionCategory] = useState<AdmissionCategory>(
    AdmissionCategory.NORMAL_DELIVERY,
  );
  const [selectedFlags, setSelectedFlags] = useState<RiskFlagKey[]>([]);
  const [noListedFlagsConfirmed, setNoListedFlagsConfirmed] = useState(false);

  const [fullName, setFullName] = useState('');
  const [nic, setNic] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [duplicateMatchPrompt, setDuplicateMatchPrompt] = useState(false);
  const [linkExistingPatient, setLinkExistingPatient] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreateTriageResponse | null>(null);

  // Filter definitions to display approved flags (core 4 first, preserving DB records)
  const displayedFlags = riskFlagDefinitions.filter((d) => CORE_PROPOSAL_FLAGS.includes(d.key));

  const resetForm = () => {
    setAdmissionCategory(AdmissionCategory.NORMAL_DELIVERY);
    setSelectedFlags([]);
    setNoListedFlagsConfirmed(false);
    setFullName('');
    setNic('');
    setContactPhone('');
    setDuplicateMatchPrompt(false);
    setLinkExistingPatient(false);
    setValidationError(null);
    setApiError(null);
    setCreatedResult(null);
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const toggleFlag = (key: RiskFlagKey) => {
    setValidationError(null);
    setSelectedFlags((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (next.length > 0) {
        setNoListedFlagsConfirmed(false);
      }
      return next;
    });
  };

  const handleToggleNoFlags = (checked: boolean) => {
    setValidationError(null);
    setNoListedFlagsConfirmed(checked);
    if (checked) {
      setSelectedFlags([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setApiError(null);

    if (selectedFlags.length === 0 && !noListedFlagsConfirmed) {
      setValidationError(
        'Select at least one clinical risk flag OR explicitly confirm that no listed risk flags apply.',
      );
      return;
    }

    const cleanNic = nic.trim();
    if (cleanNic.length > 0 && !NIC_FORMAT_REGEX.test(cleanNic)) {
      setValidationError('NIC must be 9 digits + V/X (e.g. 945012450V) or 12 digits.');
      return;
    }

    const cleanPhone = contactPhone.trim();
    if (cleanPhone.length > 0 && !/^[+0-9\s()-]{7,25}$/.test(cleanPhone)) {
      setValidationError('Contact number must contain 7-25 valid phone characters.');
      return;
    }

    const hasOptionalPii =
      fullName.trim().length > 0 || cleanNic.length > 0 || cleanPhone.length > 0;

    setSubmitting(true);
    try {
      const res = await submitRapidTriage({
        admissionCategory,
        riskFlagKeys: selectedFlags,
        noListedRiskFlagsConfirmed: noListedFlagsConfirmed,
        linkExistingPatient: duplicateMatchPrompt ? linkExistingPatient : false,
        optionalPii: hasOptionalPii
          ? {
              fullName: fullName.trim() || null,
              nic: cleanNic || null,
              contactPhone: cleanPhone || null,
            }
          : null,
      });

      if (!res.success || !res.data) {
        if (res.error?.code === 'DUPLICATE_PATIENT_MATCH') {
          setDuplicateMatchPrompt(true);
          setApiError(
            res.error.message ||
              'Existing historical patient matches this NIC. Confirm linking below to proceed without overwriting stored PII.',
          );
        } else {
          setApiError(res.error?.message || 'Unable to complete rapid triage admission.');
        }
        return;
      }

      setCreatedResult(res.data);
      onSuccess(res.data);
    } catch {
      setApiError('Network error communicating with admission triage service.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = validationError || apiError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-teal-700 shrink-0" />
            <span>Rapid Patient Triage &amp; Admission</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Immediate point-of-care registration. Backend generates a unique Admission Reference ID
            and encrypts optional patient identity details via AES-256-GCM.
          </DialogDescription>
        </DialogHeader>

        {createdResult ? (
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    Admission Recorded Successfully
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Server assigned a unique Admission Reference ID and recorded the triage profile
                    atomically.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-emerald-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Admission Reference ID:</span>
                  <span
                    data-testid="generated-admission-ref"
                    className="font-mono text-base font-bold text-teal-800"
                  >
                    {createdResult.admission.admissionReferenceId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Admission Category:</span>
                  <AdmissionCategoryBadge category={createdResult.admission.admissionCategory} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Admitted At:</span>
                  <span className="font-mono text-slate-800">
                    {new Date(createdResult.admission.admittedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Recorded Risk Screening:</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {createdResult.admission.riskFlags.length > 0 ? (
                      createdResult.admission.riskFlags.map((flag) => (
                        <Badge
                          key={flag.id}
                          variant="outline"
                          className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                        >
                          {flag.label}
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-slate-100 text-slate-700 border-slate-200"
                      >
                        Confirmed: No Listed Flags
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Link to={`/patients/${createdResult.patientId}`}>
                <Button type="button" variant="outline" size="sm" className="min-h-[44px] w-full">
                  View Patient Master Record
                </Button>
              </Link>
              <Link to={`/admissions/${createdResult.admission.id}`}>
                <Button
                  type="button"
                  size="sm"
                  className="bg-teal-700 hover:bg-teal-800 text-white min-h-[44px] w-full"
                >
                  Open Admission Detail
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs" noValidate>
            {displayError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-red-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Step 1: Admission Category (Large mobile-friendly cards) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-800">
                1. Admission Category *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    value: AdmissionCategory.NORMAL_DELIVERY,
                    label: 'Normal Delivery',
                    hint: 'Active labour intake',
                  },
                  {
                    value: AdmissionCategory.SCHEDULED_CESAREAN,
                    label: 'Cesarean Section',
                    hint: 'Scheduled operative intake',
                  },
                  {
                    value: AdmissionCategory.OBSERVATION_20_PLUS_WEEKS,
                    label: '20+ Weeks Observation',
                    hint: 'Antepartum monitoring',
                  },
                ].map((opt) => {
                  const selected = admissionCategory === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex flex-col p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                        selected
                          ? 'border-teal-600 bg-teal-50/70 text-teal-950'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="admissionCategory"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setAdmissionCategory(opt.value)}
                          disabled={submitting}
                          className="text-teal-700 focus:ring-teal-500"
                        />
                        <span className="font-semibold text-xs">{opt.label}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 pl-5 mt-0.5">{opt.hint}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Clinical Risk Flag Screening */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-800">
                2. Clinical Risk Flags Screening *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayedFlags.map((flag) => {
                  const checked = selectedFlags.includes(flag.key);
                  return (
                    <label
                      key={flag.key}
                      className={`flex items-center space-x-2.5 p-3 rounded-lg border cursor-pointer min-h-[44px] ${
                        checked
                          ? 'border-amber-500 bg-amber-50/70 text-amber-950'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFlag(flag.key)}
                        disabled={submitting}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 shrink-0"
                      />
                      <span className="font-medium text-xs">{flag.label}</span>
                    </label>
                  );
                })}
              </div>

              <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={noListedFlagsConfirmed}
                  onChange={(e) => handleToggleNoFlags(e.target.checked)}
                  disabled={submitting || selectedFlags.length > 0}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4 shrink-0"
                />
                <span className="text-xs font-medium text-slate-800">
                  Confirmed: None of the listed clinical risk flags apply at triage
                </span>
              </label>
            </div>

            {/* Step 3: Optional PII */}
            <PermissionGuard permission={Permission.ADMISSIONS_ENTER_PII}>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
                <div className="flex items-start space-x-2">
                  <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      3. Patient Identity Details (Optional — leave blank if urgent)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Any details entered here are encrypted with AES-256-GCM at rest. Triage can
                      proceed immediately with zero personal information.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="triage-fullname" className="text-xs font-medium text-slate-700">
                      Full Name (Optional)
                    </Label>
                    <Input
                      id="triage-fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 h-11 text-xs bg-white"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="triage-nic" className="text-xs font-medium text-slate-700">
                      NIC Number (Optional)
                    </Label>
                    <Input
                      id="triage-nic"
                      value={nic}
                      onChange={(e) => {
                        setNic(e.target.value);
                        setDuplicateMatchPrompt(false);
                        setLinkExistingPatient(false);
                      }}
                      placeholder="e.g. 199450102450"
                      className="mt-1 h-11 text-xs bg-white"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="triage-phone" className="text-xs font-medium text-slate-700">
                      Contact Number (Optional)
                    </Label>
                    <Input
                      id="triage-phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="e.g. +94771234567"
                      className="mt-1 h-11 text-xs bg-white"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </PermissionGuard>

            {duplicateMatchPrompt && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 space-y-2 text-amber-950">
                <div className="flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="font-semibold">Duplicate Patient Identity Protection</span>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkExistingPatient}
                    onChange={(e) => setLinkExistingPatient(e.target.checked)}
                    className="rounded text-teal-600 h-4 w-4"
                  />
                  <span>
                    Confirm linking this new admission to the existing patient record (existing
                    identity information will not be overwritten)
                  </span>
                </label>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-teal-700 hover:bg-teal-800 text-white font-semibold min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Recording Admission...
                  </>
                ) : (
                  'Submit Rapid Triage'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
