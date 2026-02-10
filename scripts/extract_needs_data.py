#!/usr/bin/env python3
"""
Extract stakeholder needs data from all Solution Stakeholder Lists Excel files.

Creates MO-DB_Needs database with granular survey responses for alignment analysis.

Usage:
    uv run extract_needs_data.py

Output:
    - mo_db_needs.csv - Full needs database for Google Sheets import
    - contact_need_mappings.csv - Contact-to-need role mappings for Roles tab backfill
    - extraction_report.txt - Summary of extraction results
"""

import os
import re
import pandas as pd
from pathlib import Path
from datetime import datetime

# Configuration
STAKEHOLDER_DIR = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\source-archives\stakeholder-data\DB-solution-stakeholder-lists")
OUTPUT_DIR = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\data")
SURVEY_YEARS = ['2016', '2018', '2020', '2022', '2024']

# Column mapping: survey field ID -> output column name
# These patterns match column headers containing the field ID in parentheses
# Note: Section 1 format varies by year:
#   2024: (1a-1) Dept, (1a-2) Agency, (1b) Org, (1c) Name, (1d) Email
#   Older: (1a) First, (1b) Last, (1c) Dept, (1d) Agency, (1e) Org
FIELD_MAPPINGS = {
    # Identity (Section 1) - 2024 format
    '(1a - 1)': 'department',      # Executive Department
    '(1a-1)': 'department',        # Alternate format
    '(1a - 2)': 'agency',          # Sub-Agency or Bureau
    '(1a-2)': 'agency',            # Alternate format
    '(1b)': 'organization',        # Organizational Unit
    '(1c)': 'submitter_name_raw',  # Name (full name in 2024)
    '(1e)': 'sme_name',            # SME Name

    # Identity - older format fallbacks
    '(1a)': 'first_name',          # First name (older surveys)
    '(1d)': 'agency_old',          # Agency (older format, but also email in 2024)

    # Strategic Objectives (Section 2)
    '(2a)': 'strategic_objective',
    '(2b)': 'application_description',
    '(2c-1)': 'similar_to_previous',
    '(2d-1)': 'need_nature_type',
    '(2e-1)': 'need_nature_frequency',
    '(2e-5)': 'archival_period',

    # Observation Requirements (Section 3a)
    '(3a-1)': 'feature_to_observe',
    '(3a-2)': 'how_long_required',
    '(3a-4)': 'degree_need_met',
    '(3a-5)': 'efficiency_gain',

    # Technical Requirements (Section 3b-3i)
    '(3b-1)': 'geographic_coverage',
    '(3c-1)': 'horizontal_resolution',
    '(3c-2)': 'vertical_resolution',
    '(3d-1)': 'temporal_frequency',
    '(3e-2)': 'data_latency',
    '(3f-2)': 'spectral_bands',
    '(3g-2)': 'measurement_uncertainty',
    '(3h-1)': 'other_attributes_1',
    '(3h-2)': 'other_attributes_2',
    '(3i)': 'critical_attributes_ranking',

    # Mission Preferences (Section 3j)
    '(3j-1)': 'preferred_missions',
    '(3j-3)': 'products_currently_used',
    '(3j-4)': 'impact_if_unavailable',
    '(3j-5)': 'impact_if_unmet',

    # Data Access (Section 4)
    '(4a-1)': 'has_infrastructure',
    '(4a-2)': 'support_needed',
    '(4a-3)': 'limiting_factors',
    '(4b-1)': 'discovery_tools',
    '(4c-1)': 'preferred_access',
    '(4d-1)': 'required_processing_level',
    '(4e-1)': 'preferred_format',
    '(4f)': 'resources_needed',
    '(4g-1)': 'training_needs',
    '(4h-1)': 'data_sharing_scope',
}

# Output columns in order
OUTPUT_COLUMNS = [
    'need_id', 'solution', 'survey_year',
    'submitter_name', 'department', 'agency', 'organization',
    'strategic_objective', 'application_description',
    'similar_to_previous', 'need_nature_type', 'need_nature_frequency', 'archival_period',
    'feature_to_observe', 'how_long_required', 'degree_need_met', 'efficiency_gain',
    'geographic_coverage', 'horizontal_resolution', 'vertical_resolution',
    'temporal_frequency', 'data_latency', 'spectral_bands',
    'measurement_uncertainty', 'other_attributes', 'critical_attributes_ranking',
    'preferred_missions', 'products_currently_used',
    'impact_if_unavailable', 'impact_if_unmet',
    'has_infrastructure', 'support_needed', 'limiting_factors',
    'discovery_tools', 'preferred_access', 'required_processing_level',
    'preferred_format', 'resources_needed', 'training_needs', 'data_sharing_scope',
    'source_file', 'extracted_at'
]

