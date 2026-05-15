import { JobRegistry } from '../registry';
import { JobResult, JobContext } from '../types';

JobRegistry.register('hello-world', async (ctx: JobContext): Promise<JobResult> => {
    const name = String(ctx.payload.name ?? 'World');
    console.log(`[hello-world] Hello, ${name}! Submitted by ${ctx.userName} (priority ${ctx.priority})`);
    return { success: true, data: { message: `Hello, ${name}!` } };
}, 'admin.jobs');
