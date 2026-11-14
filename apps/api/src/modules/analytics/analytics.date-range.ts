import { AnalyticsDateRangePreset, KpiComparison, TrendDirection } from '@lrms/shared';

// Asia/Colombo is UTC+05:30 (Offset +330 minutes)
const COLOMBO_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export interface ResolvedInterval {
  startDate: Date;
  endDate: Date;
  preset: AnalyticsDateRangePreset;
  timezone: string;
}

export interface ResolvedDateRange {
  current: ResolvedInterval;
  previous: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Returns UTC Date corresponding to 00:00:00.000 in Asia/Colombo for a given year, month (1-12), day (1-31).
 */
export function colomboDateToUtc(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  return new Date(utcMidnight - COLOMBO_OFFSET_MS);
}

/**
 * Parses an ISO date string (YYYY-MM-DD or full ISO) and extracts year, month, day in Asia/Colombo.
 */
export function getColomboParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const colomboTime = new Date(date.getTime() + COLOMBO_OFFSET_MS);
  return {
    year: colomboTime.getUTCFullYear(),
    month: colomboTime.getUTCMonth() + 1, // 1-12
    day: colomboTime.getUTCDate(), // 1-31
    dayOfWeek: colomboTime.getUTCDay(), // 0 (Sun) - 6 (Sat)
  };
}

/**
 * Resolves date range boundaries according to Asia/Colombo calendar days.
 * Start is inclusive, End is exclusive.
 */
export function resolveDateRange(
  preset: AnalyticsDateRangePreset = AnalyticsDateRangePreset.THIS_MONTH,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date(),
): ResolvedDateRange {
  const { year, month, day, dayOfWeek } = getColomboParts(now);

  let currentStart: Date;
  let currentEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (preset) {
    case AnalyticsDateRangePreset.TODAY: {
      currentStart = colomboDateToUtc(year, month, day);
      currentEnd = new Date(currentStart.getTime() + 24 * 60 * 60 * 1000);
      prevStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = currentStart;
      break;
    }
    case AnalyticsDateRangePreset.YESTERDAY: {
      currentEnd = colomboDateToUtc(year, month, day);
      currentStart = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = currentStart;
      prevStart = new Date(prevEnd.getTime() - 24 * 60 * 60 * 1000);
      break;
    }
    case AnalyticsDateRangePreset.THIS_WEEK: {
      // Monday is first day of week (dayOfWeek: 0 = Sun, 1 = Mon ... 6 = Sat)
      const diffToMonday = (dayOfWeek + 6) % 7;
      const todayStart = colomboDateToUtc(year, month, day);
      currentStart = new Date(todayStart.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
      currentEnd = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = currentStart;
      break;
    }
    case AnalyticsDateRangePreset.LAST_WEEK: {
      const diffToMonday = (dayOfWeek + 6) % 7;
      const thisMonday = new Date(
        colomboDateToUtc(year, month, day).getTime() - diffToMonday * 24 * 60 * 60 * 1000,
      );
      currentEnd = thisMonday;
      currentStart = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = currentStart;
      prevStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case AnalyticsDateRangePreset.LAST_MONTH: {
      const prevMonthYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      currentStart = colomboDateToUtc(prevMonthYear, prevMonth, 1);
      currentEnd = colomboDateToUtc(year, month, 1);

      const twoMonthsAgoYear = prevMonth === 1 ? prevMonthYear - 1 : prevMonthYear;
      const twoMonthsAgoMonth = prevMonth === 1 ? 12 : prevMonth - 1;
      prevStart = colomboDateToUtc(twoMonthsAgoYear, twoMonthsAgoMonth, 1);
      prevEnd = currentStart;
      break;
    }
    case AnalyticsDateRangePreset.LAST_30_DAYS: {
      currentEnd = new Date(now.getTime());
      currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevEnd = currentStart;
      prevStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case AnalyticsDateRangePreset.LAST_90_DAYS: {
      currentEnd = new Date(now.getTime());
      currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevEnd = currentStart;
      prevStart = new Date(currentStart.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    }
    case AnalyticsDateRangePreset.CUSTOM: {
      if (customStart && customEnd) {
        currentStart = new Date(customStart);
        currentEnd = new Date(customEnd);
      } else {
        currentStart = colomboDateToUtc(year, month, 1);
        currentEnd = new Date(now.getTime());
      }
      const durationMs = currentEnd.getTime() - currentStart.getTime();
      prevEnd = currentStart;
      prevStart = new Date(currentStart.getTime() - durationMs);
      break;
    }
    case AnalyticsDateRangePreset.THIS_MONTH:
    default: {
      currentStart = colomboDateToUtc(year, month, 1);
      const nextMonthYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      currentEnd = colomboDateToUtc(nextMonthYear, nextMonth, 1);

      const prevMonthYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      prevStart = colomboDateToUtc(prevMonthYear, prevMonth, 1);
      prevEnd = currentStart;
      break;
    }
  }

  return {
    current: {
      startDate: currentStart,
      endDate: currentEnd,
      preset,
      timezone: 'Asia/Colombo',
    },
    previous: {
      startDate: prevStart,
      endDate: prevEnd,
    },
  };
}

/**
 * Calculates a comparison between current and previous values.
 * Handles zero denominators without producing NaN or Infinity.
 */
export function calculateKpiComparison(current: number, previous: number | null): KpiComparison {
  if (previous === null || previous === undefined) {
    return {
      currentValue: current,
      previousValue: null,
      percentageChange: null,
      trend: 'NEUTRAL',
    };
  }

  if (previous === 0) {
    if (current === 0) {
      return {
        currentValue: 0,
        previousValue: 0,
        percentageChange: 0,
        trend: 'STABLE',
      };
    }
    return {
      currentValue: current,
      previousValue: 0,
      percentageChange: 100, // From 0 to positive
      trend: 'UP',
    };
  }

  const delta = current - previous;
  const pct = Math.round((delta / previous) * 1000) / 10; // 1 decimal place

  let trend: TrendDirection = 'STABLE';
  if (pct > 0.5) trend = 'UP';
  else if (pct < -0.5) trend = 'DOWN';

  return {
    currentValue: current,
    previousValue: previous,
    percentageChange: pct,
    trend,
  };
}
