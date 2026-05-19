# Data Query Registry

A lightweight framework that eliminates boilerplate from `/api/data` routes and makes every registered query directly callable from job handlers and workflow functions — without HTTP.

## The problem it solves

Every `/api/data` route used to repeat the same ~15 lines: get session, check user, check permission, extract query params, validate them, run the query, map errors. Registering a query once handles all of that automatically. It also means a job or workflow function that needs business data can import and call the query function directly instead of duplicating the SQL or making an internal HTTP call.

## Architecture

```
defineQuery({ path, permissions, params, execute })
       │
       ├─► registers in queryRegistry (keyed by path)
       │
       └─► returns a typed function: (params, ctx) => Promise<TResult>
                                          │
                     ┌─────────────────────┴──────────────────────┐
                     │                                            │
              HTTP call                                    Direct call
     GET /api/data/<path>                        import { queryFoo } from '...'
     (catch-all route)                           called from job handler or
     auth → permission →                        workflow function
     Zod parse → execute                        permission checked via
     → error mapping                            hasPermissions()
```

## File structure

```
src/lib/data/
├── registry.ts          defineQuery() factory + QueryContext type + registry map
├── errors.ts            DataNotFoundError, DataNotUniqueError, DataQueryError
├── params.ts            Reusable Zod schema helpers (zTimeRange, etc.)
├── index.ts             Bootstrap — one import per query file (side-effect registration)
└── queries/
    ├── alert.detail.ts
    ├── alert.list.ts
    ├── subject.detail.ts
    └── rfi.request.ts

src/app/api/data/[...path]/route.ts   Catch-all HTTP dispatcher
```

## Adding a new query

**1. Create a query file** in `src/lib/data/queries/`:

```typescript
// src/lib/data/queries/my-entity.list.ts
import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { MyEntity } from '@/app/api/data/my-entity/types';

const paramsSchema = z.object({
    org_unit_code: z.string().optional(),
    limit:         z.coerce.number().int().max(200).default(50),
});

const query_text = `SELECT ... FROM my_entity WHERE ...`;

export const queryMyEntityList = defineQuery({
    path: 'my-entity/list',
    permissions: ['data.my-entity'],   // omit the key for no permission check
    params: paramsSchema,
    execute: async ({ org_unit_code, limit }, ctx: QueryContext): Promise<MyEntity[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query({
                name: 'data_my_entity_list',
                text: query_text,
                values: [ctx.userName, org_unit_code ?? null, limit],
            });
            return result.rows as MyEntity[];
        } catch (err) {
            throw new DataQueryError('Get my-entity list', err as Error);
        }
    },
});
```

**2. Register it** by adding one import line to `src/lib/data/index.ts`:

```typescript
import './queries/my-entity.list';
```

The query is now available as `GET /api/data/my-entity/list` with no additional route file needed.

## Calling a query directly (from a job or workflow function)

Import the exported function and call it with a `QueryContext`:

```typescript
import { queryMyEntityList } from '@/lib/data/queries/my-entity.list';

// From a job handler
const items = await queryMyEntityList(
    { limit: 100 },
    { userName: ctx.userName, orgUnitCode: ctx.orgUnitCode ?? undefined }
);

// From a workflow function — pass the PoolClient to join the existing transaction
const items = await queryMyEntityList(
    { org_unit_code: ctx.system.orgUnitCode },
    { userName: ctx.system.userName, client }
);
```

Permissions are enforced the same way as via HTTP — a user without the required permission gets a thrown `DataQueryError`.

## QueryContext

| Field | Type | Description |
|---|---|---|
| `userName` | `string` | Required. The acting user — used for org-unit access filtering in queries. |
| `orgUnitCode` | `string \| undefined` | Optional. Carried through for convenience; use it in `execute` if the query needs it. |
| `client` | `PoolClient \| undefined` | Optional. Pass a `PoolClient` from a workflow function to run the query inside an existing transaction. |

## Error types

Throw these from `execute` — the catch-all route maps them to the correct HTTP response. In direct calls they propagate as normal exceptions.

| Class | Maps to (HTTP) | When to use |
|---|---|---|
| `DataNotFoundError(entity, id)` | 404 | Expected single row, got zero |
| `DataNotUniqueError(entity, id)` | 400 | Expected single row, got more than one |
| `DataQueryError(message, cause?)` | 500 | Any other database or logic error |

Always re-throw `DataNotFoundError` and `DataNotUniqueError` inside your catch block so they are not swallowed by the generic `DataQueryError` wrapper:

```typescript
} catch (err) {
    if (err instanceof DataNotFoundError || err instanceof DataNotUniqueError) throw err;
    throw new DataQueryError('Get foo detail', err as Error);
}
```

## Param schema tips

All HTTP query params arrive as strings. Use `z.coerce` for non-string fields so the same schema works for both HTTP and direct calls:

```typescript
z.coerce.number().int().max(200).default(50)   // numeric with cap and default
z.coerce.boolean()                             // 'true'/'false' strings → boolean
z.string().uuid().optional()                   // optional UUID
z.string().transform(s => s?.split(','))       // comma-separated list → array
```

### zTimeRange

For endpoints that accept a human-friendly time window like `7d`, `3w`, `2m`, `24h`, import `zTimeRange` from `params.ts`. It validates the format and transforms the string into a `Date` (the computed start of the period) before `execute` is called:

```typescript
import { zTimeRange } from '@/lib/data/params';

const paramsSchema = z.object({
    time_range: zTimeRange,   // execute receives a Date, not a string
});
```

Supported suffixes: `h` (hours), `d` (days), `w` (weeks), `m` (months).

For endpoints where either an ID **or** a time range is accepted, use `z.refine()`:

```typescript
const paramsSchema = z.object({
    entity_id:  z.string().uuid().optional(),
    time_range: zTimeRange.optional(),
}).refine(
    d => d.entity_id || d.time_range,
    { message: 'Either entity_id or time_range is required' }
);
```

## Routes that should NOT be migrated to the registry

The catch-all route always returns `NextResponse.json(result)`. Keep a dedicated `route.ts` for:

- Responses that are not JSON (binary downloads, streaming, custom headers)
- Routes that delegate to a cache layer rather than running a DB query (`workflow/`, `eval/rule`)
- Routes with non-trivial access control that does not fit the `permissions[]` array model
