# SimQuip Detailed Implementation Task List

## 0. Governance and Delivery Controls (must run throughout)
- [ ] Create working branch and confirm clean working tree
- [ ] Require PR template usage with linked requirement IDs
- [ ] Define mandatory reviewers (engineering + product owner)
- [ ] Enforce quality gates: lint, typecheck, tests, security scan
- [ ] Run code review checkpoint at end of each major module (Equipment, Locations, Teams, Loans, Integrations)

## 1. Foundation Setup
- [ ] Initialize Node.js + TypeScript + React project scaffold via Vite
- [ ] Configure PWA baseline (manifest, service worker, install prompt handling)
- [ ] Add `@microsoft/power-apps` SDK dependency
- [ ] Configure linting (ESLint), formatting (Prettier), strict TS config
- [ ] Add CI pipeline tasks for lint/typecheck/test/build
- [ ] Add environment configuration strategy (dev/test/prod)

### Quality gate 1
- [ ] Run lint successfully
- [ ] Run typecheck successfully
- [ ] Run unit tests successfully
- [ ] Conduct code review and address findings

## 2. PAC CLI Environment Initialization
- [ ] Authenticate PAC CLI (`pac auth create`)
- [ ] Select target environment (`pac env select -env <env-url>`)
- [ ] Initialize Code App metadata (`pac code init --displayName "SimQuip"`)
- [ ] Verify `power.config.json` values (app/environment/build path)
- [ ] Add app to solution or set `--solutionName` deployment usage

### Data source setup tasks
- [ ] Enumerate required Dataverse tables and confirm naming alignment
- [ ] Add Equipment data source (`pac code add-data-source -a dataverse -t <Equipment>`)
- [ ] Add Location data source (`pac code add-data-source -a dataverse -t <Location>`)
- [ ] Add Team data source (`pac code add-data-source -a dataverse -t <Team>`)
- [ ] Add Person data source (`pac code add-data-source -a dataverse -t <Person>`)
- [ ] Add LoanTransfer data source (`pac code add-data-source -a dataverse -t <LoanTransfer>`)
- [ ] Regenerate and verify typed models/services

### Quality gate 2
- [ ] Validate generated services compile cleanly
- [ ] Peer review generated service usage patterns

## 3. Data Model Implementation (Dataverse + App Types)
- [ ] Implement/confirm Team entity and constraints
- [ ] Implement/confirm Person entity and constraints
- [ ] Implement/confirm Building, Level, Location entities and hierarchy constraints
- [ ] Implement/confirm Equipment entity with ownership and home location constraints
- [ ] Implement/confirm Equipment nesting relation (`parentEquipmentId`) with cycle prevention
- [ ] Implement/confirm Equipment media/attachments entity
- [ ] Implement/confirm Location media/attachments entity
- [ ] Implement/confirm LoanTransfer entity and validation rules
- [ ] Seed enum/reference values (loan reasons, statuses)

### Quality gate 3
- [ ] Add schema validation tests (required fields, constraints, relationship rules)
- [ ] Run integration tests against dev environment data
- [ ] Run formal code review on schema and migration scripts

## 4. Equipment Module
- [ ] Build equipment list view (search/filter/sort/pagination)
- [ ] Build equipment create/edit form with owner/contact/home location logic
- [ ] Implement owner defaulting behavior for home location from team main location (on create, and on owner change only when `homeLocationIsManualOverride = false`)
- [ ] Build equipment detail page with:
  - [ ] Image gallery
  - [ ] Attachment list
  - [ ] Interactive contents list editor/view
  - [ ] Interactive quick start flow chart editor/view
- [ ] Build nested equipment management UI (add/remove child equipment)
- [ ] Add validation and conflict handling for nested relationships (enforce both no-cycle rule and maximum depth rule)

### Quality gate 4
- [ ] Add unit tests for owner/defaulting rules
- [ ] Add component tests for create/edit/detail flows
- [ ] Perform UX and accessibility review
- [ ] Complete module code review and resolve comments

