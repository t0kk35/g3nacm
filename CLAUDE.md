# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

g3nACM (Generative AI Alert and Case Manager) is a Next.js 15.3 application built for alert management and case processing. The system handles different types of alerts (AML Transaction Monitoring, CDD, Name Screening, Transaction Filtering) with a workflow-based processing engine.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting

### Database Setup
SQL schema files are located in the `script/` directory and should be run in dependency order:
1. `base.sql` - Core database structure
2. `users.sql` - User management tables
3. `org-unit.sql` - Organizational unit structure
4. `alert.sql` - Alert management tables
5. `workflow.sql` - Workflow engine tables
6. `chat-audit.sql` - AI chat auditing tables for compliance
7. Additional domain-specific tables as needed

## Architecture

### Core Components

**Database Layer** (`src/db/`)
- PostgreSQL connection pool configuration
- Environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**Authentication** (`src/auth.ts`)
- NextAuth.js with credentials provider
- Custom user validation via internal API endpoint
- JWT-based sessions
- Environment variable: `USER_VALIDATION_SECRET`

**Password Validation** (`src/lib/auth/password-validation.ts`)
- Configurable password validation system with environment-driven rules
- Supports variable number of regex-based validation rules
- Auto-detection of rules through indexed environment variables
- Secure default rules if not configured
- User-friendly requirement display for UI components

**API Structure** (`src/app/api/`)
- RESTful endpoints organized by domain (alert, user, role, team, org_unit)
- Action-based endpoints for entity operations (`src/app/api/action`)
- Data endpoints for read operations (`src/app/api/data`)
- Authentication endpoints

**Workflow Engine** (`src/lib/workflow/`)
- State-based workflow system with configurable actions
- Function registry for extensible workflow functions
- Entity state management and transitions
- Implementations include: entity creation, state changes, team/user assignment, email notifications

**Evaluation Engine** (`src/lib/eval-engine/`)
- Rule-based evaluation system for alerts
- Supports atomic conditions (equals, notEquals, greaterThan, lessThan)
- Schema validation with strict mode
- Configurable error handling for missing fields/invalid types

**Transaction Message Processing** (`src/lib/tf-message-mapping/`)
- XML message parsing and mapping
- PACS008 payment message support
- Fast XML parser integration

**AI Chat Auditing System** (`src/lib/chat-audit.ts`)
- Complete audit trail for financial crime compliance
- Message storage with metadata preservation for conversation reconstruction
- Performance-optimized database operations using username-based queries
- Automatic audit logging via database triggers
- Integration with workflow entities for regulatory traceability

### Frontend Architecture

**UI Framework**
- Shadcn/ui components with Radix UI primitives
- Tailwind CSS for styling
- Custom theme provider with dark/light mode support
- Responsive sidebar layout with state persistence

**Component Organization**
- `components/admin/` - Administrative interface components
- `components/alert/` - Alert management components
- `components/common/` - Shared layout and utility components
- `components/ui/` - Base UI components from Shadcn/ui

**State Management**
- React Context for entity locking (`contexts/entity-lock-context.tsx`)
- NextAuth session management
- Server-side state via API routes

### Key Features

**Entity Locking System**
- Prevents concurrent editing of entities
- Lock/unlock API endpoints
- Context-based lock status tracking

**Organizational Structure**
- Hierarchical org unit management
- Team-based user organization
- Role-based permissions

**Alert Processing**
- Multi-type alert support (TM, CDD, NS, TF)
- Workflow-driven alert processing
- Configurable evaluation rules

**AI Chat Auditing System**
- Complete audit trail for all AI agent interactions with alerts/cases
- Links every conversation to workflow entities for compliance tracking
- Automatic message storage for both user inputs and agent responses
- Performance-optimized with username-based operations to minimize DB round-trips

