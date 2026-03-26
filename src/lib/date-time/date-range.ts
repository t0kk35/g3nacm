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