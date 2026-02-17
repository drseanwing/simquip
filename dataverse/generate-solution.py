#!/usr/bin/env python3
"""
Generate a Dataverse solution package from schema.json for SimQuip.

Reads the schema definition and generates the full unpacked solution structure
that can be packed using `pac solution pack` and imported into Dataverse.

Based on the REdI Trolley Audit solution generator pattern.
"""

import json
import os
import shutil
from pathlib import Path
from typing import Any

# Constants
SOLUTION_NAME = "SimQuipTables"
SOLUTION_DISPLAY_NAME = "SimQuip Tables"
SOLUTION_VERSION = "1.0.0.0"
PUBLISHER_UNIQUE_NAME = "Resus_EDucation_Initiative"
PUBLISHER_DISPLAY_NAME = "REdI"
PUBLISHER_PREFIX = "redi"
PUBLISHER_OPTION_PREFIX = "91352"
LANGUAGE_CODE = "1033"

# Base directory for the solution
SCRIPT_DIR = Path(__file__).parent
SCHEMA_PATH = SCRIPT_DIR / "schema.json"
SOLUTION_DIR = SCRIPT_DIR / "solution_output"

# Option value base - using publisher prefix range
OPTION_VALUE_BASE = 100000000


def load_schema() -> dict[str, Any]:
    """Load and return the schema JSON."""
    with open(SCHEMA_PATH, "r") as f:
        return json.load(f)


def get_primary_name_column(table: dict[str, Any]) -> str:
    """Determine the primary name column for a table.

    Uses the explicit primaryNameColumn from schema if set,
    otherwise falls back to auto-detection.
    """
    if "primaryNameColumn" in table:
        return table["primaryNameColumn"]
    for col in table["columns"]:
        if col["logicalName"] == "redi_name":
            return "redi_name"
    for col in table["columns"]:
        if col["type"] == "String" and col.get("required", False):
            return col["logicalName"]
    for col in table["columns"]:
        if col["type"] == "String":
            return col["logicalName"]
    # Default: use entity_name convention
    return f"{table['logicalName']}_name"


def label_json(text: str) -> str:
    return f'<label description="{text}" languagecode="{LANGUAGE_CODE}" />'


