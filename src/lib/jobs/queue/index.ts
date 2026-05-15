import { IQueueAdapter } from './interface';

let _adapter: IQueueAdapter | null = null;

export function getQueueAdapter(): IQueueAdapter {
    if (_adapter) return _adapter;

    const provider = process.env.JOB_QUEUE_PROVIDER;
    switch (provider) {
        case 'bullmq': {
            const { BullMQAdapter } = require('./bullmq-adapter');
            _adapter = new BullMQAdapter();
            break;
        }
        case 'memory': {
            const { MemoryAdapter } = require('./memory-adapter');
            _adapter = new MemoryAdapter();
            break;
        }
        default:
            throw new Error(
                `JOB_QUEUE_PROVIDER is "${provider ?? 'not set'}". Supported values: bullmq, memory`
            );
    }
    return _adapter!;
}
