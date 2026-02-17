#!/usr/bin/env bash
# SimQuip Dataverse Table Provisioning Script
# Uses the PAC CLI's cached MSAL token to call the Dataverse Web API directly.
# This avoids the need for PowerShell or separate Azure CLI auth.
#
# Usage: bash dataverse/provision-tables.sh

set -e

ORG_URL="https://redi.crm6.dynamics.com"
API_BASE="$ORG_URL/api/data/v9.2"
PREFIX="redi"
SOLUTION_NAME="SimQuip"

# ── Authentication ──────────────────────────────────────────────────────────

echo "Extracting Dataverse token from PAC CLI cache..."
TOKEN=$(python3 -c "
import json, sys
with open('$HOME/.local/share/Microsoft/PowerAppsCli/tokencache_msalv3.dat', 'r') as f:
    data = json.load(f)
for k, v in data['AccessToken'].items():
    if 'redi.crm6' in v.get('target', ''):
        print(v['secret'])
        sys.exit(0)
print('ERROR: No Dataverse token found', file=sys.stderr)
sys.exit(1)
")

# Verify token works
echo "Verifying Dataverse connection..."
WHOAMI=$(curl -sf -H "Authorization: Bearer $TOKEN" -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" "$API_BASE/WhoAmI")
echo "Connected as: $(echo "$WHOAMI" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("UserId","unknown"))')"

# ── Helper Functions ────────────────────────────────────────────────────────

dv_request() {
  local METHOD="$1"
  local PATH="$2"
  local BODY="${3:-}"

  local ARGS=(-sf -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -X "$METHOD" "$API_BASE/$PATH")

  if [ -n "$BODY" ]; then
    ARGS+=(-d "$BODY")
  fi

  curl "${ARGS[@]}" 2>/dev/null || true
}

dv_request_status() {
  local METHOD="$1"
  local PATH="$2"
  local BODY="${3:-}"

  local ARGS=(-s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -X "$METHOD" "$API_BASE/$PATH")

  if [ -n "$BODY" ]; then
    ARGS+=(-d "$BODY")
  fi

  curl "${ARGS[@]}" 2>/dev/null
}

table_exists() {
  local LOGICAL_NAME="$1"
  local STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
    "$API_BASE/EntityDefinitions(LogicalName='$LOGICAL_NAME')?\$select=LogicalName")
  [ "$STATUS" = "200" ]
}

column_exists() {
  local TABLE="$1"
  local COLUMN="$2"
  local STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
    "$API_BASE/EntityDefinitions(LogicalName='$TABLE')/Attributes(LogicalName='$COLUMN')?\$select=LogicalName")
  [ "$STATUS" = "200" ]
}

label_json() {
  local TEXT="$1"
  echo "{\"@odata.type\":\"Microsoft.Dynamics.CRM.Label\",\"LocalizedLabels\":[{\"@odata.type\":\"Microsoft.Dynamics.CRM.LocalizedLabel\",\"Label\":\"$TEXT\",\"LanguageCode\":1033}]}"
}

create_table() {
  local SCHEMA_NAME="$1"
  local DISPLAY_NAME="$2"
  local PLURAL_NAME="$3"
  local DESCRIPTION="$4"
  local EXTRA_ATTRS="${5:-[]}"
  local LOGICAL_NAME=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')
  local PRIMARY_NAME="${LOGICAL_NAME}_name"

  if table_exists "$LOGICAL_NAME"; then
    echo "  Table $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "SchemaName": "$SCHEMA_NAME",
  "DisplayName": $(label_json "$DISPLAY_NAME"),
  "DisplayCollectionName": $(label_json "$PLURAL_NAME"),
  "Description": $(label_json "$DESCRIPTION"),
  "HasActivities": false,
  "HasNotes": false,
  "OwnershipType": "UserOwned",
  "IsActivity": false,
  "PrimaryNameAttribute": "$PRIMARY_NAME",
  "Attributes": [
    {
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
      "SchemaName": "${SCHEMA_NAME}_name",
      "RequiredLevel": {"Value": "ApplicationRequired"},
      "MaxLength": 200,
      "DisplayName": $(label_json "Name"),
      "IsPrimaryName": true
    }
  ]
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "  Created table: $SCHEMA_NAME"
  else
    echo "  FAILED to create table $SCHEMA_NAME (HTTP $STATUS)"
    # Get error details
    curl -s -H "Authorization: Bearer $TOKEN" \
      -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
      -H "Content-Type: application/json" -H "Accept: application/json" \
      -X POST "$API_BASE/EntityDefinitions" -d "$BODY" 2>/dev/null | python3 -m json.tool 2>/dev/null | head -10
    return 1
  fi
}