def generate_attribute_xml(
    col: dict[str, Any],
    table_logical_name: str,
    is_primary_name: bool = False,
) -> str:
    """Generate XML for a single attribute/column."""
    logical_name = col["logicalName"]
    display_name = col["displayName"]
    col_type = col["type"]
    required = col.get("required", False)
    required_level = "required" if required else "none"

    physical_name = logical_name

    display_mask = "ValidForAdvancedFind|ValidForForm|ValidForGrid"
    if is_primary_name:
        display_mask = "PrimaryName|ValidForAdvancedFind|ValidForForm|ValidForGrid|RequiredForForm"
        required_level = "required"

    common_attrs = f"""        <attribute PhysicalName="{physical_name}">
          {{TYPE_BLOCK}}
          <Name>{logical_name}</Name>
          <LogicalName>{logical_name}</LogicalName>
          <RequiredLevel>{required_level}</RequiredLevel>
          <DisplayMask>{display_mask}</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>1</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>1</IsCustomField>
          <IsAuditEnabled>1</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>{1 if is_primary_name else 0}</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>{1 if is_primary_name else 0}</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          {{EXTRA_BLOCK}}
          <displaynames>
            <displayname description="{display_name}" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>"""

    if col_type == "String":
        max_length = col.get("maxLength", 200)
        type_block = "<Type>nvarchar</Type>"
        extra = f"""<Format>text</Format>
          <MaxLength>{max_length}</MaxLength>
          <Length>{max_length * 2}</Length>"""

    elif col_type == "Memo":
        type_block = "<Type>ntext</Type>"
        extra = """<Format>textarea</Format>
          <MaxLength>2000</MaxLength>"""

    elif col_type == "Integer":
        type_block = "<Type>int</Type>"
        extra = """<Format></Format>
          <MinValue>-2147483648</MinValue>
          <MaxValue>2147483647</MaxValue>"""

    elif col_type == "Boolean":
        type_block = "<Type>bit</Type>"
        optionset_name = f"{table_logical_name}_{logical_name}"
        extra = f"""<optionset Name="{optionset_name}">
            <OptionSetType>bit</OptionSetType>
            <IntroducedVersion>1.0.0.0</IntroducedVersion>
            <IsCustomizable>1</IsCustomizable>
            <displaynames>
              <displayname description="{display_name}" languagecode="{LANGUAGE_CODE}" />
            </displaynames>
            <options>
              <option value="1" ExternalValue="" IsHidden="0">
                <labels>
                  <label description="Yes" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </option>
              <option value="0" ExternalValue="" IsHidden="0">
                <labels>
                  <label description="No" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </option>
            </options>
          </optionset>"""

    elif col_type in ("DateTime", "DateOnly"):
        type_block = "<Type>datetime</Type>"
        if col_type == "DateOnly":
            extra = """<Format>date</Format>
          <CanChangeDateTimeBehavior>1</CanChangeDateTimeBehavior>
          <Behavior>2</Behavior>"""
        else:
            extra = """<Format>datetime</Format>
          <CanChangeDateTimeBehavior>1</CanChangeDateTimeBehavior>
          <Behavior>1</Behavior>"""
        common_attrs = common_attrs.replace(
            "<ImeMode>auto</ImeMode>", "<ImeMode>inactive</ImeMode>"
        )

    elif col_type == "Lookup":
        type_block = "<Type>lookup</Type>"
        extra = """<LookupStyle>single</LookupStyle>
          <LookupTypes />"""

    elif col_type == "Choice":
        type_block = "<Type>picklist</Type>"
        options_list = col.get("options", [])
        optionset_name = f"{table_logical_name}_{logical_name}"
        options_xml = ""
        for i, opt in enumerate(options_list):
            opt_value = OPTION_VALUE_BASE + i
            options_xml += f"""
              <option value="{opt_value}" ExternalValue="" IsHidden="0">
                <labels>
                  <label description="{opt}" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </option>"""

        extra = f"""<optionset Name="{optionset_name}">
            <OptionSetType>picklist</OptionSetType>
            <IntroducedVersion>1.0.0.0</IntroducedVersion>
            <IsCustomizable>1</IsCustomizable>
            <displaynames>
              <displayname description="{display_name}" languagecode="{LANGUAGE_CODE}" />
            </displaynames>
            <options>{options_xml}
            </options>
          </optionset>"""

    else:
        raise ValueError(f"Unknown column type: {col_type}")

    result = common_attrs.replace("{TYPE_BLOCK}", type_block)
    result = result.replace("{EXTRA_BLOCK}", extra)
    return result


