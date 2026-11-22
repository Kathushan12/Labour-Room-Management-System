import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { FilterBar } from '../../components/shared/FilterBar.js';
import { EmptyState } from '../../components/shared/FeedbackStates.js';
import { AuditLogEntryDto } from '@lrms/shared';
import { RoleBadge } from '../../components/status/Badges.js';
import { Button } from '../../components/ui/button.js';
import { ShieldCheck, Lock, AlertTriangle, Download } from 'lucide-react';
import { fetchAuditLogs } from '../../services/audit.api.js';
import { formatColomboDateTime } from '../../lib/datetime.js';

// REQ-9.6 filters over the action names written by the API.
const ACTION_GROUPS: Record<string, (action: string) => boolean> = {
  LOGIN: (a) => a.startsWith('LOGIN') || a.startsWith('LOGOUT'),
  ACCOUNT: (a) => a.startsWith('USER_') && a !== 'USER_ACCESS_DENIED',
  EMERGENCY: (a) => a.startsWith('EMERGENCY_OVERRIDE'),
  PLAN: (a) => a === 'CARE_PLAN_STATE_CHANGED' || a.startsWith('EMERGENCY_ESCALATION'),
  ALERT: (a) => a.startsWith('CLINICAL_ESCALATION') || a.startsWith('ALERT_'),
  DISCHARGE: (a) => a.includes('DISCHARGE'),
};

function isWarning(action: string): boolean {
  return /DENIED|FAILED|LOCKED/.test(action);
}

function toCsv(rows: AuditLogEntryDto[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ['Time (Asia/Colombo)', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'IP'];
  const lines = rows.map((r) =>
    [
      formatColomboDateTime(r.createdAt),
      r.actorUsername ?? 'system',
      r.actorRole ?? '',
      r.action,
      r.entityName,
      r.entityId ?? '',
      r.ipAddress ?? '',
    ]
      .map(esc)
      .join(','),
  );
  return [header.map(esc).join(','), ...lines].join('\r\n');
}

export const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [logs, setLogs] = useState<AuditLogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAuditLogs().then((res) => {
      if (res.success && res.data) {
        setLogs(res.data.items);
        setTotal(res.data.pagination.total);
      } else {
        setError(res.error?.message ?? 'Could not load audit logs.');
      }
    });
  }, []);

  const filteredLogs = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        needle === '' ||
        (log.actorUsername ?? '').toLowerCase().includes(needle) ||
        log.action.toLowerCase().includes(needle) ||
        (log.entityId ?? '').toLowerCase().includes(needle) ||
        log.entityName.toLowerCase().includes(needle);
      const group = ACTION_GROUPS[actionFilter];
      return matchesSearch && (!group || group(log.action));
    });
  }, [logs, search, actionFilter]);

  const handleExport = () => {
    const blob = new Blob([toCsv(filteredLogs)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lrms-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <Button variant="outline" size="sm" className="text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Export Forensic Audit Log
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Recorded Audit Events"
          value={total}
          subtitle="Cannot be edited or deleted"
          icon={<ShieldCheck className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          title="Emergency Access"
          value={logs.filter((l) => ACTION_GROUPS.EMERGENCY(l.action)).length}
          subtitle="Doctor emergency access (latest 100)"
          icon={<Lock className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Alert Updates"
          value={logs.filter((l) => ACTION_GROUPS.ALERT(l.action)).length}
          subtitle="Escalation and alert events (latest 100)"
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
              { label: 'Logins', value: 'LOGIN' },
              { label: 'Account Changes', value: 'ACCOUNT' },
              { label: 'Emergency Access', value: 'EMERGENCY' },
              { label: 'Care Plan Changes', value: 'PLAN' },
              { label: 'Alert Updates', value: 'ALERT' },
              { label: 'Discharges', value: 'DISCHARGE' },
            ]}
            selectedFilter={actionFilter}
            onFilterChange={setActionFilter}
            onReset={() => {
              setSearch('');
              setActionFilter('ALL');
            }}
          />

          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
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
                        {formatColomboDateTime(log.createdAt)}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-900">
                          {log.actorFullName ?? log.actorUsername ?? 'System'}
                        </div>
                        {log.actorRole && (
                          <div className="mt-0.5">
                            <RoleBadge role={log.actorRole} />
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="font-mono font-bold text-teal-800 text-[11px] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-700">
                        <span className="font-semibold">{log.entityName}</span>
                        <div className="text-[11px] font-mono text-slate-500">{log.entityId}</div>
                      </td>
                      <td className="py-3 text-[11px] text-slate-500 font-mono">{log.ipAddress}</td>
                      <td className="py-3 text-right">
                        {isWarning(log.action) ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-700" />
                            WARNING
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                            SEALED
                          </span>
                        )}
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