add_string_column() {
  local TABLE="$1"
  local SCHEMA_NAME="$2"
  local DISPLAY_NAME="$3"
  local MAX_LENGTH="${4:-200}"
  local REQUIRED="${5:-None}"
  local TABLE_LOWER=$(echo "$TABLE" | tr '[:upper:]' '[:lower:]')
  local COL_LOWER=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')

  if column_exists "$TABLE_LOWER" "$COL_LOWER"; then
    echo "    Column $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
  "SchemaName": "$SCHEMA_NAME",
  "MaxLength": $MAX_LENGTH,
  "RequiredLevel": {"Value": "$REQUIRED"},
  "DisplayName": $(label_json "$DISPLAY_NAME")
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions(LogicalName='$TABLE_LOWER')/Attributes" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Column: $SCHEMA_NAME (String)"
  else
    echo "    FAILED column $SCHEMA_NAME (HTTP $STATUS)"
  fi
}

add_memo_column() {
  local TABLE="$1"
  local SCHEMA_NAME="$2"
  local DISPLAY_NAME="$3"
  local MAX_LENGTH="${4:-100000}"
  local TABLE_LOWER=$(echo "$TABLE" | tr '[:upper:]' '[:lower:]')
  local COL_LOWER=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')

  if column_exists "$TABLE_LOWER" "$COL_LOWER"; then
    echo "    Column $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
  "SchemaName": "$SCHEMA_NAME",
  "MaxLength": $MAX_LENGTH,
  "RequiredLevel": {"Value": "None"},
  "DisplayName": $(label_json "$DISPLAY_NAME")
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions(LogicalName='$TABLE_LOWER')/Attributes" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Column: $SCHEMA_NAME (Memo)"
  else
    echo "    FAILED column $SCHEMA_NAME (HTTP $STATUS)"
  fi
}

add_bool_column() {
  local TABLE="$1"
  local SCHEMA_NAME="$2"
  local DISPLAY_NAME="$3"
  local DEFAULT="${4:-true}"
  local TABLE_LOWER=$(echo "$TABLE" | tr '[:upper:]' '[:lower:]')
  local COL_LOWER=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')

  if column_exists "$TABLE_LOWER" "$COL_LOWER"; then
    echo "    Column $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
  "SchemaName": "$SCHEMA_NAME",
  "RequiredLevel": {"Value": "None"},
  "DefaultValue": $DEFAULT,
  "DisplayName": $(label_json "$DISPLAY_NAME"),
  "OptionSet": {
    "TrueOption": {"Value": 1, "Label": $(label_json "Yes")},
    "FalseOption": {"Value": 0, "Label": $(label_json "No")}
  }
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions(LogicalName='$TABLE_LOWER')/Attributes" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Column: $SCHEMA_NAME (Boolean)"
  else
    echo "    FAILED column $SCHEMA_NAME (HTTP $STATUS)"
  fi
}