def generate_system_attributes(table_logical_name: str) -> str:
    """Generate system attributes that every custom entity needs."""
    entity_id_name = f"{table_logical_name}id"
    display_name_parts = table_logical_name.replace("redi_", "").title()

    return f"""        <attribute PhysicalName="{entity_id_name}">
          <Type>primarykey</Type>
          <Name>{entity_id_name}</Name>
          <LogicalName>{entity_id_name}</LogicalName>
          <RequiredLevel>systemrequired</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|RequiredForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>0</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>1</IsFilterable>
          <IsRetrievable>1</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <displaynames>
            <displayname description="{display_name_parts}" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
          <Descriptions>
            <Description description="Unique identifier for entity instances" languagecode="{LANGUAGE_CODE}" />
          </Descriptions>
        </attribute>
        <attribute PhysicalName="CreatedBy">
          <Type>lookup</Type>
          <Name>createdby</Name>
          <LogicalName>createdby</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <LookupStyle>single</LookupStyle>
          <LookupTypes />
          <displaynames>
            <displayname description="Created By" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="CreatedOn">
          <Type>datetime</Type>
          <Name>createdon</Name>
          <LogicalName>createdon</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>inactive</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>1</IsFilterable>
          <IsRetrievable>1</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <Format>datetime</Format>
          <CanChangeDateTimeBehavior>0</CanChangeDateTimeBehavior>
          <Behavior>1</Behavior>
          <displaynames>
            <displayname description="Created On" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="CreatedOnBehalfBy">
          <Type>lookup</Type>
          <Name>createdonbehalfby</Name>
          <LogicalName>createdonbehalfby</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <LookupStyle>single</LookupStyle>
          <LookupTypes />
          <displaynames>
            <displayname description="Created By (Delegate)" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="ModifiedBy">
          <Type>lookup</Type>
          <Name>modifiedby</Name>
          <LogicalName>modifiedby</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <LookupStyle>single</LookupStyle>
          <LookupTypes />
          <displaynames>
            <displayname description="Modified By" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="ModifiedOn">
          <Type>datetime</Type>
          <Name>modifiedon</Name>
          <LogicalName>modifiedon</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>inactive</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>1</IsFilterable>
          <IsRetrievable>1</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <Format>datetime</Format>
          <CanChangeDateTimeBehavior>0</CanChangeDateTimeBehavior>
          <Behavior>1</Behavior>
          <displaynames>
            <displayname description="Modified On" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="ModifiedOnBehalfBy">
          <Type>lookup</Type>
          <Name>modifiedonbehalfby</Name>
          <LogicalName>modifiedonbehalfby</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <LookupStyle>single</LookupStyle>
          <LookupTypes />
          <displaynames>
            <displayname description="Modified By (Delegate)" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="OverriddenCreatedOn">
          <Type>datetime</Type>
          <Name>overriddencreatedon</Name>
          <LogicalName>overriddencreatedon</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForGrid</DisplayMask>
          <ImeMode>inactive</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>1</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <Format>date</Format>
          <CanChangeDateTimeBehavior>0</CanChangeDateTimeBehavior>
          <Behavior>1</Behavior>
          <displaynames>
            <displayname description="Record Created On" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="ImportSequenceNumber">
          <Type>int</Type>
          <Name>importsequencenumber</Name>
          <LogicalName>importsequencenumber</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind</DisplayMask>
          <ImeMode>disabled</ImeMode>
          <ValidForUpdateApi>0</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>1</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <Format></Format>
          <MinValue>-2147483648</MinValue>
          <MaxValue>2147483647</MaxValue>
          <displaynames>
            <displayname description="Import Sequence Number" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="TimeZoneRuleVersionNumber">
          <Type>int</Type>
          <Name>timezoneruleversionnumber</Name>
          <LogicalName>timezoneruleversionnumber</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>1</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <Format></Format>
          <MinValue>-1</MinValue>
          <MaxValue>2147483647</MaxValue>
          <displaynames>
            <displayname description="Time Zone Rule Version Number" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="UTCConversionTimeZoneCode">
          <Type>int</Type>
          <Name>utcconversiontimezonecode</Name>
          <LogicalName>utcconversiontimezonecode</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>1</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>0</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <Format></Format>
          <MinValue>-1</MinValue>
          <MaxValue>2147483647</MaxValue>
          <displaynames>
            <displayname description="UTC Conversion Time Zone Code" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="statecode">
          <Type>state</Type>
          <Name>statecode</Name>
          <LogicalName>statecode</LogicalName>
          <RequiredLevel>systemrequired</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>1</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>0</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>1</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>1</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <optionset Name="{table_logical_name}_statecode">
            <OptionSetType>state</OptionSetType>
            <IntroducedVersion>1.0.0.0</IntroducedVersion>
            <IsCustomizable>1</IsCustomizable>
            <displaynames>
              <displayname description="Status" languagecode="{LANGUAGE_CODE}" />
            </displaynames>
            <states>
              <state value="0" defaultstatus="1" invariantname="Active">
                <labels>
                  <label description="Active" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </state>
              <state value="1" defaultstatus="2" invariantname="Inactive">
                <labels>
                  <label description="Inactive" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </state>
            </states>
          </optionset>
          <displaynames>
            <displayname description="Status" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>
        <attribute PhysicalName="statuscode">
          <Type>status</Type>
          <Name>statuscode</Name>
          <LogicalName>statuscode</LogicalName>
          <RequiredLevel>none</RequiredLevel>
          <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
          <ImeMode>auto</ImeMode>
          <ValidForUpdateApi>1</ValidForUpdateApi>
          <ValidForReadApi>1</ValidForReadApi>
          <ValidForCreateApi>1</ValidForCreateApi>
          <IsCustomField>0</IsCustomField>
          <IsAuditEnabled>1</IsAuditEnabled>
          <IsSecured>0</IsSecured>
          <IntroducedVersion>1.0.0.0</IntroducedVersion>
          <IsCustomizable>1</IsCustomizable>
          <IsRenameable>1</IsRenameable>
          <CanModifySearchSettings>1</CanModifySearchSettings>
          <CanModifyRequirementLevelSettings>1</CanModifyRequirementLevelSettings>
          <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
          <SourceType>0</SourceType>
          <IsGlobalFilterEnabled>0</IsGlobalFilterEnabled>
          <IsSortableEnabled>0</IsSortableEnabled>
          <CanModifyGlobalFilterSettings>1</CanModifyGlobalFilterSettings>
          <CanModifyIsSortableSettings>1</CanModifyIsSortableSettings>
          <IsDataSourceSecret>0</IsDataSourceSecret>
          <AutoNumberFormat></AutoNumberFormat>
          <IsSearchable>0</IsSearchable>
          <IsFilterable>0</IsFilterable>
          <IsRetrievable>0</IsRetrievable>
          <IsLocalizable>0</IsLocalizable>
          <optionset Name="{table_logical_name}_statuscode">
            <OptionSetType>status</OptionSetType>
            <IntroducedVersion>1.0.0.0</IntroducedVersion>
            <IsCustomizable>1</IsCustomizable>
            <displaynames>
              <displayname description="Status Reason" languagecode="{LANGUAGE_CODE}" />
            </displaynames>
            <statuses>
              <status value="1" state="0">
                <labels>
                  <label description="Active" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </status>
              <status value="2" state="1">
                <labels>
                  <label description="Inactive" languagecode="{LANGUAGE_CODE}" />
                </labels>
              </status>
            </statuses>
          </optionset>
          <displaynames>
            <displayname description="Status Reason" languagecode="{LANGUAGE_CODE}" />
          </displaynames>
        </attribute>"""


