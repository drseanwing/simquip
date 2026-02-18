#!/usr/bin/env python3
"""SimQuip Dataverse Table Provisioning Script.

Uses the PAC CLI's cached MSAL token to call the Dataverse Web API directly.
This avoids the need for PowerShell or separate Azure CLI auth.

Usage: python3 dataverse/provision-tables.py
"""

import json
import sys
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ORG_URL = "https://redi.crm6.dynamics.com"
API_BASE = f"{ORG_URL}/api/data/v9.2"
PREFIX = "redi"
SOLUTION_NAME = "SimQuip"


def get_token():
    cache_path = Path.home() / ".local/share/Microsoft/PowerAppsCli/tokencache_msalv3.dat"
    with open(cache_path) as f:
        data = json.load(f)
    for _k, v in data["AccessToken"].items():
        if "redi.crm6" in v.get("target", ""):
            return v["secret"]
    print("ERROR: No Dataverse token found in PAC CLI cache", file=sys.stderr)
    print("Run: pac auth create --environment https://redi.crm6.dynamics.com", file=sys.stderr)
    sys.exit(1)


TOKEN = get_token()


def label(text):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.Label",
        "LocalizedLabels": [
            {
                "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel",
                "Label": text,
                "LanguageCode": 1033,
            }
        ],
    }


def _encode_url(path):
    """Encode URL path, preserving OData query structure."""
    if "?" in path:
        base, query = path.split("?", 1)
        return f"{API_BASE}/{base}?{quote(query, safe='=&$\'()')}"
    return f"{API_BASE}/{path}"


def dv_request(method, path, body=None):
    url = _encode_url(path)
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = json.dumps(body).encode() if body else None
    req = Request(url, data=data, headers=headers, method=method)
    try:
        resp = urlopen(req)
        if resp.status == 204:
            return None
        return json.loads(resp.read())
    except HTTPError as e:
        error_body = e.read().decode()
        try:
            error_json = json.loads(error_body)
            return {"_error": True, "_status": e.code, "_message": error_json.get("error", {}).get("message", error_body)}
        except json.JSONDecodeError:
            return {"_error": True, "_status": e.code, "_message": error_body}


def dv_get(path):
    url = _encode_url(path)
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Accept": "application/json",
    }
    req = Request(url, headers=headers, method="GET")
    try:
        resp = urlopen(req)
        return json.loads(resp.read())
    except HTTPError:
        return None


def table_exists(logical_name):
    result = dv_get(f"EntityDefinitions(LogicalName='{logical_name}')?$select=LogicalName")
    return result is not None


def column_exists(table, column):
    result = dv_get(f"EntityDefinitions(LogicalName='{table}')/Attributes(LogicalName='{column}')?$select=LogicalName")
    return result is not None


def create_table(schema_name, display_name, plural_name, description):
    logical = schema_name.lower()
    if table_exists(logical):
        print(f"  Table {schema_name} already exists, skipping.")
        return True

    primary_name = f"{logical}_name"
    entity = {
        "SchemaName": schema_name,
        "DisplayName": label(display_name),
        "DisplayCollectionName": label(plural_name),
        "Description": label(description),
        "HasActivities": False,
        "HasNotes": False,
        "OwnershipType": "UserOwned",
        "IsActivity": False,
        "PrimaryNameAttribute": primary_name,
        "Attributes": [
            {
                "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
                "SchemaName": f"{schema_name}_name",
                "RequiredLevel": {"Value": "ApplicationRequired"},
                "MaxLength": 200,
                "DisplayName": label("Name"),
                "IsPrimaryName": True,
            }
        ],
    }

    result = dv_request("POST", "EntityDefinitions", entity)
    if result and result.get("_error"):
        print(f"  FAILED to create table {schema_name}: {result['_message']}")
        return False
    print(f"  Created table: {schema_name}")
    time.sleep(1)  # Brief pause for Dataverse to process
    return True


