import { z } from 'zod';
import { getStartDate } from '@/lib/date-time/date-range';

const TIME_RANGE_REGEX = /^\d+[hdwm]$/;
const TIME_RANGE_MESSAGE = "Time range must be a number followed by h, d, w, or m (e.g. '7d', '2w', '3m')";

// Returns the computed start Date.
export const zTimeRangeToDate = z.string()
    .regex(TIME_RANGE_REGEX, TIME_RANGE_MESSAGE)
    .transform((val, ctx) => {
        const date = getStartDate(new Date(), val);
        if (!date) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Could not parse time range: ${val}` });
            return z.NEVER;
        }
        return date;
    });

// Returns both the original string and the computed start Date.
// Use when the raw value needs to be stored, displayed, or forwarded alongside the date.
export const zTimeRangeToDateWithRaw = z.string()
    .regex(TIME_RANGE_REGEX, TIME_RANGE_MESSAGE)
    .transform((val, ctx) => {
        const date = getStartDate(new Date(), val);
        if (!date) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Could not parse time range: ${val}` });
            return z.NEVER;
        }
        return { raw: val, date };
    });

// Return the boolean value of a string, defaults to false
export const zStringToBoolean = z.string()
    .transform((val) => {
        return val.toLocaleLowerCase() === 'true' || val.toLocaleLowerCase() === 'y' ? true : false 
    });