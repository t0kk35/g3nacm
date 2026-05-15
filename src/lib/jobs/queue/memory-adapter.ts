import { EnqueueOptions } from '../types';
import { IQueueAdapter } from './interface';

// Processes jobs synchronously in-process. Intended for tests and CI only.
export class MemoryAdapter implements IQueueAdapter {
    async enqueue(jobId: string, _jobType: string, _options?: EnqueueOptions): Promise<string> {
        // Defer to next tick so the DB INSERT completes before we process
        setImmediate(async () => {
            try {
                const { processJob } = await import('../processor');
                await processJob(jobId);
            } catch (err) {
                console.error(`[MemoryAdapter] Failed to process job ${jobId}:`, err);
            }
        });
        return jobId;
    }
}
