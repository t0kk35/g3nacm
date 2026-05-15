# Background Job Framework

A provider-agnostic background job system built on PostgreSQL for tracking and a swappable queue backend. All jobs are persisted in the database before being enqueued, giving you a complete audit trail and allowing jobs to be queried and monitored independently of the queue.

## Architecture

```
API route  ──►  producer.ts  ──►  IQueueAdapter  ──►  Queue (BullMQ / SQS / etc.)
                    │
                    ▼
               job table (PostgreSQL)   ◄──────────────────────────────┐
                                                                        │
Local:   src/worker/index.ts  (BullMQ Worker process, npm run worker)  │
           └─► processJob()  ──►  JobRegistry  ──►  handler ───────────┘

Cloud:   POST /api/action/job/process  (HTTP push from SQS / Cloud Tasks / Service Bus)
           └─► processJob()  ──►  JobRegistry  ──►  handler ───────────┘
```

Every job flows through the same `processJob()` function regardless of how it was triggered. Queue adapters differ only in how they enqueue and deliver messages.

## File Structure

```
src/lib/jobs/
├── types.ts              JobPriority enum, JobContext, JobResult, JobHandler, EnqueueOptions
├── registry.ts           JobRegistry — register and look up handlers by type string
├── processor.ts          processJob(jobId) — DB state machine + handler dispatch
├── producer.ts           createJob(params) — insert DB row then enqueue
├── index.ts              Bootstrap — import all handler files here (side-effect registration)
├── queue/
│   ├── interface.ts      IQueueAdapter interface (the provider swap point)
│   ├── index.ts          Factory: getQueueAdapter() driven by JOB_QUEUE_PROVIDER env var
│   ├── bullmq-adapter.ts BullMQ / Redis — routes to per-priority named queues
│   └── memory-adapter.ts In-process adapter for tests and CI (no Redis needed)
└── handlers/
    └── hello-world.ts    Example handler — logs a greeting and returns it as the result
```

## Adding a New Job Type

Two steps:

**1. Create a handler file** in `src/lib/jobs/handlers/`:

```typescript
// src/lib/jobs/handlers/my-job.ts
import { JobRegistry } from '../registry';
import { JobContext, JobResult } from '../types';

JobRegistry.register('my-job', async (ctx: JobContext): Promise<JobResult> => {
    // ctx.jobId       — the UUID from the job table
    // ctx.jobType     — 'my-job'
    // ctx.userName    — who submitted the job
    // ctx.orgUnitCode — org unit context, may be null
    // ctx.priority    — JobPriority enum value
    // ctx.payload     — arbitrary object passed by the caller

    const result = await doSomething(ctx.payload);
    return { success: true, data: result };

    // On failure, return { success: false, errorMessage: '...' }
    // or just throw — both mark the job as failed in the DB
});
```

**2. Register it** by adding one import line to `src/lib/jobs/index.ts`:

```typescript
import './handlers/my-job';
```

That's all. The new job type is immediately available to both the BullMQ worker and the HTTP worker endpoint.

## Submitting a Job

Call `createJob()` from any server-side context (API route, workflow function, etc.):

```typescript
import { createJob } from '@/lib/jobs/producer';
import { JobPriority } from '@/lib/jobs/types';

const jobId = await createJob({
    jobType: 'my-job',
    payload: { someInput: 'value' },
    userName: session.user.name,
    orgUnitCode: 'OU-001',          // optional
    options: {
        priority: JobPriority.HIGH, // defaults to NORMAL
        maxRetries: 5,              // defaults to 3
        delayMs: 60_000,            // optional delay before first attempt
    },
});
```

Or via the REST API from any authenticated client:

```
POST /api/action/job
{
  "jobType":     "my-job",
  "payload":     { "someInput": "value" },
  "orgUnitCode": "OU-001",
  "priority":    1
}
→ { "jobId": "<uuid>" }
```

## Priority Tiers

