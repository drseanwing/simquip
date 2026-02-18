# SimQuip x LearnTracker Integration Plan

> **Clinical Education Equipment & Impact Integration**
> Generated: 2026-02-18 | Status: Proposed | Branch: main

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Application Profiles](#2-current-application-profiles)
3. [Data Schema Analysis](#3-data-schema-analysis)
4. [Integration Opportunities](#4-integration-opportunities)
5. [Integration Architecture](#5-integration-architecture)
6. [Prioritised Implementation Roadmap](#6-prioritised-implementation-roadmap)
7. [Granular Task List](#7-granular-task-list)
8. [Schema Reference: SimQuip](#8-schema-reference-simquip)
9. [Schema Reference: LearnTracker](#9-schema-reference-learntracker)
10. [Technical Reference](#10-technical-reference)

---

## 1. Executive Summary

**SimQuip** (Simulation Equipment Manager) and **LearnTracker** (Clinical Education Impact Register) are standalone PowerApps Code Apps built on Microsoft Dataverse. Both share the `redi_` publisher prefix and operate within the same clinical simulation education domain.

SimQuip manages the lifecycle of simulation equipment — inventory, ownership, location, media, and inter-team loans. LearnTracker captures the planning, delivery, and impact evaluation of clinical education interventions — events, sessions, attendance, feedback, issues, and corrective actions.

**The integration opportunity is significant:** education events require equipment; equipment loans exist to serve education activities. Currently these systems are disconnected, meaning educators manually coordinate equipment needs and asset managers have no visibility into upcoming demand. Connecting them creates a closed loop from education planning through equipment allocation to impact measurement.

### Key Integration Surfaces

| # | Integration Surface | SimQuip Entity | LearnTracker Entity | Value |
|---|---------------------|---------------|---------------------|-------|
| 1 | **Shared Person Registry** | `redi_person` | `redi_person` | Single source of truth for all people across both apps |
| 2 | **Equipment ↔ Intervention Linkage** | `redi_equipment` | `redi_interventionequipment` | Replace free-text equipment names with actual inventory lookups |
| 3 | **Loan ↔ Intervention Automation** | `redi_loantransfer` | `redi_intervention` / `redi_event` | Auto-create loan requests when education events require equipment |
| 4 | **Location Standardisation** | `redi_location` (structured) | `redi_session.redi_location` (text) | Replace free-text session locations with SimQuip's location hierarchy |
| 5 | **Equipment Issue Feedback Loop** | `redi_equipment` status | `redi_issue` (Equipment category) | Surface equipment issues from sessions back to asset management |
| 6 | **Demand Forecasting** | Equipment availability | Intervention planning dates | Predict equipment demand from upcoming education schedules |

---

## 2. Current Application Profiles

### SimQuip — Simulation Equipment Manager

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Equipment/asset inventory, location tracking, ownership, media management, inter-team loans |
| **Platform** | PowerApps Code App (TypeScript/React on Dataverse) |
| **Dataverse Tables** | 10 tables |
| **Publisher Prefix** | `redi_` |
| **Key Entities** | Person, Team, TeamMember, Building, Level, Location, Equipment, EquipmentMedia, LocationMedia, LoanTransfer |
| **Data Service** | Generic `DataverseDataService<T>` with OData, column adapters, choice mappers |
| **Source Repo** | `simquip` (this repo) |

### LearnTracker — Clinical Education Impact Register

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Education intervention planning, event/session management, attendance tracking, feedback collection, issue/corrective action tracking, Kirkpatrick evaluation |
| **Platform** | PowerApps Code App (TypeScript/React on Dataverse) |
| **Dataverse Tables** | 17 tables |
| **Publisher Prefix** | `redi_` |
| **Key Entities** | Person, Tag, Intervention, Event, Session, SessionAttendance, Feedback, Issue, CorrectiveAction, InterventionStakeholder, InterventionEquipment, InterventionBarrier, InterventionTag, Evaluation, ChangeImplemented, AppLog, FlowLog |
| **Data Service** | Entity-specific Dataverse services (per-table service classes) |
| **Source Repo** | `drseanwing/learntracker` |

---

## 3. Data Schema Analysis

### 3.1 Shared Entities

#### `redi_person` — IDENTICAL SCHEMA, SHARED TABLE

Both apps use the **same Dataverse table** with identical column definitions:

| Column | Schema Name | Type | SimQuip | LearnTracker |
|--------|-------------|------|---------|-------------|
| Display Name | `redi_displayname` | String(200) | Yes | Yes |
| Email | `redi_email` | String(100) / Email | Yes | Yes |
| Phone | `redi_phone` | String | Yes (mapped) | No |
| Role | `redi_role` | Picklist | Yes | Yes |
| Department | `redi_department` | String(200) | Yes (in schema) | Yes |
| Facility | `redi_facility` | String(200) | Yes (in schema) | Yes |
| Is Internal | `redi_isinternal` | Boolean | No | Yes |
| Active | `redi_active` | Boolean | Yes | No |

**Analysis:** The Person table is already shared at the Dataverse level since both apps use the same publisher prefix and table name. SimQuip adds `redi_phone` and `redi_active`; LearnTracker adds `redi_isinternal`. The `redi_role` picklist values are identical across both apps (Consultant through Other, 12 values). This is the **zero-cost integration** — both apps already read/write the same Person records.

**Role Picklist Values (shared):**
- Consultant (100000000), Registrar (100000001), RMO (100000002), Nurse (RN) (100000003), Nurse (EN) (100000004), NUM (100000005), CNE (100000006), CNS (100000007), CNC (100000008), Allied Health (100000009), Student (100000010), Other (100000011)

### 3.2 Near-Match Entities

#### Equipment Tracking

| Aspect | SimQuip `redi_equipment` | LearnTracker `redi_interventionequipment` |
|--------|-------------------------|------------------------------------------|
| **Purpose** | Full equipment inventory with status, ownership, location, media | Equipment requirements per education intervention |
| **Key Difference** | Tracks actual physical items | Tracks what equipment is needed (free-text name, category, quantity, source) |
| **Link** | `redi_equipmentid` (PK) | `redi_equipmentname` (text field — no FK to equipment table) |

**Integration Opportunity:** Add a lookup field `redi_equipmentid` on `redi_interventionequipment` to link education equipment requirements to actual SimQuip inventory items.

#### Location Tracking

| Aspect | SimQuip | LearnTracker |
|--------|---------|-------------|
| **Structure** | Hierarchical: Building → Level → Location | Flat text field on Session |
| **Fields** | `redi_building`, `redi_level`, `redi_location` (3 tables) | `redi_session.redi_location` (String 200) |
| **Detail** | Contact person, description, media gallery | Just a venue name string |

**Integration Opportunity:** Add a lookup field `redi_locationid` on `redi_session` to reference SimQuip's structured location hierarchy. Retain the text field as a display/fallback.

### 3.3 Complementary Entities (No Overlap)

| SimQuip Only | LearnTracker Only |
|-------------|-------------------|
| Team, TeamMember | Intervention, Event, Session |
| Building, Level | SessionAttendance, Feedback |
| EquipmentMedia, LocationMedia | Issue, CorrectiveAction |
| LoanTransfer | InterventionStakeholder, InterventionBarrier |
| | InterventionTag, Tag |
| | Evaluation, ChangeImplemented |
| | AppLog, FlowLog |

---

## 4. Integration Opportunities

### Priority 1: HIGH VALUE, LOW EFFORT

#### INT-01: Shared Person Registry (Already Integrated)

**Status:** Already exists at Dataverse level — both apps read/write `redi_person`.

**Remaining Work:**
- Reconcile column differences: SimQuip should recognise `redi_isinternal`; LearnTracker should recognise `redi_phone` and `redi_active`
- Ensure both apps' TypeScript interfaces include all columns from both apps
- Coordinate picklist changes: any role value additions must be reflected in both apps' enum definitions

**Effort:** ~2 hours | **Value:** Foundation for all other integrations

---

#### INT-02: Equipment Inventory Linkage

**Current State:** LearnTracker's `redi_interventionequipment` stores equipment as free-text names with a category picklist. There is no link to SimQuip's actual equipment inventory.

**Target State:** Add an optional lookup `redi_equipmentid` on `redi_interventionequipment` pointing to `redi_equipment`. When populated, the intervention can pull the equipment's name, code, status, key image, and home location from SimQuip's inventory.

**Schema Change:**
```
Table: redi_interventionequipment
New Column: redi_equipmentid (Lookup → redi_equipment, Optional)
New Relationship: redi_equipment_interventionequipment_equipmentid (1:N)
Cascade Behaviour: RemoveLink on Delete
```

**Benefits:**
- Educators see real-time equipment availability when planning interventions
- Asset managers see which education activities use their equipment
- Equipment utilisation reporting across both systems
- Equipment media (images, documents) accessible from education planning context

**Effort:** ~8 hours | **Value:** High — eliminates manual equipment coordination

---

#### INT-03: Session Location Lookup

**Current State:** `redi_session.redi_location` is a free-text string (e.g., "Sim Centre Room 3").

**Target State:** Add an optional lookup `redi_locationid` on `redi_session` pointing to `redi_location`. The text field is retained for display/backward compatibility.

**Schema Change:**
```
Table: redi_session
New Column: redi_locationid (Lookup → redi_location, Optional)
New Relationship: redi_location_session_locationid (1:N)
Cascade Behaviour: RemoveLink on Delete
```

**Benefits:**
- Standardised venue tracking across education and equipment systems
- Session location inherits building/level hierarchy for reporting
- Location contact person available for coordination
- Location media (floorplans, photos) accessible from session context

**Effort:** ~6 hours | **Value:** Medium-High — better space utilisation visibility

---

### Priority 2: HIGH VALUE, MODERATE EFFORT

#### INT-04: Automated Loan Requests from Education Planning

**Current State:** When an educator plans an intervention requiring equipment from another team, they manually request a loan through SimQuip (or informally via email/phone). SimQuip's `redi_loantransfer` tracks loans with reason codes including "Simulation" and "Training".

**Target State:** When a LearnTracker intervention moves from "Draft" to "Planning" status and has `redi_interventionequipment` records linked to SimQuip equipment, the system auto-creates draft `redi_loantransfer` records in SimQuip for any equipment not owned by the requesting team.

**Integration Mechanism:** Power Automate flow triggered on `redi_intervention.redi_status` change.

**Flow Logic:**
1. Trigger: `redi_intervention.redi_status` changes to "Planning" (100000001)
2. List all `redi_interventionequipment` where `redi_equipmentid` is populated
3. For each equipment item, check `redi_equipment.redi_ownerteamid`
4. If owner team ≠ requesting team → create `redi_loantransfer` record:
   - `redi_equipmentid` → equipment item
   - `redi_originteamid` → equipment owner team
   - `redi_recipientteamid` → intervention owner's team
   - `redi_startdate` → `redi_intervention.redi_plannedstartdate`
   - `redi_duedate` → `redi_intervention.redi_plannedenddate`
   - `redi_reasoncode` → "Simulation" (100000000) or "Training" (100000001) based on intervention type
   - `redi_loanstatus` → "Draft" (100000000)
   - `redi_notes` → Link to intervention record

**Schema Change:**
```
Table: redi_loantransfer
New Column: redi_interventionid (Lookup → redi_intervention, Optional)
New Relationship: redi_intervention_loantransfer_interventionid (1:N)
Cascade Behaviour: RemoveLink on Delete
```

**Benefits:**
- Eliminates manual loan coordination for education events
- Equipment managers see upcoming demand with lead time
- Loan lifecycle tied to education intervention lifecycle
- Audit trail connecting equipment movement to education purpose

**Effort:** ~16 hours | **Value:** Very High — major workflow automation

---

#### INT-05: Equipment Issue Feedback Loop

**Current State:** LearnTracker captures issues identified during sessions. Issues have a "Category" picklist with an "Equipment" value (100000000). These issues are tracked through to corrective actions. SimQuip tracks equipment status but has no knowledge of issues identified during education use.

**Target State:** When a LearnTracker issue is created with category "Equipment" and the session's intervention has linked equipment records, the system:
1. Surfaces the issue against the specific equipment item in SimQuip
2. Optionally updates the equipment status to "UnderMaintenance" for critical severity issues

**Integration Mechanism:** Power Automate flow triggered on `redi_issue` creation.

**Schema Change:**
```
Table: redi_issue
New Column: redi_equipmentid (Lookup → redi_equipment, Optional)
New Relationship: redi_equipment_issue_equipmentid (1:N)
Cascade Behaviour: RemoveLink on Delete
```

**Benefits:**
- Equipment issues from education sessions feed back to asset management
- Equipment managers see issues without needing LearnTracker access
- Critical equipment issues can trigger automatic status changes
- Complete issue history per equipment item across both systems

**Effort:** ~12 hours | **Value:** High — closes the feedback loop

---

### Priority 3: MEDIUM VALUE, MODERATE EFFORT

#### INT-06: Team-Based Stakeholder Mapping

**Current State:** SimQuip manages teams and team membership. LearnTracker tracks intervention stakeholders as individual people with engagement types. There is no concept of a "team" requesting or endorsing an education intervention.

**Target State:** Add an optional lookup `redi_teamid` on `redi_intervention` to associate an intervention with a SimQuip team (the requesting/owning team). This enables:
- Team-level reporting on education activity
- Automatic stakeholder population from team membership
- Team-based equipment ownership checks for loan automation (INT-04)

**Schema Change:**
```
Table: redi_intervention
New Column: redi_teamid (Lookup → redi_team, Optional)
New Relationship: redi_team_intervention_teamid (1:N)
Cascade Behaviour: RemoveLink on Delete
```

**Effort:** ~8 hours | **Value:** Medium — better organisational context

---

#### INT-07: Equipment Availability Barrier Auto-Detection

**Current State:** LearnTracker captures barriers to education interventions, including "Equipment availability" (100000002) as a barrier type. This is manually recorded. SimQuip tracks real-time equipment status.

**Target State:** When an intervention's linked equipment items have status "InUse" or "UnderMaintenance" during the planned intervention dates, automatically create an `redi_interventionbarrier` record with type "Equipment availability" and impact assessment.

**Integration Mechanism:** Power Automate scheduled flow or trigger on intervention date changes.

**Effort:** ~10 hours | **Value:** Medium — proactive barrier identification

---

#### INT-08: Unified Dashboard / Reporting View

**Current State:** Each app has its own UI with no cross-app visibility.

**Target State:** Create a shared Power BI dashboard or embedded report that shows:
- Equipment utilisation overlaid with education calendar
- Session locations mapped to SimQuip's location hierarchy
- Equipment issue trends from education sessions
- Loan demand forecasting from planned interventions
- Team-level education activity vs equipment portfolio

**Effort:** ~20 hours | **Value:** Medium-High — executive visibility

---

### Priority 4: FUTURE CONSIDERATION

#### INT-09: Bi-directional Equipment Status Sync

When a loan transfer in SimQuip is marked "Active", update the linked intervention equipment's source to "Borrowed". When returned, update back.

**Effort:** ~6 hours | **Value:** Low-Medium — nice-to-have status sync

---

#### INT-10: Education-Triggered Equipment Procurement

When LearnTracker identifies equipment needs (via `redi_interventionequipment`) that don't exist in SimQuip's inventory (no `redi_equipmentid` match), surface these as procurement suggestions in SimQuip.

**Effort:** ~8 hours | **Value:** Low-Medium — procurement workflow enhancement

---

#### INT-11: Session Resource Pack Auto-Assembly

When a session is scheduled, automatically compile relevant equipment documentation (flowcharts, contents checklists, quick-start guides) from SimQuip's equipment records into a resource pack accessible from the session record.

**Effort:** ~12 hours | **Value:** Medium — educator preparation support

---

## 5. Integration Architecture

### 5.1 Shared Dataverse Environment

Both applications MUST deploy to the **same Dataverse environment** for table-level integration to work. Since both use the `redi_` publisher prefix, they share a common solution publisher.

```
┌─────────────────────────────────────────────────────┐
│                 Dataverse Environment                │
│                                                     │
│  ┌──────────────┐         ┌───────────────────┐     │
│  │   SimQuip     │         │   LearnTracker    │     │
│  │   Solution    │         │     Solution      │     │
│  │              │         │                   │     │
│  │ Equipment    │◄────────│ IntervEquipment   │     │
│  │ Location     │◄────────│ Session           │     │
│  │ LoanTransfer │◄────────│ Intervention      │     │
│  │ Team         │◄────────│ Intervention      │     │
│  │ Person ──────┼─shared──┼── Person          │     │
│  └──────────────┘         └───────────────────┘     │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         Integration Layer                     │   │
│  │  Power Automate Flows (INT-04, INT-05, INT-07)│   │
│  │  Shared Views / Dashboards (INT-08)           │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 5.2 Integration Pattern

**Primary Pattern:** Dataverse Lookup Relationships (schema-level integration)
- New lookup columns on LearnTracker tables referencing SimQuip tables
- No API middleware required — Dataverse handles referential integrity
- Both apps' OData queries can expand across the relationship

**Secondary Pattern:** Power Automate Flows (event-driven automation)
- Triggered by Dataverse record changes (status transitions, record creation)
- Orchestrates cross-entity business logic
- Logs activity to `redi_flowlog` for audit

### 5.3 Solution Packaging

**Option A (Recommended):** Single Solution
- Merge both apps into a single Dataverse solution
- All tables, relationships, and flows in one deployable unit
- Simplest ALM; version and deploy together

**Option B:** Separate Solutions with Shared Layer
- Keep SimQuip and LearnTracker as separate solutions
- Create a third "Integration" solution containing:
  - Cross-app relationship definitions
  - Power Automate flows
  - Shared views and dashboards
- More complex ALM but allows independent app versioning

---

## 6. Prioritised Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
| ID | Integration | Effort | Dependencies |
|----|------------|--------|-------------|
| INT-01 | Shared Person Registry reconciliation | 2h | None |
| INT-02 | Equipment Inventory Linkage | 8h | INT-01 |
| INT-03 | Session Location Lookup | 6h | INT-01 |

**Milestone:** Both apps can reference shared Person, Equipment, and Location records.

### Phase 2: Workflow Automation (Week 3-4)
| ID | Integration | Effort | Dependencies |
|----|------------|--------|-------------|
| INT-04 | Loan Request Automation | 16h | INT-02, INT-06 |
| INT-05 | Equipment Issue Feedback Loop | 12h | INT-02 |
| INT-06 | Team-Based Stakeholder Mapping | 8h | INT-01 |

**Milestone:** Equipment loans auto-created from education planning; equipment issues flow back to asset management.

### Phase 3: Intelligence (Week 5-6)
| ID | Integration | Effort | Dependencies |
|----|------------|--------|-------------|
| INT-07 | Equipment Availability Barrier Detection | 10h | INT-02 |
| INT-08 | Unified Dashboard | 20h | INT-01 through INT-06 |

**Milestone:** Proactive barrier identification; cross-system executive reporting.

### Phase 4: Enhancement (Week 7+)
| ID | Integration | Effort | Dependencies |
|----|------------|--------|-------------|
| INT-09 | Bi-directional Status Sync | 6h | INT-04 |
| INT-10 | Equipment Procurement Suggestions | 8h | INT-02 |
| INT-11 | Session Resource Pack Assembly | 12h | INT-02 |

**Milestone:** Full lifecycle integration with procurement and resource automation.

**Total Estimated Effort:** ~108 hours across all phases.

---

## 7. Granular Task List

### Phase 1: Foundation

#### INT-01: Shared Person Registry

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.1.1 | Audit Person column differences | Analysis | Compare `redi_person` columns used by each app; document `redi_phone`, `redi_active` (SimQuip-only) and `redi_isinternal` (LearnTracker-only) |
| 1.1.2 | Update SimQuip `Person` TypeScript interface | Code | Add `isInternal: boolean` to `src/types/models.ts` |
| 1.1.3 | Update SimQuip `personColumnAdapter` | Code | Add `isInternal` → `redi_isinternal` mapping in `src/services/dataverseAdapters.ts` |
| 1.1.4 | Update LearnTracker `Person` TypeScript interface | Code | Add `phone: string`, `active: boolean` to `src/types/person.types.ts` |
| 1.1.5 | Update LearnTracker `personService` adapter | Code | Add phone/active column mappings in `src/services/dataverse/personService.ts` |
| 1.1.6 | Synchronise `redi_role` picklist definitions | Config | Verify both apps' enum definitions match; update `choiceOptions.ts` / `enums.ts` if needed |
| 1.1.7 | Test shared Person CRUD from both apps | Test | Create/update person in SimQuip, verify visible in LearnTracker and vice versa |

#### INT-02: Equipment Inventory Linkage

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.2.1 | Add `redi_equipmentid` lookup column to `redi_interventionequipment` | Schema | Dataverse table customisation: add optional lookup to `redi_equipment`, cascade RemoveLink |
| 1.2.2 | Define relationship `redi_equipment_interventionequipment_equipmentid` | Schema | 1:N relationship from Equipment to InterventionEquipment |
| 1.2.3 | Update LearnTracker `InterventionEquipment` TypeScript interface | Code | Add `equipmentId: string \| null` field |
| 1.2.4 | Update LearnTracker `equipmentService` adapter | Code | Add `equipmentId` → `_redi_equipmentid_value` lookup mapping |
| 1.2.5 | Add equipment picker component to LearnTracker UI | Code | Searchable dropdown that queries `redi_equipment` (OData) with name, code, status display |
| 1.2.6 | Display equipment details panel when linked | Code | Show key image, status, home location, equipment code from linked SimQuip record |
| 1.2.7 | Add `redi_interventionequipment` navigation to SimQuip equipment detail | Code | Show "Education Usage" section listing interventions where this equipment is referenced |
| 1.2.8 | Update SimQuip `Equipment` interface for reverse navigation | Code | Add optional `interventionEquipment` collection property |
| 1.2.9 | Test equipment linkage end-to-end | Test | Link equipment in LearnTracker, verify bidirectional visibility |

#### INT-03: Session Location Lookup

| # | Task | Type | Detail |
|---|------|------|--------|
| 1.3.1 | Add `redi_locationid` lookup column to `redi_session` | Schema | Optional lookup to `redi_location`, cascade RemoveLink |
| 1.3.2 | Define relationship `redi_location_session_locationid` | Schema | 1:N relationship from Location to Session |
| 1.3.3 | Update LearnTracker `Session` TypeScript interface | Code | Add `locationId: string \| null` field |
| 1.3.4 | Update LearnTracker `sessionService` adapter | Code | Add `locationId` → `_redi_locationid_value` mapping |
| 1.3.5 | Add location picker to LearnTracker session form | Code | Hierarchical picker: Building → Level → Location, with fallback to free-text |
| 1.3.6 | Display location details when linked | Code | Show building, level, contact person, location media from SimQuip |
| 1.3.7 | Add "Upcoming Sessions" view to SimQuip location detail | Code | Query `redi_session` records referencing this location |
| 1.3.8 | Test location linkage end-to-end | Test | Set session location via picker, verify in both apps |

### Phase 2: Workflow Automation

#### INT-04: Automated Loan Requests

| # | Task | Type | Detail |
|---|------|------|--------|
| 2.1.1 | Add `redi_interventionid` lookup column to `redi_loantransfer` | Schema | Optional lookup to `redi_intervention`, cascade RemoveLink |
| 2.1.2 | Define relationship `redi_intervention_loantransfer_interventionid` | Schema | 1:N relationship from Intervention to LoanTransfer |
| 2.1.3 | Update SimQuip `LoanTransfer` TypeScript interface | Code | Add `interventionId: string \| null` field |
| 2.1.4 | Update SimQuip `loanTransferColumnAdapter` | Code | Add `interventionId` → `_redi_interventionid_value` mapping |
| 2.1.5 | Map intervention type → loan reason code | Config | Simulation→Simulation(100000000), In-Service→Training(100000001), Workshop→Training, Skills Station→Simulation, Orientation→Training, Other→Other(100000003) |
| 2.1.6 | Create Power Automate flow: "Auto-Create Loan Drafts" | Flow | Trigger: `redi_intervention.redi_status` updated to Planning (100000001) |
| 2.1.7 | Flow step: List intervention equipment with `redi_equipmentid` populated | Flow | OData filter: `_redi_interventionid_value eq {interventionId} and _redi_equipmentid_value ne null` |
| 2.1.8 | Flow step: For each equipment, get owner team | Flow | Expand `redi_equipment` to get `_redi_ownerteamid_value` |
| 2.1.9 | Flow step: Compare owner team vs intervention team | Flow | Skip if same team (no loan needed) |
| 2.1.10 | Flow step: Create `redi_loantransfer` draft record | Flow | Populate all fields per INT-04 specification |
| 2.1.11 | Flow step: Log to `redi_flowlog` | Flow | Record flow execution for audit |
| 2.1.12 | Add "Related Loans" section to LearnTracker intervention detail | Code | Show loan status for linked equipment |
| 2.1.13 | Add "Education Source" badge to SimQuip loan detail | Code | Show intervention name/link when `redi_interventionid` is populated |
| 2.1.14 | Test loan automation end-to-end | Test | Create intervention with linked equipment, change status to Planning, verify loan drafts created |

#### INT-05: Equipment Issue Feedback Loop

| # | Task | Type | Detail |
|---|------|------|--------|
| 2.2.1 | Add `redi_equipmentid` lookup column to `redi_issue` | Schema | Optional lookup to `redi_equipment`, cascade RemoveLink |
| 2.2.2 | Define relationship `redi_equipment_issue_equipmentid` | Schema | 1:N relationship from Equipment to Issue |
| 2.2.3 | Update LearnTracker `Issue` TypeScript interface | Code | Add `equipmentId: string \| null` field |
| 2.2.4 | Update LearnTracker `issueService` adapter | Code | Add `equipmentId` → `_redi_equipmentid_value` mapping |
| 2.2.5 | Add equipment picker to LearnTracker issue form (conditional) | Code | Show equipment picker when category is "Equipment" (100000000); pre-populate from session's intervention equipment |
| 2.2.6 | Create Power Automate flow: "Equipment Issue Alert" | Flow | Trigger: `redi_issue` created with category=Equipment and `redi_equipmentid` populated |
| 2.2.7 | Flow step: Check issue severity | Flow | If severity=Critical(100000003), update `redi_equipment.redi_sq_status` to UnderMaintenance(3) |
| 2.2.8 | Flow step: Notify equipment contact person | Flow | Send email/Teams notification to `redi_equipment.redi_sq_contactpersonid` |
| 2.2.9 | Flow step: Log to `redi_flowlog` | Flow | Record flow execution |
| 2.2.10 | Add "Education Issues" section to SimQuip equipment detail | Code | Query `redi_issue` records referencing this equipment; show severity, status, session info |
| 2.2.11 | Test issue feedback loop end-to-end | Test | Create equipment issue in LearnTracker session, verify appears in SimQuip equipment detail |

#### INT-06: Team-Based Stakeholder Mapping

| # | Task | Type | Detail |
|---|------|------|--------|
| 2.3.1 | Add `redi_teamid` lookup column to `redi_intervention` | Schema | Optional lookup to `redi_team`, cascade RemoveLink |
| 2.3.2 | Define relationship `redi_team_intervention_teamid` | Schema | 1:N relationship from Team to Intervention |
| 2.3.3 | Update LearnTracker `Intervention` TypeScript interface | Code | Add `teamId: string \| null` field |
| 2.3.4 | Update LearnTracker `interventionService` adapter | Code | Add `teamId` → `_redi_teamid_value` mapping |
| 2.3.5 | Add team picker to LearnTracker intervention form | Code | Dropdown of SimQuip teams |
| 2.3.6 | Add "Education Activity" section to SimQuip team detail | Code | List interventions associated with this team |
| 2.3.7 | Test team linkage end-to-end | Test | Associate intervention with team, verify bidirectional visibility |

### Phase 3: Intelligence

#### INT-07: Equipment Availability Barrier Detection

| # | Task | Type | Detail |
|---|------|------|--------|
| 3.1.1 | Create Power Automate flow: "Check Equipment Availability" | Flow | Trigger: `redi_intervention` date fields updated OR `redi_interventionequipment` created/updated |
| 3.1.2 | Flow step: Get intervention date range | Flow | Read `redi_plannedstartdate` and `redi_plannedenddate` |
| 3.1.3 | Flow step: Get linked equipment items | Flow | List `redi_interventionequipment` with populated `redi_equipmentid` |
| 3.1.4 | Flow step: Check each equipment's status and active loans | Flow | Query `redi_equipment.redi_sq_status` and overlapping `redi_loantransfer` records |
| 3.1.5 | Flow step: Create/update `redi_interventionbarrier` | Flow | Barrier type: "Equipment availability" (100000002); impact based on count of unavailable items |
| 3.1.6 | Flow step: Log to `redi_flowlog` | Flow | Record flow execution |
| 3.1.7 | Test barrier auto-detection | Test | Set equipment to InUse, verify barrier created on intervention |

#### INT-08: Unified Dashboard

| # | Task | Type | Detail |
|---|------|------|--------|
| 3.2.1 | Design dashboard wireframes | Design | Layout for equipment utilisation, education calendar, issue trends |
| 3.2.2 | Create Power BI dataset connecting both table sets | BI | Single semantic model over all 27 tables |
| 3.2.3 | Build equipment utilisation report | BI | Equipment usage by intervention type, time period, team |
| 3.2.4 | Build education calendar with equipment overlay | BI | Timeline of interventions with equipment allocation status |
| 3.2.5 | Build equipment issue trends report | BI | Issues by category, severity, equipment item over time |
| 3.2.6 | Build loan demand forecasting report | BI | Upcoming loans from planned interventions |
| 3.2.7 | Build team activity summary | BI | Education activity, equipment portfolio, issues per team |
| 3.2.8 | Embed reports in both applications | Code | Power BI embedded in SimQuip and LearnTracker dashboards |
| 3.2.9 | Test dashboard with sample data | Test | Verify all reports render correctly with realistic data |

### Phase 4: Enhancement

#### INT-09: Bi-directional Status Sync

| # | Task | Type | Detail |
|---|------|------|--------|
| 4.1.1 | Create flow: "Sync Loan Status to Intervention Equipment" | Flow | When loan status changes, update intervention equipment source field |
| 4.1.2 | Map loan status → equipment source | Config | Active→Borrowed(100000001), Returned→REdI owned(100000000) |
| 4.1.3 | Test status sync | Test | Change loan status, verify intervention equipment source updates |

#### INT-10: Equipment Procurement Suggestions

| # | Task | Type | Detail |
|---|------|------|--------|
| 4.2.1 | Create view: "Unlinked Equipment Needs" | View | `redi_interventionequipment` where `redi_equipmentid` is null, grouped by name/category |
| 4.2.2 | Add procurement suggestion panel to SimQuip | Code | Show frequently-requested equipment not in inventory |
| 4.2.3 | Test procurement flow | Test | Verify unlinked equipment appears as suggestions |

#### INT-11: Session Resource Pack Assembly

| # | Task | Type | Detail |
|---|------|------|--------|
| 4.3.1 | Create flow: "Assemble Session Resource Pack" | Flow | Trigger: `redi_session.redi_status` changes to Scheduled(100000000) |
| 4.3.2 | Flow step: Collect equipment media | Flow | Get `redi_equipmentmedia` for all linked equipment items in session's intervention |
| 4.3.3 | Flow step: Collect equipment flowcharts and contents lists | Flow | Get `quickStartFlowChartJson` and `contentsListJson` from linked equipment |
| 4.3.4 | Flow step: Generate resource pack | Flow | Compile into PDF or SharePoint folder |
| 4.3.5 | Flow step: Attach to session record | Flow | Store URL in `redi_session` (may need new column `redi_resourcepackurl`) |
| 4.3.6 | Test resource pack generation | Test | Schedule session with linked equipment, verify pack generated |

---

## 8. Schema Reference: SimQuip

### Tables (10)

| Table | Schema Name | Entity Set | Ownership | Key Fields |
|-------|------------|------------|-----------|------------|
| Person | `redi_person` | `redi_persons` | None | displayname, email, phone, role, department, facility, active |
| Team | `redi_team` | `redi_teams` | None | teamcode, name, mainContactPersonId, mainLocationId, active |
| Team Member | `redi_teammember` | `redi_teammembers` | None | teamId, personId, role |
| Building | `redi_building` | `redi_buildings` | None | name, code |
| Level | `redi_level` | `redi_levels` | None | buildingId, name, sortOrder |
| Location | `redi_location` | `redi_locations` | None | buildingId, levelId, name, contactPersonId, description |
| Equipment | `redi_equipment` | `redi_equipments` | None | equipmentCode, name, description, ownerType, status, active, keyImageUrl, flowchartJson, contentsListJson |
| Equipment Media | `redi_equipmentmedia` | `redi_equipmentmedias` | None | equipmentId, mediaType, fileName, mimeType, fileUrl, sortOrder |
| Location Media | `redi_locationmedia` | `redi_locationmedias` | None | locationId, mediaType, fileName, mimeType, fileUrl, sortOrder |
| Loan Transfer | `redi_loantransfer` | `redi_loantransfers` | None | equipmentId, startDate, dueDate, originTeamId, recipientTeamId, reasonCode, status, notes |

### Relationships (11)

| Parent | Child | Lookup Field | Cascade |
|--------|-------|-------------|---------|
| Building | Level | `redi_buildingid` | - |
| Equipment | EquipmentMedia | `redi_equipmentid` | - |
| Equipment | LoanTransfer | `redi_equipmentid` | - |
| Location | LocationMedia | `redi_locationid` | - |
| Location | Team (mainLocation) | `redi_mainlocationid` | - |
| Person | LoanTransfer (approver) | `redi_approverpersonid` | - |
| Person | Team (mainContact) | `redi_maincontactpersonid` | - |
| Person | TeamMember | `redi_personid` | - |
| Team | LoanTransfer (origin) | `redi_originteamid` | - |
| Team | LoanTransfer (recipient) | `redi_recipientteamid` | - |
| Team | TeamMember | `redi_teamid` | - |

### Choice Fields

| Field | Entity | Values |
|-------|--------|--------|
| `redi_sq_status` | Equipment | Available(1), InUse(2), UnderMaintenance(3), Retired(4) |
| `redi_sq_ownertype` | Equipment | Team(1), Person(2) |
| `redi_loanstatus` | LoanTransfer | Draft(100000000), Active(100000001), Overdue(100000002), Returned(100000003), Cancelled(100000004) |
| `redi_reasoncode` | LoanTransfer | Simulation(100000000), Training(100000001), Service(100000002), Other(100000003) |
| `redi_mediatype` | EquipmentMedia, LocationMedia | Image(100000000), Attachment(100000001) |
| `redi_role` | Person | Consultant(100000000) through Other(100000011) — 12 values |

---

## 9. Schema Reference: LearnTracker

### Tables (17)

| Table | Schema Name | Ownership | Key Fields |
|-------|------------|-----------|------------|
| Person | `redi_person` | None | displayname, email, role, department, facility, isInternal |
| Tag | `redi_tag` | None | name, category |
| Intervention | `redi_intervention` | UserOwned | name, description, type, status, phase, priority, dates, hours, ratings |
| Event | `redi_event` | None | interventionId, name, description, eventType, status, targetAudience, estimatedDuration |
| Session | `redi_session` | None | eventId, name, datetime, location (text), status, duration, participantCount, surveyUrl |
| Session Attendance | `redi_sessionattendance` | None | sessionId, personId, attendanceRole, attended |
| Feedback | `redi_feedback` | None | sessionId, personId, feedbackType, ratings, confidenceChange, wouldRecommend, freeText |
| Issue | `redi_issue` | None | sessionId, identifiedBy, title, description, category, severity, status, riskmanReference |
| Corrective Action | `redi_correctiveaction` | None | issueId, title, actionType, assignedTo, status, dueDate, evidence |
| Intervention Stakeholder | `redi_interventionstakeholder` | None | interventionId, personId, engagementType, notes |
| Intervention Equipment | `redi_interventionequipment` | None | interventionId, equipmentName, category, quantity, source, notes |
| Intervention Barrier | `redi_interventionbarrier` | None | interventionId, name, barrierType, impact, notes |
| Intervention Tag | `redi_interventiontag` | None | interventionId, tagId |
| Evaluation | `redi_evaluation` | None | interventionId, kirkpatrickLevel, method, findings, evidenceOfImpact, date |
| Change Implemented | `redi_changeimplemented` | None | interventionId, changeType, description, implementedDate, status, monitoringMethod |
| App Log | `redi_applog` | None | name, timestamp, level, context, message, data, userId, stack |
| Flow Log | `redi_flowlog` | None | name, flowName, runId, action, status, details, timestamp |

### Relationships (17)

| Parent | Child | Lookup Field | Required | Cascade |
|--------|-------|-------------|----------|---------|
| Intervention | Event | `redi_interventionid` | Yes | Cascade |
| Intervention | Stakeholder | `redi_interventionid` | Yes | Cascade |
| Intervention | Equipment | `redi_interventionid` | Yes | Cascade |
| Intervention | Barrier | `redi_interventionid` | Yes | Cascade |
| Intervention | Tag | `redi_interventionid` | Yes | Cascade |
| Intervention | Evaluation | `redi_interventionid` | Yes | Cascade |
| Intervention | ChangeImplemented | `redi_interventionid` | Yes | Cascade |
| Event | Session | `redi_eventid` | Yes | Cascade |
| Session | Attendance | `redi_sessionid` | Yes | Cascade |
| Session | Feedback | `redi_sessionid` | Yes | Cascade |
| Session | Issue | `redi_sessionid` | Yes | RemoveLink |
| Issue | CorrectiveAction | `redi_issueid` | Yes | Cascade |
| Person | Attendance | `redi_personid` | Yes | RemoveLink |
| Person | Feedback | `redi_personid` | No | RemoveLink |
| Person | Stakeholder | `redi_personid` | Yes | RemoveLink |
| Person | Issue (identifiedBy) | `redi_identifiedby` | No | RemoveLink |
| Tag | InterventionTag | `redi_tagid` | Yes | RemoveLink |

### Key Choice Fields

| Field | Entity | Values |
|-------|--------|--------|
| `redi_type` | Intervention | Simulation(100000000), In-Service(100000001), Workshop(100000002), Skills Station(100000003), Orientation(100000004), Other(100000005) |
| `redi_status` | Intervention | Draft(100000000), Planning(100000001), Active(100000002), Completed(100000003), Cancelled(100000004) |
| `redi_phase` | Intervention | Planning(100000000), Execution(100000001), Followup(100000002), Closed(100000003) |
| `redi_eventtype` | Event | Simulation scenario(100000000), Skills station(100000001), Lecture(100000002), Workshop(100000003), Assessment(100000004), Debrief(100000005), Other(100000006) |
| `redi_category` | InterventionEquipment | Manikin(100000000), Task trainer(100000001), AV equipment(100000002), Medication simulated(100000003), Consumables(100000004), Documentation(100000005), IT/software(100000006), Furniture(100000007), Other(100000008) |
| `redi_kirkpatricklevel` | Evaluation | L1 Reaction(100000000), L2 Learning(100000001), L3 Behaviour(100000002), L4 Results(100000003) |
| `redi_severity` | Issue (global) | Low(100000000), Medium(100000001), High(100000002), Critical(100000003) |
| `redi_barriertype` | Barrier | Staffing(100000000), Space availability(100000001), Equipment availability(100000002), Time(100000003), Stakeholder buy-in(100000004), Budget(100000005), Competing priorities(100000006), COVID(100000007), Other(100000008) |

---

## 10. Technical Reference

### 10.1 Dataverse Connection Details

Both apps connect to Dataverse via the PowerApps Code App runtime (`ComponentFramework.WebApi`). The connection is handled by the platform — no explicit connection strings are needed in the code.

**OData Endpoint Pattern:**
```
https://{org}.crm6.dynamics.com/api/data/v9.2/{entitySetName}
```

**Authentication:** Handled by PowerApps runtime (Azure AD / Entra ID SSO).

### 10.2 Key Connectors for Integration Flows

| Connector | Use Case | Configuration |
|-----------|----------|--------------|
| **Dataverse** | All CRUD operations on both apps' tables | Default environment; no additional config |
| **Power Automate (Dataverse trigger)** | Event-driven flows (INT-04, INT-05, INT-07) | "When a row is modified" trigger on specific tables |
| **Power BI** | Unified reporting (INT-08) | Dataverse connector in Power BI Desktop |
| **Office 365 Outlook** | Notifications (INT-05 equipment alerts) | Service account or user delegation |
| **Microsoft Teams** | Notifications (INT-05 equipment alerts) | Teams webhook or Flow bot |

### 10.3 Cross-App OData Query Examples

**Get equipment with education usage:**
```
GET /api/data/v9.2/redi_equipments?$expand=redi_equipment_interventionequipment_equipmentid($select=redi_equipmentname,redi_quantity)&$filter=redi_sq_active eq true
```

**Get sessions at a SimQuip location:**
```
GET /api/data/v9.2/redi_sessions?$filter=_redi_locationid_value eq '{locationId}'&$expand=redi_Event_Session($select=redi_name)&$orderby=redi_sessiondatetime desc
```

**Get loans linked to an intervention:**
```
GET /api/data/v9.2/redi_loantransfers?$filter=_redi_interventionid_value eq '{interventionId}'&$expand=redi_equipment_loantransfer_equipmentid($select=redi_itemname,redi_equipmentcode)
```

**Get equipment issues from education sessions:**
```
GET /api/data/v9.2/redi_issues?$filter=_redi_equipmentid_value eq '{equipmentId}' and redi_category eq 100000000&$orderby=redi_identifiedon desc
```

### 10.4 New Schema Additions Summary

All new columns and relationships required for integration:

| Table | New Column | Type | Target | Integration |
|-------|-----------|------|--------|-------------|
| `redi_interventionequipment` | `redi_equipmentid` | Lookup (optional) | `redi_equipment` | INT-02 |
| `redi_session` | `redi_locationid` | Lookup (optional) | `redi_location` | INT-03 |
| `redi_loantransfer` | `redi_interventionid` | Lookup (optional) | `redi_intervention` | INT-04 |
| `redi_intervention` | `redi_teamid` | Lookup (optional) | `redi_team` | INT-06 |
| `redi_issue` | `redi_equipmentid` | Lookup (optional) | `redi_equipment` | INT-05 |
| `redi_session` | `redi_resourcepackurl` | String (2000) | — | INT-11 |

**Total: 6 new columns, 5 new relationships, 0 breaking changes.**

All additions are optional lookups — no existing data or functionality is affected. Both apps continue to work independently; integration features activate only when the cross-references are populated.

### 10.5 Power Automate Flow Summary

| Flow Name | Trigger | Integration | Tables Touched |
|-----------|---------|-------------|---------------|
| Auto-Create Loan Drafts | `redi_intervention.redi_status` → Planning | INT-04 | intervention, interventionequipment, equipment, loantransfer, flowlog |
| Equipment Issue Alert | `redi_issue` created (category=Equipment) | INT-05 | issue, equipment, person, flowlog |
| Check Equipment Availability | `redi_intervention` dates modified | INT-07 | intervention, interventionequipment, equipment, loantransfer, interventionbarrier, flowlog |
| Sync Loan Status | `redi_loantransfer.redi_loanstatus` changed | INT-09 | loantransfer, interventionequipment, flowlog |
| Assemble Resource Pack | `redi_session.redi_status` → Scheduled | INT-11 | session, event, intervention, interventionequipment, equipment, equipmentmedia, flowlog |

---

## Appendix: Entity Relationship Diagram (Combined)

```
                            ┌─────────────┐
                            │   Building   │
                            └──────┬──────┘
                                   │ 1:N
                            ┌──────┴──────┐
                            │    Level     │
                            └──────┬──────┘
                                   │ 1:N
                            ┌──────┴──────┐         ┌──────────────┐
                            │  Location    │◄────────│LocationMedia │
                            └──────┬──────┘         └──────────────┘
                                   │
            ┌──────────────────────┼────────────────────────────┐
            │ mainLocation         │ INT-03: locationId          │
     ┌──────┴──────┐        ┌─────┴──────┐              ┌──────┴──────┐
     │    Team     │        │  Session    │◄─────────────│   Event     │
     └──────┬──────┘        └─────┬──────┘    eventId    └──────┬──────┘
            │                     │                              │
     ┌──────┴──────┐     ┌───────┼───────┐              ┌──────┴──────────┐
     │ TeamMember  │     │       │       │              │  Intervention    │
     └──────┬──────┘  Attend  Feedback Issue            └──┬──┬──┬──┬──┬─┘
            │            │       │       │                 │  │  │  │  │
     ┌──────┴──────┐     │       │   ┌───┴───┐            │  │  │  │  │
     │   Person    │◄────┴───────┘   │Correct│            │  │  │  │  │
     └─────────────┘                 │Action │            │  │  │  │  │
                                     └───────┘            │  │  │  │  │
                                                          │  │  │  │  │
            INT-06: teamId ───────────────────────────────┘  │  │  │  │
            INT-02: equipmentId on IntervEquipment ──────────┘  │  │  │
            Stakeholders ───────────────────────────────────────┘  │  │
            Barriers, Tags, Evaluations, Changes ─────────────────┘  │
                                                                      │
     ┌──────────────┐    INT-04: interventionId                       │
     │  Equipment   │◄──────────────────────────┐                     │
     └──────┬──────┘                     ┌──────┴──────┐              │
            │                            │ LoanTransfer │◄─────────────┘
     ┌──────┴──────┐                     └─────────────┘
     │EquipMedia   │
     └─────────────┘
```

---

*This integration plan was generated through analysis of the SimQuip and LearnTracker codebases. Both applications remain fully functional as standalone apps — integration features are additive and non-breaking.*
