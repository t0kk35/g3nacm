export function getStartDate(timeRange: string, referenceDate: Date): Date | undefined {

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
}