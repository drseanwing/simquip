# SimQuip Dataverse Table Creation Script
# Run from PowerShell (not WSL): .\dataverse\create-tables.ps1
#
# Prerequisites:
#   - Azure CLI logged in with Sean.Wing@health.qld.gov.au
#   - Or: run the device-code auth flow below
#
# This script creates all SimQuip tables in the REdI Development Dataverse environment.

param(
    [string]$OrgUrl = "https://redi.crm6.dynamics.com",
    [string]$TenantId = "0b65b008-95d7-4abc-bafc-3ffc20c039c0",
    [string]$SolutionName = "SimQuip",
    [string]$PublisherPrefix = "redi"
)

$ErrorActionPreference = "Stop"
$apiBase = "$OrgUrl/api/data/v9.2"

# ── Authentication ───────────────────────────────────────────────────────────

function Get-DataverseToken {
    # Try Azure CLI first
    try {
        $token = az account get-access-token --resource $OrgUrl --query accessToken -o tsv 2>$null
        if ($token -and $token.Length -gt 100) {
            # Verify the token works for this org
            $testHeaders = @{ Authorization = "Bearer $token"; "OData-MaxVersion" = "4.0"; "OData-Version" = "4.0" }
            try {
                Invoke-RestMethod -Uri "$apiBase/WhoAmI" -Headers $testHeaders -Method Get | Out-Null
                return $token
            } catch {
                Write-Host "Azure CLI token invalid for this org, trying device code flow..."
            }
        }
    } catch {}

    # Fall back to device code flow
    $clientId = "51f81489-12ee-4a9e-aaae-a2591f45987d"
    $body = @{ client_id = $clientId; resource = "$OrgUrl/" }
    $deviceCode = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$TenantId/oauth2/devicecode" -Method POST -Body $body

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  AUTHENTICATION REQUIRED                                     ║" -ForegroundColor Cyan
    Write-Host "║                                                              ║" -ForegroundColor Cyan
    Write-Host "║  1. Open: https://microsoft.com/devicelogin                  ║" -ForegroundColor Cyan
    Write-Host "║  2. Enter code: $($deviceCode.user_code)                              ║" -ForegroundColor Cyan
    Write-Host "║  3. Sign in with: Sean.Wing@health.qld.gov.au                ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    $pollBody = @{
        grant_type = "urn:ietf:params:oauth:grant-type:device_code"
        client_id  = $clientId
        resource   = "$OrgUrl/"
        code       = $deviceCode.device_code
    }

    for ($i = 0; $i -lt 120; $i++) {
        Start-Sleep -Seconds 5
        try {
            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$TenantId/oauth2/token" -Method POST -Body $pollBody -ErrorAction Stop
            Write-Host "Authenticated successfully!" -ForegroundColor Green
            return $tokenResponse.access_token
        } catch {
            $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($err.error -ne "authorization_pending") {
                throw "Authentication failed: $($err.error_description)"
            }
        }
    }
    throw "Authentication timed out"
}

$token = Get-DataverseToken
$headers = @{
    Authorization      = "Bearer $token"
    "OData-MaxVersion" = "4.0"
    "OData-Version"    = "4.0"
    "Content-Type"     = "application/json"
    Accept             = "application/json"
}

Write-Host ""
Write-Host "Connected to $OrgUrl" -ForegroundColor Green

# ── Helper Functions ─────────────────────────────────────────────────────────

function Invoke-Dv {
    param([string]$Method, [string]$Path, [object]$Body)
    $uri = "$apiBase/$Path"
    $params = @{ Uri = $uri; Headers = $headers; Method = $Method }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
    Invoke-RestMethod @params
}

function Test-TableExists {
    param([string]$LogicalName)
    try {
        Invoke-Dv -Method GET -Path "EntityDefinitions(LogicalName='$LogicalName')?`$select=LogicalName" | Out-Null
        return $true
    } catch { return $false }
}

