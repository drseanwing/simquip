# SimQuip Architecture Overview

> Version: 1.0 | Date: 2026-02-18 | Author: SimQuip Team

## 1. Purpose

SimQuip is a Progressive Web App (PWA) for managing equipment and related resources used in training, education, and simulation events at the Royal Brisbane and Women's Hospital (RBWH). It runs as a Power Apps Code App hosted within the Microsoft Power Platform.

## 2. Three-Layer Architecture

```
+-----------------------------------------------------+
|                   Browser / PWA Shell                |
|                                                      |
|  +-----------------------------------------------+  |
|  |           App Code (React + TypeScript)        |  |
|  |                                                |  |
|  |  Pages / Components / Hooks / Services         |  |
|  +----------------------+------------------------+  |
|                         |                            |
|  +----------------------v------------------------+  |
|  |          Power Apps SDK (@microsoft/power-apps)|  |
|  |                                                |  |
|  |  getContext() / Data Source Connectors          |  |
|  +----------------------+------------------------+  |
|                         |                            |
|  +----------------------v------------------------+  |
|  |            Platform Host (Power Apps)          |  |
|  |                                                |  |
|  |  Entra Auth / Dataverse / Power Automate       |  |
|  +-----------------------------------------------+  |
+-----------------------------------------------------+
```

**App Code** -- The React SPA containing all UI components, routing, state management, service-layer logic, and validation. This is the layer developers build and maintain directly.

**Power Apps SDK** -- The `@microsoft/power-apps` package provides the bridge between the app code and the hosting platform. It exposes `getContext()` for initialization and generated data-source services for connector-backed CRUD operations against Dataverse tables.

**Platform Host** -- The Power Apps runtime that hosts the Code App. It handles Entra ID authentication, connection references, environment configuration, and exposes Dataverse and Power Automate integrations.

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language | TypeScript | ~5.9 | Strict type-safe codebase |
| UI Framework | React | 19.x | Component-based SPA |
| Design System | Fluent UI v9 | 9.73+ | Power Platform-consistent UI |
| Routing | React Router | 7.x | Client-side SPA routing |
| Build Tool | Vite | 7.x | Fast dev server and production bundler |
| Testing | Vitest + Testing Library | 4.x / 16.x | Unit and component tests |
| Linting | ESLint + Prettier | 9.x / 3.x | Code quality and formatting |
| Platform SDK | @microsoft/power-apps | 1.x | Power Apps Code App integration |
| Deployment | PAC CLI | Latest | Build, push, and manage Power Apps solutions |

## 4. Project Structure

```
simquip/
├── docs/                         # Project documentation
│   ├── architecture.md           # This file
│   ├── data-dictionary.md        # Entity and field definitions
│   ├── deployment-runbook.md     # Deployment procedures
│   └── adr/                      # Architecture Decision Records
│       ├── 001-pwa-strategy.md
│       ├── 002-data-access.md
│       └── 003-ui-framework.md
├── src/
│   ├── main.tsx                  # Application entry point
│   ├── App.tsx                   # Root component with route definitions
│   ├── PowerProvider.tsx         # Power Apps SDK context provider
│   ├── powerContext.ts           # React context for IContext
│   ├── config.ts                 # Environment configuration
│   ├── registerSw.ts            # Service worker registration (PWA)
│   ├── index.css                 # Global styles
│   ├── vite-env.d.ts            # Vite type declarations
│   ├── components/               # Shared UI components
│   │   ├── AppShell.tsx          # Layout shell with tab navigation
│   │   ├── EquipmentForm.tsx     # Equipment create/edit form
│   │   ├── ErrorBoundary.tsx     # Global error boundary
│   │   └── StatusBadge.tsx       # Status indicator component
│   ├── pages/                    # Route-level page components
│   │   ├── DashboardPage.tsx
│   │   ├── EquipmentListPage.tsx
│   │   ├── EquipmentDetailPage.tsx
│   │   ├── EquipmentCreatePage.tsx
│   │   ├── EquipmentEditPage.tsx
│   │   ├── LocationsPage.tsx
│   │   ├── LocationDetailPage.tsx
│   │   ├── TeamsPage.tsx
│   │   ├── TeamCreatePage.tsx
│   │   ├── TeamDetailPage.tsx
│   │   ├── LoansPage.tsx
│   │   ├── LoanCreatePage.tsx
│   │   └── LoanDetailPage.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── usePowerContext.ts    # Access Power Apps IContext
│   │   └── usePwaInstall.ts     # PWA install prompt handling
│   ├── services/                 # Data access and business logic
│   │   ├── dataService.ts        # Generic DataService interface
│   │   ├── mockDataService.ts    # In-memory mock implementation
│   │   ├── mockData.ts           # Seed data for development
│   │   ├── equipmentService.ts   # Equipment-specific domain service
│   │   ├── validators.ts         # Entity validation functions
│   │   └── index.ts              # Barrel exports
│   ├── errors/                   # Typed error model
│   │   ├── AppError.ts           # Error class hierarchy
│   │   ├── normalizeError.ts     # Raw error normalization
│   │   └── index.ts              # Barrel exports
│   ├── types/                    # TypeScript type definitions
│   │   ├── models.ts             # Entity interfaces
│   │   ├── enums.ts              # Enum constants and types
│   │   └── index.ts              # Barrel exports
│   └── test/                     # Test infrastructure
│       └── setup.ts              # Vitest global setup
├── package.json
├── vite.config.ts
├── tsconfig.json
└── SimQuip_Application_Specification.md
```

