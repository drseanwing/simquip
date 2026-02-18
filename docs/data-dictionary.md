# SimQuip Data Dictionary

> Version: 1.0 | Date: 2026-02-18 | Author: SimQuip Team

## 1. Overview

This document defines all entities, fields, constraints, and relationships in the SimQuip data model. Field types reference the TypeScript interface definitions in `src/types/models.ts`. The backing store is Microsoft Dataverse, accessed through the Power Apps SDK data-source connectors.

## 2. Entities

### 2.1 Person

Represents an individual staff member who may be a team member, equipment contact, location contact, or loan approver.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `personId` | `string` | Yes | PK | Unique identifier |
| `displayName` | `string` | Yes | Non-empty | Full display name |
| `email` | `string` | Yes | Unique; valid email format (`x@y.z`) | Email address |
| `phone` | `string` | Yes | -- | Phone number |
| `teamId` | `string \| null` | No | FK -> Team.teamId | Default team association (nullable) |
| `active` | `boolean` | Yes | -- | Whether the person record is active |

**Validation rules:**
- `displayName` is required.
- `email` is required and must match the pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`.

---

### 2.2 Team

Represents an organisational team that can own equipment, originate loans, and receive transfers.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `teamId` | `string` | Yes | PK | Unique identifier |
| `teamCode` | `string` | Yes | Unique; non-empty | Short code for the team |
| `name` | `string` | Yes | Non-empty | Team display name |
| `mainContactPersonId` | `string` | Yes | FK -> Person.personId; must be a member of this team | Primary contact person |
| `mainLocationId` | `string` | Yes | FK -> Location.locationId; must be one of the team's locations | Primary location |
| `active` | `boolean` | Yes | -- | Whether the team record is active |

**Validation rules:**
- `name` is required.
- `teamCode` is required.
- `mainContactPersonId` must reference a Person who is an active TeamMember of this team.
- `mainLocationId` must reference a Location assigned to this team.

---

### 2.3 TeamMember

Join entity linking a Person to a Team with a role.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `teamMemberId` | `string` | Yes | PK | Unique identifier |
| `teamId` | `string` | Yes | FK -> Team.teamId | Parent team |
| `personId` | `string` | Yes | FK -> Person.personId | Member person |
| `role` | `string` | Yes | -- | Role within the team (free text) |

**Constraints:**
- Unique constraint on (`teamId`, `personId`) -- a person can hold only one role per team.

---

### 2.4 Building

Top level of the location hierarchy.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `buildingId` | `string` | Yes | PK | Unique identifier |
| `name` | `string` | Yes | Non-empty | Building name |
| `code` | `string` | Yes | Unique | Short building code |

---

### 2.5 Level

A floor or level within a Building.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `levelId` | `string` | Yes | PK | Unique identifier |
| `buildingId` | `string` | Yes | FK -> Building.buildingId | Parent building |
| `name` | `string` | Yes | Non-empty | Level name (e.g., "Ground Floor", "Level 3") |
| `sortOrder` | `number` | Yes | -- | Display ordering within the building |

**Constraints:**
- Unique constraint on (`buildingId`, `name`) -- no duplicate level names within a building.

---

### 2.6 Location

A specific room, area, or storage point within a Building and Level.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `locationId` | `string` | Yes | PK | Unique identifier |
| `buildingId` | `string` | Yes | FK -> Building.buildingId | Parent building |
| `levelId` | `string` | Yes | FK -> Level.levelId | Parent level |
| `name` | `string` | Yes | Non-empty | Location name |
| `contactPersonId` | `string` | Yes | FK -> Person.personId | Primary contact for this location |
| `description` | `string` | Yes | -- | Free-text description |

**Constraints:**
- Unique constraint on (`buildingId`, `levelId`, `name`) -- no duplicate location names within the same building and level.

**Validation rules:**
- `name`, `buildingId`, and `levelId` are required.

---

### 2.7 Equipment

A piece of equipment tracked by the system. Supports nesting (container/contents relationships).

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `equipmentId` | `string` | Yes | PK | Unique identifier |
| `equipmentCode` | `string` | Yes | Unique; non-empty | Short unique code |
| `name` | `string` | Yes | Non-empty | Equipment display name |
| `description` | `string` | Yes | -- | Free-text description |
| `ownerType` | `OwnerType` | Yes | Enum: `Team`, `Person` | Whether the owner is a team or individual |
| `ownerTeamId` | `string \| null` | Conditional | FK -> Team.teamId; required when `ownerType` = `Team`, must be null otherwise | Owning team |
| `ownerPersonId` | `string \| null` | Conditional | FK -> Person.personId; required when `ownerType` = `Person`, must be null otherwise | Owning person |
| `contactPersonId` | `string` | Yes | FK -> Person.personId | Nominated contact person |
| `homeLocationId` | `string` | Yes | FK -> Location.locationId | Default home location |
| `parentEquipmentId` | `string \| null` | No | FK -> Equipment.equipmentId (self-referencing); cannot create cycles; max nesting depth 10 | Parent container equipment |
| `quickStartFlowChartJson` | `string` | Yes | Valid JSON | Interactive quick-start flowchart data |
| `contentsListJson` | `string` | Yes | Valid JSON | Interactive contents list data |
| `status` | `EquipmentStatus` | Yes | Enum: `Available`, `InUse`, `UnderMaintenance`, `Retired` | Current lifecycle status |
| `active` | `boolean` | Yes | -- | Whether the equipment record is active |

**Validation rules:**
- `name`, `equipmentCode`, `ownerType`, and `status` are required.
- `equipmentCode` must be a non-empty string.
- Exactly one owner FK is set based on `ownerType` (the other must be null).
- `parentEquipmentId` cannot reference the same `equipmentId` (no self-reference).
- `parentEquipmentId` ancestry chain must not create cycles (validated recursively before save).
- Nesting depth must not exceed 10 levels.

---

### 2.8 EquipmentMedia

Attachments and images associated with an Equipment record.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `equipmentMediaId` | `string` | Yes | PK | Unique identifier |
| `equipmentId` | `string` | Yes | FK -> Equipment.equipmentId | Parent equipment |
| `mediaType` | `MediaType` | Yes | Enum: `Image`, `Attachment` | Type of media |
| `fileName` | `string` | Yes | Non-empty | Original file name |
| `mimeType` | `string` | Yes | Non-empty | MIME type (e.g., `image/png`, `application/pdf`) |
| `fileUrl` | `string` | Yes | Non-empty | URL or blob reference to the file |
| `sortOrder` | `number` | Yes | -- | Display ordering |

---

### 2.9 LocationMedia

Attachments and images associated with a Location record.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `locationMediaId` | `string` | Yes | PK | Unique identifier |
| `locationId` | `string` | Yes | FK -> Location.locationId | Parent location |
| `mediaType` | `MediaType` | Yes | Enum: `Image`, `Attachment` | Type of media |
| `fileName` | `string` | Yes | Non-empty | Original file name |
| `mimeType` | `string` | Yes | Non-empty | MIME type |
| `fileUrl` | `string` | Yes | Non-empty | URL or blob reference to the file |
| `sortOrder` | `number` | Yes | -- | Display ordering |

---

### 2.10 LoanTransfer

Tracks loans and transfers of equipment between teams.

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `loanTransferId` | `string` | Yes | PK | Unique identifier |
| `equipmentId` | `string` | Yes | FK -> Equipment.equipmentId | Equipment being loaned/transferred |
| `startDate` | `string` | Yes | ISO 8601 date | Loan start date |
| `dueDate` | `string` | Yes | ISO 8601 date; must be >= `startDate` | Expected return date |
| `originTeamId` | `string` | Yes | FK -> Team.teamId | Team lending the equipment |
| `recipientTeamId` | `string` | Yes | FK -> Team.teamId | Team receiving the equipment |
| `reasonCode` | `LoanReason` | Yes | Enum: `Simulation`, `Training`, `Service`, `Other` | Categorical reason for the loan |
| `approverPersonId` | `string` | Yes | FK -> Person.personId; must belong to recipient team | Person approving the loan |
| `isInternalTransfer` | `boolean` | Yes | Default: `false` | Whether this is a same-team logistical move |
| `status` | `LoanStatus` | Yes | Enum: `Draft`, `Active`, `Overdue`, `Returned`, `Cancelled` | Current loan status |
| `notes` | `string` | Yes | -- | Free-text notes |

**Validation rules:**
- `equipmentId`, `startDate`, `dueDate`, `originTeamId`, `recipientTeamId`, `reasonCode`, `approverPersonId`, and `status` are all required.
- `dueDate` must be greater than or equal to `startDate`.
- `approverPersonId` must belong to the recipient team.
- If `isInternalTransfer` is `true`, then `originTeamId` must equal `recipientTeamId`.
- If `originTeamId` equals `recipientTeamId`, then `isInternalTransfer` must be `true`.

**Origin defaulting rules (UI logic):**
- If equipment owner is a Team: default `originTeamId` to that team.
- If equipment owner is a Person with exactly one active team membership: default `originTeamId` to that team.
- If equipment owner is a Person with zero or multiple active team memberships: require manual origin selection.

## 3. Enum Definitions

All enums are defined as `const` objects in `src/types/enums.ts`, producing both runtime values and TypeScript types.

### 3.1 OwnerType

Specifies whether equipment is owned by a team or an individual person.

| Value | Description |
|---|---|
| `Team` | Equipment is owned by a team |
| `Person` | Equipment is owned by an individual |

### 3.2 EquipmentStatus

Lifecycle status of a piece of equipment.

| Value | Description |
|---|---|
| `Available` | Ready for use or loan |
| `InUse` | Currently in active use |
| `UnderMaintenance` | Undergoing maintenance or repair |
| `Retired` | No longer in service |

### 3.3 LoanStatus

Status of a loan/transfer record.

| Value | Description |
|---|---|
| `Draft` | Loan created but not yet active |
| `Active` | Loan is currently in progress |
| `Overdue` | Loan has passed its due date without return |
| `Returned` | Equipment has been returned |
| `Cancelled` | Loan was cancelled before completion |

### 3.4 LoanReason

Categorical reason for a loan or transfer.

| Value | Description |
|---|---|
| `Simulation` | Equipment needed for a simulation event |
| `Training` | Equipment needed for training purposes |
| `Service` | Equipment needed for servicing or maintenance |
| `Other` | Other reason (details in notes field) |

### 3.5 MediaType

Type of media file attached to an entity.

| Value | Description |
|---|---|
| `Image` | Image file (photo, diagram, etc.) |
| `Attachment` | Non-image file (PDF, document, etc.) |

## 4. Relationship Diagram

```
Person ──────────────────────────────────────────────────────────────────┐
  │ personId (PK)                                                       │
  │                                                                     │
  ├──< TeamMember >──┤                                                  │
  │    teamMemberId (PK)                                                │
  │    personId (FK) ───> Person                                        │
  │    teamId (FK) ─────> Team                                          │
  │                                                                     │
  │                                                                     │
