import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '@lrms/shared';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { Badge } from '../../components/ui/badge.js';

export const ChangePasswordPage: React.FC = () => {
  const { user, mustChangePassword, changePassword, logout, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const checks = {
    length: newPassword.length >= PASSWORD_MIN_LENGTH && newPassword.length <= 128,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setValidationError('Please enter your current or temporary password.');
      return;
    }

    if (!checks.length || !checks.upper || !checks.lower || !checks.digit || !checks.special) {
      setValidationError(
        'New password must be 10-128 characters and include uppercase, lowercase, numeric, and special characters.',
      );
      return;
    }

    if (!checks.matches) {
      setValidationError('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMessage('Password updated securely. Redirecting to your workspace...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 600);
    } catch {
      // Safe generic error handled cleanly in AuthContext state
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md">
            <Activity className="w-7 h-7" />
          </div>
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          {mustChangePassword ? 'Set Permanent Staff Password' : 'Change Account Password'}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {user ? `${user.fullName} (${user.username})` : 'Authenticated Hospital Staff'}
        </p>
        {mustChangePassword && (
          <Badge
            variant="outline"
            className="mt-2 bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
          >
            Action Required Before Accessing Ward Modules
          </Badge>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-8 space-y-5">
          {mustChangePassword && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Your administrator issued a temporary initial credential. Set a private permanent
                password now; all other sessions will be rotated automatically.
              </div>
            </div>
          )}

          {displayError && (
            <div
              className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{displayError}</div>
            </div>
          )}

          {successMessage && (
            <div
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start space-x-2.5 text-xs text-emerald-800"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="currentPassword" className="text-xs font-semibold text-slate-700">
                {mustChangePassword ? 'Current / Temporary Password' : 'Current Password'}
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pl-9 pr-9 text-xs h-9"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                New Permanent Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 10 complex characters"
                  className="pl-9 pr-9 text-xs h-9"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                Confirm New Password
              </Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="pl-9 pr-9 text-xs h-9"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Policy Checklist */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
              <p className="font-semibold text-slate-700 mb-1">Hospital Password Policy</p>
              <div className={checks.length ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                {checks.length ? '✔' : '•'} At least {PASSWORD_MIN_LENGTH} characters
              </div>
              <div
                className={
                  checks.upper && checks.lower ? 'text-emerald-700 font-medium' : 'text-slate-500'
                }
              >
                {checks.upper && checks.lower ? '✔' : '•'} Both uppercase and lowercase letters
              </div>
              <div
                className={
                  checks.digit && checks.special ? 'text-emerald-700 font-medium' : 'text-slate-500'
                }
              >
                {checks.digit && checks.special ? '✔' : '•'} At least one number and special symbol
              </div>
              <div className={checks.matches ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                {checks.matches ? '✔' : '•'} Matches confirmation input
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs h-9"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating Security Credentials...
                </>
              ) : (
                'Update Password & Continue'
              )}
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {!mustChangePassword ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Dashboard
              </Button>
            ) : (
              <span className="text-[11px] text-slate-400">Session restricted until updated</span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-red-600"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