function New-Table {
    param([string]$SchemaName, [string]$DisplayName, [string]$PluralName, [string]$Description, [hashtable[]]$Columns)

    $logicalName = $SchemaName.ToLower()

    if (Test-TableExists $logicalName) {
        Write-Host "  Table $SchemaName already exists, skipping..." -ForegroundColor Yellow
        return
    }

    $entity = @{
        SchemaName = $SchemaName
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
        DisplayCollectionName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $PluralName; LanguageCode = 1033 }) }
        Description = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $Description; LanguageCode = 1033 }) }
        HasActivities = $false
        HasNotes = $false
        OwnershipType = "UserOwned"
        IsActivity = $false
        PrimaryNameAttribute = "${logicalName}_name"
        Attributes = @(
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName = "${SchemaName}_name"
                RequiredLevel = @{ Value = "ApplicationRequired" }
                MaxLength = 200
                DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = "Name"; LanguageCode = 1033 }) }
                IsPrimaryName = $true
            }
        )
    }

    try {
        Invoke-Dv -Method POST -Path "EntityDefinitions" -Body $entity
        Write-Host "  Created table: $SchemaName" -ForegroundColor Green
    } catch {
        Write-Host "  FAILED to create table $SchemaName : $($_.Exception.Message)" -ForegroundColor Red
        throw
    }

    # Add additional columns
    foreach ($col in $Columns) {
        try {
            Invoke-Dv -Method POST -Path "EntityDefinitions(LogicalName='$logicalName')/Attributes" -Body $col
            $colName = $col.SchemaName
            Write-Host "    + Column: $colName" -ForegroundColor DarkGray
        } catch {
            Write-Host "    FAILED column $($col.SchemaName): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function New-Lookup {
    param([string]$FromTable, [string]$LookupSchemaName, [string]$DisplayName, [string]$ToTable, [bool]$Required = $false)

    $fromLogical = $FromTable.ToLower()
    $toLogical = $ToTable.ToLower()

    $relationship = @{
        SchemaName = "${fromLogical}_${LookupSchemaName.ToLower()}"
        "@odata.type" = "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata"
        ReferencedEntity = $toLogical
        ReferencingEntity = $fromLogical
        Lookup = @{
            "@odata.type" = "Microsoft.Dynamics.CRM.LookupAttributeMetadata"
            SchemaName = $LookupSchemaName
            RequiredLevel = @{ Value = if ($Required) { "ApplicationRequired" } else { "None" } }
            DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
        }
    }

    try {
        Invoke-Dv -Method POST -Path "RelationshipDefinitions" -Body $relationship
        Write-Host "    + Lookup: $LookupSchemaName -> $ToTable" -ForegroundColor DarkGray
    } catch {
        Write-Host "    FAILED lookup $LookupSchemaName : $($_.Exception.Message)" -ForegroundColor Red
    }
}

function New-StringColumn {
    param([string]$SchemaName, [string]$DisplayName, [int]$MaxLength = 200, [bool]$Required = $false)
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
        SchemaName = $SchemaName
        MaxLength = $MaxLength
        RequiredLevel = @{ Value = if ($Required) { "ApplicationRequired" } else { "None" } }
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
    }
}

function New-MemoColumn {
    param([string]$SchemaName, [string]$DisplayName, [int]$MaxLength = 100000)
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.MemoAttributeMetadata"
        SchemaName = $SchemaName
        MaxLength = $MaxLength
        RequiredLevel = @{ Value = "None" }
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
    }
}

function New-BoolColumn {
    param([string]$SchemaName, [string]$DisplayName, [bool]$Default = $true)
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.BooleanAttributeMetadata"
        SchemaName = $SchemaName
        RequiredLevel = @{ Value = "None" }
        DefaultValue = $Default
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
        OptionSet = @{
            TrueOption = @{ Value = 1; Label = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = "Yes"; LanguageCode = 1033 }) } }
            FalseOption = @{ Value = 0; Label = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = "No"; LanguageCode = 1033 }) } }
        }
    }
}

function New-IntColumn {
    param([string]$SchemaName, [string]$DisplayName)
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"
        SchemaName = $SchemaName
        RequiredLevel = @{ Value = "None" }
        MinValue = 0
        MaxValue = 999999
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
    }
}

