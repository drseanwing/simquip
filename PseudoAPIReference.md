# Power Automate Management API and Actions: Complete Reference

**Power Automate flows can be created, edited, and managed programmatically through three distinct API surfaces**: the Power Automate Management connector (built-in actions usable within flows), the Dataverse Web API (officially supported for solution-aware flows), and the legacy `api.flow.microsoft.com` REST API (unsupported but widely used). The most critical pain point in programmatic flow management is **connectionReferences handling during Update Flow operations**, which suffers from multiple known bugs including duplicate key collisions and authentication property validation failures. This document provides the complete reference needed to programmatically manage flows, navigate these issues, and apply proven workarounds.

---

## The three API surfaces and when to use each

Microsoft offers three approaches for programmatic flow management, each with distinct capabilities and trade-offs.

### 1. Power Automate Management connector (Standard connector)

The **Power Automate Management** connector is a Standard-tier connector usable inside Power Automate flows, Power Apps, and Copilot Studio. It exposes **20+ actions** for flow CRUD, ownership management, and run control. Authentication uses Microsoft Entra ID Integrated (first party) or Client Certificate Auth for service principals (admin actions only).

**Throttling limits are strict**: 5 API calls per connection per 60 seconds, 300 non-GET requests per connection per 3,600 seconds, and a maximum of 50 connections per account.

### 2. Dataverse Web API (officially supported)

The Dataverse Web API at `https://{org}.{region}.dynamics.com/api/data/v9.2/workflows` is the **only officially supported** code-based approach. Flows are stored as rows in the **Process (workflow) table** with the flow definition in the `clientdata` column as stringified JSON. This approach **only works for solution-aware flows** — Microsoft explicitly states that managing flows under "My Flows" is not supported with code.

### 3. api.flow.microsoft.com REST API (unsupported but functional)

The REST API at `https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/` is what the Management connector uses internally. Microsoft warns: *"The API at api.flow.microsoft.com isn't supported. Customers should instead use the Dataverse Web APIs. These APIs are subject to change, so breaking changes could occur."* Despite this, it remains the most feature-complete API for both solution and non-solution flows.

| API Surface | Supported? | Solution Flows | Non-Solution Flows | Best For |
|---|---|---|---|---|
| Management Connector | Yes | Yes | Yes | Within-flow automation |
| Dataverse Web API | **Officially supported** | Yes | **No** | ALM, CI/CD, service-principal operations |
| api.flow.microsoft.com | **No** (use at own risk) | Yes | Yes | Full-feature programmatic access |

---

## Flow Management connector: complete action reference

The connector (Operation Group: `flowmanagement`) provides these actions:

| Action | Operation ID | Description |
|---|---|---|
| **Create Flow** | `CreateFlow` | Create a new flow in an environment |
| **Update Flow** | `UpdateFlow` | Update an existing flow's definition |
| **Get Flow** | `GetFlow` | Retrieve full flow details + definition |
| **Get Flow as Admin** | `AdminGetFlow` | Get flow with admin privileges (optional `includeFlowDefinition` parameter) |
| **Delete Flow** | `DeleteFlow` | Delete a flow |
| **List My Flows** | `ListMyFlows` | List flows the current user created |
| **List Flows as Admin (V2)** | `ListFlowsInEnvironment_V2` | High-performance admin listing (no definition included) |
| **Turn On Flow** | `StartFlow` | Enable/activate a flow |
| **Turn Off Flow** | `StopFlow` | Disable/deactivate a flow |
| **Cancel Flow Run** | `CancelFlowRun` | Cancel a running flow instance |
| **Resubmit Flow** | `ResubmitFlow` | Resubmit a previous flow run |
| **List Flow Owners** | `ListFlowOwners` | List all owners of a flow |
| **Modify Flow Owners** | `ModifyFlowOwners` | Add/remove flow owners |
| **Modify Flow Owners as Admin** | `AdminModifyFlowOwners` | Admin-level owner management |
| **List Flow Run-Only Users** | `ListFlowUsers` | List run-only users |
| **Modify Run-Only Users** | `ModifyRunOnlyUsers` | Add/remove run-only users |
| **List Callback URL** | `ListCallbackUrl` | Get callback URL for manual triggers |
| **List My Environments** | `ListUserEnvironments` | List accessible environments |
| **List Connectors** | `ListApis` | List all connectors in environment |
| **Create Connection** | `CreateConnection` | Create a connection for a connector |
| **List My Connections** | `ListConnections` | List connections in environment |
| **Restore Deleted Flow as Admin** | `AdminRestoreFlow` | Restore a soft-deleted flow |

