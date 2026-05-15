import { EnqueueOptions } from '../types';

export interface IQueueAdapter {
    enqueue(jobId: string, jobType: string, options?: EnqueueOptions): Promise<string>;
    close?(): Promise<void>;
}
