/* export function getStartDate(timeRange: string, referenceDate: Date): Date | undefined {

    const value = parseInt(timeRange.slice(0, -1));
    if (Number.isNaN(value)) return undefined    
    const unit = timeRange.slice(-1);

    switch (unit) {
        case 'd':
            const dDate = new Date(referenceDate);
            dDate.setDate(referenceDate.getDate() - value);
            return dDate;
        case 'w':
            const wDate = new Date(referenceDate);
            wDate.setDate(referenceDate.getDate() - (value * 7));
            return wDate
        case 'm':
            const mDate = new Date(referenceDate);
            mDate.setMonth(referenceDate.getMonth() - value);
        case 'y':
            const yDate = new Date(referenceDate);
            yDate.setFullYear(referenceDate.getFullYear() - value)
        default : return undefined
    }
} */

import { calculateDailyPeriods, calculateMonthlyPeriods, calculateWeeklyPeriods, Period } from '@/lib/date-time/period-calculator';

export function getStartDate(referenceDate: Date, timePeriod: string) {
    const period = timePeriod.slice(-1).toLocaleLowerCase();
    let periods:Period[]
    switch (period) {
        case 'h':
            const hDate = new Date(referenceDate.getTime());
            const hours = parseInt(timePeriod.slice(0, -1));
            hDate.setHours(hDate.getHours() - hours);
            hDate.setMinutes(0);
            hDate.setSeconds(0);
            hDate.setMilliseconds(0);
            return hDate;
        case 'd': 
            periods = calculateDailyPeriods(referenceDate, timePeriod);
            break;
        case 'w': 
            periods = calculateWeeklyPeriods(referenceDate, timePeriod);
            break;
        case 'm':
            periods = calculateMonthlyPeriods(referenceDate, timePeriod);
            break;
        default:
            periods = [];
            break;
    }

    if (periods.length === 0) return undefined;
    return periods[0].start;
}