### Create Flow action parameters

The Create Flow action (`CreateFlow`) accepts a `FlowWithConnectionReferences` object:

| Parameter | Key | Required | Type |
|---|---|---|---|
| Environment | `environmentName` | Yes | string (GUID) |
| Flow Display Name | `displayName` | Yes | string |
| Flow State | `state` | Yes | string (`Started` or `Stopped`) |
| Flow Definition | `definition` | Yes | object (JSON) |
| Connection References | (nested object) | Conditional | object (JSON) |
| Creator tenant ID | `tenantId` | Yes | string |
| Creator user ID | `userId` | Yes | string |
| Creator user type | `userType` | Yes | string |

In practice, **five parameters** matter most: Environment, Flow Display Name, Flow Definition, Flow State, and Connection References. The action returns a `Flow` object containing `name` (the new flow's GUID), `properties/displayName`, `properties/state`, and other metadata.

### Update Flow action parameters

Identical to Create Flow, **plus** a required `flowName` parameter (GUID of the target flow). The action accepts the same `FlowWithConnectionReferences` body. Via the Dataverse Web API alternative, updates use `PATCH` and only require the properties being changed.

### Get Flow return structure

The Get Flow action returns the complete flow object at `body/properties/definition` (full JSON) along with:

```
body/name                              → Flow GUID
body/properties/displayName            → Display name
body/properties/state                  → Started/Stopped
body/properties/connectionReferences   → Array of connection references
body/properties/definition             → Full workflow definition JSON
body/properties/createdTime            → ISO datetime
body/properties/lastModifiedTime       → ISO datetime
body/properties/flowTriggerUri         → Trigger URI
body/properties/creator                → UserIdentity object
body/properties/definitionSummary      → Summary of triggers/actions
```

Access nested properties in expressions:
```
outputs('Get_Flow')?['body/properties/definition']
outputs('Get_Flow')?['body/properties/definition/triggers/When_an_item_is_created/inputs/parameters/dataset']
```

---

## Flow definition JSON schema (the clientdata structure)

Every flow's definition is stored as a JSON structure called **clientdata**. In the Dataverse `workflow` table, this is a stringified JSON string in the `clientdata` column. When used via the Management connector, it maps to the `definition` and `connectionReferences` parameters.

### Top-level structure

```json
{
  "properties": {
    "connectionReferences": { ... },
    "definition": { ... }
  },
  "schemaVersion": "1.0.0.0"
}
```

### The connectionReferences section

Each key is a connector identifier mapping to connection details:

```json
"connectionReferences": {
  "shared_sharepointonline": {
    "runtimeSource": "embedded",
    "connection": {
      "name": "shared-sharepointonl-ceefa1df-44c6-4e6f-800b-ca17dbda",
      "connectionReferenceLogicalName": "soln_sharedsharepointonline_34ba4"
    },
    "api": {
      "name": "shared_sharepointonline"
    }
  },
  "shared_office365": {
    "runtimeSource": "embedded",
    "connection": {
      "name": "shared-office365-3bf72576-f215-4852-db33f170"
    },
    "api": {
      "name": "shared_office365"
    }
  }
}
```

Key properties per entry: **`runtimeSource`** is `"embedded"` (creator's connection) or `"invoker"` (run-only user's connection). **`connection.name`** is the connection identifier string. **`connection.connectionReferenceLogicalName`** is the Dataverse logical name (solution-aware flows only). **`api.name`** is the connector API name.

### The definition section

Uses the **Azure Logic Apps Workflow Definition Language** schema:

```json
"definition": {
  "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "$connections": { "defaultValue": {}, "type": "Object" },
    "$authentication": { "defaultValue": {}, "type": "SecureObject" }
  },
  "triggers": { ... },
  "actions": { ... },
  "outputs": {}
}
```

### How JSON maps to the visual designer

| JSON Section | Visual Designer Element |
|---|---|
| `triggers` | Trigger card at top of flow |
| `actions` | Each action card in the flow |
| `runAfter` | Arrows/connections between cards (execution order) |
| `host.operationId` | The specific action selected (e.g., "SendEmailV2") |
| `host.connectionName` | Links back to `connectionReferences` key |
| `host.apiId` | The connector being used |
| `parameters` | The fields filled in on each action card |
| `type` | Action type: `OpenApiConnection`, `Request`, `Compose`, `If`, `Foreach`, etc. |
| `recurrence` | Polling/recurrence settings on triggers |

### Trigger examples

**Manual/Button trigger:**
```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "Button",
    "inputs": {
      "schema": { "type": "object", "properties": {}, "required": [] }
    }
  }
}
```

**SharePoint "When an item is created" trigger:**
```json
"triggers": {
  "When_an_item_is_created": {
    "recurrence": { "frequency": "Minute", "interval": 3 },
    "splitOn": "@triggerOutputs()?['body/value']",
    "type": "OpenApiConnection",
    "inputs": {
      "host": {
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
        "connectionName": "shared_sharepointonline",
        "operationId": "GetOnNewItems"
      },
      "parameters": {
        "dataset": "https://contoso.sharepoint.com/",
        "table": "e134069a-5a16-4602-bdd5-7f1fec27d45a"
      },
      "authentication": "@parameters('$authentication')"
    }
  }
}
```

**Dataverse webhook trigger:**
```json
"triggers": {
  "When_a_row_is_added_modified_or_deleted": {
    "type": "OpenApiConnectionWebhook",
    "inputs": {
      "host": {
        "connectionName": "shared_commondataserviceforapps",
        "operationId": "SubscribeWebhookTrigger",
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
      },
      "parameters": {
        "subscriptionRequest/message": 4,
        "subscriptionRequest/entityname": "account",
        "subscriptionRequest/scope": 4
      }
    }
  }
}
```

### Action examples

```json
"actions": {
  "Send_an_email_(V2)": {
    "runAfter": {},
    "type": "OpenApiConnection",
    "inputs": {
      "host": {
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365",
        "connectionName": "shared_office365",
        "operationId": "SendEmailV2"
      },
      "parameters": {
        "emailMessage/To": "@triggerOutputs()?['body/Author/Email']",
        "emailMessage/Subject": "New Item Created!",
        "emailMessage/Body": "<p>A new item was created.</p>"
      },
      "authentication": "@parameters('$authentication')"
    }
  }
}
```

The **`runAfter`** object controls execution order. An empty `{}` means "run immediately after the trigger." To run after another action: `"runAfter": { "Previous_Action": ["Succeeded"] }`. Possible statuses: `Succeeded`, `Failed`, `Skipped`, `TimedOut`.

---

## Connection references: the critical pain point

This is the most problematic area of programmatic flow management. The connectionReferences system behaves differently across the Management connector, Dataverse API, and REST API, and the **Update Flow action has multiple known bugs** when connectionReferences are included.

### Embedded connections vs connection references

| Aspect | Embedded Connections | Connection References |
|---|---|---|
| Context | Non-solution flows ("My Flows") | Solution-aware flows |
| Storage | Connection details inline in flow definition | Reference component in Dataverse; flow references by logical name |
| JSON format | `"connectionName": "<guid>", "source": "Embedded", "id": "..."` | `"runtimeSource": "embedded", "connection": {"name": "...", "connectionReferenceLogicalName": "..."}, "api": {"name": "..."}` |
| Deployment | Must reconfigure each connection per action in new environment | Change reference once → all flows updated |
| Managed layers | Changing connections creates unmanaged layers | Changing connection on reference does NOT create unmanaged layer |

### Known bug #1: duplicate connectionReferences key collision

**This is the most commonly reported failure.** The Management connector's Get Flow action returns connectionReferences as a **flat array**, but when a flow uses the same connector multiple times (e.g., two SQL Server connections), duplicate entries appear. When this array is fed into Create Flow or Update Flow, the system attempts to convert it back to a keyed object, and **duplicate keys collide**.

**Exact error:**
```
Can not add property shared_sql to Newtonsoft.Json.Linq.JObject.
Property with the same name already exists on object.
```

**Root cause:** Internally, flows maintain separate connection objects like `shared_sql` and `shared_sql_1`, but the array format returned by Get Flow loses this distinction. Removing duplicates causes some actions to lose their associated connection. This bug **makes it impossible to reliably copy, update, or restore flows** that use multiple connections to the same connector.

### Known bug #2: authentication property validation failure

When using Create Flow or Update Flow with flow definitions containing certain action types (Approvals, Get File Properties, and others), the action fails with:

```
Flow save failed with code 'WorkflowRunActionInputsInvalidProperty'
and message 'The inputs of workflow run action 'Create_Flow' of type
'OpenApiConnection' should not have the property 'authentication'.'
```

Community reports indicate the Create Flow action works for **simple flow definitions** but fails with complex flows containing branches, multiple conditionals, or certain connector actions. As one community member stated: *"This breaks on several fronts — Get File Properties, Approvals. It renders the update flow and create flow power automate management actions unusable."*

### Known bug #3: InvokerConnectionOverrideFailed

When a flow is updated but apps or other flows referencing it retain old metadata:

```json
{
  "code": "InvokerConnectionOverrideFailed",
  "message": "Failed to parse invoker connections from trigger 'manual' outputs.
  Could not find any valid connection for connection reference name '<name>'
  in APIM tokens header."
}
```

### Known bug #4: ConnectionAuthorizationFailed

The user performing the update must have permissions to **all** connections referenced in the flow. This is especially problematic when programmatically updating flows owned by service accounts or when connections are owned by different users.

### Connection prerequisites

**Connections must exist before being referenced.** A connection reference is metadata pointing to a connection. During solution import, connections must be provided for all references. If a connection reference has no `connectionid` assigned, flows using it will fail. Common failure causes include expired tokens, removed connection links, and the "refresh token has expired due to inactivity" error.

### Six workarounds for connectionReferences issues

**Workaround A — Use the Dataverse Web API directly.** Bypass the Management connector entirely. Write the `clientdata` as a raw stringified JSON string, giving complete control over the connectionReferences format with no connector-imposed transformation:

```http
PATCH [Org URI]/api/data/v9.2/workflows(<workflowid>)
Content-Type: application/json

{
  "clientdata": "{\"properties\":{\"connectionReferences\":{...},\"definition\":{...}},\"schemaVersion\":\"1.0.0.0\"}"
}
```

**Workaround B — Manage connectionReferences separately.** Parse and clean connectionReferences from the Get Flow output before passing to Update Flow. Map the array format back to the keyed object format manually, preserving `shared_sql` vs `shared_sql_1` distinctions.

**Workaround C — Re-create flows instead of updating.** Delete the existing flow, create a new one with the cleaned definition, re-assign ownership and sharing, then turn on the new flow. **Caveat:** This changes the flow's GUID, breaking references from Power Apps, other flows, or bookmarks.

**Workaround D — Update connection references via the Dataverse connectionreference table.** The `connectionreference` table can be updated directly to change which connection a reference points to, without modifying the flow definition at all. Query the table, update the `connectionid` column, and all flows using that reference automatically use the new connection.

**Workaround E — Use the .NET SDK for Dataverse.** Programmatically update the `clientdata` column with full control:

```csharp
var workflow = new Entity("workflow") {
    Id = workflowId,
    Attributes = {
        {"clientdata", "<full clientdata JSON string>"},
        {"statecode", new OptionSetValue(0)}
    }
};
service.Update(workflow);
```

**Workaround F — Use PAC CLI with deployment settings.** Export/import solutions with a deployment settings file that maps connection references:

```json
{
  "ConnectionReferences": [
    {
      "LogicalName": "tst_sharedconnector_b4cc7",
      "ConnectionId": "4445162937b84457a3465d2f0c2cab7e",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_connector"
    }
  ]
}
```

---

## REST API endpoints reference

### api.flow.microsoft.com endpoints (unsupported but functional)

**Base URL:** `https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple`
**API Version:** `api-version=2016-11-01`
**Regional variants:** `https://emea.api.flow.microsoft.com`, `https://unitedstates.api.flow.microsoft.com`

| Operation | Method | Endpoint |
|---|---|---|
| List Flows | GET | `/environments/{envId}/flows` |
| List Flows (Admin) | GET | `/scopes/admin/environments/{envId}/flows` |
| Get Flow | GET | `/environments/{envId}/flows/{flowId}` |
| Get Flow (Expanded) | GET | `/environments/{envId}/flows/{flowId}?$expand=swagger,properties.connectionreferences.apidefinition,properties.definitionSummary.operations.apiOperation,operationDefinition,plan,properties.throttleData` |
| Create Flow | POST | `/environments/{envId}/flows` |
| Update Flow | PATCH | `/environments/{envId}/flows/{flowId}` |
| Delete Flow | DELETE | `/environments/{envId}/flows/{flowId}` |
| Enable Flow | POST | `/environments/{envId}/flows/{flowId}/start` |
| Disable Flow | POST | `/environments/{envId}/flows/{flowId}/stop` |
| List Flow Runs | GET | `/environments/{envId}/flows/{flowId}/runs` |
| Cancel Flow Run | POST | `/environments/{envId}/flows/{flowId}/runs/{runId}/cancel` |
| Resubmit Flow Run | POST | `/environments/{envId}/flows/{flowId}/triggers/manual/histories/{runId}/resubmit` |

All endpoints require `?api-version=2016-11-01` appended.

### Authentication for api.flow.microsoft.com

**Resource/Audience:** `https://service.flow.microsoft.com/`
**Token endpoint:** `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
**Required scope:** `https://service.flow.microsoft.com//.default`

Register an Azure AD app, add API permissions for **Flow Service** (`Flows.Manage.All`, `Flows.Read.All`), grant admin consent, then obtain tokens via authorization code flow or client credentials flow:

```
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
client_id={appId}&scope=https://service.flow.microsoft.com//.default
&grant_type=client_credentials&client_secret={secret}
```

Use the token: `Authorization: Bearer {access_token}`

### Dataverse Web API endpoints

**Base URL:** `https://{org}.{region}.dynamics.com/api/data/v9.2/`

```
GET    /workflows?$filter=category eq 5&$select=name,clientdata    → List flows
POST   /workflows                                                    → Create flow
PATCH  /workflows(<workflowid>)                                     → Update flow
DELETE /workflows(<workflowid>)                                     → Delete flow
```

---

## Flow run management

### Listing and filtering runs

The List Flow Runs endpoint returns **50 records per page** with a `nextLink` for pagination. Filter by status using OData:

```
GET .../flows/{flowId}/runs?api-version=2016-11-01&$filter=Status eq 'failed'
GET .../flows/{flowId}/runs?api-version=2016-11-01&$filter=Status eq 'running'
GET .../flows/{flowId}/runs?api-version=2016-11-01&$filter=Status eq 'succeeded'
GET .../flows/{flowId}/runs?api-version=2016-11-01&$filter=Status eq 'cancelled'
```

**Date range filtering is not natively supported** via `$filter`; client-side filtering using `properties.startTime` is required.

### Run response schema

Each run includes:

```json
{
  "name": "08585812450273045760418259003CU08",
  "properties": {
    "startTime": "2021-05-07T04:30:58.173606Z",
    "endTime": "2021-05-07T04:30:58.791Z",
    "status": "Failed",
    "code": "ActionFailed",
    "error": {
      "code": "ActionFailed",
      "message": "An action failed. No dependent actions succeeded."
    },
    "trigger": {
      "name": "manual",
      "inputsLink": { "uri": "https://prod-21...logic.azure.com/.../TriggerInputs?..." },
      "outputsLink": { "uri": "https://prod-21...logic.azure.com/.../TriggerOutputs?..." },
      "startTime": "...",
      "endTime": "...",
      "status": "Succeeded"
    }
  }
}
```

The **`inputsLink`** and **`outputsLink`** URIs are SAS-signed Azure Logic Apps URLs that are temporary and expire. Available status values are `Succeeded`, `Failed`, `Running`, and `Cancelled`.

The Management connector provides **Cancel Flow Run** (requires `environmentName`, `flowName`, `runId`) and **Resubmit Flow** (requires `triggerName` and `runId`).

---

## Solution-aware vs non-solution flows

### What makes a flow solution-aware

A flow becomes solution-aware when created inside a solution, added to a solution from the "Outside Dataverse" tab, or when the environment setting "Create in Dataverse solutions" is enabled. Solution flows are stored in the **Process (workflow) table** in Dataverse.

| Aspect | Solution-Aware | Non-Solution |
|---|---|---|
| Connections | Connection References (abstract placeholders) | Direct Connections |
| Portability | Exportable in managed/unmanaged solutions | Must export as .zip per flow |
| Versioning | Supports drafts and version history | No versioning |
| Environment Variables | Supported | Not supported |
| Flow limit | Unlimited per user | **600 flows** max per user |
| Child Flows | Supported | Not available |
| Programmatic management | Dataverse Web API (supported) | api.flow.microsoft.com only (unsupported) |

### Dual identifier system

Solution flows have two GUIDs: **`workflowid`** (stable across imports — the primary identifier) and **`workflowidunique`** (changes with each version/import). When opened from My Flows, URLs use `workflowid` (stable). When opened from Solution Explorer, URLs may use `workflowidunique` (changes). Always use `workflowid` for programmatic references.

### Dataverse workflow table key columns

| Column | Type | Description |
|---|---|---|
| `workflowid` | GUID | Stable unique identifier |
| `category` | Choice | `5` = Cloud Flow, `6` = Desktop Flow |
| `type` | Choice | `1` = Definition, `2` = Activation, `3` = Template |
| `statecode` | Choice | `0` = Draft/Off, `1` = Activated/On, `2` = Suspended |
| `clientdata` | String | Stringified JSON of full flow definition + connectionReferences |
| `name` | String | Display name |
| `primaryentity` | String | `"none"` for cloud flows |
| `ownerid` | Lookup | Owner (user or team) |
| `ismanaged` | Boolean | Whether installed via managed solution |

---

## Proven patterns for programmatic flow management

### Template-based creation (the recommended pattern)

The most reliable approach for creating flows programmatically:

1. **Create a "base" flow manually** with desired trigger, actions, and connections
2. **Retrieve the flow's clientdata** via Dataverse Web API: `GET /workflows?$filter=name eq 'Base Flow'&$select=clientdata`
3. **Parse and modify the clientdata JSON** — change site URLs, list GUIDs, entity names, filter values using string replacement
4. **Create a new flow** by POSTing to `/workflows` with `category: 5`, `type: 1`, `primaryentity: "none"`, and the modified `clientdata`
5. **Activate** with `PATCH /workflows(<id>)` setting `statecode: 1`

Using the Management connector: call **Get Flow** → modify definition using `replace()` expressions → call **Create Flow** with modified definition. Example expression:
```
replace(
  string(outputs('Get_Base_Flow')?['body/properties/definition']),
  'https://old-site.sharepoint.com',
  'https://new-site.sharepoint.com'
)
```

### Flow definition gotchas to watch for

- **`clientdata` is stringified JSON** — all quotes must be escaped (`\"`)  when writing via Dataverse Web API
- **Remove `displayName`** from connectionReferences before passing to Create Flow — it auto-generates
- Expressions like `@triggerOutputs()?['body/value']` must be properly escaped in the serialized string
- **Different trigger types** (automated, instant, scheduled) have different schema structures
- Flows with the `authentication` property on actions may fail when passed through the Management connector
- **Actions per workflow limit: 500**. Use child flows for complex processes
- Action/trigger name length limit: **80 characters**
- Maximum nesting depth: **8 levels**
- Variables per workflow: **250**

### PowerShell cmdlets for bulk operations

Install `Microsoft.PowerApps.Administration.PowerShell` for admin cmdlets:

| Cmdlet | Purpose |
|---|---|
| `Get-AdminFlow` | List flows (supports filters, environment scoping) |
| `Enable-AdminFlow` | Turn on a flow |
| `Disable-AdminFlow` | Turn off a flow |
| `Remove-AdminFlow` | Delete a flow |
| `Set-AdminFlowOwnerRole` | Change flow ownership |
| `Add-AdminFlowsToSolution` | **Migrate non-solution flows to solutions** |

These cmdlets use the `api.flow.microsoft.com` API internally.

### PAC CLI for solution-based flow management

The PAC CLI manages flows through solution operations:

```bash
pac solution export --name MySolution --path ./export --managed
pac solution unpack --zipfile ./export/MySolution.zip --folder ./unpacked
# Modify flow JSON files in Workflows/ directory
pac solution pack --folder ./unpacked --zipfile ./modified.zip
pac solution import --path ./modified.zip
pac solution create-settings --solution-zip ./export.zip --settings-file ./settings.json
```

Unpacked flows appear as JSON files in the `Workflows/` directory for direct editing.

---

## Conclusion: practical recommendations for AI agents

The most reliable path for programmatic flow management is the **Dataverse Web API** working with the `clientdata` column on the `workflow` table. This bypasses the Management connector's known bugs with connectionReferences. For non-solution flows, the Management connector or `api.flow.microsoft.com` REST API is the only option, but agents should expect failures with complex flows using multiple connections to the same connector.

**Always create flows in solutions** for programmatic management — this enables Dataverse API access, versioning, connection references, and ALM. When connectionReferences cause Update Flow failures, the most effective workaround is **updating the `clientdata` column directly via Dataverse Web API**, which gives full control over the JSON structure. For cross-environment deployments, use **PAC CLI with deployment settings files** to map connection references to local connections. The template-based creation pattern (Get → Modify → Create) is the most battle-tested approach, but agents should strip `displayName` from connectionReferences, handle the `authentication` property validation issue, and ensure connections exist before referencing them.