function New-ChoiceColumn {
    param([string]$SchemaName, [string]$DisplayName, [hashtable[]]$Options)
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
        SchemaName = $SchemaName
        RequiredLevel = @{ Value = "None" }
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
        OptionSet = @{
            "@odata.type" = "Microsoft.Dynamics.CRM.OptionSetMetadata"
            IsGlobal = $false
            OptionSetType = "Picklist"
            Options = @(
                $Options | ForEach-Object {
                    @{
                        Value = $_.Value
                        Label = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $_.Label; LanguageCode = 1033 }) }
                    }
                }
            )
        }
    }
}

function New-DateColumn {
    param([string]$SchemaName, [string]$DisplayName)
    return @{
        "@odata.type" = "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata"
        SchemaName = $SchemaName
        RequiredLevel = @{ Value = "None" }
        Format = "DateOnly"
        DisplayName = @{ "@odata.type" = "Microsoft.Dynamics.CRM.Label"; LocalizedLabels = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $DisplayName; LanguageCode = 1033 }) }
    }
}

# ── Create Solution ──────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=== Phase 1: Creating SimQuip Solution ===" -ForegroundColor Cyan

try {
    $existingSolution = Invoke-Dv -Method GET -Path "solutions?`$filter=uniquename eq '$SolutionName'&`$select=solutionid"
    if ($existingSolution.value.Count -gt 0) {
        Write-Host "Solution '$SolutionName' already exists" -ForegroundColor Yellow
    } else {
        # Get the REdI publisher ID
        $publisher = Invoke-Dv -Method GET -Path "publishers?`$filter=customizationprefix eq '$PublisherPrefix'&`$select=publisherid"
        if ($publisher.value.Count -eq 0) {
            throw "Publisher with prefix '$PublisherPrefix' not found"
        }
        $publisherId = $publisher.value[0].publisherid

        $solution = @{
            uniquename = $SolutionName
            friendlyname = "SimQuip Equipment Management"
            description = "Equipment management system for RBWH simulation and training"
            version = "1.0.0.0"
            "publisherid@odata.bind" = "/publishers($publisherId)"
        }
        Invoke-Dv -Method POST -Path "solutions" -Body $solution
        Write-Host "Created solution: $SolutionName" -ForegroundColor Green
    }
} catch {
    Write-Host "Solution creation: $($_.Exception.Message)" -ForegroundColor Red
}

# ── Create Tables ────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "=== Phase 2: Creating Tables (Tier 1 - No FKs) ===" -ForegroundColor Cyan

# Building
Write-Host "Creating redi_building..."
New-Table -SchemaName "${PublisherPrefix}_building" -DisplayName "Building" -PluralName "Buildings" -Description "Physical buildings containing simulation spaces" -Columns @(
    (New-StringColumn -SchemaName "${PublisherPrefix}_code" -DisplayName "Building Code" -MaxLength 20 -Required $true)
)

# Person (without teamId - added later as circular ref fixup)
Write-Host "Creating redi_person..."
New-Table -SchemaName "${PublisherPrefix}_person" -DisplayName "Person" -PluralName "People" -Description "Staff members who manage or use equipment" -Columns @(
    (New-StringColumn -SchemaName "${PublisherPrefix}_displayname" -DisplayName "Display Name" -MaxLength 200 -Required $true),
    (New-StringColumn -SchemaName "${PublisherPrefix}_email" -DisplayName "Email" -MaxLength 200),
    (New-StringColumn -SchemaName "${PublisherPrefix}_phone" -DisplayName "Phone" -MaxLength 50),
    (New-BoolColumn -SchemaName "${PublisherPrefix}_active" -DisplayName "Active" -Default $true)
)

Write-Host ""
Write-Host "=== Phase 3: Creating Tables (Tier 2 - Depends on Tier 1) ===" -ForegroundColor Cyan

# Team (without mainLocationId - added later)
Write-Host "Creating redi_team..."
New-Table -SchemaName "${PublisherPrefix}_team" -DisplayName "Team" -PluralName "Teams" -Description "Organisational teams that own and manage equipment" -Columns @(
    (New-StringColumn -SchemaName "${PublisherPrefix}_teamcode" -DisplayName "Team Code" -MaxLength 20 -Required $true),
    (New-BoolColumn -SchemaName "${PublisherPrefix}_active" -DisplayName "Active" -Default $true)
)
New-Lookup -FromTable "${PublisherPrefix}_team" -LookupSchemaName "${PublisherPrefix}_maincontactpersonid" -DisplayName "Main Contact" -ToTable "${PublisherPrefix}_person"

