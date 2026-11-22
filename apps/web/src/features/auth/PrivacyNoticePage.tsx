import React from 'react';
import { Link } from 'react-router-dom';

// SRS 6.2: privacy notice reachable from the login screen.
export const PrivacyNoticePage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 px-4 py-10">
    <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700">
      <h1 className="text-lg font-bold text-slate-900">Privacy notice</h1>
      <p>
        The Labour Room Management System of Colombo South Teaching Hospital (Kalubowila) is used
        only by authorised labour room staff to manage admissions, observations, escalations and
        beds.
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          Patient name, NIC and phone number are optional. When entered they are stored securely
          and are shown only to the nurses and doctors caring for the patient.
        </li>
        <li>Ward boards and reports never show names, NIC or phone numbers.</li>
        <li>Administrators manage beds and staff accounts and cannot see patient details.</li>
        <li>
          Every sign-in, account change, emergency access, care plan change, alert update and
          discharge is recorded in an audit log that cannot be changed.
        </li>
        <li>Data is used only for patient care and de-identified ward reports.</li>
      </ul>
      <p>Questions about this notice: contact the ward administrator.</p>
      <Link to="/login" className="inline-block text-teal-700 font-semibold hover:underline">
        Back to sign in
      </Link>
    </div>
  </div>
);