Team ────────────────────────────────────────────────────────────────┐  │
  │ teamId (PK)                                                      │  │
  │ mainContactPersonId (FK) ───> Person                             │  │
  │ mainLocationId (FK) ────────> Location                           │  │
  │                                                                  │  │
  │                                                                  │  │
Building ──< Level ──< Location                                     │  │
  │            │         │ locationId (PK)                           │  │
  │            │         │ buildingId (FK) ───> Building             │  │
  │            │         │ levelId (FK) ─────> Level                 │  │
  │            │         │ contactPersonId (FK) ───> Person          │  │
  │            │         │                                           │  │
  │            │         ├──< LocationMedia                          │  │
  │            │         │    locationId (FK) ───> Location          │  │
  │            │                                                     │  │
  │            │                                                     │  │
Equipment ───────────────────────────────────────────────────────┐  │  │
  │ equipmentId (PK)                                             │  │  │
  │ ownerTeamId (FK, nullable) ────> Team ───────────────────────┘  │  │
  │ ownerPersonId (FK, nullable) ──> Person ────────────────────────┘  │
  │ contactPersonId (FK) ──────────> Person ───────────────────────────┘
  │ homeLocationId (FK) ───────────> Location
  │ parentEquipmentId (FK, nullable, self-ref) ───> Equipment
  │
  ├──< EquipmentMedia
  │    equipmentId (FK) ───> Equipment
  │
  └──< LoanTransfer
       equipmentId (FK) ────────> Equipment
       originTeamId (FK) ───────> Team
       recipientTeamId (FK) ────> Team
       approverPersonId (FK) ──> Person