**Dynamic Screen Framework** (`src/components/ui/custom/dynamic-screen/`)
- Responsive screen system with drag-and-drop widget layouts
- Widget registry with configurable components and responsive constraints
- User-customizable layouts per screen size (desktop, tablet, mobile)
- Database-backed widget configuration and layout persistence

**Background Job Framework** (`src/lib/jobs/`)
- Provider-agnostic background task processing for agents, reports, emails, aggregation, etc.
- Jobs are persisted in PostgreSQL (`job` table, `script/job.sql`) before being enqueued — full audit trail independent of the queue
- Queue backend is swappable via `JOB_QUEUE_PROVIDER` env var; current implementations: `bullmq` (Redis, local/dev) and `memory` (in-process, tests)
- Four priority tiers (HIGH/NORMAL/LOW/BACKGROUND) each map to a separate named queue with configurable concurrency — prevents low-priority floods from starving high-priority work
- Jobs carry the submitting user's identity (`user_name`, `org_unit_code`) through to the handler
- Standalone worker process (`npm run worker`) for local dev; serverless deployments receive jobs via HTTP push to `POST /api/action/job/process`
- See `src/lib/jobs/README.md` for full documentation, including how to add new job types

**Data Query Registry** (`src/lib/data/`)
- Register a query once with `defineQuery()` — it automatically becomes a `GET /api/data/<path>` endpoint AND a directly-callable typed function
- Eliminates boilerplate (auth, permission check, Zod validation, error mapping) that was repeated across every `/api/data` route
- Callable from job handlers and workflow functions without HTTP — pass a `PoolClient` to participate in an existing transaction
- Reusable Zod param helpers in `params.ts` (e.g. `zTimeRange` for `7d`/`3w`/`2m` strings)
- See `src/lib/data/README.md` for full documentation, including how to register a new query

### Design Principles ###
- All interaction between the UI and database goes through the API routes, either /api/data or /api/action
- Run as much logic as possible in UI server components with 'use server' marker
- API's should use the ErrorCreators from the lib/api-error-handling.ts file for standardized API error handling

## Background Job Framework Architecture

### Overview
The job framework provides asynchronous background processing with a consistent interface across local (Redis/BullMQ) and cloud (SQS, Cloud Tasks, Service Bus) queue backends.

### Core Components
- **`src/lib/jobs/types.ts`** — `JobPriority` enum, `JobContext`, `JobResult`, `JobHandler`, `EnqueueOptions`
- **`src/lib/jobs/registry.ts`** — `JobRegistry`: maps job type strings to handler functions
- **`src/lib/jobs/processor.ts`** — `processJob(jobId)`: claims the job in the DB, dispatches to the registered handler, updates status to `completed` or `failed`
- **`src/lib/jobs/producer.ts`** — `createJob(params)`: inserts the job row then enqueues via the configured adapter
- **`src/lib/jobs/index.ts`** — bootstrap file; import all handler files here so they self-register
- **`src/lib/jobs/queue/`** — `IQueueAdapter` interface + `BullMQAdapter`, `MemoryAdapter`, factory
- **`src/lib/jobs/handlers/`** — one file per job type
- **`src/worker/index.ts`** — standalone BullMQ worker process (`npm run worker`)

### Database Schema (`script/jobs.sql`)
- **`job`** — tracks every job: type, status, priority, payload, result, user, org unit, timestamps, retry count

### API Endpoints
- **`POST /api/action/job/submit`** — submit a job (session auth); body: `{ jobType, payload, orgUnitCode?, priority?, maxRetries?, delayMs? }`; returns `{ jobId }`
- **`GET /api/data/job`** — list jobs; users see only their own unless they hold `admin.jobs` permission
- **`POST /api/action/job/process`** — HTTP push entry point for cloud queue delivery; secured with `Authorization: Bearer $JOB_WORKER_SECRET`

### Adding a New Job Type
1. Create `src/lib/jobs/handlers/<name>.ts` and call `JobRegistry.register('<type>', handler)`
2. Add one import line to `src/lib/jobs/index.ts`