add_int_column() {
  local TABLE="$1"
  local SCHEMA_NAME="$2"
  local DISPLAY_NAME="$3"
  local TABLE_LOWER=$(echo "$TABLE" | tr '[:upper:]' '[:lower:]')
  local COL_LOWER=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')

  if column_exists "$TABLE_LOWER" "$COL_LOWER"; then
    echo "    Column $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
  "SchemaName": "$SCHEMA_NAME",
  "RequiredLevel": {"Value": "None"},
  "MinValue": 0,
  "MaxValue": 999999,
  "DisplayName": $(label_json "$DISPLAY_NAME")
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions(LogicalName='$TABLE_LOWER')/Attributes" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Column: $SCHEMA_NAME (Integer)"
  else
    echo "    FAILED column $SCHEMA_NAME (HTTP $STATUS)"
  fi
}

add_choice_column() {
  local TABLE="$1"
  local SCHEMA_NAME="$2"
  local DISPLAY_NAME="$3"
  local OPTIONS_JSON="$4"
  local TABLE_LOWER=$(echo "$TABLE" | tr '[:upper:]' '[:lower:]')
  local COL_LOWER=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')

  if column_exists "$TABLE_LOWER" "$COL_LOWER"; then
    echo "    Column $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
  "SchemaName": "$SCHEMA_NAME",
  "RequiredLevel": {"Value": "None"},
  "DisplayName": $(label_json "$DISPLAY_NAME"),
  "OptionSet": {
    "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
    "IsGlobal": false,
    "OptionSetType": "Picklist",
    "Options": $OPTIONS_JSON
  }
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions(LogicalName='$TABLE_LOWER')/Attributes" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Column: $SCHEMA_NAME (Choice)"
  else
    echo "    FAILED column $SCHEMA_NAME (HTTP $STATUS)"
  fi
}

add_date_column() {
  local TABLE="$1"
  local SCHEMA_NAME="$2"
  local DISPLAY_NAME="$3"
  local TABLE_LOWER=$(echo "$TABLE" | tr '[:upper:]' '[:lower:]')
  local COL_LOWER=$(echo "$SCHEMA_NAME" | tr '[:upper:]' '[:lower:]')

  if column_exists "$TABLE_LOWER" "$COL_LOWER"; then
    echo "    Column $SCHEMA_NAME already exists, skipping."
    return 0
  fi

  local BODY=$(cat <<ENDJSON
{
  "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
  "SchemaName": "$SCHEMA_NAME",
  "RequiredLevel": {"Value": "None"},
  "Format": "DateOnly",
  "DisplayName": $(label_json "$DISPLAY_NAME")
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "EntityDefinitions(LogicalName='$TABLE_LOWER')/Attributes" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Column: $SCHEMA_NAME (DateTime)"
  else
    echo "    FAILED column $SCHEMA_NAME (HTTP $STATUS)"
  fi
}

add_lookup() {
  local FROM_TABLE="$1"
  local LOOKUP_SCHEMA="$2"
  local DISPLAY_NAME="$3"
  local TO_TABLE="$4"
  local REQUIRED="${5:-None}"
  local FROM_LOWER=$(echo "$FROM_TABLE" | tr '[:upper:]' '[:lower:]')
  local TO_LOWER=$(echo "$TO_TABLE" | tr '[:upper:]' '[:lower:]')
  local LOOKUP_LOWER=$(echo "$LOOKUP_SCHEMA" | tr '[:upper:]' '[:lower:]')

  if column_exists "$FROM_LOWER" "$LOOKUP_LOWER"; then
    echo "    Lookup $LOOKUP_SCHEMA already exists, skipping."
    return 0
  fi

  local REL_SCHEMA="${FROM_LOWER}_${LOOKUP_LOWER}"

  local BODY=$(cat <<ENDJSON
{
  "SchemaName": "$REL_SCHEMA",
  "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
  "ReferencedEntity": "$TO_LOWER",
  "ReferencingEntity": "$FROM_LOWER",
  "Lookup": {
    "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
    "SchemaName": "$LOOKUP_SCHEMA",
    "RequiredLevel": {"Value": "$REQUIRED"},
    "DisplayName": $(label_json "$DISPLAY_NAME")
  }
}
ENDJSON
)

  local STATUS=$(dv_request_status "POST" "RelationshipDefinitions" "$BODY")
  if [ "$STATUS" = "204" ] || [ "$STATUS" = "200" ]; then
    echo "    + Lookup: $LOOKUP_SCHEMA -> $TO_TABLE"
  else
    echo "    FAILED lookup $LOOKUP_SCHEMA (HTTP $STATUS)"
  fi
}

# ── Option arrays for choice columns ────────────────────────────────────────

OWNER_TYPE_OPTIONS='[
  {"Value":1,"Label":'"$(label_json "Team")"'},
  {"Value":2,"Label":'"$(label_json "Person")"'}
]'

EQUIPMENT_STATUS_OPTIONS='[
  {"Value":1,"Label":'"$(label_json "Available")"'},
  {"Value":2,"Label":'"$(label_json "In Use")"'},
  {"Value":3,"Label":'"$(label_json "Under Maintenance")"'},
  {"Value":4,"Label":'"$(label_json "Retired")"'}
]'