# Contact-to-need mapping columns (for Roles tab backfill)
MAPPING_COLUMNS = [
    'need_id', 'contact_name', 'role', 'solution', 'survey_year',
    'department', 'agency', 'organization', 'source_file'
]


def extract_solution_name(filename):
    """Extract solution name from filename."""
    # Remove prefix and suffix
    name = filename.replace('DB-Copy of ', '').replace(' - SNWG stakeholders.xlsx', '')
    return name.strip()


def find_column_by_field_id(columns, field_id):
    """Find column name containing the field ID pattern."""
    pattern = re.escape(field_id)
    for col in columns:
        if re.search(pattern, str(col)):
            return col
    return None


# Additional mappings for older survey formats (2016)
# These map exact column names or partial matches
ALTERNATE_COLUMN_NAMES = {
    "Survey Taker's Name": 'submitter_name_raw',
    "Horizontal resolution": 'horizontal_resolution',
    "Temporal frequency": 'temporal_frequency',
    "Geographic domain": 'geographic_coverage',
    "Vertical resolution": 'vertical_resolution',
    "Latency": 'data_latency',
    "Spectral band": 'spectral_bands',
    "Measurement accuracy": 'measurement_uncertainty',
    "Missions": 'preferred_missions',
    "Other attributes": 'other_attributes_1',
    "Data processing level": 'required_processing_level',
}


def map_columns(df):
    """Map Excel columns to output schema using field IDs and alternate names."""
    column_map = {}
    mapped_cols = set()  # Track which columns are already mapped

    # First, map by field ID patterns
    for field_id, output_col in FIELD_MAPPINGS.items():
        found_col = find_column_by_field_id(df.columns, field_id)
        if found_col is not None:
            column_map[found_col] = output_col
            mapped_cols.add(found_col)

    # Then, map by alternate column names (for older formats)
    for col in df.columns:
        if col in mapped_cols:
            continue
        col_str = str(col).strip()
        # Check exact matches
        if col_str in ALTERNATE_COLUMN_NAMES:
            column_map[col] = ALTERNATE_COLUMN_NAMES[col_str]
            mapped_cols.add(col)
        # Check partial matches for longer column names
        else:
            for alt_name, output_col in ALTERNATE_COLUMN_NAMES.items():
                if alt_name.lower() in col_str.lower():
                    column_map[col] = output_col
                    mapped_cols.add(col)
                    break

    return column_map


