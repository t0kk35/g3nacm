// Calendar-aligned period calculation for transaction analysis
// Ensures proper month/week boundaries for meaningful AML behavioral analysis

export interface PeriodConfig {
  daily: string;   // e.g., "7d"
  weekly: string;  // e.g., "4w"
  monthly: string; // e.g., "6m"
}

export interface Period {
  start: Date;
  end: Date;
  type: 'complete' | 'partial';
  label: string;
}

export interface CalculatedPeriods {
  daily: Period[];
  weekly: Period[];
  monthly: Period[];
}

export function calculatePeriods(referenceDate: Date, periods: PeriodConfig): CalculatedPeriods {
  return {
    daily: calculateDailyPeriods(referenceDate, periods.daily),
    weekly: calculateWeeklyPeriods(referenceDate, periods.weekly),
    monthly: calculateMonthlyPeriods(referenceDate, periods.monthly)
  };
}

export function calculateDailyPeriods(referenceDate: Date, periodSpec: string): Period[] {
  const dayCount = parseInt(periodSpec.slice(0, -1));
  const periods: Period[] = [];
  
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() - i);
    
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    periods.push({
      start,
      end,
      type: 'complete',
      label: date.toISOString().split('T')[0]
    });
  }
  
  return periods.reverse(); // Return in chronological order
}

export function calculateWeeklyPeriods(referenceDate: Date, periodSpec: string): Period[] {
  const weekCount = parseInt(periodSpec.slice(0, -1));
  const periods: Period[] = [];
  
  // Find the start of the current week (Monday)
  const currentWeekStart = new Date(referenceDate);
  const dayOfWeek = currentWeekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
  currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  
  // Current week (partial)
  const currentWeekEnd = new Date(referenceDate);
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  periods.push({
    start: new Date(currentWeekStart),
    end: currentWeekEnd,
    type: 'partial',
    label: `Week of ${currentWeekStart.toISOString().split('T')[0]}`
  });
  
  // Previous complete weeks
  for (let i = 1; i < weekCount; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (i * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    periods.unshift({
      start: weekStart,
      end: weekEnd,
      type: 'complete',
      label: `Week of ${weekStart.toISOString().split('T')[0]}`
    });
  }
  
  return periods;
}

export function calculateMonthlyPeriods(referenceDate: Date, periodSpec: string): Period[] {
  const monthCount = parseInt(periodSpec.slice(0, -1));
  const periods: Period[] = [];
  
  // Current month (partial)
  const currentMonthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const currentMonthEnd = new Date(referenceDate);
  currentMonthEnd.setHours(23, 59, 59, 999);
  
  periods.push({
    start: currentMonthStart,
    end: currentMonthEnd,
    type: 'partial',
    label: `${currentMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
  });
  
  // Previous complete months
  for (let i = 1; i < monthCount; i++) {
    const monthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1);
    const monthEnd = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    periods.unshift({
      start: monthStart,
      end: monthEnd,
      type: 'complete',
      label: `${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    });
  }

  return periods;
}

// SQL date range helpers
export function formatDateForSQL(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function generateDateRanges(periods: Period[]): Array<{start: string, end: string}> {
  return periods.map(period => ({
    start: formatDateForSQL(period.start),
    end: formatDateForSQL(period.end)
  }));
}

// Example usage for July 10, 2025:
// const referenceDate = new Date('2025-07-10');
// const periods = calculatePeriods(referenceDate, {
//   daily: '7d',
//   weekly: '4w', 
//   monthly: '6m'
// });
// 
// Monthly periods would be:
// - January 2025 (complete): Jan 1 - Jan 31
// - February 2025 (complete): Feb 1 - Feb 28
// - March 2025 (complete): Mar 1 - Mar 31
// - April 2025 (complete): Apr 1 - Apr 30
// - May 2025 (complete): May 1 - May 31
// - June 2025 (partial): Jun 1 - Jul 10