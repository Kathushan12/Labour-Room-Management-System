import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table.js';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface AnalyticsDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  title?: string;
  emptyText?: string;
  maxHeight?: string;
  className?: string;
  testId?: string;
}

export function AnalyticsDataTable<T extends Record<string, any>>({
  columns,
  data,
  title,
  emptyText = 'No records found',
  maxHeight,
  className = '',
  testId = 'analytics-data-table',
}: AnalyticsDataTableProps<T>) {
  return (
    <div className={`space-y-3 ${className}`} data-testid={testId}>
      {title && (
        <h4 className="text-xs font-semibold text-slate-700 tracking-wide uppercase">{title}</h4>
      )}

      <div
        className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10">
            <TableRow className="border-b border-slate-200">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-xs font-semibold text-slate-600 uppercase tracking-wider py-2.5 px-3 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-xs text-slate-400 italic"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow
                  key={row.id || row.bedNumber || row.date || row.code || idx}
                  className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0"
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`text-xs text-slate-800 py-2.5 px-3 ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : row[col.key] !== undefined
                          ? String(row[col.key])
                          : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
