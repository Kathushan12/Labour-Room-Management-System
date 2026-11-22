import React, { useState, useEffect } from 'react';
import {
  CreateUserRequest,
  ProfessionalRegistrationBody,
  UpdateUserProfileRequest,
  UserListItemDto,
  UserRole,
} from '@lrms/shared';
import { Button } from '../../../components/ui/button.js';
import { Input } from '../../../components/ui/input.js';
import { Label } from '../../../components/ui/label.js';
import { Badge } from '../../../components/ui/badge.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.js';
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldAlert,
  UserCog,
  UserPlus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { formatColomboDateTime } from '../../../lib/datetime.js';

export interface EphemeralCredentialPayload {
  username: string;
  fullName: string;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
  isReissue?: boolean;
}

interface TemporaryCredentialDialogProps {
  credential: EphemeralCredentialPayload | null;
  onClose: () => void;
}

export const TemporaryCredentialDialog: React.FC<TemporaryCredentialDialogProps> = ({
  credential,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [credential]);

  if (!credential) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credential.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly in non-HTTPS contexts
    }
  };

  return (
    <Dialog open={Boolean(credential)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-teal-700" />
            <span>
              {credential.isReissue ? 'Temporary Credential Reissued' : 'Staff Account Provisioned'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            One-time initial login credential for <strong>{credential.fullName}</strong> (
            <span className="font-mono">{credential.username}</span>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-2.5 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>One-Time Display Security Policy:</strong> Communicate this temporary password
              securely to the staff member outside the system. It is never stored in browser storage
              and cannot be viewed again once you close this window. The user must set a permanent
              password upon first sign-in.
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900 text-slate-100 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Temporary Password (One-Time)</span>
              <Badge variant="outline" className="text-[10px] border-teal-500/40 text-teal-300">
                Expires {formatColomboDateTime(credential.temporaryPasswordExpiresAt)}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 bg-slate-950/60 px-3 py-2 rounded border border-slate-800">
              <code
                data-testid="temporary-password-value"
                className="font-mono text-sm font-bold tracking-wide text-emerald-300 select-all break-all"
              >
                {credential.temporaryPassword}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="h-7 px-2.5 text-[11px] bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
          >
            I Have Communicated It Securely — Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ProvisionStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateUserRequest) => Promise<void>;
}

export const ProvisionStaffDialog: React.FC<ProvisionStaffDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [regBody, setRegBody] = useState<ProfessionalRegistrationBody | ''>('');
  const [regNumber, setRegNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setErrorMsg(null);
    }
  }, [open]);

  const resetForm = () => {
    setUsername('');
    setFullName('');
    setRole(UserRole.DOCTOR);
    setEmail('');
    setStaffId('');
    setRegBody('');
    setRegNumber('');
    setContactNumber('');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setErrorMsg(
        'Username must be 3-50 characters using letters, numbers, underscores, dots, or hyphens.',
      );
      return;
    }

    if (fullName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        username: cleanUsername,
        fullName: fullName.trim(),
        role,
        email: email.trim() || null,
        staffId: staffId.trim() || null,
        professionalRegistrationBody: regBody || null,
        professionalRegistrationNumber: regNumber.trim() || null,
        contactNumber: contactNumber.trim() || null,
      });
      resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-teal-700" />
            <span>Provision New Staff Account</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Creates a hospital staff account with a temporary password that must be changed on
            first sign-in.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div
            className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="create-username" className="text-xs font-semibold text-slate-700">
                Login Username *
              </Label>
              <Input
                id="create-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. dr_jayawardena"
                className="mt-1 text-xs h-9"
                disabled={submitting}
                required
              />
            </div>

            <div>
              <Label htmlFor="create-role" className="text-xs font-semibold text-slate-700">
                System Role *
              </Label>
              <select
                id="create-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={submitting}
              >
                <option value={UserRole.DOCTOR}>DOCTOR (Clinical Station & Alerts)</option>
                <option value={UserRole.NURSE_STAFF}>
                  NURSE_STAFF (Triage, Vitals & Bed Turnover)
                </option>
                <option value={UserRole.ADMIN}>ADMIN (Ward Config, Users & Audits)</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="create-fullname" className="text-xs font-semibold text-slate-700">
              Full Name *
            </Label>
            <Input
              id="create-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. K. Jayawardena"
              className="mt-1 text-xs h-9"
              disabled={submitting}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="create-staffid" className="text-xs font-semibold text-slate-700">
                Hospital Staff ID (Optional)
              </Label>
              <Input
                id="create-staffid"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. CSTH-1042"
                className="mt-1 text-xs h-9"
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="create-email" className="text-xs font-semibold text-slate-700">
                Official Email (Optional)
              </Label>
              <Input
                id="create-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. staff@csth.gov.lk"
                className="mt-1 text-xs h-9"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="create-regbody" className="text-xs font-semibold text-slate-700">
                Registration Body (Optional)
              </Label>
              <select
                id="create-regbody"
                value={regBody}
                onChange={(e) => setRegBody(e.target.value as ProfessionalRegistrationBody | '')}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={submitting}
              >
                <option value="">Not specified</option>
                <option value={ProfessionalRegistrationBody.SLMC}>SLMC (Medical Council)</option>
                <option value={ProfessionalRegistrationBody.SLNC}>SLNC (Nursing Council)</option>
                <option value={ProfessionalRegistrationBody.OTHER}>OTHER</option>
              </select>
            </div>

            <div>
              <Label htmlFor="create-regnum" className="text-xs font-semibold text-slate-700">
                Council Reg Number (Optional)
              </Label>
              <Input
                id="create-regnum"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. SLMC-28491"
                className="mt-1 text-xs h-9"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="create-contact" className="text-xs font-semibold text-slate-700">
              Ward Contact Number (Optional)
            </Label>
            <Input
              id="create-contact"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. +94771234567"
              className="mt-1 text-xs h-9"
              disabled={submitting}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Professional registration fields are optional administrative references and are not
            externally verified against council registries.
          </p>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Provisioning...
                </>
              ) : (
                'Create Account & Generate Credential'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface EditStaffProfileDialogProps {
  user: UserListItemDto | null;
  onClose: () => void;
  onSubmit: (userId: string, payload: UpdateUserProfileRequest) => Promise<void>;
}

export const EditStaffProfileDialog: React.FC<EditStaffProfileDialogProps> = ({
  user,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [regBody, setRegBody] = useState<ProfessionalRegistrationBody | ''>('');
  const [regNumber, setRegNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email || '');
      setStaffId(user.staffProfile?.staffId || '');
      setRegBody(user.staffProfile?.professionalRegistrationBody || '');
      setRegNumber(user.staffProfile?.professionalRegistrationNumber || '');
      setContactNumber(user.staffProfile?.contactNumber || '');
      setErrorMsg(null);
    }
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (fullName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(user.id, {
        fullName: fullName.trim(),
        email: email.trim() || null,
        staffId: staffId.trim() || null,
        professionalRegistrationBody: regBody || null,
        professionalRegistrationNumber: regNumber.trim() || null,
        contactNumber: contactNumber.trim() || null,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update staff profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Edit Staff Profile — {user.username}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Update permitted profile metadata. Role changes, credentials, and account status are
            managed via separate audited controls.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div
            className="p-2.5 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2 text-xs text-red-700"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <Label htmlFor="edit-fullname" className="text-xs font-semibold text-slate-700">
              Full Name *
            </Label>
            <Input
              id="edit-fullname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 text-xs h-9"
              disabled={submitting}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-staffid" className="text-xs font-semibold text-slate-700">
                Hospital Staff ID
              </Label>
              <Input
                id="edit-staffid"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="mt-1 text-xs h-9"
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-700">
                Official Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 text-xs h-9"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-regbody" className="text-xs font-semibold text-slate-700">
                Registration Body
              </Label>
              <select
                id="edit-regbody"
                value={regBody}
                onChange={(e) => setRegBody(e.target.value as ProfessionalRegistrationBody | '')}
                className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800"
                disabled={submitting}
              >
                <option value="">Not specified</option>
                <option value={ProfessionalRegistrationBody.SLMC}>SLMC</option>
                <option value={ProfessionalRegistrationBody.SLNC}>SLNC</option>
                <option value={ProfessionalRegistrationBody.OTHER}>OTHER</option>
              </select>
            </div>

            <div>
              <Label htmlFor="edit-regnum" className="text-xs font-semibold text-slate-700">
                Council Reg Number
              </Label>
              <Input
                id="edit-regnum"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                className="mt-1 text-xs h-9"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-contact" className="text-xs font-semibold text-slate-700">
              Contact Number
            </Label>
            <Input
              id="edit-contact"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="mt-1 text-xs h-9"
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
            >
              {submitting ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ChangeRoleDialogProps {
  user: UserListItemDto | null;
  onClose: () => void;
  onConfirm: (userId: string, role: UserRole, reason?: string) => Promise<void>;
}

export const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({ user, onClose, onConfirm }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.DOCTOR);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setReason('');
      setErrorMsg(null);
    }
  }, [user]);

  if (!user) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onConfirm(user.id, selectedRole, reason.trim() || undefined);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to change role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <UserCog className="w-5 h-5 text-teal-700" />
            <span>Change Role Assignment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Update system role for <strong>{user.fullName}</strong> ({user.username}).
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Changing a staff member&apos;s role immediately revokes all their active sessions. They
            will be required to sign in again to receive updated permissions.
          </span>
        </div>

        {errorMsg && (
          <div
            className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
            role="alert"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3 text-xs">
          <div>
            <Label htmlFor="role-select" className="text-xs font-semibold text-slate-700">
              Target System Role
            </Label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800"
              disabled={submitting}
            >
              <option value={UserRole.DOCTOR}>DOCTOR</option>
              <option value={UserRole.NURSE_STAFF}>NURSE_STAFF</option>
              <option value={UserRole.ADMIN}>ADMIN</option>
            </select>
          </div>

          <div>
            <Label htmlFor="role-reason" className="text-xs font-semibold text-slate-700">
              Audit Reason (Optional)
            </Label>
            <Input
              id="role-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Acting Ward In-Charge duty roster change"
              className="mt-1 text-xs h-9"
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || selectedRole === user.role}
              className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
            >
              {submitting ? 'Updating Role...' : 'Confirm Role Change'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ToggleStatusDialogProps {
  user: UserListItemDto | null;
  onClose: () => void;
  onConfirm: (userId: string, nextActive: boolean, reason?: string) => Promise<void>;
}

export const ToggleStatusDialog: React.FC<ToggleStatusDialogProps> = ({
  user,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setReason('');
    setErrorMsg(null);
  }, [user]);

  if (!user) return null;

  const isDeactivating = user.isActive;
  const nextActive = !user.isActive;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onConfirm(user.id, nextActive, reason.trim() || undefined);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update account status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            {isDeactivating ? (
              <UserX className="w-5 h-5 text-red-600" />
            ) : (
              <UserCheck className="w-5 h-5 text-emerald-600" />
            )}
            <span>{isDeactivating ? 'Deactivate Staff Account' : 'Reactivate Staff Account'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Account: <strong>{user.fullName}</strong> (
            <span className="font-mono">{user.username}</span>)
          </DialogDescription>
        </DialogHeader>

        <div
          className={`p-3 rounded-lg border flex items-start space-x-2 text-xs ${
            isDeactivating
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {isDeactivating
              ? 'Deactivating immediately revokes all active refresh sessions, invalidates existing access tokens, and prevents sign-in. Historical clinical & audit records remain preserved.'
              : 'Reactivating allows the staff member to perform a fresh login. Previously revoked sessions are never automatically restored.'}
          </span>
        </div>

        {errorMsg && (
          <div
            className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
            role="alert"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3 text-xs">
          <div>
            <Label htmlFor="status-reason" className="text-xs font-semibold text-slate-700">
              Reason (Optional)
            </Label>
            <Input
              id="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isDeactivating ? 'e.g. Ward transfer / End of rotation' : 'e.g. Returning to duty'
              }
              className="mt-1 text-xs h-9"
              disabled={submitting}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              variant={isDeactivating ? 'destructive' : 'default'}
              className={!isDeactivating ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : ''}
            >
              {submitting
                ? 'Updating Status...'
                : isDeactivating
                  ? 'Confirm Deactivation'
                  : 'Confirm Activation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
