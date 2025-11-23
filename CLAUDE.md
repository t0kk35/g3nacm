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
- Action-based endpoints for entity operations
- Data endpoints for read operations
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

### Design Principles ###
- All interaction between the UI and database goes through the API routes, either /api/data or /api/action
- Run as much logic as possible in UI server components with 'use server' marker
- API's should use the ErrorCreators from the lib/api-error-handling.ts file for standardized API error handling

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