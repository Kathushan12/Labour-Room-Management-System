import React, { useState, useMemo } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { UserRole } from '@lrms/shared';
import { RoleBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { ShieldCheck, Lock, AlertTriangle, Download } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'DENIED';
}

const PREVIEW_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2026-11-11T09:12:02Z',
    actorName: 'Dr. K. Jayawardena',
    actorRole: UserRole.DOCTOR,
    action: 'ALERT_DELIVERY_ACKNOWLEDGED',
    entityType: 'EmergencyAlert',
    entityId: 'alt-001',
    ipAddress: '192.168.18.42 (Ward Terminal)',
    status: 'SUCCESS',
  },
  {
    id: 'aud-002',
    timestamp: '2026-11-11T09:10:00Z',
    actorName: 'Staff Midwife Silva',
    actorRole: UserRole.NURSE_STAFF,
    action: 'EMERGENCY_ALERT_DISPATCHED',
    entityType: 'EmergencyAlert',
    entityId: 'alt-001',
    ipAddress: '192.168.18.15 (Nurse Station)',
    status: 'SUCCESS',
  },
  {
    id: 'aud-003',
    timestamp: '2026-11-11T08:48:30Z',
    actorName: 'Dr. K. Jayawardena',
    actorRole: UserRole.DOCTOR,
    action: 'PII_DECRYPT_ACCESSED',
    entityType: 'Patient',
    entityId: 'pat-4082',
    ipAddress: '192.168.18.42 (Ward Terminal)',
    status: 'SUCCESS',
  },
  {
    id: 'aud-004',
    timestamp: '2026-11-11T08:45:00Z',
    actorName: 'Staff Midwife Silva',
    actorRole: UserRole.NURSE_STAFF,
    action: 'PATIENT_ADMISSION_CREATED',
    entityType: 'Admission',
    entityId: 'ADM-2026-0003',
    ipAddress: '192.168.18.15 (Nurse Station)',
    status: 'SUCCESS',
  },
  {
    id: 'aud-005',
    timestamp: '2026-11-11T08:46:10Z',
    actorName: 'Staff Midwife Silva',
    actorRole: UserRole.NURSE_STAFF,
    action: 'BED_ALLOCATION_ASSIGNED',
    entityType: 'BedAllocation',
    entityId: 'bed-3',
    ipAddress: '192.168.18.15 (Nurse Station)',
    status: 'SUCCESS',
  },
  {
    id: 'aud-006',
    timestamp: '2026-11-11T07:15:00Z',
    actorName: 'System Administrator',
    actorRole: UserRole.ADMIN,
    action: 'USER_ROLE_VERIFIED',
    entityType: 'User',
    entityId: 'usr-002',
    ipAddress: '192.168.18.1 (Admin Console)',
    status: 'SUCCESS',
  },
];

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    return PREVIEW_AUDIT_LOGS.filter((log) => {
      const matchesSearch =
        search.trim() === '' ||
        log.actorName.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.entityId.toLowerCase().includes(search.toLowerCase()) ||
        log.entityType.toLowerCase().includes(search.toLowerCase());

      let matchesAction = true;
      if (actionFilter === 'PII') matchesAction = log.action.includes('PII');
      else if (actionFilter === 'ALERT') matchesAction = log.action.includes('ALERT');
      else if (actionFilter === 'ADMISSION') matchesAction = log.action.includes('ADMISSION');

      return matchesSearch && matchesAction;
    });
  }, [search, actionFilter]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Forensic Security & Clinical Audit Trail"
        description="Immutable audit trail of authentication events, patient admissions, PII decryption requests, and doctor escalations."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Audit Logs', active: true },
        ]}
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-700" />
            COMPLIANCE AUDIT
          </span>
        }
        action={
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Export Forensic Audit Log
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Recorded Audit Events"
          value={PREVIEW_AUDIT_LOGS.length}
          subtitle="All transactions sealed"
          icon={<ShieldCheck className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          title="Decrypted PII Accesses"
          value={PREVIEW_AUDIT_LOGS.filter((l) => l.action.includes('PII')).length}
          subtitle="Audited doctor accesses"
          icon={<Lock className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Emergency Escalations"
          value={PREVIEW_AUDIT_LOGS.filter((l) => l.action.includes('ALERT')).length}
          subtitle="Notification events logged"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        />
      </div>

      <SectionCard
        title="Audit Events Log"
        description="Append-only sequential records ordered chronologically"
      >
        <div className="space-y-4">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search actor, action, or entity ID..."
            filterOptions={[
              { label: 'All Events', value: 'ALL' },
              { label: 'PII Decryption Access', value: 'PII' },
              { label: 'Emergency Alerts', value: 'ALERT' },
              { label: 'Patient Admissions', value: 'ADMISSION' },
            ]}
            selectedFilter={actionFilter}
            onFilterChange={setActionFilter}
            onReset={() => {
              setSearch('');
              setActionFilter('ALL');
            }}
          />

          {filteredLogs.length === 0 ? (
            <EmptyState
              title="No audit events found"
              description="No audit records match the current search or filter query."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Actor / Role</th>
                    <th className="pb-3">Action Event</th>
                    <th className="pb-3">Target Entity</th>
                    <th className="pb-3">Terminal Origin</th>
                    <th className="pb-3 text-right">Integrity Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-mono text-slate-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="mt-0.5">
                          <RoleBadge role={log.actorRole} />
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-mono font-bold text-teal-800 text-[11px] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-700">
                        <span className="font-semibold">{log.entityType}</span>
                        <div className="text-[11px] font-mono text-slate-500">{log.entityId}</div>
                      </td>
                      <td className="py-3 text-[11px] text-slate-500 font-mono">{log.ipAddress}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                          SEALED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};