def add_column(table, col_def):
    table_lower = table.lower()
    col_lower = col_def["SchemaName"].lower()
    if column_exists(table_lower, col_lower):
        print(f"    Column {col_def['SchemaName']} already exists, skipping.")
        return True

    result = dv_request("POST", f"EntityDefinitions(LogicalName='{table_lower}')/Attributes", col_def)
    if result and result.get("_error"):
        print(f"    FAILED column {col_def['SchemaName']}: {result['_message']}")
        return False
    col_type = col_def.get("@odata.type", "").split(".")[-1].replace("AttributeMetadata", "")
    print(f"    + Column: {col_def['SchemaName']} ({col_type})")
    return True


def string_col(schema_name, display_name, max_length=200, required=False):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": schema_name,
        "MaxLength": max_length,
        "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
        "DisplayName": label(display_name),
    }


def memo_col(schema_name, display_name, max_length=100000):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",
        "SchemaName": schema_name,
        "MaxLength": max_length,
        "RequiredLevel": {"Value": "None"},
        "DisplayName": label(display_name),
    }


def bool_col(schema_name, display_name, default=True):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.BooleanAttributeMetadata",
        "SchemaName": schema_name,
        "RequiredLevel": {"Value": "None"},
        "DefaultValue": default,
        "DisplayName": label(display_name),
        "OptionSet": {
            "TrueOption": {"Value": 1, "Label": label("Yes")},
            "FalseOption": {"Value": 0, "Label": label("No")},
        },
    }


def int_col(schema_name, display_name):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.IntegerAttributeMetadata",
        "SchemaName": schema_name,
        "RequiredLevel": {"Value": "None"},
        "MinValue": 0,
        "MaxValue": 999999,
        "DisplayName": label(display_name),
    }


def choice_col(schema_name, display_name, options):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.PicklistAttributeMetadata",
        "SchemaName": schema_name,
        "RequiredLevel": {"Value": "None"},
        "DisplayName": label(display_name),
        "OptionSet": {
            "@odata.type": "Microsoft.Dynamics.CRM.OptionSetMetadata",
            "IsGlobal": False,
            "OptionSetType": "Picklist",
            "Options": [{"Value": v, "Label": label(l)} for v, l in options],
        },
    }


def date_col(schema_name, display_name):
    return {
        "@odata.type": "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata",
        "SchemaName": schema_name,
        "RequiredLevel": {"Value": "None"},
        "Format": "DateOnly",
        "DisplayName": label(display_name),
    }


def add_lookup(from_table, lookup_schema, display_name, to_table, required=False):
    from_lower = from_table.lower()
    lookup_lower = lookup_schema.lower()

    if column_exists(from_lower, lookup_lower):
        print(f"    Lookup {lookup_schema} already exists, skipping.")
        return True

    rel_schema = f"{from_lower}_{lookup_lower}"
    to_lower = to_table.lower()

    relationship = {
        "SchemaName": rel_schema,
        "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
        "ReferencedEntity": to_lower,
        "ReferencingEntity": from_lower,
        "Lookup": {
            "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
            "SchemaName": lookup_schema,
            "RequiredLevel": {"Value": "ApplicationRequired" if required else "None"},
            "DisplayName": label(display_name),
        },
    }

    result = dv_request("POST", "RelationshipDefinitions", relationship)
    if result and result.get("_error"):
        print(f"    FAILED lookup {lookup_schema}: {result['_message']}")
        return False
    print(f"    + Lookup: {lookup_schema} -> {to_table}")
    return True


def add_to_solution(table_name):
    entity_meta = dv_get(f"EntityDefinitions(LogicalName='{table_name}')?$select=MetadataId")
    if not entity_meta:
        print(f"  Could not find MetadataId for {table_name}")
        return False

    metadata_id = entity_meta["MetadataId"]
    body = {
        "ComponentId": metadata_id,
        "ComponentType": 1,
        "SolutionUniqueName": SOLUTION_NAME,
        "AddRequiredComponents": False,
    }
    result = dv_request("POST", "AddSolutionComponent", body)
    if result and result.get("_error"):
        print(f"  Could not add {table_name}: {result['_message']}")
        return False
    print(f"  Added {table_name} to solution")
    return True


# ═══════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════

