import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../../components/ui/button.js';
import { Badge } from '../../components/ui/badge.js';

export const UnauthorizedPage: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 mb-2">
          HTTP 403 Forbidden
        </Badge>

        <h1 className="text-xl font-bold text-slate-900 mt-1">Access Restricted</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Your active staff session is authenticated, but your clinical role lacks authorization to
          view or modify this module per the hospital Role-Permission policy.
        </p>

        {user && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-left text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Authenticated Staff:</span>
              <span className="font-semibold text-slate-800">{user.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Role:</span>
              <span className="font-bold text-teal-700">{role}</span>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>

          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-100"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