def generate_entity_xml(table: dict[str, Any]) -> str:
    """Generate the complete Entity.xml for a table."""
    logical_name = table["logicalName"]
    display_name = table["displayName"]
    plural_name = table["pluralName"]
    description = table.get("description", f"{display_name} table for SimQuip")
    entity_set_name = logical_name + "es" if logical_name.endswith("s") else logical_name + "s"

    primary_name_col = get_primary_name_column(table)

    custom_attrs = []
    for col in table["columns"]:
        is_primary = col["logicalName"] == primary_name_col
        attr_xml = generate_attribute_xml(col, logical_name, is_primary)
        custom_attrs.append(attr_xml)

    # Only create a primary name column if it's explicitly in the columns list.
    # If using the auto-generated {entity}_name column (from Dataverse),
    # don't create a new one - the table already has it.
    has_primary = any(col["logicalName"] == primary_name_col for col in table["columns"])
    if not has_primary and "primaryNameColumn" not in table:
        # Only auto-create redi_name if no explicit primary was set
        default_primary = {
            "logicalName": "redi_name",
            "displayName": "Name",
            "type": "String",
            "maxLength": 200,
            "required": True,
        }
        custom_attrs.insert(
            0,
            generate_attribute_xml(default_primary, logical_name, is_primary_name=True),
        )

    system_attrs = generate_system_attributes(logical_name)
    all_attrs = system_attrs + "\n" + "\n".join(custom_attrs)

    entity_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<Entity xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Name LocalizedName="{display_name}" OriginalName="{display_name}">{logical_name}</Name>
  <EntityInfo>
    <entity Name="{logical_name}">
      <LocalizedNames>
        <LocalizedName description="{display_name}" languagecode="{LANGUAGE_CODE}" />
      </LocalizedNames>
      <LocalizedCollectionNames>
        <LocalizedCollectionName description="{plural_name}" languagecode="{LANGUAGE_CODE}" />
      </LocalizedCollectionNames>
      <Descriptions>
        <Description description="{description}" languagecode="{LANGUAGE_CODE}" />
      </Descriptions>
      <attributes>
{all_attrs}
      </attributes>
      <EntitySetName>{entity_set_name}</EntitySetName>
      <IsDuplicateCheckSupported>0</IsDuplicateCheckSupported>
      <IsBusinessProcessEnabled>0</IsBusinessProcessEnabled>
      <IsRequiredOffline>0</IsRequiredOffline>
      <IsInteractionCentricEnabled>0</IsInteractionCentricEnabled>
      <IsCollaboration>0</IsCollaboration>
      <AutoRouteToOwnerQueue>0</AutoRouteToOwnerQueue>
      <IsConnectionsEnabled>0</IsConnectionsEnabled>
      <IsDocumentManagementEnabled>0</IsDocumentManagementEnabled>
      <AutoCreateAccessTeams>0</AutoCreateAccessTeams>
      <IsOneNoteIntegrationEnabled>0</IsOneNoteIntegrationEnabled>
      <IsKnowledgeManagementEnabled>0</IsKnowledgeManagementEnabled>
      <IsSLAEnabled>0</IsSLAEnabled>
      <IsDocumentRecommendationsEnabled>0</IsDocumentRecommendationsEnabled>
      <IsBPFEntity>0</IsBPFEntity>
      <OwnershipTypeMask>UserOwned</OwnershipTypeMask>
      <IsAuditEnabled>1</IsAuditEnabled>
      <IsRetrieveAuditEnabled>0</IsRetrieveAuditEnabled>
      <IsRetrieveMultipleAuditEnabled>0</IsRetrieveMultipleAuditEnabled>
      <IsActivity>0</IsActivity>
      <ActivityTypeMask></ActivityTypeMask>
      <IsActivityParty>0</IsActivityParty>
      <IsReplicated>0</IsReplicated>
      <IsReplicationUserFiltered>0</IsReplicationUserFiltered>
      <IsMailMergeEnabled>0</IsMailMergeEnabled>
      <IsVisibleInMobile>0</IsVisibleInMobile>
      <IsVisibleInMobileClient>0</IsVisibleInMobileClient>
      <IsReadOnlyInMobileClient>0</IsReadOnlyInMobileClient>
      <IsOfflineInMobileClient>0</IsOfflineInMobileClient>
      <DaysSinceRecordLastModified>0</DaysSinceRecordLastModified>
      <MobileOfflineFilters></MobileOfflineFilters>
      <IsMapiGridEnabled>1</IsMapiGridEnabled>
      <IsReadingPaneEnabled>1</IsReadingPaneEnabled>
      <IsQuickCreateEnabled>0</IsQuickCreateEnabled>
      <SyncToExternalSearchIndex>0</SyncToExternalSearchIndex>
      <IntroducedVersion>1.0.0.0</IntroducedVersion>
      <IsCustomizable>1</IsCustomizable>
      <IsRenameable>1</IsRenameable>
      <IsMappable>1</IsMappable>
      <CanModifyAuditSettings>1</CanModifyAuditSettings>
      <CanModifyMobileVisibility>1</CanModifyMobileVisibility>
      <CanModifyMobileClientVisibility>1</CanModifyMobileClientVisibility>
      <CanModifyMobileClientReadOnly>1</CanModifyMobileClientReadOnly>
      <CanModifyMobileClientOffline>1</CanModifyMobileClientOffline>
      <CanModifyConnectionSettings>1</CanModifyConnectionSettings>
      <CanModifyDuplicateDetectionSettings>1</CanModifyDuplicateDetectionSettings>
      <CanModifyMailMergeSettings>1</CanModifyMailMergeSettings>
      <CanModifyQueueSettings>1</CanModifyQueueSettings>
      <CanCreateAttributes>1</CanCreateAttributes>
      <CanCreateForms>1</CanCreateForms>
      <CanCreateCharts>1</CanCreateCharts>
      <CanCreateViews>1</CanCreateViews>
      <CanModifyAdditionalSettings>1</CanModifyAdditionalSettings>
      <CanEnableSyncToExternalSearchIndex>1</CanEnableSyncToExternalSearchIndex>
      <EnforceStateTransitions>0</EnforceStateTransitions>
      <CanChangeHierarchicalRelationship>1</CanChangeHierarchicalRelationship>
      <EntityHelpUrlEnabled>0</EntityHelpUrlEnabled>
      <ChangeTrackingEnabled>1</ChangeTrackingEnabled>
      <CanChangeTrackingBeEnabled>1</CanChangeTrackingBeEnabled>
      <IsEnabledForExternalChannels>0</IsEnabledForExternalChannels>
      <IsMSTeamsIntegrationEnabled>0</IsMSTeamsIntegrationEnabled>
      <IsSolutionAware>0</IsSolutionAware>
    </entity>
  </EntityInfo>
  <FormXml />
  <SavedQueries />
  <RibbonDiffXml />