def main():
    print("Extracting Dataverse token from PAC CLI cache...")
    print("Verifying Dataverse connection...")
    whoami = dv_get("WhoAmI")
    if not whoami:
        print("ERROR: Failed to connect to Dataverse!", file=sys.stderr)
        sys.exit(1)
    print(f"Connected as: {whoami.get('UserId', 'unknown')}")

    # ── Phase 1: Create Solution ──────────────────────────────────────────
    print("\n=== Phase 1: Ensuring SimQuip Solution ===")
    solutions = dv_get(f"solutions?$filter=uniquename eq '{SOLUTION_NAME}'&$select=solutionid")
    if solutions and solutions.get("value"):
        print(f"Solution '{SOLUTION_NAME}' already exists.")
    else:
        publishers = dv_get(f"publishers?$filter=customizationprefix eq '{PREFIX}'&$select=publisherid")
        if not publishers or not publishers.get("value"):
            print("ERROR: Publisher with prefix 'redi' not found!", file=sys.stderr)
            sys.exit(1)
        publisher_id = publishers["value"][0]["publisherid"]
        print(f"Found publisher: {publisher_id}")

        result = dv_request("POST", "solutions", {
            "uniquename": SOLUTION_NAME,
            "friendlyname": "SimQuip Equipment Management",
            "description": "Equipment management system for RBWH simulation and training",
            "version": "1.0.0.0",
            "publisherid@odata.bind": f"/publishers({publisher_id})",
        })
        if result and result.get("_error"):
            print(f"Solution creation: {result['_message']}")
        else:
            print(f"Created solution: {SOLUTION_NAME}")

    # ── Phase 2: Tier 1 Tables (no foreign keys) ─────────────────────────
    print("\n=== Phase 2: Creating Tier 1 Tables ===")

    print("Creating redi_building...")
    create_table(f"{PREFIX}_building", "Building", "Buildings",
                 "Physical buildings containing simulation spaces")
    add_column(f"{PREFIX}_building", string_col(f"{PREFIX}_code", "Building Code", 20, required=True))

    print("\nAdding missing columns to existing redi_person...")
    add_column(f"{PREFIX}_person", string_col(f"{PREFIX}_phone", "Phone", 50))
    add_column(f"{PREFIX}_person", bool_col(f"{PREFIX}_active", "Active", default=True))

    # ── Phase 3: Tier 2 Tables ────────────────────────────────────────────
    print("\n=== Phase 3: Creating Tier 2 Tables ===")

    print("Creating redi_team...")
    create_table(f"{PREFIX}_team", "Team", "Teams",
                 "Organisational teams that own and manage equipment")
    add_column(f"{PREFIX}_team", string_col(f"{PREFIX}_teamcode", "Team Code", 20, required=True))
    add_column(f"{PREFIX}_team", bool_col(f"{PREFIX}_active", "Active", default=True))
    add_lookup(f"{PREFIX}_team", f"{PREFIX}_maincontactpersonid", "Main Contact", f"{PREFIX}_person")

    print("\nCreating redi_level...")
    create_table(f"{PREFIX}_level", "Level", "Levels",
                 "Floor levels within buildings")
    add_column(f"{PREFIX}_level", int_col(f"{PREFIX}_sortorder", "Sort Order"))
    add_lookup(f"{PREFIX}_level", f"{PREFIX}_buildingid", "Building", f"{PREFIX}_building", required=True)

    # ── Phase 4: Tier 3 Tables ────────────────────────────────────────────
    print("\n=== Phase 4: Creating Tier 3 Tables ===")

    print("Adding columns/lookups to existing redi_location...")
    add_column(f"{PREFIX}_location", memo_col(f"{PREFIX}_sq_description", "Description", 5000))
    add_lookup(f"{PREFIX}_location", f"{PREFIX}_sq_buildingid", "Building", f"{PREFIX}_building")
    add_lookup(f"{PREFIX}_location", f"{PREFIX}_sq_levelid", "Level", f"{PREFIX}_level")
    add_lookup(f"{PREFIX}_location", f"{PREFIX}_contactpersonid", "Contact Person", f"{PREFIX}_person")

    print("\nCreating redi_teammember...")
    create_table(f"{PREFIX}_teammember", "Team Member", "Team Members",
                 "Association between people and teams with role")
    add_column(f"{PREFIX}_teammember", string_col(f"{PREFIX}_role", "Role", 200))
    add_lookup(f"{PREFIX}_teammember", f"{PREFIX}_teamid", "Team", f"{PREFIX}_team", required=True)
    add_lookup(f"{PREFIX}_teammember", f"{PREFIX}_personid", "Person", f"{PREFIX}_person", required=True)

    # ── Phase 5: Equipment columns ────────────────────────────────────────
    print("\n=== Phase 5: Adding SimQuip columns to existing redi_equipment ===")

    add_column(f"{PREFIX}_equipment", string_col(f"{PREFIX}_equipmentcode", "Equipment Code", 50, required=True))
    add_column(f"{PREFIX}_equipment", memo_col(f"{PREFIX}_sq_description", "Description", 10000))
    add_column(f"{PREFIX}_equipment", choice_col(f"{PREFIX}_sq_ownertype", "Owner Type", [
        (1, "Team"), (2, "Person"),
    ]))
    add_column(f"{PREFIX}_equipment", choice_col(f"{PREFIX}_sq_status", "Equipment Status", [
        (1, "Available"), (2, "In Use"), (3, "Under Maintenance"), (4, "Retired"),
    ]))
    add_column(f"{PREFIX}_equipment", bool_col(f"{PREFIX}_sq_active", "Active", default=True))
    add_column(f"{PREFIX}_equipment", string_col(f"{PREFIX}_keyimageurl", "Key Image URL", 2000))
    add_column(f"{PREFIX}_equipment", memo_col(f"{PREFIX}_contentslistjson", "Contents List JSON", 100000))
    add_column(f"{PREFIX}_equipment", memo_col(f"{PREFIX}_quickstartflowchartjson", "Quick Start Flowchart JSON", 100000))
    add_lookup(f"{PREFIX}_equipment", f"{PREFIX}_ownerteamid", "Owner Team", f"{PREFIX}_team")
    add_lookup(f"{PREFIX}_equipment", f"{PREFIX}_ownerpersonid", "Owner Person", f"{PREFIX}_person")
    add_lookup(f"{PREFIX}_equipment", f"{PREFIX}_sq_contactpersonid", "Contact Person", f"{PREFIX}_person")
    add_lookup(f"{PREFIX}_equipment", f"{PREFIX}_sq_homelocationid", "Home Location", f"{PREFIX}_location")
    add_lookup(f"{PREFIX}_equipment", f"{PREFIX}_parentequipmentid", "Parent Equipment", f"{PREFIX}_equipment")

    # ── Phase 6: Leaf Entity Tables ───────────────────────────────────────
    print("\n=== Phase 6: Creating Leaf Entity Tables ===")

    print("Creating redi_equipmentmedia...")
    create_table(f"{PREFIX}_equipmentmedia", "Equipment Media", "Equipment Media",
                 "Images, documents, and attachments for equipment")
    add_column(f"{PREFIX}_equipmentmedia", choice_col(f"{PREFIX}_mediatype", "Media Type", [
        (1, "Image"), (2, "Attachment"),
    ]))
    add_column(f"{PREFIX}_equipmentmedia", string_col(f"{PREFIX}_filename", "File Name", 500))
    add_column(f"{PREFIX}_equipmentmedia", string_col(f"{PREFIX}_mimetype", "MIME Type", 200))
    add_column(f"{PREFIX}_equipmentmedia", string_col(f"{PREFIX}_fileurl", "File URL", 2000))
    add_column(f"{PREFIX}_equipmentmedia", int_col(f"{PREFIX}_sortorder", "Sort Order"))
    add_lookup(f"{PREFIX}_equipmentmedia", f"{PREFIX}_equipmentid", "Equipment", f"{PREFIX}_equipment", required=True)

    print("\nCreating redi_locationmedia...")
    create_table(f"{PREFIX}_locationmedia", "Location Media", "Location Media",
                 "Images and attachments for locations")
    add_column(f"{PREFIX}_locationmedia", choice_col(f"{PREFIX}_mediatype", "Media Type", [
        (1, "Image"), (2, "Attachment"),
    ]))
    add_column(f"{PREFIX}_locationmedia", string_col(f"{PREFIX}_filename", "File Name", 500))
    add_column(f"{PREFIX}_locationmedia", string_col(f"{PREFIX}_mimetype", "MIME Type", 200))
    add_column(f"{PREFIX}_locationmedia", string_col(f"{PREFIX}_fileurl", "File URL", 2000))
    add_column(f"{PREFIX}_locationmedia", int_col(f"{PREFIX}_sortorder", "Sort Order"))
    add_lookup(f"{PREFIX}_locationmedia", f"{PREFIX}_locationid", "Location", f"{PREFIX}_location", required=True)

    print("\nCreating redi_loantransfer...")
    create_table(f"{PREFIX}_loantransfer", "Loan Transfer", "Loan Transfers",
                 "Equipment loan and transfer records")
    add_column(f"{PREFIX}_loantransfer", date_col(f"{PREFIX}_startdate", "Start Date"))
    add_column(f"{PREFIX}_loantransfer", date_col(f"{PREFIX}_duedate", "Due Date"))
    add_column(f"{PREFIX}_loantransfer", choice_col(f"{PREFIX}_reasoncode", "Reason", [
        (1, "Simulation"), (2, "Training"), (3, "Service"), (4, "Other"),
    ]))
    add_column(f"{PREFIX}_loantransfer", choice_col(f"{PREFIX}_sq_status", "Status", [
        (1, "Draft"), (2, "Active"), (3, "Overdue"), (4, "Returned"), (5, "Cancelled"),
    ]))
    add_column(f"{PREFIX}_loantransfer", bool_col(f"{PREFIX}_isinternaltransfer", "Internal Transfer", default=False))
    add_column(f"{PREFIX}_loantransfer", memo_col(f"{PREFIX}_notes", "Notes", 10000))
    add_lookup(f"{PREFIX}_loantransfer", f"{PREFIX}_equipmentid", "Equipment", f"{PREFIX}_equipment", required=True)
    add_lookup(f"{PREFIX}_loantransfer", f"{PREFIX}_originteamid", "Origin Team", f"{PREFIX}_team", required=True)
    add_lookup(f"{PREFIX}_loantransfer", f"{PREFIX}_recipientteamid", "Recipient Team", f"{PREFIX}_team", required=True)
    add_lookup(f"{PREFIX}_loantransfer", f"{PREFIX}_approverpersonid", "Approver", f"{PREFIX}_person")

    # ── Phase 7: Circular Reference Fixups ────────────────────────────────
    print("\n=== Phase 7: Circular Reference Fixups ===")

    print("Adding Person -> Team lookup...")
    add_lookup(f"{PREFIX}_person", f"{PREFIX}_teamid", "Team", f"{PREFIX}_team")

    print("Adding Team -> Location lookup...")
    add_lookup(f"{PREFIX}_team", f"{PREFIX}_mainlocationid", "Main Location", f"{PREFIX}_location")

    # ── Phase 8: Add Tables to Solution ───────────────────────────────────
    print("\n=== Phase 8: Adding Tables to SimQuip Solution ===")

    tables = [
        f"{PREFIX}_building", f"{PREFIX}_person", f"{PREFIX}_team",
        f"{PREFIX}_level", f"{PREFIX}_location", f"{PREFIX}_teammember",
        f"{PREFIX}_equipment", f"{PREFIX}_equipmentmedia",
        f"{PREFIX}_locationmedia", f"{PREFIX}_loantransfer",
    ]

    for t in tables:
        add_to_solution(t)

    # ── Done ──────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("  SimQuip Dataverse schema provisioning complete!")
    print()
    print("  Next steps:")
    print("  1. Register data sources: pac code add-data-source")
    print("  2. Build and deploy: npm run build && pac code push")
    print("=" * 60)


if __name__ == "__main__":
    main()