## 5. Data Flow

```
User Interaction
       |
       v
+------------------+       +---------------------+       +-------------------+
|  UI Components   | ----> |    Domain Services   | ----> |    DataService    |
|  (Pages, Forms)  |       | (EquipmentService,   |       |    Interface      |
|                  |       |  validators)         |       |                   |
+------------------+       +---------------------+       +--------+----------+
                                                                   |
                                          +------------------------+
                                          |
                           +--------------+---------------+
                           |                              |
                    +------v-------+             +--------v---------+
                    | MockDataService|            | Power Apps SDK    |
                    | (Development)  |            | Data Sources      |
                    +---------------+             | (Production)      |
                                                  +--------+---------+
                                                           |
                                                  +--------v---------+
                                                  |    Dataverse     |
                                                  |  (Cloud Storage) |
                                                  +------------------+
```

**Step-by-step flow:**

1. **User interacts** with a page component (e.g., EquipmentListPage).
2. **Page component** calls a domain service method (e.g., `EquipmentService.getAll()`).
3. **Domain service** applies validation rules via `validators.ts`, then delegates to the generic `DataService<T>` interface.
4. **DataService implementation** resolves at runtime:
   - In development: `MockDataService` provides in-memory CRUD with simulated latency.
   - In production: Power Apps SDK generated services route requests through platform connectors.
5. **Power Apps SDK** communicates with Dataverse through the platform host's authenticated connection references.
6. **Responses** flow back up the chain, with errors normalized through `normalizeError()` into typed `AppError` subclasses.

## 6. Component Initialization

The application bootstraps through a provider chain defined in `main.tsx`:

```
StrictMode
  └── ErrorBoundary          (catches unhandled render errors)
       └── PowerProvider      (initializes Power Apps SDK context via getContext())
            └── FluentProvider (provides Fluent UI v9 theme tokens)
                 └── App       (BrowserRouter + route definitions)
                      └── AppShell (layout with TabList navigation)
                           └── <Outlet /> (lazy-loaded page components)
```

All page components are lazy-loaded using `React.lazy()` with a `Suspense` fallback spinner, reducing the initial bundle size.

## 7. Error Handling Architecture

The application uses a centralized typed error model:

| Error Class | Code | Usage |
|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | Field-level validation failures |
| `NotFoundError` | `NOT_FOUND` | Entity lookup misses |
| `ConflictError` | `CONFLICT` | Duplicate or concurrent modification |
| `AuthorizationError` | `AUTHORIZATION_ERROR` | Permission failures |
| `TransientDependencyError` | `TRANSIENT_DEPENDENCY_ERROR` | Retriable network/service errors |

All errors carry a `correlationId` (auto-generated UUID) for log tracing. The `normalizeError()` function converts raw exceptions (including HTTP status codes in error messages) into the appropriate typed error subclass.

## 8. Key Architectural Decisions

| Decision | Summary | ADR |
|---|---|---|
| PWA Strategy | Offline-capable shell with service worker for installability; web-only delivery via Power Apps Code Apps | [ADR-001](adr/001-pwa-strategy.md) |
| Data Access | Generic `DataService<T>` interface with swappable mock and Power Apps SDK implementations | [ADR-002](adr/002-data-access.md) |
| UI Framework | Fluent UI v9 for visual consistency with the Power Platform host environment | [ADR-003](adr/003-ui-framework.md) |
