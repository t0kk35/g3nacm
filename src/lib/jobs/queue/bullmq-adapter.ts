import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { EnqueueOptions, JobPriority, PRIORITY_QUEUE_NAMES } from '../types';
import { IQueueAdapter } from './interface';

function getRedisConnection(): Redis {
    return new Redis({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    });
}

export class BullMQAdapter implements IQueueAdapter {
    private queues = new Map<string, Queue>();

    private getQueue(queueName: string): Queue {
        if (!this.queues.has(queueName)) {
            this.queues.set(queueName, new Queue(queueName, { connection: getRedisConnection() }));
        }
        return this.queues.get(queueName)!;
    }

    async enqueue(jobId: string, jobType: string, options?: EnqueueOptions): Promise<string> {
        const priority = options?.priority ?? JobPriority.NORMAL;
        const queueName = PRIORITY_QUEUE_NAMES[priority];
        const queue = this.getQueue(queueName);

        const job = await queue.add(jobType, { jobId }, {
            jobId,
            delay: options?.delayMs,
            attempts: (options?.maxRetries ?? 3) + 1,
            backoff: { type: 'exponential', delay: 5000 },
        });

        return job.id ?? jobId;
    }

    async close(): Promise<void> {
        await Promise.all(Array.from(this.queues.values()).map(q => q.close()));
    }
}