### Priority and Concurrency
Four named queues (one per tier) with per-tier worker concurrency caps. Configurable via `JOB_WORKER_CONCURRENCY_HIGH/NORMAL/LOW/BACKGROUND` env vars (defaults: 5/3/2/1).

### Environment Variables
```env
JOB_QUEUE_PROVIDER=bullmq        # bullmq | memory
JOB_WORKER_SECRET=<secret>       # for /api/worker/process
REDIS_HOST=localhost              # BullMQ only
REDIS_PORT=6379
```
Worker reads from `.env.worker`; Next.js app reads from `.env.local`.

## Data Query Registry Architecture

### Overview
The data query registry eliminates the repeated boilerplate in `/api/data` routes (auth check, permission check, param extraction/validation, try/catch error mapping) and solves a second problem: job handlers and workflow functions that need the same business data no longer have to duplicate SQL or call the HTTP API internally. Register a query once and it is available both as an HTTP endpoint and as a typed function you can import anywhere.

### Core Components
- **`src/lib/data/registry.ts`** — `defineQuery<TParams, TResult>(def)`: registers the definition in the global map and returns a directly-callable typed function; `QueryContext` type (`userName`, `orgUnitCode?`, `client?`)
- **`src/lib/data/errors.ts`** — `DataNotFoundError`, `DataNotUniqueError`, `DataQueryError` — thrown by `execute`, caught and mapped to HTTP responses by the catch-all route
- **`src/lib/data/params.ts`** — reusable Zod schema helpers (e.g. `zTimeRange` converts `'7d'`/`'3w'`/`'2m'` to a `Date` inside the schema)
- **`src/lib/data/index.ts`** — bootstrap file; add one import per query file here so definitions self-register on startup
- **`src/lib/data/queries/`** — one file per query (or per domain group)
- **`src/app/api/data/[...path]/route.ts`** — catch-all HTTP dispatcher: auth → permission → Zod parse → `execute` → error mapping; specific `route.ts` files take Next.js precedence and are unaffected

### Adding a New Query
1. Create `src/lib/data/queries/<name>.ts` and call `defineQuery({ path, permissions?, params, execute })`
2. Add one import line to `src/lib/data/index.ts`

The query is now available as `GET /api/data/<path>` with no additional route file needed.

### Calling a Query Directly (from a job or workflow function)
```typescript
import { queryAlertDetail } from '@/lib/data/queries/alert.detail';

// From a job handler
const alert = await queryAlertDetail({ alert_id: ctx.payload.alert_id }, { userName: ctx.userName });

// From a workflow function — participates in the existing DB transaction
const alert = await queryAlertDetail({ alert_id: inputs.alert_id }, { userName: ctx.system.userName, client });
```

### Zod Param Schemas and Coercion
All HTTP query params arrive as strings. Use `z.coerce.number()`, `z.coerce.boolean()`, and `.transform()` for non-string fields so the same schema works for both HTTP calls and direct typed calls:
- `z.coerce.number().int().max(200)` — numeric params with bounds
- `zTimeRange` from `params.ts` — validates format and transforms to `Date`
- `z.string().transform(s => s?.split(','))` — comma-separated arrays

### Routes That Stay as Specific `route.ts` Files
These cannot be served by the registry's `NextResponse.json(result)` pattern:
- `attachment/detail` — returns a binary response with custom headers
- `workflow/`, `eval/rule`, `eval/schema` — delegate to cache layer, not DB
- Routes with non-standard response shapes or complex streaming

## AI Chat Auditing Architecture

### Core Audit Principles
The application implements comprehensive auditing for all AI agent interactions to meet financial crime compliance requirements. Every conversation is linked to specific alerts/cases and tracked with complete user attribution.

### Database Schema (`script/chat-audit.sql`)
- **`chat_session`** - Links conversations to workflow entities with user and organizational context
- **`chat_message`** - Stores individual messages with content, metadata, and context preservation
- **`chat_audit_log`** - Comprehensive audit trail with automatic triggers for compliance reporting

