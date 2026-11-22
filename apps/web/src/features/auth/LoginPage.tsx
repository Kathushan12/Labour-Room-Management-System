import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Activity, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../../components/ui/button.js';
import { Input } from '../../components/ui/input.js';
import { Label } from '../../components/ui/label.js';
import { Badge } from '../../components/ui/badge.js';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, mustChangePassword, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // If already logged in, redirect to forced password change or origin/dashboard
  if (isAuthenticated) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setValidationError('Username is required');
      return;
    }

    if (!password) {
      setValidationError('Password is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanUsername, password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch {
      // Error message is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = validationError || error;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Hospital Branding & Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-700/20">
            <Activity className="w-8 h-8" />
          </div>
        </div>

        <h1 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Labour Room Management System
        </h1>
        <p className="mt-1 text-center text-xs text-slate-500">
          Colombo South Teaching Hospital (Kalubowila) · Ward 18
        </p>

        <div className="mt-2 flex justify-center">
          <Badge variant="outline" className="text-[10px] bg-white text-slate-600 border-slate-300">
            Department of Obstetrics & Gynaecology
          </Badge>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-10">
          {displayError && (
            <div
              className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 animate-in fade-in duration-200"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{displayError}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                Staff Username
              </Label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. dr.perera or nurse.silva"
                  className="pl-9 text-xs py-2 h-9"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
              </div>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-9 text-xs py-2 h-9"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs h-9 shadow-xs transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating Staff...
                  </>
                ) : (
                  'Sign In to Labour Ward'
                )}
              </Button>
            </div>
          </form>

          {/* Academic / Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              CO2307 - Software Engineering Project · Group 07
            </p>
            <Link
              to="/privacy"
              className="inline-block mt-2 text-xs font-semibold text-teal-700 hover:underline"
            >
              Privacy notice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
