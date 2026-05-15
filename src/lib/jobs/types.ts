export enum JobPriority {
    HIGH       = 1,
    NORMAL     = 2,
    LOW        = 3,
    BACKGROUND = 4,
}

export interface JobContext {
    jobId: string;
    jobType: string;
    userName: string;
    orgUnitCode: string | null;
    payload: Record<string, unknown>;
    priority: JobPriority;
}

export interface JobResult {
    success: boolean;
    data?: unknown;
    errorMessage?: string;
}

export type JobHandler = (ctx: JobContext) => Promise<JobResult>;

export interface EnqueueOptions {
    /** Defaults to JobPriority.NORMAL */
    priority?: JobPriority;
    delayMs?: number;
    maxRetries?: number;
}

export interface CreateJobParams {
    jobType: string;
    payload: Record<string, unknown>;
    userName: string;
    orgUnitCode?: string | null;
    options?: EnqueueOptions;
}

export const PRIORITY_QUEUE_NAMES: Record<JobPriority, string> = {
    [JobPriority.HIGH]:       'g3nacm-jobs-high',
    [JobPriority.NORMAL]:     'g3nacm-jobs-normal',
    [JobPriority.LOW]:        'g3nacm-jobs-low',
    [JobPriority.BACKGROUND]: 'g3nacm-jobs-background',
};