### API Endpoints
- **`/api/chat`** - Main streaming chat endpoint with session management and user message storage
- **`/api/chat/store-response`** - Post-streaming endpoint for capturing complete agent responses
- **`/api/data/chat/history`** - Retrieval endpoint for conversation history and audit queries

### Performance Optimizations
- **Username-based operations** - Eliminates unnecessary user ID lookups (reduces 3 DB round-trips per request)
- **Single query session creation** - Uses INSERT with JOIN for efficient session initialization
- **Ownership validation** - Combines session access checks with user verification in single query
- **Automatic triggers** - Database-level audit logging without application overhead

### Compliance Features
- **Complete traceability** - Links every message to users, entities, and organizational units
- **Context preservation** - Stores template variables and agent reasoning for conversation reconstruction
- **Metadata capture** - Preserves complex UI components, tool invocations, and streaming data
- **Audit log integrity** - Immutable audit trail with timestamp precision for regulatory requirements

### Integration Pattern
1. Client initiates chat with entity context (alert/case ID, org unit)
2. System creates/finds chat session linked to workflow entity
3. User messages stored immediately for audit trail
4. Agent responses stream to client for real-time interaction
5. Complete agent responses captured post-streaming via callback
6. All interactions automatically logged for compliance reporting

## Dynamic Screen Framework Architecture

### Core Components
The dynamic screen framework provides a customizable dashboard system with responsive widget layouts.

**Database Schema** (`script/dynamic-screen.sql` + `script/dynamic-screen-responsive-migration.sql`)
- **`dynamic_screen_widget_registry`** - Available widget types with responsive constraints
- **`dynamic_screen_user_config`** - User dashboard configurations with responsive layouts
- **`dynamic_screen_user_widget_config`** - Individual widget instances and settings

**Component Structure**
- **`DynamicScreenContainer`** - Main orchestration component handling layout and widget management
- **`DynamicScreenGrid`** - Responsive grid layout using react-grid-layout with drag-and-drop
- **`DynamicScreenWidgetWrapper`** - Error boundary and wrapper for individual widgets
- **`widget-registry.ts`** - Widget registration system with validation and constraints

**API Endpoints**
- **`/api/data/dynamic_screen`** - Retrieves user dashboard configuration with responsive layouts
- **`/api/action/dynamic_screen/layout`** - Saves responsive layout changes across all breakpoints

### Responsive Layout System
- **Breakpoint-specific layouts**: Separate arrangements for desktop (lg), tablet (md), and mobile (sm/xs)
- **Widget constraints per breakpoint**: Different min/max sizes based on screen size
- **Persistent customization**: User layouts saved and restored per device type
- **Automatic fallbacks**: Smart default layouts generated when no custom layout exists

### Widget Development
Widgets are registered in the widget registry with:
- React component and skeleton loading component
- Configuration schema using Zod validation
- Responsive constraints defining min/max sizes per breakpoint
- Default configuration and permissions

## Template-Based Entity Detail Screen System

### Overview
The template system provides a configurable, file-based approach to rendering entity detail screens using markdown templates with the liquidjs template engine. Templates define which APIs to call and how to render the data, enabling easy customization without code changes.

### Core Components

**Template Engine** (`src/lib/entity-template/`)
- **`types.ts`** - TypeScript type definitions for templates, API calls, and rendering
- **`registry.ts`** - Template registry with file-based loading and caching
- **`api-orchestrator.ts`** - API call execution with dependency resolution and parallel execution
- **`renderer.ts`** - Liquidjs template engine wrapper with custom filters

**API Endpoint**
- **`/api/data/entity/rendered_detail`** - Renders entity detail using template system
  - Query params: `entity_id` (UUID), `entity_code` (e.g., "aml.rule.alert")
  - Returns: JSON with `rendered_markdown`, `data_sources`, `template_version`, and optional `errors`