def process_sheet(df, solution, year, filename):
    """Process a single survey year sheet.

    Returns:
        tuple: (records, mappings) where records are need rows and
               mappings are contact-to-need role associations.
    """
    if df.empty:
        return [], []

    # Map columns
    column_map = map_columns(df)

    # Rename columns we found
    df_mapped = df.rename(columns=column_map)

    records = []
    mappings = []
    for idx, row in df_mapped.iterrows():
        # Skip rows without any meaningful data
        has_data = False
        check_cols = ['submitter_name_raw', 'first_name', 'department', 'strategic_objective', 'feature_to_observe']
        for col in check_cols:
            if col in df_mapped.columns and pd.notna(row.get(col)) and str(row.get(col)).strip():
                has_data = True
                break

        if not has_data:
            continue

        # Build record
        record = {col: '' for col in OUTPUT_COLUMNS}

        # Handle submitter name - different formats by year
        # 2024 format: (1c) has full name
        # Older format: separate first/last name columns
        if 'submitter_name_raw' in df_mapped.columns and pd.notna(row.get('submitter_name_raw')):
            record['submitter_name'] = str(row.get('submitter_name_raw')).strip()
        else:
            first_name = str(row.get('first_name', '')).strip() if pd.notna(row.get('first_name')) else ''
            last_name = str(row.get('last_name', '')).strip() if pd.notna(row.get('last_name')) else ''
            record['submitter_name'] = f"{first_name} {last_name}".strip()

        # Handle department/agency - check for both new and old format
        if 'department' not in df_mapped.columns or not pd.notna(row.get('department')):
            # Try agency_old as department fallback for older surveys
            if 'agency_old' in df_mapped.columns and pd.notna(row.get('agency_old')):
                # Check if it looks like an email (don't use as dept)
                val = str(row.get('agency_old', ''))
                if '@' not in val:
                    record['department'] = val.strip()

        record['solution'] = solution
        record['survey_year'] = int(year)
        record['need_id'] = f"{solution[:20]}_{year}_{idx+1}"

        # Copy all mapped fields
        for output_col in OUTPUT_COLUMNS:
            if output_col in df_mapped.columns:
                value = row.get(output_col)
                # Handle case where get returns a Series (duplicate columns)
                if isinstance(value, pd.Series):
                    value = value.iloc[0] if len(value) > 0 else None
                if pd.notna(value):
                    # Clean up the value
                    if isinstance(value, str):
                        value = value.strip()
                        # Skip email addresses for non-email fields
                        if output_col not in ['email'] and '@' in value and output_col in ['department', 'agency']:
                            continue
                        # Truncate very long values for spreadsheet compatibility
                        if len(value) > 5000:
                            value = value[:5000] + '...'
                    record[output_col] = value

        # Combine other_attributes
        def get_scalar(row, col):
            """Safely get a scalar value from a row, handling Series."""
            if col not in df_mapped.columns:
                return ''
            val = row.get(col)
            if isinstance(val, pd.Series):
                val = val.iloc[0] if len(val) > 0 else None
            return str(val).strip() if pd.notna(val) else ''

        attr1 = get_scalar(row, 'other_attributes_1')
        attr2 = get_scalar(row, 'other_attributes_2')
        record['other_attributes'] = '; '.join(filter(None, [attr1, attr2]))

        record['source_file'] = filename
        record['extracted_at'] = datetime.now().isoformat()

        records.append(record)

        # --- Build contact-to-need mappings ---
        need_id = record['need_id']
        submitter = record['submitter_name']
        dept = record.get('department', '')
        agcy = record.get('agency', '')
        org = record.get('organization', '')

        # Submitter mapping (the person who filled out this row)
        if submitter:
            mappings.append({
                'need_id': need_id,
                'contact_name': submitter,
                'role': 'Survey Submitter',
                'solution': solution,
                'survey_year': int(year),
                'department': dept,
                'agency': agcy,
                'organization': org,
                'source_file': filename,
            })

        # SME mapping (field 1e — different person listed as subject matter expert)
        sme_name = get_scalar(row, 'sme_name')
        if sme_name and sme_name.lower() != submitter.lower():
            mappings.append({
                'need_id': need_id,
                'contact_name': sme_name,
                'role': 'SME',
                'solution': solution,
                'survey_year': int(year),
                # SME's dept/agency/org not available from this row
                'department': '',
                'agency': '',
                'organization': '',
                'source_file': filename,
            })

    return records, mappings


def process_file(filepath):
    """Process a single stakeholder Excel file.

    Returns:
        tuple: (records, mappings)
    """
    import traceback
    filename = filepath.name
    solution = extract_solution_name(filename)

    print(f"  Processing: {solution}")

    all_records = []
    all_mappings = []

    try:
        # Read all sheets
        xl = pd.ExcelFile(filepath)

        for sheet in xl.sheet_names:
            # Check if this is a survey year sheet
            if sheet in SURVEY_YEARS:
                try:
                    df = pd.read_excel(filepath, sheet_name=sheet)
                    records, mappings = process_sheet(df, solution, sheet, filename)
                    all_records.extend(records)
                    all_mappings.extend(mappings)
                    print(f"    {sheet}: {len(records)} records, {len(mappings)} mappings")
                except Exception as e:
                    print(f"    {sheet}: Error - {e}")
                    traceback.print_exc()

            # Also check for "Combined" sheet
            elif sheet.lower() == 'combined':
                # Skip combined sheet - we want individual year data
                pass

    except Exception as e:
        print(f"  Error reading file: {e}")
        traceback.print_exc()

    return all_records, all_mappings


