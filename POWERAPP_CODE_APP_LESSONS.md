# PowerApps Code App — Consolidated Lessons & Instructions

> **Source**: Consolidated from four production repositories (trolleys, learntracker, simquip, govman) deployed to the REdI Development Dataverse environment. These lessons represent hard-won knowledge from real deployments. Every directive below has been validated through failure in at least one, and often multiple, projects.
>
> **Audience**: LLM agents and human developers building or maintaining PowerApps Code Apps.
>
> **Last Updated**: 2026-02-18

---

## Table of Contents

1. [Critical Directives](#1-critical-directives)
2. [PAC CLI Reference](#2-pac-cli-reference)
3. [Power Platform SDK](#3-power-platform-sdk)
4. [Dataverse Gotchas](#4-dataverse-gotchas)
5. [Code App Configuration](#5-code-app-configuration)
6. [Connector & Data Source Setup](#6-connector--data-source-setup)
7. [Schema Provisioning](#7-schema-provisioning)
8. [Power Automate Integration](#8-power-automate-integration)
9. [SharePoint Integration](#9-sharepoint-integration)
10. [Deployment & ALM](#10-deployment--alm)
11. [Licensing & Limits](#11-licensing--limits)
12. [Common Pitfalls Quick Reference](#12-common-pitfalls-quick-reference)
13. [Recurring Cross-Project Issues](#13-recurring-cross-project-issues)
14. [CSDL $metadata Reference](#14-csdl-metadata-reference)

---

## 1. Critical Directives

These are absolute rules. Violating any of them WILL cause failures.

### MUST DO

| # | Directive | Severity | Repos Affected |
|---|-----------|----------|----------------|
| 1 | **Deploy ONLY via `pac code push`.** No manual uploads, no direct API calls, no alternative tools. | CRITICAL | ALL |
| 2 | **Always run `npm run build` before `pac code push`.** Development builds may be blocked or cause runtime errors. | CRITICAL | ALL |
| 3 | **Verify `pac auth who` confirms the correct environment** before every `pac code push`. | CRITICAL | ALL |
| 4 | **Use `HashRouter`, never `BrowserRouter`.** Code Apps are served from nested paths (`/play/e/{env}/a/{app}`). BrowserRouter causes all routes to 404 after deployment. | CRITICAL | trolleys, simquip |
| 5 | **Set Vite `base: "./"` (relative path).** The default `base: "/"` causes all CSS, JS, and image assets to 404 after deployment. | CRITICAL | trolleys, simquip |
| 6 | **Use integer values (100000000+) for Dataverse Choice/OptionSet fields.** Sending string labels returns HTTP 500. | CRITICAL | trolleys, simquip |
| 7 | **Verify EntitySetNames from solution XML after every import.** Dataverse uses naive pluralization (appends `s` regardless of grammar). `redi_equipmentcategory` becomes `redi_equipmentcategorys`, NOT `redi_equipmentcategories`. | CRITICAL | trolleys, simquip |
| 8 | **Call `initialize()` or `getContext()` from the SDK before any data operations.** Without SDK initialization, all connector-based operations WILL fail silently or throw. | CRITICAL | ALL |
| 9 | **Use the SDK `DataClient` for all data operations in Code Apps.** Direct `fetch()` calls are blocked by CORS in the deployed Code App iframe. | CRITICAL | trolleys, govman |
| 10 | **Set Vite dev server port to 3000** (default for SDK middleware). Can be overridden via `pac code run --appUrl http://localhost:<port>`, but 3000 is the convention. | HIGH | trolleys, simquip, govman |
| 11 | **Always associate Code Apps with a solution** using `pac code push --solutionName MySolution`. Code Apps are NOT saved to a solution by default, blocking cross-environment promotion. | CRITICAL | trolleys, simquip, govman |

### NEVER DO

| # | Directive | Consequence | Repos Affected |
|---|-----------|-------------|----------------|
| 1 | **NEVER use `BrowserRouter` in a Code App.** | All routes 404 after deployment. | trolleys, simquip |
| 2 | **NEVER send string values for Choice columns to Dataverse.** | HTTP 500 error with no useful message. | trolleys, simquip |
| 3 | **NEVER assume Dataverse EntitySetNames follow English pluralization.** | HTTP 404/500 on every data call. | trolleys, simquip |
| 4 | **NEVER deploy a development/unminified build via `pac code push`.** | May be blocked; wastes bundle size budget. | ALL |
| 5 | **NEVER call `fetch()` to external URLs from a deployed Code App.** | CORS error. Use SDK DataClient or Power Automate flows. | trolleys, govman |
| 6 | **NEVER use PnP.PowerShell in environments without app-registration permissions.** | Will fail silently or error. Use SharePoint REST API with Azure CLI auth instead. | govman |
| 7 | **NEVER attempt alternate deployment methods if `pac code push` fails.** | Stop and report the error. Do not upload via Maker Portal, REST API, or other CLIs. | ALL |
| 8 | **NEVER hardcode user identity.** | Shows placeholder text after deployment. Use `getContext()` from SDK. | trolleys |
| 9 | **NEVER create Dataverse rollup fields via Web API or solution import.** | They MUST be manually configured in Maker Portal in every environment. | learntracker |
| 10 | **NEVER store sensitive data (API keys, secrets) in Code App source.** | Published code is on a publicly accessible endpoint. | ALL |

---

## 2. PAC CLI Reference

### Installation

```bash
# Windows
winget install Microsoft.PowerApps.CLI

# macOS/Linux
npm install -g @microsoft/pac-cli
# or
brew tap microsoft/powerplatform && brew install pac
```

### Authentication

```bash
# Interactive browser login (default)
pac auth create

# Device code flow (for SSH/Codespaces)
pac auth create --deviceCode

# Service principal (for CI/CD)
pac auth create --applicationId <id> --clientSecret <secret> --tenant <id>

# Verify current auth
pac auth who

# Select target environment
pac env select -env https://your-environment.crm.dynamics.com

# List auth profiles
pac auth list

# Clear cached credentials
pac auth clear
```

### Code App Lifecycle

```bash
# Initialize a new Code App (creates power.config.json, .power/ directory)
pac code init --displayName "My App"

# Add a Dataverse data source (generates typed models/services)
pac code add-data-source -a dataverse -t <table-logical-name>

# Start local SDK middleware for development
pac code run

# Build and deploy
npm run build
pac code push

# Deploy into a specific solution (RECOMMENDED — see Section 10)
pac code push --solutionName MySolution
```

### Solution Management

```bash
# List solutions in environment
pac solution list

# Export solution
pac solution export --name MySolution --path ./exports/MySolution.zip

# Import solution
pac solution import --path ./MySolution.zip --force-overwrite

# Unpack for inspection (critical for verifying EntitySetNames)
pac solution unpack --zipfile ./Solution.zip --folder ./solution_output

# Pack from folder
pac solution pack --folder ./solution_output --zipfile ./Solution.zip --processCanvasApps

# Create deployment settings for cross-environment promotion
pac solution create-settings --solution-zip ./exports/Solution.zip --settings-file ./exports/deploy-settings.json
```

### Recovery Steps

If `pac` is not found in the current shell:

1. Run `where pac` (Windows) or `which pac` (macOS/Linux) to check PATH.
2. Try PowerShell explicitly: `powershell -Command "pac auth who"`
3. Check VS Code extension path: `~/.vscode-server/data/User/globalStorage/microsoft-isvexptools.powerplatform-vscode/pac/pac`
4. Check local install: `$env:LOCALAPPDATA\Microsoft\PowerAppsCLI\pac.exe` (Windows)
5. **If still unavailable: STOP. Do not proceed. Report error to user.**

### Enabling Code Apps on an Environment

Navigate to Power Platform Admin Center → Manage → Environments → select environment → Settings → Product → Features → toggle "Enable code apps" to ON.

> If the setting is not visible, append `?ecs.ShowCodeAppSetting=true` to the admin center URL.

---

## 3. Power Platform SDK

### Package

```json
"@microsoft/power-apps": "^1.0.4"
```

> SDK version 1.0.3 was the GA release (Feb 2026). Version 1.0.4 is the current latest.

### SDK Initialization (PowerProvider Pattern)

Every Code App MUST initialize the SDK before rendering any data-bound components. Use this wrapper pattern:

```tsx
import { initialize } from '@microsoft/power-apps/app';
import { useState, useEffect, type ReactNode } from 'react';

export default function PowerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setError(new Error('SDK timeout')), 10000);
    initialize()
      .then(() => { clearTimeout(timer); setReady(true); })
      .catch((err) => { clearTimeout(timer); setError(err); });
    return () => clearTimeout(timer);
  }, []);

  if (error) return <div>Failed to initialize Power Platform SDK</div>;
  if (!ready) return <div>Loading...</div>;
  return <>{children}</>;
}
```

### SDK Imports

```typescript
// App context and initialization
import { initialize, getContext } from '@microsoft/power-apps/app';

// Data client for CRUD operations
import { getClient } from '@microsoft/power-apps/data';
import type { DataClient, IOperationResult } from '@microsoft/power-apps/data';

// Auto-generated data source info (REQUIRES path alias — see Section 5)
import { dataSourcesInfo } from '@power/schemas/appschemas/dataSourcesInfo';
```

### DataClient Singleton

```typescript
import { getClient } from '@microsoft/power-apps/data';
import { dataSourcesInfo } from '@power/schemas/appschemas/dataSourcesInfo';

let _client: DataClient | null = null;

export function getDataClient(): DataClient {
  if (!_client) {
    _client = getClient(dataSourcesInfo);
  }
  return _client;
}
```

### DataClient Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `retrieveMultipleRecordsAsync<T>(entitySet, options?)` | List/query records | `IOperationResult<T[]>` |
| `retrieveRecordAsync<T>(entitySet, id)` | Get single record by ID | `IOperationResult<T>` |
| `createRecordAsync<TIn, TOut>(entitySet, data)` | Create new record | `IOperationResult<TOut>` |
| `updateRecordAsync<TIn, TOut>(entitySet, id, data)` | Update existing record | `IOperationResult<TOut>` |
| `deleteRecordAsync(entitySet, id)` | Delete record | `IOperationResult<void>` |

### Query Options (IGetAllOptions)

```typescript
const result = await service.getAll({
  select: ['name', 'accountnumber'],
  filter: "address1_country eq 'USA'",
  orderBy: ['name asc'],
  top: 50,
  skip: 0,
  maxPageSize: 100
});
```

### Getting User Identity

```typescript
import { getContext } from '@microsoft/power-apps/app';

const ctx = await getContext();
const fullName = ctx.user.fullName;
const upn = ctx.user.userPrincipalName;
```

> **NEVER hardcode user information.** Always use `getContext()`.

### Auto-Generated Services

Running `pac code add-data-source` generates typed files:
- `src/generated/models/<Table>Model.ts` — TypeScript interfaces
- `src/generated/services/<Table>Service.ts` — Typed CRUD methods

> **WARNING (from trolleys)**: Auto-generated services may have syntax issues. If they do, exclude `src/generated` from TypeScript compilation and build a custom service layer on the lower-level `DataClient` instead. The generated `dataSourcesInfo` in `.power/schemas/` is still required.

### GA Limitations (as of Feb 2026)

**Unsupported in the SDK:**
- Formatted values / display names for option sets
- Lookup fields (including polymorphic lookups)
- Dataverse actions and functions
- FetchXML queries
- Alternate key support
- Schema definition CRUD operations
- Deleting data sources via CLI

**Platform constraints:**
- Web browser only (no Power Apps mobile app)
- No Content Security Policy support
- No Power Platform Git integration
- No Solution Packager support
- No native Application Insights
- No Power BI integration
- No PWA support
- No custom domains

---

## 4. Dataverse Gotchas

### 4.1 EntitySetName Naive Pluralization

**Severity**: CRITICAL | **Repos**: trolleys, simquip

Dataverse auto-pluralizes entity logical names by naively appending `s`, regardless of English grammar rules.

| Logical Name | You'd Expect | Actual EntitySetName |
|---|---|---|
| `redi_equipmentcategory` | `redi_equipmentcategories` | **`redi_equipmentcategorys`** |
| `redi_auditchecks` | `redi_auditchecks` | **`redi_auditcheckses`** |
| `redi_auditdocuments` | `redi_auditdocuments` | **`redi_auditdocumentses`** |
| `redi_equipment` | `redi_equipment` | **`redi_equipments`** |
| `redi_person` | `redi_people` | **`redi_persons`** |

**Resolution**: ALWAYS verify EntitySetNames from solution XML after import:

```bash
pac solution unpack --zipfile solution.zip --folder solution_output

# Linux/macOS/Git Bash:
grep -r "EntitySetName" solution_output/Entities/*/Entity.xml

# Windows PowerShell:
Select-String -Path "solution_output\Entities\*\Entity.xml" -Pattern "EntitySetName"
```

### 4.2 Tables Renamed on Import

**Severity**: HIGH | **Repos**: trolleys

During solution import, Dataverse may prefix table logical names if there is a naming conflict with system tables. Observed renames:
- `redi_issue` → `redi_taissue`
- `redi_correctiveaction` → `redi_tacorrectiveaction`
- `redi_issuecomment` → `redi_taissuecomment`

**Resolution**: Check import logs after every `pac solution import`. Update all code references to use the actual logical names and EntitySetNames.

### 4.3 Choice/OptionSet Fields Require Integer Values

**Severity**: CRITICAL | **Repos**: trolleys, simquip

```javascript
// WRONG — returns HTTP 500 with no useful error message
{ redi_trolleytype: "Standard" }

// CORRECT
{ redi_trolleytype: 100000000 }
```

**Convention**: New choice values start at `100000000` and increment:

```
100000000 = First option
100000001 = Second option
100000002 = Third option
```

> **Exception (simquip)**: Pre-existing/shared tables may use simple integer values (1, 2, 3, 4) for historical reasons. Check the actual schema.

### 4.4 Lookup Field Read/Write Asymmetry

**Severity**: CRITICAL | **Repos**: trolleys

Lookup fields have DIFFERENT formats for reading vs writing:

**Reading** (GET response):
```json
{ "_redi_categoryid_value": "def-456" }
```

**Writing** (POST/PATCH payload):
```json
{ "redi_categoryid@odata.bind": "/redi_equipmentcategorys(def-456)" }
```

> Note the EntitySetName in the `@odata.bind` value — this is where naive pluralization also matters.

**Resolution**: Build a bidirectional field mapping layer:

```typescript
// mapFromDv: Convert Dataverse record → TypeScript model
//   _redi_categoryid_value → categoryId (GUID string)

// mapToDv: Convert TypeScript model → Dataverse write payload
//   categoryId → redi_categoryid@odata.bind: "/redi_equipmentcategorys(GUID)"

// mapFilterToDv: Rewrite OData filter strings
//   categoryId eq 'X' → _redi_categoryid_value eq 'X'
```

### 4.5 Rollup Fields Cannot Be Automated

**Severity**: HIGH | **Repos**: learntracker

Dataverse Web API **cannot** create, modify, or retrieve FormulaDefinition records. Rollup fields CANNOT be provisioned via `pac solution push`, Web API, or any automated tool.

**Resolution**: Rollup fields MUST be manually configured in every environment via Maker Portal. Document the exact configuration for each rollup field.

**Multi-hop rollup workaround** (learntracker): Dataverse rollup fields can only traverse 1 relationship. For deeper aggregation:
1. Create 1-hop rollups at the nearest level
2. Use calculated fields as intermediates at middle levels
3. Chain rollups at the top level using the calculated fields

### 4.6 Shared Table Column Naming

**Severity**: HIGH | **Repos**: simquip

When multiple Code Apps share a Dataverse environment with the same publisher prefix, app-specific columns on shared tables MUST use a sub-prefix to avoid naming collisions.

**Example**: SimQuip uses `redi_sq_*` prefix on shared tables:
- `redi_sq_status` (SimQuip equipment status) — distinct from `redi_status` (Trolley Audit status)
- `redi_sq_contactpersonid`, `redi_sq_buildingid`, `redi_sq_homelocationid`

### 4.7 Existing Tables Cause Import Conflicts

**Severity**: MEDIUM | **Repos**: simquip

If tables already exist (e.g., from a previous partial import), solution import may fail with relationship conflicts.

**Resolution**: Add missing columns directly via the Dataverse Web API with a bearer token extracted from PAC CLI's MSAL cache (see Section 7.3).

---

## 5. Code App Configuration

### 5.1 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',  // CRITICAL: Must be relative, NOT '/'
  server: {
    port: 3000,  // CRITICAL: SDK requires port 3000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@power': path.resolve(__dirname, './.power'),  // For SDK schema imports
    },
  },
});
```

### 5.2 TypeScript Configuration

```jsonc
// tsconfig.app.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@power/*": ["./.power/*"]
    }
  },
  "include": ["src", ".power/schemas"]  // CRITICAL: .power/schemas MUST be included
}
```

### 5.3 Router Configuration

```tsx
// CORRECT — HashRouter for Code Apps
import { HashRouter } from 'react-router-dom';

<HashRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Dashboard />} />
    </Route>
  </Routes>
</HashRouter>
```

```tsx
// WRONG — BrowserRouter will break after deployment
import { BrowserRouter } from 'react-router-dom';  // DO NOT USE
```

### 5.4 Provider Chain Pattern

```tsx
// App component wrapping order
<StrictMode>
  <ErrorBoundary>
    <PowerProvider>        {/* SDK initialization */}
      <FluentProvider>     {/* Fluent UI v9 theming */}
        <ServiceProvider>  {/* Data service registry */}
          <HashRouter>
            <AppShell />
          </HashRouter>
        </ServiceProvider>
      </FluentProvider>
    </PowerProvider>
  </ErrorBoundary>
</StrictMode>
```

---

## 6. Connector & Data Source Setup

### 6.1 Dataverse Connector

```bash
# Add a Dataverse table as data source
pac code add-data-source -a dataverse -t <table-logical-name>
```

This generates typed models and services in `src/generated/`. The connector configuration appears in `power.config.json`:

```json
{
  "connectionReferences": {
    "<connection-ref-id>": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps",
      "displayName": "Microsoft Dataverse",
      "dataSources": ["commondataserviceforapps"]
    }
  }
}
```

### 6.2 SharePoint Connector

```bash
pac code add-data-source \
  -a "shared_sharepointonline" \
  -c "<connectionId>" \
  -t "<listId>" \
  -d "<siteUrl>"
```

### 6.3 SQL Server Connector

```bash
pac code add-data-source \
  -a "shared_sql" \
  -c "<connectionId>" \
  -t "[dbo].[TableName]" \
  -d "server.database.windows.net,databaseName"
```

### 6.4 Manual Data Source Registration

When `pac code add-data-source` does not generate services, or for manual registration, data sources can be added directly to `power.config.json`:

```json
{
  "databaseReferences": {
    "default": {
      "cds": {
        "dataSources": {
          "myDataSource": {
            "entitySetName": "redi_tablenames",
            "logicalName": "redi_tablename"
          }
        }
      }
    }
  }
}
```

> **WARNING**: Manual registration does NOT generate typed TypeScript services. It only registers the data source for the runtime.

### 6.5 Connector Limits

- Maximum ~30 data connections per app (recommended)
- Excessive connections increase startup latency
- Deleting Dataverse data sources via CLI is unsupported at GA

---

## 7. Schema Provisioning

### 7.1 Schema-Driven Provisioning Pattern

Used across trolleys, simquip, and learntracker. The pattern:

1. **Define** tables declaratively in a JSON schema file
2. **Generate** Dataverse solution XML from the schema
3. **Pack** into a solution ZIP
4. **Import** via PAC CLI

```bash
# Step 1: schema.json defines tables, columns, relationships
# Step 2: Generate solution XML
python scripts/generate_solution.py

# Step 3: Pack
pac solution pack --folder ./solution_output --zipfile ./Solution.zip --processCanvasApps

# Step 4: Import
pac solution import --path ./Solution.zip --force-overwrite

# Step 5: VERIFY EntitySetNames (CRITICAL)
pac solution unpack --zipfile ./Solution.zip --folder ./solution_verify
grep -r "EntitySetName" solution_verify/Entities/*/Entity.xml
```

### 7.2 Tiered Table Creation

Tables MUST be created in dependency order. Circular references require a fixup phase.

```
Phase 1: Independent tables (no foreign keys)
Phase 2: Tables depending on Phase 1
Phase 3: Tables depending on Phase 2
...
Phase N: Circular reference fixup (add FK columns after all tables exist)
Final:   Publish customizations
```

**Example** (simquip): Person ↔ Team and Team ↔ Location are circular. Create both tables without the mutual FK columns, then add the FK columns in a fixup phase.

### 7.3 PAC CLI Token Extraction for Web API

When you need direct Dataverse Web API access (e.g., to add columns to existing tables that would conflict on solution import), extract the auth token from PAC CLI's MSAL cache:

```python
import json, os, platform
from pathlib import Path

# Token cache location varies by OS
if platform.system() == "Windows":
    cache_path = Path(os.environ["LOCALAPPDATA"]) / "Microsoft/PowerAppsCli/tokencache_msalv3.dat"
else:
    cache_path = Path.home() / ".local/share/Microsoft/PowerAppsCli/tokencache_msalv3.dat"

with open(cache_path) as f:
    data = json.load(f)
for _k, v in data["AccessToken"].items():
    if "your-org.crm6" in v.get("target", ""):
        return v["secret"]
```

> This avoids requiring a separate authentication flow for Web API calls.

### 7.4 Provisioning via Dataverse Web API

Alternative to solution import. Used by learntracker (`provision-dataverse.mjs`) and simquip (`provision-tables.py`):

```bash
# Authenticate via Azure CLI
az login
TOKEN=$(az account get-access-token --resource "https://your-org.crm6.dynamics.com/" --query accessToken -o tsv)

# Create table
curl -X POST "https://your-org.crm6.dynamics.com/api/data/v9.2/EntityDefinitions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"SchemaName": "redi_tablename", "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": "Table Name", "LanguageCode": 1033}]}, "HasActivities": false, "OwnershipType": "UserOwned"}'

# Add column
curl -X POST "https://your-org.crm6.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='redi_tablename')/Attributes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '...'

# Publish customizations
curl -X POST "https://your-org.crm6.dynamics.com/api/data/v9.2/PublishAllXml" \
  -H "Authorization: Bearer $TOKEN"
```

> **Idempotent**: Check for HTTP 409 (Conflict) = entity already exists. Skip and continue.

### 7.5 SharePoint List Provisioning

**Via Schema Deployer Flow** (govman):

```bash
curl -X POST "$SP_LIST_CREATOR_URL" \
  -H "Content-Type: application/json" \
  -d '{"listName":"MyList","columns":[{"name":"Status","required":true}]}'
```

> **CRITICAL (govman)**: The FlowLogs list MUST be provisioned FIRST. The Schema Deployer flow logs all deployments to FlowLogs. Without it, all other list creations fail with HTTP 500.

**Via SharePoint REST API** (when PnP.PowerShell is unavailable):

```powershell
$token = az account get-access-token --resource "https://healthqld.sharepoint.com" --query accessToken -o tsv
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json"; "Accept" = "application/json" }
Invoke-RestMethod -Uri "$siteUrl/_api/web/lists" -Method Post -Headers $headers -Body $body
```

> **PnP.PowerShell is NOT viable in environments without app-registration permissions** (confirmed in govman). Use SharePoint REST API with Azure CLI authentication instead.

---

## 8. Power Automate Integration

### 8.1 HTTP Trigger Flows as API Endpoints

Power Automate flows with HTTP triggers serve as the API layer for operations that cannot be done via the SDK connector alone.

**Four standard proxy flows** (used across govman, trolleys):

| Flow | Purpose | Default Timeout |
|------|---------|-----------------|
| PA Management | List/edit flows, connections, trigger URLs | 25s |
| SP CRUD Proxy | SharePoint list operations | 25s |
| DV CRUD Proxy | Dataverse CRUD operations | 25s |
| Schema Deployer | Create SharePoint lists from JSON schema | 60s |

### 8.2 SAS URL Authentication

All HTTP trigger endpoints use SAS-signed URLs. The URL IS the credential.

- **No Authorization header needed** — the HMAC signature is embedded in the query string
- **URLs change when a flow's HTTP trigger is recreated** (e.g., deleting and re-adding the trigger step, or recreating the flow). Simply editing and saving flow steps does NOT change the URL. Treat URLs as secrets.
- **No CSRF protection** — anyone with the URL can call the flow
- **No concurrency** — flows do not support parallel requests to the same endpoint

> **On 401/403**: Go to make.powerautomate.com, open the flow, copy the new trigger URL.

### 8.3 DV CRUD Proxy Usage

```bash
# List records
curl -X POST "$DV_TRIGGER_URL" -H "Content-Type: application/json" \
  -d '{"action":"list","entity":"redi_locations","filter":"redi_status eq 100000000","select":"redi_name,redi_status","top":50}'

# Get single record
curl -X POST "$DV_TRIGGER_URL" -H "Content-Type: application/json" \
  -d '{"action":"get","entity":"redi_locations","recordId":"<GUID>"}'

# Create record
curl -X POST "$DV_TRIGGER_URL" -H "Content-Type: application/json" \
  -d '{"action":"create","entity":"redi_locations","data":{"redi_name":"New Location","redi_status":100000000}}'

# Update record
curl -X POST "$DV_TRIGGER_URL" -H "Content-Type: application/json" \
  -d '{"action":"update","entity":"redi_locations","recordId":"<GUID>","data":{"redi_name":"Updated"}}'

# Delete record
curl -X POST "$DV_TRIGGER_URL" -H "Content-Type: application/json" \
  -d '{"action":"delete","entity":"redi_locations","recordId":"<GUID>"}'
```

### 8.4 Flow-to-Flow Communication

When editing flows programmatically, you MUST strip all `$authentication` and `authentication` keys from the flow definition before sending. The MCP server automates this via a sanitizer, but manual edits require awareness.

### 8.5 Performance

- Each Power Automate invocation adds **~0.6 seconds** of overhead plus network latency.
- **Use direct connector calls when possible** instead of routing through flows.
- HTTP trigger flows have **1-3 second cold-start latency** if not recently invoked.
- **30-second timeout** on HTTP Response actions.

### 8.6 Power Automate Environment Variables

Reference environment variables in flows as: `@environment('variableName')`

Standard variables used across projects:
- `redi_SurveySecret` — HMAC key for anonymous URL signing
- `redi_SurveyServeFlowUrl` — HTTP trigger URL for survey form serving
- `redi_ReportTemplateLibrary` — SharePoint URL to Word templates
- `redi_AdminEmail` — Admin notification email address

> **HTTP trigger URLs change if a flow is recreated** (not on save). Store in environment variables and monitor for breakage.

---

## 9. SharePoint Integration

### 9.1 SharePoint as Data Store

GovMan chose SharePoint Lists over Dataverse (ADR-001) to eliminate premium licensing costs. Tradeoffs:

| Advantage | Limitation |
|-----------|------------|
| No premium license required | 5,000-item view threshold |
| Simpler administration | No referential integrity |
| Native M365 integration | Max 12 lookup columns per list |
| Included in M365 licensing | No rollup/calculated fields |

### 9.2 SharePoint in Code Apps

```bash
pac code add-data-source -a "shared_sharepointonline" -c "<connectionId>" -t "<listId>" -d "<siteUrl>"
```

Generated services support full CRUD plus `getReferencedEntity()` for choice/lookup columns.

**Not supported**: Document processing APIs, permission changes, SharePoint forms integration.

**Known issue**: CORS issues with SharePoint images (GitHub issue #198).

### 9.3 SharePoint REST API (without PnP.PowerShell)

When PnP.PowerShell is unavailable (no app-registration permissions), use SharePoint REST API with Azure CLI:

```powershell
# Get Azure CLI token for SharePoint
$token = az account get-access-token --resource "https://yourtenant.sharepoint.com" --query accessToken -o tsv

# Create list
$body = @{ Title = "MyList"; BaseTemplate = 100 } | ConvertTo-Json
Invoke-RestMethod -Uri "$siteUrl/_api/web/lists" -Method Post -Headers @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
  "Accept" = "application/json"
} -Body $body
```

---

## 10. Deployment & ALM

### 10.1 Standard Deployment Workflow

```bash
# 1. Verify authentication
pac auth who

# 2. Build production bundle
npm run build

# 3. Deploy to Power Platform (into a named solution)
pac code push --solutionName MySolution

# 4. Verify in Power Apps Maker Portal
```

> **Code Apps are NOT saved to a solution by default.** Always use `--solutionName` during push, or manually add via Maker Portal → Solutions → Add existing → App → Code app.

### 10.2 Cross-Environment Promotion

```bash
# Export from source environment
pac solution export --name MySolution --path ./exports/MySolution.zip

# Create deployment settings for target environment
pac solution create-settings --solution-zip ./exports/MySolution.zip \
  --settings-file ./exports/deploy-settings.json

# Edit deploy-settings.json to map connection references to target environment

# Import to target environment
pac auth create --environment https://target-environment.crm.dynamics.com
pac solution import --path ./exports/MySolution.zip \
  --settings-file ./exports/deploy-settings.json
```

### 10.3 No ALM Tooling for Code Apps

Code Apps do NOT support:
- Solution Packager
- Power Platform Git integration
- Power Platform Build Tools for Azure DevOps (solution-level only)

**Source code MUST be managed separately in Git**, with the built bundle deployed through `pac code push`.

### 10.4 Rollback Strategy

During Code App migration (govman): Disable (don't delete) legacy flows for 2 weeks. If rollback is needed, re-enable the legacy flows.

---

## 11. Licensing & Limits

### 11.1 License Requirements

| Capability | License Required | Cost |
|---|---|---|
| Code App end-user access | Power Apps Premium | $20/user/month |
| Pay-As-You-Go | Power Apps PAYG | $10/active user/app/month |
| Per-app plan | **Discontinued** Jan 2, 2026 | N/A |
| M365 seeded licenses | **Do NOT include Code Apps** | N/A |
| Power Automate HTTP triggers | Premium connector | Per-user plan required |

### 11.2 API Request Limits

| Limit | Threshold |
|---|---|
| Power Apps Premium | 40,000 requests per 24 hours |
| Per-app plan (legacy) | 6,000 requests per 24 hours |
| Service protection | 5-minute sliding window (concurrent connections, requests, execution time) |
| Throttled response | HTTP 429 with `Retry-After` header |

> **MUST implement exponential backoff** for 429 errors. Recommended: 3 retries with 1s, 2s, 4s delays. Only retry on 429 or 5xx.

### 11.3 Power Automate Limits

- Flow runs per 24 hours: depends on license tier
- HTTP Response action timeout: 30 seconds
- Flow-to-flow HTTP call latency: 200-500ms
- Each invocation costs one premium connector action

---

## 12. Common Pitfalls Quick Reference

| # | Pitfall | Symptom | Fix | Repos |
|---|---------|---------|-----|-------|
| 1 | `BrowserRouter` | Routes 404 after deploy | Use `HashRouter` | trolleys, simquip |
| 2 | Vite `base: '/'` | Assets 404 after deploy | Set `base: './'` | trolleys, simquip |
| 3 | Wrong EntitySetName | HTTP 404/500 on data ops | Verify from solution XML | trolleys, simquip |
| 4 | String choice values | HTTP 500 on create/update | Use integers (100000000+) | trolleys, simquip |
| 5 | Direct lookup GUID in write | HTTP 500 on create/update | Use `@odata.bind` format | trolleys |
| 6 | `fetch()` to external URL | CORS error | Use SDK DataClient | trolleys, govman |
| 7 | Hardcoded user info | Shows placeholder | Use `getContext()` | trolleys |
| 8 | Read lookup as `redi_field` | Returns undefined | Read as `_redi_field_value` | trolleys |
| 9 | Tables renamed on import | SDK calls fail | Check import log for renames | trolleys |
| 10 | Missing `dataSourcesInfo` path alias | DataClient fails to init | Add `@power` alias to tsconfig + vite | trolleys |
| 11 | `.power/schemas` not in tsconfig include | TypeScript compile errors | Add to `include` array | trolleys |
| 12 | Dev build deployed | Blocked or oversized | Always `npm run build` first | ALL |
| 13 | Not in solution | Can't export/promote | Use `--solutionName` on push | ALL |
| 14 | Fetching all data at startup | Hits API limits, slow | Use server-side filter + pagination | ALL |
| 15 | Rollup via API | Silently fails | Manual Maker Portal config only | learntracker |
| 16 | PnP.PowerShell | Auth fails | Use SP REST API + Azure CLI | govman |
| 17 | FlowLogs not first | All schema deploys fail 500 | Provision FlowLogs list first | govman |
| 18 | Chrome localhost block | SDK dev broken | Configure `LocalNetworkAccessAllowedForUrls` | ALL |
| 19 | Port not 3000 | SDK middleware fails | Set `server.port: 3000` in vite config | ALL |
| 20 | No SDK init | All data ops fail | Wrap app in PowerProvider | ALL |
| 21 | Guessing EntitySetNames | HTTP 404/500 on data ops | Download and search `$metadata` document | ALL |

---

## 13. Recurring Cross-Project Issues

These issues occurred in **multiple** repositories independently, confirming they are systemic rather than project-specific.

### Tier 1: Occurred in 3-4 Repositories

| Issue | Description | Impact |
|---|---|---|
| **PAC CLI as only deploy method** | Every repo independently documented that `pac code push` is the ONLY supported deployment method, with identical recovery steps and identical "stop if unavailable" guardrails. | Deployment failure if alternative methods attempted |
| **SDK initialization required** | Every Code App project hit failures from missing `initialize()` / `getContext()` calls. The PowerProvider wrapper pattern was independently developed in each repo. | Silent data operation failures |
| **Port 3000 requirement** | Documented in simquip, govman, and trolleys. Not immediately obvious; causes cryptic SDK middleware errors. | Local development completely broken |
| **Code Apps not in solution** | trolleys, simquip, and govman all documented that Code Apps are NOT automatically added to solutions, requiring `--solutionName` flag or manual addition. | Cannot promote between environments |
| **Premium license requirement** | All repos documented the $20/user/month requirement and that M365 seeded licenses do NOT include Code Apps. | Budget planning errors |
| **Chrome localhost blocking** | Dec 2025+ browser change documented in simquip, govman, trolleys. Requires enterprise policy configuration. | Local development broken in managed environments |
| **$metadata as source of truth** | The CSDL `$metadata` document at `/api/data/v9.2/$metadata` is the definitive schema for all EntityTypes, Properties, NavigationProperties, Actions, and Functions. All names are case-sensitive. ALWAYS consult before writing Web API code. | Silent failures from wrong names, 404/500 errors |

### Tier 2: Occurred in 2-3 Repositories

| Issue | Description | Impact |
|---|---|---|
| **EntitySetName pluralization** | trolleys and simquip independently discovered and documented naive `s` appending. Both built workarounds. | Every data operation fails until corrected |
| **Choice fields: integers not strings** | trolleys and simquip independently hit HTTP 500 from string values. Both documented the 100000000+ convention. | Record creation/update fails |
| **HashRouter + relative base** | trolleys and simquip independently discovered that BrowserRouter and absolute base paths break Code Apps. | All routes and assets 404 after deploy |
| **CORS blocks fetch()** | trolleys and govman documented that direct `fetch()` is blocked in the Code App iframe. | External API integration impossible without flows |
| **Schema-driven provisioning** | trolleys, simquip, and learntracker all independently built JSON-schema-to-Dataverse provisioning pipelines. | N/A (convergent solution) |
| **Tiered table creation** | simquip and trolleys both built dependency-ordered creation with circular reference fixup phases. | Tables fail to create if dependencies missing |
| **SAS URL expiration** | govman and trolleys documented that HTTP trigger URLs expire on flow republish with no auto-propagation mechanism. | API integrations silently break |
| **Power Automate 0.6s overhead** | Documented across multiple repos. Led to architectural preference for direct connector calls over flow invocations. | Cumulative latency in flow-heavy architectures |
| **Auto-generated service issues** | trolleys documented syntax errors in generated services. simquip found only 1 of 10 data sources generated typed services. | Requires custom service layer |

### Tier 3: Significant Single-Project Lessons with Cross-Project Relevance

| Issue | Source Repo | Relevance |
|---|---|---|
| Rollup fields cannot be automated | learntracker | Any project using Dataverse rollups |
| Multi-hop rollup workaround (calculated intermediates) | learntracker | Any project with deep entity relationships |
| Shared table column prefix strategy (`redi_sq_*`) | simquip | Any shared Dataverse environment |
| PnP.PowerShell not viable without app permissions | govman | Any QLD Health / restricted tenant environment |
| FlowLogs-first provisioning ordering | govman | Any project using Schema Deployer flow |
| Tables renamed on import (`redi_issue` → `redi_taissue`) | trolleys | Any project with tables that conflict with system names |
| Lookup field read/write asymmetry | trolleys | Any project using Dataverse lookups (all of them) |

---

## Appendix A: Recommended Project Structure

```
my-code-app/
├── .power/                    # Auto-generated by pac code init
│   └── schemas/
│       ├── appschemas/
│       │   └── dataSourcesInfo.ts
│       └── commondataserviceforapps/
│           └── commondataserviceforapps.Schema.json
├── src/
│   ├── generated/             # Auto-generated by pac code add-data-source
│   │   ├── models/
│   │   └── services/
│   ├── services/              # Custom service layer (recommended over generated)
│   │   ├── dataClient.ts      # DataClient singleton
│   │   ├── dvMapping.ts       # Bidirectional field mapping
│   │   └── entityService.ts   # Generic CRUD service factory
│   ├── contexts/
│   │   └── ServiceContext.tsx  # Service registry provider
│   ├── components/
│   ├── pages/
│   ├── PowerProvider.tsx       # SDK initialization wrapper
│   └── App.tsx                # HashRouter + provider chain
├── scripts/
│   ├── schema.json            # Declarative Dataverse table definitions
│   ├── generate_solution.py   # Schema → solution XML generator
│   └── seed-dataverse.mjs     # Reference data seeding
├── docs/
│   ├── data-dictionary.md     # Complete entity/field definitions
│   └── deployment-runbook.md  # Step-by-step deployment guide
├── power.config.json          # Power Platform app configuration
├── package.json
├── vite.config.ts             # base: './', port: 3000, @power alias
├── tsconfig.app.json          # includes .power/schemas, @power path alias
└── CLAUDE.md                  # Agent instructions
```

## Appendix B: Environment Details (REdI Development)

| Property | Value |
|---|---|
| Environment URL | `https://redi.crm6.dynamics.com` |
| Environment ID | `a67592d2-e775-e14c-bb5a-6366576198ca` |
| Tenant ID | `0b65b008-95d7-4abc-bafc-3ffc20c039c0` |
| Publisher Prefix | `redi` |
| Option Value Prefix | `91352` |
| Region | `prod` (Australia) |
| Auth User | `Sean.Wing@health.qld.gov.au` |

---

## 14. CSDL $metadata Reference

The CSDL (Common Schema Definition Language) `$metadata` document is the **authoritative source of truth** for every table, field, relationship, action, and function available in a Dataverse environment's Web API.

### 14.1 Critical Directives

| # | Directive | Severity |
|---|-----------|----------|
| 1 | **ALWAYS consult the `$metadata` document to verify exact EntityType names, Property names, NavigationProperty names, and EntitySetNames before writing any Web API code.** All names are case-sensitive. | CRITICAL |
| 2 | **ALWAYS use `?annotations=true`** when downloading `$metadata` for reference. Annotations add field descriptions, read-only markers, and display names. | HIGH |
| 3 | **NEVER assume EntitySetName equals the table logical name plus "s".** Always verify from the `EntityContainer/EntitySet` element in `$metadata` or the service document root. | CRITICAL |
| 4 | **NEVER assume OptionSet/choice field values are in the `$metadata` EnumTypes.** Business table choice values (100000000+) are NOT in the CSDL. Query the `EntityDefinitions` metadata API instead. | HIGH |
| 5 | **ALWAYS use NavigationProperty names (not lookup property names) when setting lookup values.** The `$metadata` shows the `ReferentialConstraint` mapping between `_field_value` (read-only) and the NavigationProperty (writable). | CRITICAL |

### 14.2 Endpoint URL

```
https://{org}.crm{N}.dynamics.com/api/data/v9.2/$metadata?annotations=true
```

Where `{N}` is the regional datacenter number (e.g., `6` for Oceania/Australia, blank for North America). See [Datacenter regions](https://learn.microsoft.com/en-us/power-platform/admin/new-datacenter-regions).

**REdI Development environment:**
```
https://redi.crm6.dynamics.com/api/data/v9.2/$metadata?annotations=true
```

The **service document root** (JSON list of all EntitySets) is at:
```
https://redi.crm6.dynamics.com/api/data/v9.2/
```

> This is an authenticated endpoint. A valid OAuth 2.0 Bearer token with Dataverse access is required.

### 14.3 What the $metadata Document Contains

The document is XML in the `Microsoft.Dynamics.CRM` namespace (aliased as `mscrm`). Key elements:

| Element | Purpose | Example |
|---------|---------|---------|
| `EntityType` | Table definition with Key, Properties, NavigationProperties | `<EntityType Name="account">` |
| `Property` | Column definition with type | `<Property Name="name" Type="Edm.String"/>` |
| `NavigationProperty` | Relationship definition | `<NavigationProperty Name="primarycontactid" Type="mscrm.contact"/>` |
| `EntityContainer/EntitySet` | Maps EntityType to queryable URL segment | `<EntitySet Name="accounts" EntityType="mscrm.account"/>` |
| `Action` | POST operation (may have side effects) | `<Action Name="WinOpportunity">` |
| `Function` | GET operation (no side effects) | `<Function Name="WhoAmI">` |
| `ComplexType` | Keyless structured return type | `<ComplexType Name="WhoAmIResponse">` |
| `EnumType` | System-level enumeration | `<EnumType Name="AccessRights">` |

### 14.4 Common Lookup Patterns in $metadata

**Reading a lookup** (from `Property`):
```xml
<Property Name="_primarycontactid_value" Type="Edm.Guid"/>
```
The `_name_value` pattern indicates a read-only computed GUID for the lookup foreign key.

**Writing a lookup** (from `NavigationProperty`):
```xml
<NavigationProperty Name="primarycontactid" Type="mscrm.contact" Partner="account_primary_contact">
  <ReferentialConstraint Property="_primarycontactid_value" ReferencedProperty="contactid"/>
</NavigationProperty>
```
The `ReferentialConstraint` maps the read-only `_primarycontactid_value` to the writable `primarycontactid` NavigationProperty.

**In API calls:**
```javascript
// READ — returns _primarycontactid_value (GUID)
GET /api/data/v9.2/accounts(id)?$select=_primarycontactid_value

// WRITE — use NavigationProperty with @odata.bind
PATCH /api/data/v9.2/accounts(id)
{ "primarycontactid@odata.bind": "/contacts(target-guid)" }
```

### 14.5 Querying OptionSet/Choice Values

The `$metadata` EnumTypes section contains only **system-level** enumerations (e.g., `AccessRights`, `ComponentType`). Business table choice values are NOT included.

**To retrieve choice values for a specific field:**
```
GET /api/data/v9.2/EntityDefinitions(LogicalName='redi_tablename')/Attributes(LogicalName='redi_fieldname')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)
```

**To retrieve a global option set:**
```
GET /api/data/v9.2/GlobalOptionSetDefinitions(Name='redi_optionsetname')
```

### 14.6 Downloading the $metadata Document

#### Via PowerShell (Az Module)

```powershell
$environmentUrl = 'https://redi.crm6.dynamics.com/'
$writeFileTo    = './metadata/redi-metadata.xml'

# Authenticate via Azure CLI / Az Module
if ($null -eq (Get-AzTenant -ErrorAction SilentlyContinue)) {
   Connect-AzAccount | Out-Null
}

# Get token
$secureToken = (Get-AzAccessToken -ResourceUrl $environmentUrl -AsSecureString).Token
$token = ConvertFrom-SecureString -SecureString $secureToken -AsPlainText

# Download
$xmlHeaders = @{
   'Authorization'    = 'Bearer ' + $token
   'Accept'           = 'application/xml'
   'OData-MaxVersion' = '4.0'
   'OData-Version'    = '4.0'
}

$doc = [xml](Invoke-WebRequest `
   -Uri ($environmentUrl + 'api/data/v9.2/$metadata?annotations=true') `
   -Method Get -Headers $xmlHeaders).Content

# Pretty-print and save
$StringWriter = New-Object System.IO.StringWriter
$XmlWriter = New-Object System.Xml.XmlTextWriter $StringWriter
$xmlWriter.Formatting = 'indented'
$xmlWriter.Indentation = 2
$doc.WriteContentTo($XmlWriter)
$XmlWriter.Flush(); $StringWriter.Flush()
Set-Content -Path $writeFileTo -Value $StringWriter.ToString()
```

#### Via PAC CLI Token Extraction + curl

Reuse the token extraction method from Section 7.3:

```bash
# Extract token from PAC CLI MSAL cache (see Section 7.3)
TOKEN=$(python3 -c "
import json, os, platform
from pathlib import Path
if platform.system() == 'Windows':
    p = Path(os.environ['LOCALAPPDATA']) / 'Microsoft/PowerAppsCli/tokencache_msalv3.dat'
else:
    p = Path.home() / '.local/share/Microsoft/PowerAppsCli/tokencache_msalv3.dat'
data = json.load(open(p))
for k, v in data['AccessToken'].items():
    if 'redi.crm6' in v.get('target', ''):
        print(v['secret']); break
")

# Download $metadata
curl -s "https://redi.crm6.dynamics.com/api/data/v9.2/\$metadata?annotations=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/xml" \
  -o metadata/redi-metadata.xml
```

> **Tip**: VS Code may warn about XML symbol limits on large `$metadata` files. Set `xml.symbols.maxItemsComputed` to `500000` in VS Code settings.

### 14.7 Using $metadata for LLM Agents

| Task | How to Find in $metadata |
|------|--------------------------|
| Find EntitySetName for a table | Search `<EntitySet Name="` within `<EntityContainer>` for the matching `EntityType` |
| Verify field name and type | Search `<Property Name="fieldname"` within the `<EntityType>` block |
| Find NavigationProperty for a lookup | Search `<NavigationProperty Name="` within the `<EntityType>` block |
| Determine lookup read/write mapping | Read the `<ReferentialConstraint>` inside the `<NavigationProperty>` |
| Find Action/Function signature | Search `<Action Name="` or `<Function Name="` at the top level |
| Check if an action is bound or unbound | `IsBound="true"` = entity-specific; absent = unbound (global) |
| Find return type of a function | Read the `<ReturnType>` element — may reference a `ComplexType` |
| Identify collection vs single navigation | `Type="Collection(mscrm.entity)"` = one-to-many; `Type="mscrm.entity"` = many-to-one |

**Directive for agents**: When building or debugging Dataverse Web API calls, ALWAYS download and search the `$metadata` document BEFORE guessing at EntitySetNames, field names, or relationship navigation paths. The `$metadata` is the contract — runtime behavior matches it exactly.

### 14.8 Key Gotchas

| Gotcha | Detail |
|--------|--------|
| **Case sensitivity** | ALL names are case-sensitive. `Account` ≠ `account`. Property names are lowercase. NavigationProperty names are mixed case. |
| **EntitySetName ≠ LogicalCollectionName** | `EntitySetName` is customisable and is what you use in API URLs. `LogicalCollectionName` is the SDK name (usually identical, not guaranteed). |
| **Document size** | Without annotations: 2-5 MB. With `?annotations=true`: significantly larger. Environment-specific — custom tables/fields from solutions appear. |
| **Lookup properties are read-only** | `_field_value` properties are `Edm.Guid` and computed. To SET a lookup, use the NavigationProperty with `@odata.bind`. |
| **Polymorphic lookups** | One `_customerid_value` may map to MULTIPLE NavigationProperties (e.g., `customerid_account`, `customerid_contact`). |
| **Many-to-many intersect tables** | Exist as EntityTypes but all properties are read-only. Operate on collection-valued NavigationProperties instead. |
| **API version matters** | `v9.2` is current. The `$metadata` varies slightly between versions. Always use `v9.2`. |
| **PAC CLI has no token export** | There is NO `pac auth token` command. Extract from MSAL cache (Section 7.3) or use Az PowerShell / Azure CLI. |

### 14.9 External References

| Resource | URL |
|----------|-----|
| Web API Service Documents (Microsoft) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-service-documents |
| Web API Types and Operations | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-types-operations |
| Web API Navigation Properties | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-navigation-properties |
| Web API Properties | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-properties |
| Web API Actions | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-actions |
| Web API Functions | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-functions |
| Web API Complex & Enum Types | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/web-api-complex-enum-types |
| Query Table Definitions (Metadata API) | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-metadata-web-api |
| Use PowerShell with Dataverse Web API | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/use-ps-and-vscode-web-api |
| Authenticate to Dataverse Web API | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/authenticate-web-api |
| OData CSDL XML v4.01 (OASIS Standard) | https://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html |
| Dataverse Web API Reference | https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/about |

---

*This document is maintained in the [ConsolidatedLessons](https://github.com/drseanwing/ConsolidatedLessons) repository and distributed to all REdI Code App projects.*