# Level
Write-Host "Creating redi_level..."
New-Table -SchemaName "${PublisherPrefix}_level" -DisplayName "Level" -PluralName "Levels" -Description "Floor levels within buildings" -Columns @(
    (New-IntColumn -SchemaName "${PublisherPrefix}_sortorder" -DisplayName "Sort Order")
)
New-Lookup -FromTable "${PublisherPrefix}_level" -LookupSchemaName "${PublisherPrefix}_buildingid" -DisplayName "Building" -ToTable "${PublisherPrefix}_building" -Required $true

Write-Host ""
Write-Host "=== Phase 4: Creating Tables (Tier 3) ===" -ForegroundColor Cyan

# Location
Write-Host "Creating redi_location..."
New-Table -SchemaName "${PublisherPrefix}_location" -DisplayName "Location" -PluralName "Locations" -Description "Physical spaces where equipment is stored or used" -Columns @(
    (New-MemoColumn -SchemaName "${PublisherPrefix}_description" -DisplayName "Description" -MaxLength 5000)
)
New-Lookup -FromTable "${PublisherPrefix}_location" -LookupSchemaName "${PublisherPrefix}_buildingid" -DisplayName "Building" -ToTable "${PublisherPrefix}_building" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_location" -LookupSchemaName "${PublisherPrefix}_levelid" -DisplayName "Level" -ToTable "${PublisherPrefix}_level" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_location" -LookupSchemaName "${PublisherPrefix}_contactpersonid" -DisplayName "Contact Person" -ToTable "${PublisherPrefix}_person"

# TeamMember
Write-Host "Creating redi_teammember..."
New-Table -SchemaName "${PublisherPrefix}_teammember" -DisplayName "Team Member" -PluralName "Team Members" -Description "Association between people and teams with role" -Columns @(
    (New-StringColumn -SchemaName "${PublisherPrefix}_role" -DisplayName "Role" -MaxLength 200)
)
New-Lookup -FromTable "${PublisherPrefix}_teammember" -LookupSchemaName "${PublisherPrefix}_teamid" -DisplayName "Team" -ToTable "${PublisherPrefix}_team" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_teammember" -LookupSchemaName "${PublisherPrefix}_personid" -DisplayName "Person" -ToTable "${PublisherPrefix}_person" -Required $true

Write-Host ""
Write-Host "=== Phase 5: Creating Tables (Tier 4 - Equipment) ===" -ForegroundColor Cyan

# Equipment
Write-Host "Creating redi_equipment..."
New-Table -SchemaName "${PublisherPrefix}_equipment" -DisplayName "Equipment" -PluralName "Equipment Items" -Description "Simulation and training equipment assets" -Columns @(
    (New-StringColumn -SchemaName "${PublisherPrefix}_equipmentcode" -DisplayName "Equipment Code" -MaxLength 50 -Required $true),
    (New-MemoColumn -SchemaName "${PublisherPrefix}_description" -DisplayName "Description" -MaxLength 10000),
    (New-ChoiceColumn -SchemaName "${PublisherPrefix}_ownertype" -DisplayName "Owner Type" -Options @(
        @{ Value = 1; Label = "Team" }, @{ Value = 2; Label = "Person" }
    )),
    (New-ChoiceColumn -SchemaName "${PublisherPrefix}_status" -DisplayName "Status" -Options @(
        @{ Value = 1; Label = "Available" }, @{ Value = 2; Label = "In Use" },
        @{ Value = 3; Label = "Under Maintenance" }, @{ Value = 4; Label = "Retired" }
    )),
    (New-BoolColumn -SchemaName "${PublisherPrefix}_active" -DisplayName "Active" -Default $true),
    (New-StringColumn -SchemaName "${PublisherPrefix}_keyimageurl" -DisplayName "Key Image URL" -MaxLength 2000),
    (New-MemoColumn -SchemaName "${PublisherPrefix}_contentslistjson" -DisplayName "Contents List JSON" -MaxLength 100000),
    (New-MemoColumn -SchemaName "${PublisherPrefix}_quickstartflowchartjson" -DisplayName "Quick Start Flowchart JSON" -MaxLength 100000)
)
New-Lookup -FromTable "${PublisherPrefix}_equipment" -LookupSchemaName "${PublisherPrefix}_ownerteamid" -DisplayName "Owner Team" -ToTable "${PublisherPrefix}_team"
New-Lookup -FromTable "${PublisherPrefix}_equipment" -LookupSchemaName "${PublisherPrefix}_ownerpersonid" -DisplayName "Owner Person" -ToTable "${PublisherPrefix}_person"
New-Lookup -FromTable "${PublisherPrefix}_equipment" -LookupSchemaName "${PublisherPrefix}_contactpersonid" -DisplayName "Contact Person" -ToTable "${PublisherPrefix}_person" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_equipment" -LookupSchemaName "${PublisherPrefix}_homelocationid" -DisplayName "Home Location" -ToTable "${PublisherPrefix}_location" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_equipment" -LookupSchemaName "${PublisherPrefix}_parentequipmentid" -DisplayName "Parent Equipment" -ToTable "${PublisherPrefix}_equipment"