</Entity>"""

    return entity_xml


def generate_relationship_xml(
    relationship_name: str,
    referencing_entity: str,
    referenced_entity: str,
    referencing_attribute: str,
) -> str:
    """Generate XML for a single 1:N relationship."""
    return f"""  <EntityRelationship Name="{relationship_name}">
    <EntityRelationshipType>OneToMany</EntityRelationshipType>
    <IsCustomizable>1</IsCustomizable>
    <IntroducedVersion>1.0.0.0</IntroducedVersion>
    <IsHierarchical>0</IsHierarchical>
    <ReferencingEntityName>{referencing_entity}</ReferencingEntityName>
    <ReferencedEntityName>{referenced_entity}</ReferencedEntityName>
    <CascadeAssign>NoCascade</CascadeAssign>
    <CascadeDelete>RemoveLink</CascadeDelete>
    <CascadeArchive>RemoveLink</CascadeArchive>
    <CascadeReparent>NoCascade</CascadeReparent>
    <CascadeShare>NoCascade</CascadeShare>
    <CascadeUnshare>NoCascade</CascadeUnshare>
    <CascadeRollupView>NoCascade</CascadeRollupView>
    <IsValidForAdvancedFind>1</IsValidForAdvancedFind>
    <ReferencingAttributeName>{referencing_attribute}</ReferencingAttributeName>
    <RelationshipDescription />
    <EntityRelationshipRoles>
      <EntityRelationshipRole>
        <NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption>
        <NavPaneArea>Details</NavPaneArea>
        <NavPaneOrder>10000</NavPaneOrder>
        <NavigationPropertyName>{referencing_attribute}</NavigationPropertyName>
        <RelationshipRoleType>1</RelationshipRoleType>
      </EntityRelationshipRole>
      <EntityRelationshipRole>
        <NavigationPropertyName>{relationship_name}</NavigationPropertyName>
        <RelationshipRoleType>0</RelationshipRoleType>
      </EntityRelationshipRole>
    </EntityRelationshipRoles>
  </EntityRelationship>"""


def get_relationship_name(
    referenced_entity: str,
    referencing_entity: str,
    referencing_attribute: str,
) -> str:
    """Generate a unique relationship name."""
    ref_short = referenced_entity.replace("redi_", "")
    refing_short = referencing_entity.replace("redi_", "")
    attr_short = referencing_attribute.replace("redi_", "")
    return f"redi_{ref_short}_{refing_short}_{attr_short}"


def generate_solution() -> None:
    """Generate the complete solution package structure."""
    schema = load_schema()
    tables = schema["tables"]

    if SOLUTION_DIR.exists():
        shutil.rmtree(SOLUTION_DIR)

    entities_dir = SOLUTION_DIR / "Entities"
    other_dir = SOLUTION_DIR / "Other"
    relationships_dir = other_dir / "Relationships"

    entities_dir.mkdir(parents=True)
    other_dir.mkdir(parents=True)
    relationships_dir.mkdir(parents=True)

    all_relationships: dict[str, list[str]] = {}
    all_relationship_names: list[str] = []

    for table in tables:
        logical_name = table["logicalName"]
        entity_dir = entities_dir / logical_name
        entity_dir.mkdir(parents=True)

        entity_xml = generate_entity_xml(table)
        with open(entity_dir / "Entity.xml", "w", encoding="utf-8") as f:
            f.write(entity_xml)

        with open(entity_dir / "RibbonDiff.xml", "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="utf-8"?>\n<RibbonDiffXml />\n')

        for col in table["columns"]:
            if col["type"] == "Lookup":
                target = col["target"]
                rel_name = get_relationship_name(target, logical_name, col["logicalName"])
                rel_xml = generate_relationship_xml(
                    rel_name, logical_name, target, col["logicalName"]
                )
                if target not in all_relationships:
                    all_relationships[target] = []
                all_relationships[target].append(rel_xml)
                all_relationship_names.append(rel_name)

        print(f"  Generated entity: {logical_name} ({table['displayName']})")

    for referenced_entity, rel_xmls in all_relationships.items():
        rel_file_content = '<?xml version="1.0" encoding="utf-8"?>\n<EntityRelationships xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
        rel_file_content += "\n".join(rel_xmls)
        rel_file_content += "\n</EntityRelationships>\n"

        rel_path = relationships_dir / f"{referenced_entity}.xml"
        with open(rel_path, "w", encoding="utf-8") as f:
            f.write(rel_file_content)
        print(f"  Generated relationships for: {referenced_entity}")

    rel_index_xml = '<?xml version="1.0" encoding="utf-8"?>\n<EntityRelationships xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
    for rel_name in sorted(all_relationship_names):
        rel_index_xml += f'  <EntityRelationship Name="{rel_name}" />\n'
    rel_index_xml += "</EntityRelationships>\n"

    with open(other_dir / "Relationships.xml", "w", encoding="utf-8") as f:
        f.write(rel_index_xml)

    customizations_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Entities />
  <Roles />
  <Workflows />
  <FieldSecurityProfiles />
  <Templates />
  <EntityMaps />
  <EntityRelationships />
  <OrganizationSettings />
  <optionsets />
  <CustomControls />
  <EntityDataProviders />
  <Languages>
    <Language>{LANGUAGE_CODE}</Language>
  </Languages>
</ImportExportXml>"""

    with open(other_dir / "Customizations.xml", "w", encoding="utf-8") as f:
        f.write(customizations_xml)

    root_components = ""
    for table in tables:
        root_components += f'      <RootComponent type="1" schemaName="{table["logicalName"]}" behavior="0" />\n'

    solution_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml version="9.2.26012.156" SolutionPackageVersion="9.2" languagecode="{LANGUAGE_CODE}" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SolutionManifest>
    <UniqueName>{SOLUTION_NAME}</UniqueName>
    <LocalizedNames>
      <LocalizedName description="{SOLUTION_DISPLAY_NAME}" languagecode="{LANGUAGE_CODE}" />
    </LocalizedNames>
    <Descriptions>
      <Description description="SimQuip equipment management tables for RBWH simulation and training" languagecode="{LANGUAGE_CODE}" />
    </Descriptions>
    <Version>{SOLUTION_VERSION}</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>{PUBLISHER_UNIQUE_NAME}</UniqueName>
      <LocalizedNames>
        <LocalizedName description="{PUBLISHER_DISPLAY_NAME}" languagecode="{LANGUAGE_CODE}" />
      </LocalizedNames>
      <Descriptions />
      <EMailAddress xsi:nil="true"></EMailAddress>
      <SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
      <CustomizationPrefix>{PUBLISHER_PREFIX}</CustomizationPrefix>
      <CustomizationOptionValuePrefix>{PUBLISHER_OPTION_PREFIX}</CustomizationOptionValuePrefix>
      <Addresses>
        <Address>
          <AddressNumber>1</AddressNumber>
          <AddressTypeCode>1</AddressTypeCode>
          <City xsi:nil="true"></City>
          <County xsi:nil="true"></County>
          <Country xsi:nil="true"></Country>
          <Fax xsi:nil="true"></Fax>
          <FreightTermsCode xsi:nil="true"></FreightTermsCode>
          <ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber>
          <Latitude xsi:nil="true"></Latitude>
          <Line1 xsi:nil="true"></Line1>
          <Line2 xsi:nil="true"></Line2>
          <Line3 xsi:nil="true"></Line3>
          <Longitude xsi:nil="true"></Longitude>
          <Name xsi:nil="true"></Name>
          <PostalCode xsi:nil="true"></PostalCode>
          <PostOfficeBox xsi:nil="true"></PostOfficeBox>
          <PrimaryContactName xsi:nil="true"></PrimaryContactName>
          <ShippingMethodCode>1</ShippingMethodCode>
          <StateOrProvince xsi:nil="true"></StateOrProvince>
          <Telephone1 xsi:nil="true"></Telephone1>
          <Telephone2 xsi:nil="true"></Telephone2>
          <Telephone3 xsi:nil="true"></Telephone3>
          <TimeZoneRuleVersionNumber>0</TimeZoneRuleVersionNumber>
          <UPSZone xsi:nil="true"></UPSZone>
          <UTCOffset xsi:nil="true"></UTCOffset>
          <UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode>
        </Address>
        <Address>
          <AddressNumber>2</AddressNumber>
          <AddressTypeCode>1</AddressTypeCode>
          <City xsi:nil="true"></City>
          <County xsi:nil="true"></County>
          <Country xsi:nil="true"></Country>
          <Fax xsi:nil="true"></Fax>
          <FreightTermsCode xsi:nil="true"></FreightTermsCode>
          <ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber>
          <Latitude xsi:nil="true"></Latitude>
          <Line1 xsi:nil="true"></Line1>
          <Line2 xsi:nil="true"></Line2>
          <Line3 xsi:nil="true"></Line3>
          <Longitude xsi:nil="true"></Longitude>
          <Name xsi:nil="true"></Name>
          <PostalCode xsi:nil="true"></PostalCode>
          <PostOfficeBox xsi:nil="true"></PostOfficeBox>
          <PrimaryContactName xsi:nil="true"></PrimaryContactName>
          <ShippingMethodCode>1</ShippingMethodCode>
          <StateOrProvince xsi:nil="true"></StateOrProvince>
          <Telephone1 xsi:nil="true"></Telephone1>
          <Telephone2 xsi:nil="true"></Telephone2>
          <Telephone3 xsi:nil="true"></Telephone3>
          <TimeZoneRuleVersionNumber>0</TimeZoneRuleVersionNumber>
          <UPSZone xsi:nil="true"></UPSZone>
          <UTCOffset xsi:nil="true"></UTCOffset>
          <UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode>
        </Address>
      </Addresses>
    </Publisher>
    <RootComponents>
{root_components}    </RootComponents>
    <MissingDependencies />
  </SolutionManifest>
</ImportExportXml>"""

    with open(other_dir / "Solution.xml", "w", encoding="utf-8") as f:
        f.write(solution_xml)

    # Generate [Content_Types].xml
    content_types_xml = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/octet-stream" />
</Types>"""

    with open(SOLUTION_DIR / "[Content_Types].xml", "w", encoding="utf-8") as f:
        f.write(content_types_xml)

    print(f"\nSolution generated at: {SOLUTION_DIR}")
    print(f"Tables: {len(tables)}")
    print(f"Relationships: {len(all_relationship_names)}")


if __name__ == "__main__":
    generate_solution()
