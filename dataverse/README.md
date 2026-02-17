# Dataverse Table Provisioning

This directory contains scripts and schema definitions for provisioning SimQuip tables in the REdI Dataverse environment.

## Environment

- **Environment**: REdI Development (`https://redi.crm6.dynamics.com`)
- **Environment ID**: `a67592d2-e775-e14c-bb5a-6366576198ca`
- **Publisher**: Resus_EDucation_Initiative (prefix: `redi`, option prefix: `91352`)

## Shared vs SimQuip-Specific Tables

The REdI Dataverse environment is shared across multiple REdI applications (Trolley Audit, SimQuip, etc.). Some tables are shared:

| Table | Status | Primary Name Column | Notes |
|-------|--------|-------------------|-------|
| `redi_person` | Pre-existing (shared) | `redi_displayname` | Shared across all REdI apps |
| `redi_equipment` | Pre-existing (shared) | `redi_itemname` | SimQuip columns use `redi_sq_*` prefix |
| `redi_location` | Pre-existing (shared) | `redi_departmentname` | SimQuip columns use `redi_sq_*` prefix |
| `redi_building` | SimQuip-created | `redi_building_name` | |
| `redi_level` | SimQuip-created | `redi_level_name` | |
| `redi_team` | SimQuip-created | `redi_team_name` | |
| `redi_teammember` | SimQuip-created | `redi_teammember_name` | |
| `redi_equipmentmedia` | SimQuip-created | `redi_equipmentmedia_name` | |
| `redi_locationmedia` | SimQuip-created | `redi_locationmedia_name` | |
| `redi_loantransfer` | SimQuip-created | `redi_loantransfer_name` | |

For shared tables, SimQuip-specific columns are prefixed with `redi_sq_` to avoid conflicts with other apps' columns. For example:
- `redi_sq_status` (SimQuip equipment status) vs `redi_status` (Trolley Audit status)
- `redi_sq_homelocationid` vs `redi_homelocationid`

## Files

| File | Purpose |
|------|---------|
| `schema.json` | Schema definition for the 7 SimQuip-created tables |
| `generate-solution.py` | Generates a Dataverse solution package from `schema.json` |
| `create-tables.ps1` | PowerShell alternative (requires Windows/unrestricted execution policy) |
| `provision-tables.py` | Direct Web API provisioning script (alternative approach) |
| `provision-tables.sh` | Bash version of direct API provisioning |

## Provisioning Process (Solution Generator)

This is the recommended approach. It generates a Dataverse solution XML package from `schema.json`, packs it using PAC CLI, and imports it.

### Prerequisites

- Python 3.10+
- PAC CLI installed and authenticated (`pac auth create`)
- Authenticated to the target environment

### Steps

1. **Define schema** in `schema.json`:
   ```json
   {
     "tables": [
       {
         "logicalName": "redi_tablename",
         "displayName": "Table Name",
         "pluralName": "Table Names",
         "description": "Description",
         "primaryNameColumn": "redi_tablename_name",
         "columns": [
           {
             "logicalName": "redi_columnname",
             "displayName": "Column Name",
             "type": "String",
             "maxLength": 200,
             "required": true
           }
         ]
       }
     ]
   }
   ```

   Supported column types: `String`, `Integer`, `Boolean`, `DateOnly`, `Memo`, `Choice`, `Lookup`

2. **Generate solution package**:
   ```bash
   cd dataverse
   python3 generate-solution.py
   ```
   This creates the unpacked solution in `solution_output/`.

3. **Pack the solution**:
   ```bash
   pac solution pack --zipfile SimQuipTables.zip --folder solution_output --packagetype Unmanaged
   ```

4. **Import to Dataverse**:
   ```bash
   pac solution import --path SimQuipTables.zip --activate-plugins
   ```

5. **Verify** tables were created in the Power Platform admin center or via API.

### Handling Existing Tables

If tables already exist (e.g., from a previous partial import), the import may fail with relationship conflicts. In that case, you can add missing columns directly via the Dataverse Web API:

```bash
# Extract auth token from PAC CLI's MSAL cache
TOKEN=$(python3 -c "
import json
with open('$HOME/.local/share/Microsoft/PowerAppsCli/tokencache_msalv3.dat') as f:
    cache = json.load(f)
for v in cache.get('AccessToken', {}).values():
    if 'dynamics.com' in v.get('target', ''):
        print(v['secret'])
        break
")

# Add a column
curl -X POST \
  "https://redi.crm6.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='redi_tablename')/Attributes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "OData-MaxVersion: 4.0" \
  -H "OData-Version: 4.0" \
  -d '{"@odata.type":"Microsoft.Dynamics.CRM.StringAttributeMetadata","SchemaName":"redi_columnname","DisplayName":{"@odata.type":"Microsoft.Dynamics.CRM.Label","LocalizedLabels":[{"@odata.type":"Microsoft.Dynamics.CRM.LocalizedLabel","Label":"Column Name","LanguageCode":1033}]},"RequiredLevel":{"Value":"None"},"MaxLength":200}'
```

## Adding Data Sources to the App

After tables are provisioned, register them in `power.config.json` under `databaseReferences.default.cds.dataSources`:

```json
{
  "datasourceName": {
    "entitySetName": "redi_tablenames",
    "logicalName": "redi_tablename"
  }
}
```

The entity set name is typically the pluralised logical name (e.g., `redi_buildings` for `redi_building`).

## Deploying

After all data sources are configured:

```bash
npm run build
pac code push
```

This publishes the app to the Power Platform environment.

## Choice Column Values

Choice columns on **SimQuip-created tables** use values starting at `100000000` (as defined by `OPTION_VALUE_BASE` in `generate-solution.py`):

| Column | Values |
|--------|--------|
| `redi_loanstatus` | Draft=100000000, Active=100000001, Overdue=100000002, Returned=100000003, Cancelled=100000004 |
| `redi_reasoncode` | Simulation=100000000, Training=100000001, Service=100000002, Other=100000003 |
| `redi_mediatype` | Image=100000000, Attachment=100000001 |

Choice columns on **shared/pre-existing tables** use simple integer values:

| Column | Values |
|--------|--------|
| `redi_sq_ownertype` | Team=1, Person=2 |
| `redi_sq_status` | Available=1, In Use=2, Under Maintenance=3, Retired=4 |