Write-Host ""
Write-Host "=== Phase 6: Creating Tables (Tier 5 - Leaf Entities) ===" -ForegroundColor Cyan

# EquipmentMedia
Write-Host "Creating redi_equipmentmedia..."
New-Table -SchemaName "${PublisherPrefix}_equipmentmedia" -DisplayName "Equipment Media" -PluralName "Equipment Media" -Description "Images, documents, and attachments for equipment" -Columns @(
    (New-ChoiceColumn -SchemaName "${PublisherPrefix}_mediatype" -DisplayName "Media Type" -Options @(
        @{ Value = 1; Label = "Image" }, @{ Value = 2; Label = "Attachment" }
    )),
    (New-StringColumn -SchemaName "${PublisherPrefix}_filename" -DisplayName "File Name" -MaxLength 500),
    (New-StringColumn -SchemaName "${PublisherPrefix}_mimetype" -DisplayName "MIME Type" -MaxLength 200),
    (New-StringColumn -SchemaName "${PublisherPrefix}_fileurl" -DisplayName "File URL" -MaxLength 2000),
    (New-IntColumn -SchemaName "${PublisherPrefix}_sortorder" -DisplayName "Sort Order")
)
New-Lookup -FromTable "${PublisherPrefix}_equipmentmedia" -LookupSchemaName "${PublisherPrefix}_equipmentid" -DisplayName "Equipment" -ToTable "${PublisherPrefix}_equipment" -Required $true

# LocationMedia
Write-Host "Creating redi_locationmedia..."
New-Table -SchemaName "${PublisherPrefix}_locationmedia" -DisplayName "Location Media" -PluralName "Location Media" -Description "Images and attachments for locations" -Columns @(
    (New-ChoiceColumn -SchemaName "${PublisherPrefix}_mediatype" -DisplayName "Media Type" -Options @(
        @{ Value = 1; Label = "Image" }, @{ Value = 2; Label = "Attachment" }
    )),
    (New-StringColumn -SchemaName "${PublisherPrefix}_filename" -DisplayName "File Name" -MaxLength 500),
    (New-StringColumn -SchemaName "${PublisherPrefix}_mimetype" -DisplayName "MIME Type" -MaxLength 200),
    (New-StringColumn -SchemaName "${PublisherPrefix}_fileurl" -DisplayName "File URL" -MaxLength 2000),
    (New-IntColumn -SchemaName "${PublisherPrefix}_sortorder" -DisplayName "Sort Order")
)
New-Lookup -FromTable "${PublisherPrefix}_locationmedia" -LookupSchemaName "${PublisherPrefix}_locationid" -DisplayName "Location" -ToTable "${PublisherPrefix}_location" -Required $true