MEDIA_TYPE_OPTIONS='[
  {"Value":1,"Label":'"$(label_json "Image")"'},
  {"Value":2,"Label":'"$(label_json "Attachment")"'}
]'

LOAN_REASON_OPTIONS='[
  {"Value":1,"Label":'"$(label_json "Simulation")"'},
  {"Value":2,"Label":'"$(label_json "Training")"'},
  {"Value":3,"Label":'"$(label_json "Service")"'},
  {"Value":4,"Label":'"$(label_json "Other")"'}
]'

LOAN_STATUS_OPTIONS='[
  {"Value":1,"Label":'"$(label_json "Draft")"'},
  {"Value":2,"Label":'"$(label_json "Active")"'},
  {"Value":3,"Label":'"$(label_json "Overdue")"'},
  {"Value":4,"Label":'"$(label_json "Returned")"'},
  {"Value":5,"Label":'"$(label_json "Cancelled")"'}
]'

# ═══════════════════════════════════════════════════════════════════════════
# Phase 1: Create Solution
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 1: Creating SimQuip Solution ==="

EXISTING_SOLUTION=$(curl -sf -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
  "$API_BASE/solutions?\$filter=uniquename%20eq%20'$SOLUTION_NAME'&\$select=solutionid" 2>/dev/null)

SOLUTION_COUNT=$(echo "$EXISTING_SOLUTION" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('value',[])))" 2>/dev/null || echo "0")

if [ "$SOLUTION_COUNT" -gt "0" ]; then
  echo "Solution '$SOLUTION_NAME' already exists."
else
  # Get publisher ID
  PUBLISHER_RESPONSE=$(curl -sf -H "Authorization: Bearer $TOKEN" \
    -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
    "$API_BASE/publishers?\$filter=customizationprefix%20eq%20'$PREFIX'&\$select=publisherid" 2>/dev/null)

  PUBLISHER_ID=$(echo "$PUBLISHER_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['value'][0]['publisherid'] if d.get('value') else 'NOT_FOUND')" 2>/dev/null)

  if [ "$PUBLISHER_ID" = "NOT_FOUND" ]; then
    echo "ERROR: Publisher with prefix '$PREFIX' not found!"
    exit 1
  fi

  echo "Found publisher: $PUBLISHER_ID"

  SOLUTION_BODY=$(cat <<ENDJSON
{
  "uniquename": "$SOLUTION_NAME",
  "friendlyname": "SimQuip Equipment Management",
  "description": "Equipment management system for RBWH simulation and training",
  "version": "1.0.0.0",
  "publisherid@odata.bind": "/publishers($PUBLISHER_ID)"
}
ENDJSON
)

  SOL_STATUS=$(dv_request_status "POST" "solutions" "$SOLUTION_BODY")
  if [ "$SOL_STATUS" = "204" ] || [ "$SOL_STATUS" = "200" ]; then
    echo "Created solution: $SOLUTION_NAME"
  else
    echo "Solution creation returned HTTP $SOL_STATUS (may already exist)"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Phase 2: Create Tier 1 Tables (no foreign keys)
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 2: Creating Tier 1 Tables ==="