**Template Files** (`templates/entity-details/`)
- **`registry.json`** - Registry of available templates
- **`{entity_code}/config.json`** - API configuration per entity type
- **`{entity_code}/template.liquid`** - Markdown template with liquidjs syntax
- **`_shared/*.liquid`** - Reusable template partials

### Template Configuration

Each template directory contains a `config.json` defining:
- **`entity_code`** - Entity type this template renders (e.g., "aml.rule.alert")
- **`permissions`** - Required permissions to render
- **`api_calls`** - Array of API calls to execute before rendering:
  - `name` - Unique identifier for the API call
  - `endpoint` - API endpoint path
  - `params` - Query parameters with template variable support (`{{entity_id}}`, `{{alert.alert_item.id}}`)
  - `required` - Whether to fail fast if call fails (true/false)
  - `condition` - JavaScript expression to conditionally execute call
  - `depends_on` - Name of API call this depends on (for execution ordering)
  - `variable_name` - Name to store response data in template context

### API Orchestration

The orchestrator executes API calls with:
- **Dependency resolution** - Topological sort to determine execution order
- **Parallel execution** - Calls with no dependencies run in parallel waves
- **Template variable substitution** - Resolves `{{variable}}` in API params from context
- **Conditional execution** - Evaluates conditions before executing optional calls
- **Fail-fast error handling** - Required API failures abort rendering immediately

### Liquid Template Syntax

Templates support standard liquidjs syntax with custom filters:
- **Variables**: `{{ alert.alert_identifier }}`
- **Conditionals**: `{% if subject %} ... {% endif %}`
- **Loops**: `{% for detection in alert.detections %} ... {% endfor %}`
- **Partials**: `{% include 'entity-state-history', history: alert.entity_state_history %}`

**Custom Filters:**
- `date: "%Y-%m-%d %H:%M:%S"` - Date formatting
- `alert_icon` - Alert type icons (🎯 TM, 🔍 NS, 💰 TF, 📋 CDD)
- `subject_type_name` - Convert IND/CRP to Individual/Corporate
- `round: 2` - Round numbers to decimal places
- `json` - JSON stringify
- `default: "value"` - Default value if null/undefined
- `upcase`, `downcase`, `capitalize` - Text transformations
- `truncate: 50` - Truncate long text

### Creating New Templates

To add a new entity type template:

1. Create directory: `templates/entity-details/{entity_code}/`
2. Create `config.json` with API calls and permissions
3. Create `template.liquid` with markdown and liquidjs syntax
4. Register in `templates/entity-details/registry.json`

Example minimal config:
```json
{
  "entity_code": "case",
  "entity_type": "case",
  "version": "1.0.0",
  "name": "Case Detail",
  "permissions": ["data.case"],
  "api_calls": [
    {
      "name": "case_detail",
      "endpoint": "/api/data/case/detail",
      "params": { "case_id": "{{entity_id}}" },
      "required": true,
      "variable_name": "case"
    }
  ],
  "enable_markdown": true
}
```

### Integration Pattern

1. Client calls `/api/data/entity/rendered_detail?entity_id={id}&entity_code={code}`
2. System loads template and validates permissions
3. Orchestrator executes API calls in dependency-optimized order
4. Template engine renders markdown with API response data
5. Returns JSON with markdown text for client's markdown renderer
6. Client displays rendered markdown in UI

### Security Considerations
- **Liquidjs sandboxing** - Prevents arbitrary code execution in templates
- **Permission validation** - Template-level and API-level permission checks
- **UUID validation** - Entity ID format validation
- **Entity code whitelist** - Only registered templates can be rendered

### Future Migration Path
- **Phase 2**: Migrate templates from files to database storage
- **Phase 3**: Build UI for template editing and configuration
- **Phase 4**: Add template versioning and rollback capabilities
- **Phase 5**: Implement caching layer for rendered output

## Path Aliases

The application uses TypeScript path mapping:
- `@/*` maps to `src/*`
- Component aliases defined in `components.json`