| Value | Name         | Queue name                  | Default concurrency | Intended use                     |
|-------|--------------|-----------------------------|---------------------|----------------------------------|
| 1     | `HIGH`       | `g3nacm-jobs-high`          | 5                   | User-facing, time-sensitive      |
| 2     | `NORMAL`     | `g3nacm-jobs-normal`        | 3                   | Default for most jobs            |
| 3     | `LOW`        | `g3nacm-jobs-low`           | 2                   | Batch operations, reports        |
| 4     | `BACKGROUND` | `g3nacm-jobs-background`    | 1                   | Non-urgent aggregation, cleanup  |

Each tier has its own named queue and its own BullMQ Worker instance. A burst of `BACKGROUND` jobs cannot consume `NORMAL` or `HIGH` worker slots.

## API Endpoints

| Method | Path                           | Auth          | Description                                    |
|--------|--------------------------------|---------------|------------------------------------------------|
| POST   | `/api/action/job/submit`       | Session       | Submit a job; returns `{ jobId }`              |
| GET    | `/api/data/job`                | Session       | List jobs. Users see only their own unless `admin.jobs` permission is held. Query params: `status`, `jobType`, `limit`, `offset` |
| POST   | `/api/action/job/process`      | Bearer secret | HTTP entry point for cloud queue push delivery |

## Running the Worker Locally

The standalone worker process is a separate long-running Node process. It must run alongside `npm run dev`.

```bash
npm run worker
```

It reads environment variables from `.env.worker`. See [Environment Variables](#environment-variables) below.

Graceful shutdown on `SIGTERM` / `SIGINT` — closes all BullMQ workers cleanly before exiting.

## Environment Variables

Add to `.env.worker` (for the worker process) and `.env.local` (for the Next.js app):

```env
# Required — selects the queue backend
JOB_QUEUE_PROVIDER=bullmq    # bullmq | memory

# Required — shared secret for POST /api/worker/process
JOB_WORKER_SECRET=<random string>

# Redis connection (BullMQ only)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=               # leave blank if no auth

# Per-tier worker concurrency (all optional, defaults shown)
JOB_WORKER_CONCURRENCY_HIGH=5
JOB_WORKER_CONCURRENCY_NORMAL=3
JOB_WORKER_CONCURRENCY_LOW=2
JOB_WORKER_CONCURRENCY_BACKGROUND=1
```

## Database Schema

Defined in `script/job.sql`. Run this after `script/base.sql`.

Key columns on the `job` table:

| Column              | Type           | Description                                    |
|---------------------|----------------|------------------------------------------------|
| `id`                | UUID           | Primary key, returned to callers as `jobId`    |
| `job_type`          | TEXT           | Matches the string passed to `JobRegistry.register()` |
| `status`            | enum           | `pending` → `running` → `completed` / `failed` / `cancelled` |
| `priority`          | SMALLINT       | 1–4 (see priority tiers above)                 |
| `payload`           | JSONB          | Input data provided by the caller              |
| `result`            | JSONB          | Output data returned by the handler            |
| `error_message`     | TEXT           | Set on failure                                 |
| `user_name`         | TEXT           | User who submitted the job                     |
| `org_unit_code`     | TEXT           | Org unit context, nullable                     |
| `create_datetime`   | TIMESTAMPTZ    | When the job was created                       |
| `start_datetime`    | TIMESTAMPTZ    | When the worker claimed the job                |
| `complete_datetime` | TIMESTAMPTZ    | When the job finished (success or failure)     |
| `retry_count`       | INT            | Number of attempts so far                      |
| `max_retries`       | INT            | Maximum attempts before giving up              |

## Switching Queue Providers

The `IQueueAdapter` interface is the only contract between the framework and the queue backend:

```typescript
interface IQueueAdapter {
    enqueue(jobId: string, jobType: string, options?: EnqueueOptions): Promise<string>;
    close?(): Promise<void>;
}
```

To add a new provider (e.g. AWS SQS):

1. Create `src/lib/jobs/queue/sqs-adapter.ts` implementing `IQueueAdapter`
2. Add a `case 'sqs':` branch in `src/lib/jobs/queue/index.ts`
3. Set `JOB_QUEUE_PROVIDER=sqs` in the environment

For HTTP-push providers (SQS, Cloud Tasks, Service Bus), point the queue's delivery target at `POST /api/worker/process` with an `Authorization: Bearer <JOB_WORKER_SECRET>` header. The body must be `{ "jobId": "<uuid>" }`.