## 5. Locations Module
- [ ] Build Building/Level/Location management screens
- [ ] Enforce hierarchy creation/edit rules (Location requires Building + Level)
- [ ] Add location contact person assignment
- [ ] Add location image upload and attachment management
- [ ] Build location detail page showing linked equipment

### Quality gate 5
- [ ] Add tests for hierarchy integrity and uniqueness constraints
- [ ] Add tests for location contact assignment
- [ ] Complete module code review and resolve comments

## 6. Teams and Staff Module
- [ ] Build team list/detail/create/edit flows
- [ ] Build team staff assignment workflow
- [ ] Implement main contact selection constrained to team staff
- [ ] Implement team location assignment workflow
- [ ] Implement main location selection constrained to team locations

### Quality gate 6
- [ ] Add tests for staff/main contact and location/main location constraints
- [ ] Complete module code review and resolve comments

## 7. Loans/Transfers Module
- [ ] Build loan/transfer create/edit workflow
- [ ] Implement required fields (start, due, origin, recipient, reason, approver)
- [ ] Enforce due date and approver membership validations
- [ ] Build lifecycle actions (activate, return, cancel)
- [ ] Implement overdue state derivation
- [ ] Build loan history timeline per equipment

### Quality gate 7
- [ ] Add tests for validation rules and status transitions
- [ ] Add integration tests for end-to-end loan creation and return
- [ ] Complete module code review and resolve comments

## 8. External API/MCP and Power Automate Integration
- [ ] Document approved usage of non-connector endpoints in code comments/docs:
  - [ ] Dataverse Web API for supported workflow metadata operations
  - [ ] `api.flow.microsoft.com` only for explicit exception scenarios
- [ ] Implement flow-trigger integration points for reminder emails
- [ ] Ensure all flow operations are solution-aware where possible
- [ ] Add retry/backoff and robust error normalization for throttling/auth errors

### Quality gate 8
- [ ] Add integration tests/mocks for flow-trigger invocations
- [ ] Perform security review on endpoint usage and token handling
- [ ] Complete module code review and resolve comments

## 9. Observability, Error Handling, and Security Hardening
- [ ] Implement centralized error mapper and user-friendly error surfaces
- [ ] Add structured logging with correlation IDs
- [ ] Add global error boundaries and fallback UI states
- [ ] Enforce file upload validation (type/size/content checks)
- [ ] Add rate-limit and transient failure retry policies

### Quality gate 9
- [ ] Run security scan and remediate actionable findings
- [ ] Execute negative tests for key failure modes
- [ ] Complete targeted security-focused code review

## 10. Documentation and Handover
- [ ] Publish architecture, schema dictionary, and integration docs
- [ ] Publish operations runbook for deployment and rollback
- [ ] Publish known limitations and support model
- [ ] Record ADRs for major architectural choices

### Quality gate 10
- [ ] Documentation review for completeness and correctness
- [ ] Final stakeholder sign-off review

## 11. Deployment and Release (PAC CLI specific)
- [ ] Build production bundle (`npm run build`)
- [ ] Push code app (`pac code push --solutionName SimQuip`)
- [ ] Verify app in target environment URL
- [ ] Create/export solution package for promotion
- [ ] Generate deployment settings for connection references
- [ ] Import solution in downstream environment with mapped references
- [ ] Smoke test critical user journeys post-deploy

### Release gate
- [ ] Final lint/typecheck/test/build all green
- [ ] Final code review approved
- [ ] Final security scan reviewed and signed off
- [ ] Go-live approval recorded

## 12. Post-Release Stabilization
- [ ] Monitor runtime errors and flow failures for first release window
- [ ] Triage and fix high-priority defects
- [ ] Confirm reminder flow reliability and escalation paths
- [ ] Capture backlog for iterative improvements