## Environment Configuration

### Required Variables
- **Database**: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Authentication**: `USER_VALIDATION_SECRET`, `DATA_URL`
- **NextAuth**: Standard NextAuth environment variables

### Password Validation Configuration
The password validation system can be customized via environment variables to meet deployment-specific security requirements.

**Minimum Length**
- `NEXT_PUBLIC_PASSWORD_MIN_LENGTH` - Minimum password length (default: 8)
- `NEXT_PUBLIC_PASSWORD_MIN_LENGTH_MESSAGE` - Custom error message for minimum length

**Regex Rules**
Rules are defined using indexed environment variables. You can define any number of rules (1, 2, 3, or more):

- `NEXT_PUBLIC_PASSWORD_RULE_COUNT` - (Optional) Explicit count of rules; if omitted, rules are auto-detected
- `NEXT_PUBLIC_PASSWORD_RULE_1_REGEX` - First validation regex pattern
- `NEXT_PUBLIC_PASSWORD_RULE_1_MESSAGE` - First validation error message
- `NEXT_PUBLIC_PASSWORD_RULE_2_REGEX` - Second validation regex pattern
- `NEXT_PUBLIC_PASSWORD_RULE_2_MESSAGE` - Second validation error message
- ... continue for additional rules (3, 4, 5, etc.)

**Example Configurations**

Basic deployment (default rules if not configured):
```env
# Uses secure defaults:
# - Uppercase letter: [A-Z]
# - Lowercase letter: [a-z]
# - Number: [0-9]
# - Special character: [^A-Za-z0-9]
```

Custom deployment with 3 rules:
```env
NEXT_PUBLIC_PASSWORD_MIN_LENGTH=10
NEXT_PUBLIC_PASSWORD_MIN_LENGTH_MESSAGE=Password must be at least 10 characters
NEXT_PUBLIC_PASSWORD_RULE_1_REGEX=[A-Z]
NEXT_PUBLIC_PASSWORD_RULE_1_MESSAGE=Password must contain at least one uppercase letter
NEXT_PUBLIC_PASSWORD_RULE_2_REGEX=[0-9]
NEXT_PUBLIC_PASSWORD_RULE_2_MESSAGE=Password must contain at least one number
NEXT_PUBLIC_PASSWORD_RULE_3_REGEX=[!@#$%^&*]
NEXT_PUBLIC_PASSWORD_RULE_3_MESSAGE=Password must contain at least one special character (!@#$%^&*)
```

High-security deployment with 5 rules:
```env
NEXT_PUBLIC_PASSWORD_MIN_LENGTH=12
NEXT_PUBLIC_PASSWORD_RULE_COUNT=5
NEXT_PUBLIC_PASSWORD_RULE_1_REGEX=[A-Z]{2,}
NEXT_PUBLIC_PASSWORD_RULE_1_MESSAGE=Password must contain at least two uppercase letters
NEXT_PUBLIC_PASSWORD_RULE_2_REGEX=[a-z]{2,}
NEXT_PUBLIC_PASSWORD_RULE_2_MESSAGE=Password must contain at least two lowercase letters
NEXT_PUBLIC_PASSWORD_RULE_3_REGEX=[0-9]{2,}
NEXT_PUBLIC_PASSWORD_RULE_3_MESSAGE=Password must contain at least two numbers
NEXT_PUBLIC_PASSWORD_RULE_4_REGEX=[!@#$%^&*]
NEXT_PUBLIC_PASSWORD_RULE_4_MESSAGE=Password must contain a special character
NEXT_PUBLIC_PASSWORD_RULE_5_REGEX=^(?!.*(.)\1{2})
NEXT_PUBLIC_PASSWORD_RULE_5_MESSAGE=Password cannot contain the same character three times in a row
```

## Testing and Quality

Run linting before commits using `npm run lint`. The application uses TypeScript strict mode with comprehensive type checking configured in `tsconfig.json`.