echo "Creating ${PREFIX}_building..."
create_table "${PREFIX}_building" "Building" "Buildings" "Physical buildings containing simulation spaces"
add_string_column "${PREFIX}_building" "${PREFIX}_code" "Building Code" 20 "ApplicationRequired"

echo ""
echo "Adding missing columns to existing ${PREFIX}_person..."
add_string_column "${PREFIX}_person" "${PREFIX}_phone" "Phone" 50
add_bool_column "${PREFIX}_person" "${PREFIX}_active" "Active" true

# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Create Tier 2 Tables (depend on Tier 1)
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 3: Creating Tier 2 Tables ==="

echo "Creating ${PREFIX}_team..."
create_table "${PREFIX}_team" "Team" "Teams" "Organisational teams that own and manage equipment"
add_string_column "${PREFIX}_team" "${PREFIX}_teamcode" "Team Code" 20 "ApplicationRequired"
add_bool_column "${PREFIX}_team" "${PREFIX}_active" "Active" true
add_lookup "${PREFIX}_team" "${PREFIX}_maincontactpersonid" "Main Contact" "${PREFIX}_person"

echo ""
echo "Creating ${PREFIX}_level..."
create_table "${PREFIX}_level" "Level" "Levels" "Floor levels within buildings"
add_int_column "${PREFIX}_level" "${PREFIX}_sortorder" "Sort Order"
add_lookup "${PREFIX}_level" "${PREFIX}_buildingid" "Building" "${PREFIX}_building" "ApplicationRequired"

# ═══════════════════════════════════════════════════════════════════════════
# Phase 4: Create Tier 3 Tables
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 4: Creating Tier 3 Tables ==="

echo "Adding missing columns/lookups to existing ${PREFIX}_location..."
add_memo_column "${PREFIX}_location" "${PREFIX}_description" "Description" 5000
add_lookup "${PREFIX}_location" "${PREFIX}_sq_buildingid" "Building" "${PREFIX}_building"
add_lookup "${PREFIX}_location" "${PREFIX}_sq_levelid" "Level" "${PREFIX}_level"
add_lookup "${PREFIX}_location" "${PREFIX}_contactpersonid" "Contact Person" "${PREFIX}_person"

echo ""
echo "Creating ${PREFIX}_teammember..."
create_table "${PREFIX}_teammember" "Team Member" "Team Members" "Association between people and teams with role"
add_string_column "${PREFIX}_teammember" "${PREFIX}_role" "Role" 200
add_lookup "${PREFIX}_teammember" "${PREFIX}_teamid" "Team" "${PREFIX}_team" "ApplicationRequired"
add_lookup "${PREFIX}_teammember" "${PREFIX}_personid" "Person" "${PREFIX}_person" "ApplicationRequired"

# ═══════════════════════════════════════════════════════════════════════════
# Phase 5: Create Equipment columns + Tier 4 Tables
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 5: Adding SimQuip columns to existing ${PREFIX}_equipment ==="