# LoanTransfer
Write-Host "Creating redi_loantransfer..."
New-Table -SchemaName "${PublisherPrefix}_loantransfer" -DisplayName "Loan Transfer" -PluralName "Loan Transfers" -Description "Equipment loan and transfer records" -Columns @(
    (New-DateColumn -SchemaName "${PublisherPrefix}_startdate" -DisplayName "Start Date"),
    (New-DateColumn -SchemaName "${PublisherPrefix}_duedate" -DisplayName "Due Date"),
    (New-ChoiceColumn -SchemaName "${PublisherPrefix}_reasoncode" -DisplayName "Reason" -Options @(
        @{ Value = 1; Label = "Simulation" }, @{ Value = 2; Label = "Training" },
        @{ Value = 3; Label = "Service" }, @{ Value = 4; Label = "Other" }
    )),
    (New-ChoiceColumn -SchemaName "${PublisherPrefix}_status" -DisplayName "Status" -Options @(
        @{ Value = 1; Label = "Draft" }, @{ Value = 2; Label = "Active" },
        @{ Value = 3; Label = "Overdue" }, @{ Value = 4; Label = "Returned" },
        @{ Value = 5; Label = "Cancelled" }
    )),
    (New-BoolColumn -SchemaName "${PublisherPrefix}_isinternaltransfer" -DisplayName "Internal Transfer" -Default $false),
    (New-MemoColumn -SchemaName "${PublisherPrefix}_notes" -DisplayName "Notes" -MaxLength 10000)
)
New-Lookup -FromTable "${PublisherPrefix}_loantransfer" -LookupSchemaName "${PublisherPrefix}_equipmentid" -DisplayName "Equipment" -ToTable "${PublisherPrefix}_equipment" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_loantransfer" -LookupSchemaName "${PublisherPrefix}_originteamid" -DisplayName "Origin Team" -ToTable "${PublisherPrefix}_team" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_loantransfer" -LookupSchemaName "${PublisherPrefix}_recipientteamid" -DisplayName "Recipient Team" -ToTable "${PublisherPrefix}_team" -Required $true
New-Lookup -FromTable "${PublisherPrefix}_loantransfer" -LookupSchemaName "${PublisherPrefix}_approverpersonid" -DisplayName "Approver" -ToTable "${PublisherPrefix}_person"

Write-Host ""
Write-Host "=== Phase 7: Circular Reference Fixups ===" -ForegroundColor Cyan

# Add teamId lookup on Person -> Team
Write-Host "Adding Person.teamId -> Team lookup..."
New-Lookup -FromTable "${PublisherPrefix}_person" -LookupSchemaName "${PublisherPrefix}_teamid" -DisplayName "Team" -ToTable "${PublisherPrefix}_team"

# Add mainLocationId lookup on Team -> Location
Write-Host "Adding Team.mainLocationId -> Location lookup..."
New-Lookup -FromTable "${PublisherPrefix}_team" -LookupSchemaName "${PublisherPrefix}_mainlocationid" -DisplayName "Main Location" -ToTable "${PublisherPrefix}_location"

Write-Host ""
Write-Host "=== Phase 8: Adding Tables to Solution ===" -ForegroundColor Cyan

$solution = Invoke-Dv -Method GET -Path "solutions?`$filter=uniquename eq '$SolutionName'&`$select=solutionid"
if ($solution.value.Count -gt 0) {
    $solutionId = $solution.value[0].solutionid

    $tables = @(
        "${PublisherPrefix}_building", "${PublisherPrefix}_person", "${PublisherPrefix}_team",
        "${PublisherPrefix}_level", "${PublisherPrefix}_location", "${PublisherPrefix}_teammember",
        "${PublisherPrefix}_equipment", "${PublisherPrefix}_equipmentmedia",
        "${PublisherPrefix}_locationmedia", "${PublisherPrefix}_loantransfer"
    )

    foreach ($table in $tables) {
        try {
            $entityMeta = Invoke-Dv -Method GET -Path "EntityDefinitions(LogicalName='$table')?`$select=MetadataId"
            $addComponent = @{
                ComponentId = $entityMeta.MetadataId
                ComponentType = 1  # Entity
                SolutionUniqueName = $SolutionName
                AddRequiredComponents = $false
            }
            Invoke-Dv -Method POST -Path "AddSolutionComponent" -Body $addComponent
            Write-Host "  Added $table to solution" -ForegroundColor DarkGray
        } catch {
            Write-Host "  Could not add $table to solution: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  SimQuip Dataverse schema created successfully!              ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Next steps:                                                 ║" -ForegroundColor Green
Write-Host "║  1. Register data sources: pac code add-data-source          ║" -ForegroundColor Green
Write-Host "║  2. Seed data via Settings page                              ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