def main():
    """Main extraction process."""
    print("=" * 60)
    print("MO-DB_Needs Extraction")
    print("=" * 60)
    print(f"Source: {STAKEHOLDER_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Find all stakeholder Excel files
    excel_files = list(STAKEHOLDER_DIR.glob("DB-Copy of *.xlsx"))
    print(f"Found {len(excel_files)} stakeholder files")
    print()

    # Process each file
    all_records = []
    all_mappings = []
    file_stats = []

    for filepath in sorted(excel_files):
        records, mappings = process_file(filepath)
        all_records.extend(records)
        all_mappings.extend(mappings)
        file_stats.append({
            'file': filepath.name,
            'solution': extract_solution_name(filepath.name),
            'records': len(records),
            'mappings': len(mappings),
        })

    print()
    print("=" * 60)
    print(f"Total needs extracted: {len(all_records)}")
    print(f"Total contact-need mappings: {len(all_mappings)}")
    print("=" * 60)

    # Create needs DataFrame
    df_output = pd.DataFrame(all_records, columns=OUTPUT_COLUMNS)

    # Save needs CSV
    output_csv = OUTPUT_DIR / "mo_db_needs.csv"
    df_output.to_csv(output_csv, index=False)
    print(f"\nSaved: {output_csv}")

    # Create mappings DataFrame
    df_mappings = pd.DataFrame(all_mappings, columns=MAPPING_COLUMNS)

    # Deduplicate: same contact can appear on multiple need rows for the
    # same solution/year with the same role — collapse and aggregate need_ids
    group_cols = ['contact_name', 'role', 'solution', 'survey_year',
                  'department', 'agency', 'organization']
    df_roles = (df_mappings
                .groupby(group_cols, as_index=False)
                .agg({
                    'need_id': lambda ids: ','.join(sorted(set(ids))),
                    'source_file': 'first',
                })
                .rename(columns={'need_id': 'need_ids'}))

    # Save mappings CSV
    mappings_csv = OUTPUT_DIR / "contact_need_mappings.csv"
    df_roles.to_csv(mappings_csv, index=False)
    print(f"Saved: {mappings_csv}")

    # Create extraction report
    report_path = OUTPUT_DIR / "needs_extraction_report.txt"
    with open(report_path, 'w') as f:
        f.write("MO-DB_Needs Extraction Report\n")
        f.write("=" * 50 + "\n")
        f.write(f"Extracted: {datetime.now().isoformat()}\n")
        f.write(f"Total Need Records: {len(all_records)}\n")
        f.write(f"Total Contact-Need Mappings (raw): {len(all_mappings)}\n")
        f.write(f"Total Contact-Need Mappings (deduplicated): {len(df_roles)}\n")
        f.write(f"Total Files: {len(excel_files)}\n\n")

        f.write("Records by Solution:\n")
        f.write("-" * 60 + "\n")
        f.write(f"  {'Solution':<40} {'Needs':>5} {'Mappings':>8}\n")
        f.write(f"  {'-'*40} {'-'*5} {'-'*8}\n")
        for stat in sorted(file_stats, key=lambda x: -x['records']):
            f.write(f"  {stat['solution'][:40]:<40} {stat['records']:>5} {stat['mappings']:>8}\n")

        f.write("\nNeeds by Year:\n")
        f.write("-" * 50 + "\n")
        year_counts = df_output.groupby('survey_year').size()
        for year, count in year_counts.items():
            f.write(f"  {year}: {count}\n")

        f.write("\nMappings by Role:\n")
        f.write("-" * 50 + "\n")
        role_counts = df_roles.groupby('role').size()
        for role, count in role_counts.items():
            f.write(f"  {role}: {count}\n")

        f.write("\nMappings by Year:\n")
        f.write("-" * 50 + "\n")
        mapping_year_counts = df_roles.groupby('survey_year').size()
        for year, count in mapping_year_counts.items():
            f.write(f"  {year}: {count}\n")

        f.write("\nUnique Contacts in Mappings:\n")
        f.write("-" * 50 + "\n")
        unique_names = df_roles['contact_name'].nunique()
        f.write(f"  {unique_names} unique contact names\n")

        f.write("\nColumn Coverage (Needs):\n")
        f.write("-" * 50 + "\n")
        for col in OUTPUT_COLUMNS:
            non_empty = df_output[col].notna().sum()
            pct = (non_empty / len(df_output) * 100) if len(df_output) > 0 else 0
            f.write(f"  {col:<35} {non_empty:>5} ({pct:>5.1f}%)\n")

    print(f"Saved: {report_path}")

    # Print summary stats
    print("\nNeeds by Year:")
    print(df_output.groupby('survey_year').size())

    print("\nMappings by Role:")
    print(df_roles.groupby('role').size())

    print(f"\nUnique contacts: {df_roles['contact_name'].nunique()}")

    print("\nTop 10 Solutions by Need Count:")
    print(df_output.groupby('solution').size().sort_values(ascending=False).head(10))


if __name__ == "__main__":
    main()
