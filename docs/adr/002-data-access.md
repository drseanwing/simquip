# ADR-002: Data Access Strategy

> Version: 1.0 | Date: 2026-02-18 | Author: SimQuip Team

## Status

Accepted

## Context

SimQuip needs to perform CRUD operations against Dataverse tables for all domain entities (Equipment, Teams, Locations, Loans, etc.). The application runs as a Power Apps Code App, which provides a specific SDK (`@microsoft/power-apps`) for data access through platform-managed connectors.

Key factors considered:

- **Power Apps SDK availability**: The `@microsoft/power-apps` package provides `getContext()` for initialisation and supports generated data-source services via `pac code add-data-source`. This is the platform-endorsed approach for Code Apps.
- **Development workflow**: During local development, the Power Apps SDK requires PAC middleware (`pac code run`) and an authenticated connection to a live Dataverse environment. This slows the inner development loop and makes it impossible to develop offline or without environment access.
- **Testing**: Unit and component tests need to exercise service-layer logic without depending on a live Dataverse instance or network connectivity.
- **Future flexibility**: The data access strategy should allow switching between data sources (e.g., Dataverse to a REST API) without rewriting UI components or domain services.
- **Direct API access**: For scenarios outside the Power Apps connector model (e.g., Power Automate flow metadata operations), the Dataverse Web API (`/api/data/v9.2/`) and Power Automate REST API are available but carry different support levels. The Power Automate REST API is unsupported and only used when risk-accepted.

## Decision

SimQuip uses a two-tier data access strategy built on a generic interface with swappable implementations:

### 1. Generic DataService interface

All data access is mediated through the `DataService<T>` interface (`src/services/dataService.ts`):

```typescript
interface DataService<T> {
  getAll(options?: ListOptions): Promise<PagedResult<T>>
  getById(id: string): Promise<T>
  create(item: Partial<T>): Promise<T>
  update(id: string, item: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}
```

Supporting types include `ListOptions` (filter, search, orderBy, pagination) and `PagedResult<T>` (data array, total count, hasMore flag). All queries support pagination to prevent unbounded reads.

### 2. Mock implementation for development and testing

`MockDataService<T>` (`src/services/mockDataService.ts`) provides a fully functional in-memory implementation:
- Operates on a mutable array with shallow-copy isolation.
- Simulates 100ms async latency on every operation.
- Supports search across configurable fields, simple `field eq 'value'` filtering, sorting, and pagination.
- Throws typed `NotFoundError` for missing records.
- Activated when `VITE_ENABLE_MOCK_DATA=true` is set.

Seed data is maintained in `src/services/mockData.ts`.

### 3. Power Apps SDK implementation for production

In production, the `DataService<T>` interface is backed by generated services from `pac code add-data-source`. These services route CRUD operations through the platform's authenticated Dataverse connectors. The `PowerProvider` component initialises the SDK context via `getContext()`, and the `usePowerContext` hook provides access to the context throughout the component tree.

### 4. Domain services layer

Entity-specific domain services (e.g., `EquipmentService`) wrap the generic `DataService<T>` and add:
- Validation via `validators.ts` before create/update operations.
- Related-entity resolution (e.g., fetching owner, contact, and location details alongside equipment).
- Domain-specific queries (e.g., child equipment lookup).

UI components depend only on domain services, never on raw data service implementations.

### 5. Secondary data access (outside standard connectors)

For operations not covered by Power Apps SDK connectors:
- **Dataverse Web API** (`https://{org}.{region}.dynamics.com/api/data/v9.2/`): Used for solution-aware flow and workflow metadata operations. Officially supported.
- **Power Automate REST API**: Used only when required and risk-accepted; this API is unsupported by Microsoft.

## Consequences

**Benefits:**
- UI components and domain services are fully decoupled from the data source implementation. Switching from mock to Power Apps SDK (or to any other backend) requires no changes above the service layer.
- Local development is fast and self-contained: developers can work without Power Platform credentials or network access by using mock data.
- Unit tests run against `MockDataService` with deterministic data and no external dependencies.
- The `DataService<T>` contract enforces consistent pagination, filtering, and error handling across all entities.
- Validation logic is centralised in `validators.ts` and runs identically against both mock and production implementations.

**Trade-offs:**
- The mock implementation does not replicate all Dataverse behaviours (e.g., server-side computed columns, optimistic concurrency, change tracking). Integration testing against a real Dataverse environment remains necessary.
- Maintaining seed data in `mockData.ts` adds a small ongoing effort, particularly as the schema evolves.
- The generic `DataService<T>` interface covers standard CRUD but does not address complex query patterns (joins, aggregates, batch operations). These cases are handled in domain-specific services or via direct API calls.
- The `ListOptions` filter syntax (simple `field eq 'value'`) is intentionally limited in the mock layer. The production Power Apps SDK layer supports richer OData-style filtering.