add_string_column "${PREFIX}_equipment" "${PREFIX}_equipmentcode" "Equipment Code" 50 "ApplicationRequired"
add_memo_column "${PREFIX}_equipment" "${PREFIX}_sq_description" "Description" 10000
add_choice_column "${PREFIX}_equipment" "${PREFIX}_sq_ownertype" "Owner Type" "$OWNER_TYPE_OPTIONS"
add_choice_column "${PREFIX}_equipment" "${PREFIX}_sq_status" "Equipment Status" "$EQUIPMENT_STATUS_OPTIONS"
add_bool_column "${PREFIX}_equipment" "${PREFIX}_sq_active" "Active" true
add_string_column "${PREFIX}_equipment" "${PREFIX}_keyimageurl" "Key Image URL" 2000
add_memo_column "${PREFIX}_equipment" "${PREFIX}_contentslistjson" "Contents List JSON" 100000
add_memo_column "${PREFIX}_equipment" "${PREFIX}_quickstartflowchartjson" "Quick Start Flowchart JSON" 100000
add_lookup "${PREFIX}_equipment" "${PREFIX}_ownerteamid" "Owner Team" "${PREFIX}_team"
add_lookup "${PREFIX}_equipment" "${PREFIX}_ownerpersonid" "Owner Person" "${PREFIX}_person"
add_lookup "${PREFIX}_equipment" "${PREFIX}_sq_contactpersonid" "Contact Person" "${PREFIX}_person"
add_lookup "${PREFIX}_equipment" "${PREFIX}_sq_homelocationid" "Home Location" "${PREFIX}_location"
add_lookup "${PREFIX}_equipment" "${PREFIX}_parentequipmentid" "Parent Equipment" "${PREFIX}_equipment"

# ═══════════════════════════════════════════════════════════════════════════
# Phase 6: Create Leaf Entity Tables
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 6: Creating Leaf Entity Tables ==="

echo "Creating ${PREFIX}_equipmentmedia..."
create_table "${PREFIX}_equipmentmedia" "Equipment Media" "Equipment Media" "Images, documents, and attachments for equipment"
add_choice_column "${PREFIX}_equipmentmedia" "${PREFIX}_mediatype" "Media Type" "$MEDIA_TYPE_OPTIONS"
add_string_column "${PREFIX}_equipmentmedia" "${PREFIX}_filename" "File Name" 500
add_string_column "${PREFIX}_equipmentmedia" "${PREFIX}_mimetype" "MIME Type" 200
add_string_column "${PREFIX}_equipmentmedia" "${PREFIX}_fileurl" "File URL" 2000
add_int_column "${PREFIX}_equipmentmedia" "${PREFIX}_sortorder" "Sort Order"
add_lookup "${PREFIX}_equipmentmedia" "${PREFIX}_equipmentid" "Equipment" "${PREFIX}_equipment" "ApplicationRequired"

echo ""
echo "Creating ${PREFIX}_locationmedia..."
create_table "${PREFIX}_locationmedia" "Location Media" "Location Media" "Images and attachments for locations"
add_choice_column "${PREFIX}_locationmedia" "${PREFIX}_mediatype" "Media Type" "$MEDIA_TYPE_OPTIONS"
add_string_column "${PREFIX}_locationmedia" "${PREFIX}_filename" "File Name" 500
add_string_column "${PREFIX}_locationmedia" "${PREFIX}_mimetype" "MIME Type" 200
add_string_column "${PREFIX}_locationmedia" "${PREFIX}_fileurl" "File URL" 2000
add_int_column "${PREFIX}_locationmedia" "${PREFIX}_sortorder" "Sort Order"
add_lookup "${PREFIX}_locationmedia" "${PREFIX}_locationid" "Location" "${PREFIX}_location" "ApplicationRequired"

