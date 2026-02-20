# SimQuip Application Specification

## 1. Purpose and Scope
SimQuip is a modern, professional Node.js Progressive Web App (PWA) for managing equipment and related resources used in training, education, and simulation events at the Royal Brisbane & Women's Hospital (RBWH).

The app supports:
- Equipment cataloguing and lifecycle tracking
- Equipment nesting (container/contents relationships)
- Team and staff ownership and contact management
- Structured locations (Building > Level > Location)
- Loan/transfer workflows with approval metadata
- Attachments, images, and interactive guidance content
- Issue and corrective action tracking with conversation-style notes
- Preventative maintenance scheduling with checklists and auto-generation

Out of scope for initial release:
- Full reminder automation implementation (Power Automate integration points are defined, but flow logic is handled externally)

## 2. Product Requirements

### 2.1 Equipment
Each equipment record must support:
- Name, unique code/identifier, status
- Owner (team or person)
- Nominated contact person
- Home location (defaultable from owner's main location)
- Primary image plus additional images
- Attachments
- Interactive contents list
- Interactive quick start flow chart
- Nesting (parent equipment and children equipment)

### 2.2 Locations
Locations are hierarchical:
- Building
- Level
- Location

Each location must support:
- Contact person
- Images
- Attachments

### 2.3 Teams and Staff
Team records must support:
- Team metadata (name, code)
- Team members (staff)
- Main contact (must be one of the staff members)
- Team locations (one or more)
- Main location (must be one of team locations)

### 2.4 Loans/Transfers
Each loan/transfer record must support:
- Start date
- Due date
- Origin
- Recipient (loaning team)
- Categorical reason (simulation, training, service, etc.)
- Approver (person from recipient team)
- Status (draft, active, overdue, returned, cancelled)

Origin defaulting rules:
- If equipment owner is a team: default origin to that owner team.
- If equipment owner is a person with exactly one active team membership: default origin to that team.
- If equipment owner is a person with zero or multiple active team memberships: require manual origin selection.

## 3. Architecture and Technology

### 3.1 Runtime and Delivery
- Node.js LTS runtime
- TypeScript-first codebase
- Frontend as a PWA with offline-capable shell and installability
- Host model aligns with Power Apps Code Apps (web-only)

### 3.2 Frontend
- React + TypeScript SPA
- Design system: Fluent UI (recommended for Power Apps ecosystem consistency)
- Routing: client-side routed SPA
- State: server-state + local UI state separation

### 3.3 Data Access Strategy
Primary strategy:
- Use `@microsoft/power-apps` generated services from `pac code add-data-source` for connector-backed CRUD where possible.

Secondary strategy (outside Power Platform connector calls, when explicitly required):
- Dataverse Web API: `https://{org}.{region}.dynamics.com/api/data/v9.2/` (officially supported for solution-aware flow/workflow metadata operations)
- Power Automate REST API (unsupported; use only when required and risk-accepted):
  - `https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/...`
  - Regional variants: `https://emea.api.flow.microsoft.com/...`, `https://unitedstates.api.flow.microsoft.com/...`
- Power Automate Management connector actions may orchestrate flow management in-process when appropriate.

### 3.4 Integration Boundaries
- Reminder notifications are triggered by Power Automate flows.
- App persists all domain state in configured data sources (Dataverse preferred).
- Avoid direct secret storage in client code.

## 4. Data Schema (Logical)

### 4.1 Person
- `personId` (PK)
- `displayName`
- `email` (unique)
- `phone`
- `teamId` (nullable FK)
- `active`

### 4.2 Team
- `teamId` (PK)
- `teamCode` (unique)
- `name`
- `mainContactPersonId` (FK -> Person, member of team)
- `mainLocationId` (FK -> Location, one of team locations)
- `active`

### 4.3 TeamMember
- `teamMemberId` (PK)
- `teamId` (FK)
- `personId` (FK)
- `role`
- Unique constraint: (`teamId`, `personId`)

### 4.4 Building
- `buildingId` (PK)
- `name`
- `code` (unique)

### 4.5 Level
- `levelId` (PK)
- `buildingId` (FK)
- `name`
- `sortOrder`
- Unique constraint: (`buildingId`, `name`)

### 4.6 Location
- `locationId` (PK)
- `buildingId` (FK)
- `levelId` (FK)
- `name`
- `contactPersonId` (FK -> Person)
- `description`
- Unique constraint: (`buildingId`, `levelId`, `name`)

### 4.7 Equipment
- `equipmentId` (PK)
- `equipmentCode` (unique)
- `name`
- `description`
- `ownerType` (enum: Team, Person)
- `ownerTeamId` (nullable FK)
- `ownerPersonId` (nullable FK)
- `contactPersonId` (FK -> Person)
- `homeLocationId` (FK -> Location)
- `parentEquipmentId` (nullable FK -> Equipment)
- `quickStartFlowChartJson` (JSON)
- `contentsListJson` (JSON)
- `status` (enum)
- `active`

Rules:
- Exactly one owner target is set based on `ownerType`.
- `parentEquipmentId` cannot create cycles (validate ancestry recursively before save).
- Equipment nesting depth must not exceed 10 levels.

### 4.8 EquipmentMedia
- `equipmentMediaId` (PK)
- `equipmentId` (FK)
- `mediaType` (enum: Image, Attachment)
- `fileName`
- `mimeType`
- `fileUrl`/`blobId`
- `sortOrder`

### 4.9 LocationMedia
- `locationMediaId` (PK)
- `locationId` (FK)
- `mediaType` (enum: Image, Attachment)
- `fileName`
- `mimeType`
- `fileUrl`/`blobId`
- `sortOrder`

### 4.10 LoanTransfer
- `loanTransferId` (PK)
- `equipmentId` (FK)
- `startDate`
- `dueDate`
- `originTeamId` (FK)
- `recipientTeamId` (FK)
- `reasonCode` (enum)
- `approverPersonId` (FK -> Person)
- `isInternalTransfer` (boolean, default `false`)
- `status` (enum)
- `notes`

Rules:
- `dueDate >= startDate`
- `approverPersonId` must belong to recipient team
- `isInternalTransfer` is set to `true` only for approved same-team logistical moves that still require tracking.
- `originTeamId = recipientTeamId` if and only if `isInternalTransfer = true`

### 4.11 Reference Enum Tables
- `LoanReason` (Simulation, Training, Service, Other)
- `EquipmentStatus` (Available, InUse, UnderMaintenance, Retired)
- `LoanStatus` (Draft, Active, Overdue, Returned, Cancelled)
- `IssueStatus` (Open, InProgress, AwaitingParts, Resolved, Closed)
- `IssuePriority` (Low, Medium, High, Critical)
- `CorrectiveActionStatus` (Planned, InProgress, Completed, Verified)
- `PMStatus` (Scheduled, InProgress, Completed, Overdue, Cancelled)
- `PMFrequency` (Weekly, Monthly, Quarterly, SemiAnnual, Annual)
- `PMChecklistItemStatus` (Pending, Pass, Fail, NotApplicable)

### 4.12 EquipmentIssue
- `issueId` (PK)
- `equipmentId` (FK -> Equipment)
- `title`
- `description`
- `reportedByPersonId` (FK -> Person)
- `assignedToPersonId` (nullable FK -> Person)
- `status` (enum: IssueStatus)
- `priority` (enum: IssuePriority)
- `dueDate` (auto-populated: 7 days from creation)
- `createdOn`
- `resolvedOn` (nullable, auto-set when status becomes Resolved/Closed)
- `active`

Rules:
- `dueDate` is automatically set to 7 days from creation if not provided.
- `resolvedOn` is automatically set when status transitions to Resolved or Closed.
- Equipment owner is notified via email when a new issue is created.

### 4.13 IssueNote
- `issueNoteId` (PK)
- `issueId` (FK -> EquipmentIssue)
- `authorPersonId` (FK -> Person)
- `content`
- `createdOn`

Rules:
- Notes provide a conversation-style thread against an issue.

### 4.14 CorrectiveAction
- `correctiveActionId` (PK)
- `issueId` (FK -> EquipmentIssue)
- `description`
- `assignedToPersonId` (FK -> Person)
- `status` (enum: CorrectiveActionStatus)
- `equipmentStatusChange` (nullable, enum: EquipmentStatus)
- `completedOn` (nullable)
- `createdOn`

Rules:
- When a corrective action is completed with `equipmentStatusChange` set, the equipment's status is automatically updated.

### 4.15 PMTemplate
- `pmTemplateId` (PK)
- `equipmentId` (FK -> Equipment)
- `name`
- `description`
- `frequency` (enum: PMFrequency)
- `active`

### 4.16 PMTemplateItem
- `pmTemplateItemId` (PK)
- `pmTemplateId` (FK -> PMTemplate)
- `description`
- `sortOrder`

### 4.17 PMTask
- `pmTaskId` (PK)
- `pmTemplateId` (FK -> PMTemplate)
- `equipmentId` (FK -> Equipment)
- `scheduledDate`
- `completedDate` (nullable)
- `completedByPersonId` (nullable FK -> Person)
- `status` (enum: PMStatus)
- `notes`
- `generatedIssueId` (nullable FK -> EquipmentIssue)

Rules:
- When a PM task is completed, the next PM task is automatically created based on the template frequency.
- If any checklist items have Fail status on completion, an EquipmentIssue is automatically created.
- `completedDate >= scheduledDate` when provided.

### 4.18 PMTaskItem
- `pmTaskItemId` (PK)
- `pmTaskId` (FK -> PMTask)
- `pmTemplateItemId` (FK -> PMTemplateItem)
- `description`
- `status` (enum: PMChecklistItemStatus)
- `notes`
- `sortOrder`

## 5. Naming Conventions
- TypeScript:
  - Types/Interfaces/Components: `PascalCase`
  - Variables/functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: React components `PascalCase.tsx`; utilities/services `camelCase.ts`
- Data model:
  - Table/entity names singular `PascalCase` (e.g., `Equipment`, `LoanTransfer`)
  - Primary keys `<entityName>Id`
  - Foreign keys `<relatedEntityName>Id`
- API/service methods:
  - `get*`, `list*`, `create*`, `update*`, `delete*`, `validate*`

## 6. Coding Standards
- Strict TypeScript (`strict: true`)
- ESLint + Prettier enforced in CI
- No `any` unless justified with inline suppression and rationale
- Prefer pure functions and immutable updates
- Service layer isolation: UI components must not contain raw HTTP logic
- Validate all user input at UI and service boundaries
- Use pagination/filtering; avoid unbounded reads

## 7. Error Handling Standards
- Centralized typed error model:
  - `ValidationError`
  - `NotFoundError`
  - `ConflictError`
  - `AuthorizationError`
  - `TransientDependencyError`
- Normalize backend/connector/API errors to typed app errors
- User-facing errors must be actionable and non-technical
- Retriable failures (429/5xx/transient network): exponential backoff with capped retries
- Log correlation ID with every failed network operation

## 8. Security and Compliance
- Use Entra-authenticated host context; no custom auth stack
- Never store secrets/tokens in source or client local storage
- Enforce least privilege on data sources and flows
- Sanitize uploaded file metadata and validate MIME/size limits
- Validate and sanitize all rich content (interactive list/flowchart payloads)

## 9. Documentation Requirements
The repository must contain:
- Architecture overview and context diagram
- Entity/data dictionary with field definitions and constraints
- API/data source integration guide
- Deployment runbook (PAC CLI commands + prerequisites)
- Operational guide for flow reminder dependencies
- ADRs for major decisions (PWA strategy, data source, flow integration pattern)

All docs must be:
- Versioned with change date and author
- Written in plain technical English
- Updated in the same PR as related implementation changes

## 10. Deployment and Environment Management (PAC CLI)

### 10.1 Prerequisites
1. Node.js LTS installed
2. PAC CLI installed (VS Code extension or .NET tool)
3. Environment with Code Apps enabled
4. Authenticated profile and selected environment

### 10.2 App Initialization
```bash
npm create vite@latest simquip -- --template react-ts
npm install
npm install --save @microsoft/power-apps
pac auth create
pac env select -env <environment-url>
pac code init --displayName "SimQuip"
```

### 10.3 Data Source Setup (example sequence)
```bash
pac code add-data-source -a dataverse -t <EquipmentTable>
pac code add-data-source -a dataverse -t <LocationTable>
pac code add-data-source -a dataverse -t <TeamTable>
pac code add-data-source -a dataverse -t <LoanTransferTable>
```

### 10.4 Local Run / Build / Deploy
```bash
npm run dev            # script must run PAC middleware (`pac code run`) and Vite dev server together
npm run build
pac code push --solutionName SimQuip
```

### 10.5 Solution and Connection Reference Handling
- Use solution-aware flows and connection references.
- For cross-environment deployment, generate and maintain deployment settings.
- Prefer Dataverse Web API for complex flow definition updates where connector update bugs are encountered.