```

### Relationship Summary

| From | To | Cardinality | FK Field | Notes |
|---|---|---|---|---|
| TeamMember | Team | Many-to-One | `teamId` | Unique on (`teamId`, `personId`) |
| TeamMember | Person | Many-to-One | `personId` | |
| Team | Person | Many-to-One | `mainContactPersonId` | Must be a member |
| Team | Location | Many-to-One | `mainLocationId` | Must be a team location |
| Level | Building | Many-to-One | `buildingId` | |
| Location | Building | Many-to-One | `buildingId` | |
| Location | Level | Many-to-One | `levelId` | |
| Location | Person | Many-to-One | `contactPersonId` | |
| Equipment | Team | Many-to-One | `ownerTeamId` | Nullable; conditional on `ownerType` |
| Equipment | Person | Many-to-One | `ownerPersonId` | Nullable; conditional on `ownerType` |
| Equipment | Person | Many-to-One | `contactPersonId` | |
| Equipment | Location | Many-to-One | `homeLocationId` | |
| Equipment | Equipment | Many-to-One | `parentEquipmentId` | Self-referencing; max depth 10 |
| EquipmentMedia | Equipment | Many-to-One | `equipmentId` | |
| LocationMedia | Location | Many-to-One | `locationId` | |
| LoanTransfer | Equipment | Many-to-One | `equipmentId` | |
| LoanTransfer | Team | Many-to-One | `originTeamId` | |
| LoanTransfer | Team | Many-to-One | `recipientTeamId` | |
| LoanTransfer | Person | Many-to-One | `approverPersonId` | Must belong to recipient team |
