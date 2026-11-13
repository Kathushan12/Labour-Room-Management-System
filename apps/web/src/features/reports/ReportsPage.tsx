import React, { useState } from 'react';
import { PageHeader, StatCard, SectionCard } from '../../components/shared/HeadersAndCards.js';
import { Button } from '../../components/ui/button.js';
import {
  FileBarChart2,
  Download,
  Calendar,
  Activity,
  Sparkles,
  Clock,
  HeartPulse,
  Baby,
  Stethoscope,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('CURRENT_MONTH');

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Operational Reports & Clinical Analytics"
        description="Aggregated ward occupancy, delivery modes, emergency response times, and bed turnover statistics."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Reports & Analytics', active: true },
        ]}
        action={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
              Export CSV
            </Button>
            <Button size="sm" className="text-xs bg-teal-700 hover:bg-teal-800 text-white">
              <FileBarChart2 className="w-3.5 h-3.5 mr-1" />
              Generate Monthly PDF Report
            </Button>
          </div>
        }
      />

      {/* Date Range Selector Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Reporting Interval:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="CURRENT_WEEK">Current Week (5 Nov – 11 Nov 2026)</option>
            <option value="CURRENT_MONTH">Current Month (November 2026)</option>
            <option value="LAST_MONTH">Previous Month (October 2026)</option>
            <option value="YEAR_TO_DATE">Year to Date (2026)</option>
          </select>
        </div>
        <span className="text-[11px] text-slate-500">
          Showing aggregated data for Colombo South Teaching Hospital — Ward 18
        </span>
      </div>

      {/* Top Level Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Completed Deliveries"
          value="48"
          subtitle="During selected period"
          icon={<Baby className="w-5 h-5 text-teal-600" />}
          trend="+12% from last month"
        />
        <StatCard
          title="Normal Vaginal Deliveries"
          value="34 (70.8%)"
          subtitle="Uncomplicated vaginal births"
          icon={<HeartPulse className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Cesarean Section Deliveries"
          value="14 (29.2%)"
          subtitle="9 Scheduled / 5 Emergency"
          icon={<Stethoscope className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Doctor Acknowledgment Latency"
          value="74s"
          subtitle="Avg proof-of-receipt time"
          icon={<Clock className="w-5 h-5 text-teal-600" />}
          trend="Target: < 180s"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Outcome Breakdown */}
        <SectionCard
          title="Clinical Delivery Mode Breakdown"
          description="Distribution of labour outcomes and surgical interventions"
        >
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold py-1">
                <span className="text-slate-700">Normal Vaginal Delivery</span>
                <span className="text-emerald-700">34 cases (70.8%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: '70.8%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold py-1">
                <span className="text-slate-700">Scheduled Cesarean Section</span>
                <span className="text-blue-700">9 cases (18.8%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '18.8%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold py-1">
                <span className="text-slate-700">Emergency Cesarean Escalation</span>
                <span className="text-amber-700">5 cases (10.4%)</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '10.4%' }} />
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500">
              Robson ten-group classification compliant report structure for ministry health
              statistics.
            </div>
          </div>
        </SectionCard>

        {/* Ward Turnover & Efficiency */}
        <SectionCard
          title="Ward Bed Efficiency & Sanitization Metrics"
          description="Bed utilization and cleaning turnaround metrics"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="font-semibold text-slate-800">Average Bed Turnover Time</span>
                  <div className="text-[11px] text-slate-500">
                    From discharge to sanitized and ready
                  </div>
                </div>
              </div>
              <span className="text-base font-bold text-slate-900 font-mono">24 mins</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-3">
                <Activity className="w-5 h-5 text-teal-600" />
                <div>
                  <span className="font-semibold text-slate-800">
                    Labour Ward Bed Occupancy Rate
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Average operational bed utilization
                  </div>
                </div>
              </div>
              <span className="text-base font-bold text-teal-800 font-mono">83.3%</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <span className="font-semibold text-slate-800">
                    Closed-Loop Alert Receipt Rate
                  </span>
                  <div className="text-[11px] text-slate-500">
                    Alerts acknowledged within 3-min SLA
                  </div>
                </div>
              </div>
              <span className="text-base font-bold text-purple-900 font-mono">98.5%</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