echo ""
echo "Creating ${PREFIX}_loantransfer..."
create_table "${PREFIX}_loantransfer" "Loan Transfer" "Loan Transfers" "Equipment loan and transfer records"
add_date_column "${PREFIX}_loantransfer" "${PREFIX}_startdate" "Start Date"
add_date_column "${PREFIX}_loantransfer" "${PREFIX}_duedate" "Due Date"
add_choice_column "${PREFIX}_loantransfer" "${PREFIX}_reasoncode" "Reason" "$LOAN_REASON_OPTIONS"
add_choice_column "${PREFIX}_loantransfer" "${PREFIX}_status" "Status" "$LOAN_STATUS_OPTIONS"
add_bool_column "${PREFIX}_loantransfer" "${PREFIX}_isinternaltransfer" "Internal Transfer" false
add_memo_column "${PREFIX}_loantransfer" "${PREFIX}_notes" "Notes" 10000
add_lookup "${PREFIX}_loantransfer" "${PREFIX}_equipmentid" "Equipment" "${PREFIX}_equipment" "ApplicationRequired"
add_lookup "${PREFIX}_loantransfer" "${PREFIX}_originteamid" "Origin Team" "${PREFIX}_team" "ApplicationRequired"
add_lookup "${PREFIX}_loantransfer" "${PREFIX}_recipientteamid" "Recipient Team" "${PREFIX}_team" "ApplicationRequired"
add_lookup "${PREFIX}_loantransfer" "${PREFIX}_approverpersonid" "Approver" "${PREFIX}_person"

# ═══════════════════════════════════════════════════════════════════════════
# Phase 7: Circular Reference Fixups
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 7: Circular Reference Fixups ==="

echo "Adding Person -> Team lookup..."
add_lookup "${PREFIX}_person" "${PREFIX}_teamid" "Team" "${PREFIX}_team"

echo "Adding Team -> Location lookup..."
add_lookup "${PREFIX}_team" "${PREFIX}_mainlocationid" "Main Location" "${PREFIX}_location"

# ═══════════════════════════════════════════════════════════════════════════
# Phase 8: Add Tables to Solution
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "=== Phase 8: Adding Tables to SimQuip Solution ==="

SOLUTION_INFO=$(curl -sf -H "Authorization: Bearer $TOKEN" \
  -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
  "$API_BASE/solutions?\$filter=uniquename%20eq%20'$SOLUTION_NAME'&\$select=solutionid" 2>/dev/null)

SOLUTION_EXISTS=$(echo "$SOLUTION_INFO" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('value',[])))" 2>/dev/null || echo "0")

if [ "$SOLUTION_EXISTS" -gt "0" ]; then
  for TABLE in ${PREFIX}_building ${PREFIX}_person ${PREFIX}_team ${PREFIX}_level \
               ${PREFIX}_location ${PREFIX}_teammember ${PREFIX}_equipment \
               ${PREFIX}_equipmentmedia ${PREFIX}_locationmedia ${PREFIX}_loantransfer; do

    # Get entity MetadataId
    ENTITY_META=$(curl -sf -H "Authorization: Bearer $TOKEN" \
      -H "OData-MaxVersion: 4.0" -H "OData-Version: 4.0" \
      "$API_BASE/EntityDefinitions(LogicalName='$TABLE')?\$select=MetadataId" 2>/dev/null || echo "{}")

    METADATA_ID=$(echo "$ENTITY_META" | python3 -c "import json,sys; print(json.load(sys.stdin).get('MetadataId',''))" 2>/dev/null)

    if [ -n "$METADATA_ID" ] && [ "$METADATA_ID" != "" ]; then
      ADD_BODY=$(cat <<ENDJSON
{
  "ComponentId": "$METADATA_ID",
  "ComponentType": 1,
  "SolutionUniqueName": "$SOLUTION_NAME",
  "AddRequiredComponents": false
}
ENDJSON
)
      ADD_STATUS=$(dv_request_status "POST" "AddSolutionComponent" "$ADD_BODY")
      echo "  Added $TABLE to solution (HTTP $ADD_STATUS)"
    else
      echo "  Could not find MetadataId for $TABLE"
    fi
  done
else
  echo "  Solution not found, skipping component assignment."
fi

# ═══════════════════════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SimQuip Dataverse schema provisioning complete!            ║"
echo "║                                                            ║"
echo "║  Next steps:                                               ║"
echo "║  1. Register data sources: pac code add-data-source        ║"
echo "║  2. Build and deploy: npm run build && pac code push       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
