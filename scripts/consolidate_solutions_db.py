#!/usr/bin/env python3
"""
Consolidate MO-DB_Solutions Database
====================================
Refactors the Solutions database for better organization:

1. MILESTONES: Extract 24 milestone columns → MO-DB_Milestones table
2. CONTACTS: Convert name fields to contact_id references where possible
3. CLEANUP: Remove empty/redundant columns
4. KEY MESSAGES: Add columns from Key Messages source file

Before: 80 columns
After: ~50 columns + related tables

Usage:
    python consolidate_solutions_db.py [--dry-run]
"""

import pandas as pd
import argparse
from datetime import datetime
from pathlib import Path
import re


def extract_milestones(solutions_df):
    """
    Extract milestone data from Solutions into separate Milestones table.

    Milestone types in Solutions:
    - science_sow (date, url)
    - project_plan (date, url)
    - ipa (date, url)
    - icd (date, url)
    - tta (date, url)
    - deep_dive (date, url)
    - atp (date, memo_date, memo_url)
    - f2i (date, memo_date, memo_url)
    - orr (date, memo_date, memo_url)
    - closeout (date, memo_date, memo_url)
    """
    milestones = []

    milestone_types = [
        ('science_sow', ['science_sow_date', 'science_sow_url'], []),
        ('project_plan', ['project_plan_date', 'project_plan_url'], []),
        ('ipa', ['ipa_date', 'ipa_url'], []),
        ('icd', ['icd_date', 'icd_url'], []),
        ('tta', ['tta_date', 'tta_url'], []),
        ('deep_dive', ['deep_dive_date', 'deep_dive_url'], []),
        ('atp', ['atp_date'], ['atp_memo_date', 'atp_memo_url']),
        ('f2i', ['f2i_date'], ['f2i_memo_date', 'f2i_memo_url']),
        ('orr', ['orr_date'], ['orr_memo_date', 'orr_memo_url']),
        ('closeout', ['closeout_date'], ['closeout_memo_date', 'closeout_memo_url']),
    ]

    milestone_id = 0

    for idx, row in solutions_df.iterrows():
        solution_id = row.get('solution_id', '')
        solution_name = row.get('name', '')

        if not solution_id:
            continue

        for m_type, date_url_cols, memo_cols in milestone_types:
            # Check if any data exists for this milestone type
            has_data = False

            date_col = f'{m_type}_date'
            url_col = f'{m_type}_url' if m_type not in ['atp', 'f2i', 'orr', 'closeout'] else None
            memo_date_col = f'{m_type}_memo_date' if m_type in ['atp', 'f2i', 'orr', 'closeout'] else None
            memo_url_col = f'{m_type}_memo_url' if m_type in ['atp', 'f2i', 'orr', 'closeout'] else None

            date_val = row.get(date_col) if date_col in row.index else None
            url_val = row.get(url_col) if url_col and url_col in row.index else None
            memo_date_val = row.get(memo_date_col) if memo_date_col and memo_date_col in row.index else None
            memo_url_val = row.get(memo_url_col) if memo_url_col and memo_url_col in row.index else None

            # Check for non-null values
            if pd.notna(date_val) or pd.notna(url_val) or pd.notna(memo_date_val) or pd.notna(memo_url_val):
                has_data = True

            if has_data:
                milestone_id += 1
                milestones.append({
                    'milestone_id': f'MS-{milestone_id:04d}',
                    'solution_id': solution_id,
                    'solution_name': solution_name,
                    'milestone_type': m_type,
                    'milestone_name': m_type.replace('_', ' ').title(),
                    'date': format_date(date_val),
                    'url': str(url_val).strip() if pd.notna(url_val) else '',
                    'memo_date': format_date(memo_date_val),
                    'memo_url': str(memo_url_val).strip() if pd.notna(memo_url_val) else '',
                    'status': determine_milestone_status(date_val),
                    'notes': '',
                    'created_date': datetime.now().strftime('%Y-%m-%d')
                })

    return pd.DataFrame(milestones)


def format_date(date_val):
    """Format date value to YYYY-MM-DD string."""
    if pd.isna(date_val) or date_val is None:
        return ''
    if isinstance(date_val, datetime):
        return date_val.strftime('%Y-%m-%d')
    if isinstance(date_val, str):
        return date_val.strip()
    return str(date_val)


def determine_milestone_status(date_val):
    """Determine milestone status based on date."""
    if pd.isna(date_val) or date_val is None:
        return 'pending'

    try:
        if isinstance(date_val, str):
            date_obj = pd.to_datetime(date_val)
        else:
            date_obj = date_val

        if date_obj <= datetime.now():
            return 'completed'
        else:
            return 'scheduled'
    except:
        return 'pending'


def map_contacts(solutions_df, contacts_df):
    """
    Map person name fields to contact_ids where possible.
    Returns mapping dict and list of unmatched names.
    """
    # Build lookup from contacts
    contact_lookup = {}
    for _, row in contacts_df.iterrows():
        full_name = f"{row.get('first_name', '')} {row.get('last_name', '')}".strip().lower()
        if full_name and row.get('contact_id'):
            contact_lookup[full_name] = row['contact_id']
        # Also try email prefix
        email = str(row.get('email', '') or row.get('primary_email', '')).lower()
        if '@' in email:
            email_name = email.split('@')[0].replace('.', ' ')
            contact_lookup[email_name] = row.get('contact_id')

    person_columns = ['solution_lead', 'ra_representative', 'earth_action_advocate']
    mappings = {}
    unmatched = []

    for col in person_columns:
        if col not in solutions_df.columns:
            continue

        for idx, row in solutions_df.iterrows():
            name = row.get(col)
            if pd.isna(name) or not str(name).strip():
                continue

            name_lower = str(name).strip().lower()

            if name_lower in contact_lookup:
                mappings[(idx, col)] = contact_lookup[name_lower]
            else:
                unmatched.append((row.get('solution_id'), col, name))

    return mappings, unmatched


def merge_key_messages(solutions_df, key_messages_path):
    """
    Merge key messages data from source file into Solutions.
    Uses fuzzy matching to handle name variations.
    """
    if not Path(key_messages_path).exists():
        print(f"Warning: Key messages file not found: {key_messages_path}")
        return solutions_df

    km_df = pd.read_excel(key_messages_path)

    # The first row contains headers in this file
    # Find the actual header row
    for i, row in km_df.iterrows():
        if 'Solution Name' in str(row.values):
            km_df.columns = km_df.iloc[i].values
            km_df = km_df.iloc[i+1:].reset_index(drop=True)
            break

    # Rename columns to match our schema
    column_map = {
        'Solution Name': 'name',
        'Key Messages (Oct 2025)': 'key_messages',
        'Key Messages [old]': 'key_messages_old',
        'Science or Decision Making Focus': 'focus_type',
        'Primary Thematic Area': 'primary_thematic_area',
        'Secondary Thematic Area(s)': 'secondary_thematic_areas',
        'Industry connections': 'industry_connections',
        'Solution Scientific Advancement': 'scientific_advancement',
        'Use / Impact by Agency or other user': 'agency_use_impact',
        'Potential Use / Impact by Agency or Other user': 'potential_use_impact',
        'Public facing communications links': 'public_comms_links'
    }

    km_df = km_df.rename(columns={k: v for k, v in column_map.items() if k in km_df.columns})

    # Known name mappings (Solutions DB name -> Key Messages name)
    name_aliases = {
        'nisar downlink': 'additional nisar downlink station',
        'hls-ll': 'hls low latency',
        'air quality - pandora sensors': 'aq forecasts and pandora sensors',
        'air quality - gmao': 'atmospheric composition using geos-5',
        'vlm for coastal applications': 'vlm',
        'opera dswx': 'opera surface water extent',
        'opera disp': 'opera land surface deformation',
        'opera dist': 'opera land surface disturbance',
        'icesat-2 boreal biomass': 'icesat-2 quick look products',
        'gcc from satcorps': 'global cloud composite',
        'gacr': 'gacr',
        'tempo': 'tempo nrt products enhanced',
    }

    def normalize_name(name):
        """Normalize name for matching."""
        if pd.isna(name):
            return ''
        return str(name).strip().lower().replace('-', ' ').replace('_', ' ')

    def find_best_match(sol_name, km_names_list):
        """Find best matching key message entry."""
        sol_norm = normalize_name(sol_name)

        # 1. Check aliases
        if sol_norm in name_aliases:
            alias = name_aliases[sol_norm]
            for km_name in km_names_list:
                if normalize_name(km_name) == alias:
                    return km_name

        # 2. Exact match
        for km_name in km_names_list:
            if normalize_name(km_name) == sol_norm:
                return km_name

        # 3. Partial match - solution name contains key message name or vice versa
        for km_name in km_names_list:
            km_norm = normalize_name(km_name)
            if sol_norm in km_norm or km_norm in sol_norm:
                return km_name

        # 4. Word overlap match (>50% of words match)
        sol_words = set(sol_norm.split())
        for km_name in km_names_list:
            km_words = set(normalize_name(km_name).split())
            if len(sol_words & km_words) / max(len(sol_words), len(km_words)) > 0.5:
                return km_name

        return None

    key_cols = ['key_messages', 'focus_type', 'industry_connections',
                'scientific_advancement', 'agency_use_impact', 'public_comms_links']

    # Add new columns to solutions
    for col in key_cols:
        if col not in solutions_df.columns:
            solutions_df[col] = ''

    # Build list of key message names
    km_names_list = km_df['name'].dropna().tolist()

    # Match and update
    matched = 0
    unmatched = []
    for idx, sol_row in solutions_df.iterrows():
        sol_name = sol_row['name']
        best_match = find_best_match(sol_name, km_names_list)

        if best_match:
            km_row = km_df[km_df['name'] == best_match].iloc[0]
            for col in key_cols:
                if col in km_row.index and pd.notna(km_row[col]):
                    solutions_df.at[idx, col] = str(km_row[col]).strip()
            matched += 1
        else:
            unmatched.append(sol_name)

    print(f"  Key messages matched: {matched}/{len(solutions_df)} solutions")
    if unmatched and len(unmatched) <= 10:
        print(f"  Unmatched: {', '.join(unmatched[:10])}")

    return solutions_df


def get_columns_to_remove():
    """
    Return list of columns to remove (empty or migrated).
    """
    # Milestone columns (migrated to MO-DB_Milestones)
    milestone_cols = [
        'science_sow_date', 'science_sow_url',
        'project_plan_date', 'project_plan_url',
        'ipa_date', 'ipa_url',
        'icd_date', 'icd_url',
        'tta_date', 'tta_url',
        'deep_dive_date', 'deep_dive_url',
        'atp_date', 'atp_memo_date', 'atp_memo_url',
        'f2i_date', 'f2i_memo_date', 'f2i_memo_url',
        'orr_date', 'orr_memo_date', 'orr_memo_url',
        'closeout_date', 'closeout_memo_date', 'closeout_memo_url'
    ]

    # Empty people columns (0% fill)
    empty_people_cols = [
        'solution_lead_title',
        'stakeholder_engagement_lead',
        'comms_lead',
        'program_scientist',
        'ra_program_scientist',
        'primary_algo_developer',
        'other_contacts'
    ]

    # Empty description/resource columns
    empty_other_cols = [
        'proposed_activity',
        'next_steps',
        'training_resource_url',
        'fact_sheet_url',
        'lifecycle_docs_url',
        'nsite_sep_mandate',
        'project_deliverables'
    ]

    return milestone_cols + empty_people_cols + empty_other_cols


def get_final_column_order():
    """
    Return the desired column order for the consolidated Solutions table.
    """
    return [
        # Identity
        'solution_id', 'name', 'full_title', 'alternate_names', 'solution_group',

        # Status/Phase
        'cycle', 'cycle_year', 'phase', 'uses_jpl_milestones',
        'funding_status', 'funded_by_ison', 'funding_period',

        # Visibility flags
        'on_official_webpage', 'has_drive_folder', 'is_commercial', 'show_in_default',

        # Key People (names, could add _id references later)
        'solution_lead', 'solution_lead_affiliation',
        'ra_representative', 'ra_representative_affiliation',
        'earth_action_advocate', 'earth_action_affiliation',
        'stakeholder_list',

        # Description
        'purpose_mission', 'background', 'societal_impact', 'status_summary', 'notes',

        # Technical specs
        'platform', 'temporal_frequency', 'horizontal_resolution',
        'geographic_domain', 'assigned_daac_location', 'thematic_areas',

        # Key Messaging (NEW)
        'key_messages', 'focus_type', 'industry_connections',
        'scientific_advancement', 'agency_use_impact', 'public_comms_links',

        # Resource URLs
        'solution_resources', 'drive_folder_url', 'snwg_solution_page_url',
        'risk_register_url', 'data_product_table_url', 'stakeholder_survey_url',

        # Sync/tracking
        'last_earthdata_sync', 'last_updated'
    ]


def main():
    parser = argparse.ArgumentParser(description='Consolidate MO-DB_Solutions database')
    parser.add_argument('--dry-run', action='store_true', help='Show changes without writing files')
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent.parent  # MO-development
    db_dir = base_dir / 'database-files' / 'MO-Viewer Databases'

    solutions_path = db_dir / 'MO-DB_Solutions.xlsx'
    contacts_path = db_dir / 'MO-DB_Contacts.xlsx'
    milestones_path = db_dir / 'MO-DB_Milestones.xlsx'
    key_messages_path = base_dir / 'source-archives' / 'raw-exports' / 'Key Messages By Solution - In Development.xlsx'

    print("=== MO-DB_Solutions Consolidation ===\n")

    # Load data
    print("Loading data...")
    solutions_df = pd.read_excel(solutions_path)
    contacts_df = pd.read_excel(contacts_path)

    original_cols = len(solutions_df.columns)
    print(f"  Solutions: {len(solutions_df)} rows, {original_cols} columns")
    print(f"  Contacts: {len(contacts_df)} rows")

    # Step 1: Extract milestones
    print("\n1. Extracting milestones...")
    milestones_df = extract_milestones(solutions_df)
    print(f"  Created {len(milestones_df)} milestone records")

    # Step 2: Map contacts (info only for now)
    print("\n2. Analyzing contact mappings...")
    mappings, unmatched = map_contacts(solutions_df, contacts_df)
    print(f"  Mapped: {len(mappings)} person references")
    print(f"  Unmatched: {len(unmatched)} (will keep name strings)")

    # Step 3: Add key messages
    print("\n3. Adding key messages...")
    solutions_df = merge_key_messages(solutions_df, key_messages_path)

    # Step 4: Remove columns
    print("\n4. Removing migrated/empty columns...")
    cols_to_remove = get_columns_to_remove()
    cols_removed = [c for c in cols_to_remove if c in solutions_df.columns]
    solutions_df = solutions_df.drop(columns=cols_removed, errors='ignore')
    print(f"  Removed {len(cols_removed)} columns")

    # Step 5: Reorder columns
    print("\n5. Reordering columns...")
    final_order = get_final_column_order()

    # Keep any columns not in final_order at the end
    existing_cols = [c for c in final_order if c in solutions_df.columns]
    extra_cols = [c for c in solutions_df.columns if c not in final_order]
    solutions_df = solutions_df[existing_cols + extra_cols]

    final_cols = len(solutions_df.columns)
    print(f"  Final column count: {final_cols} (was {original_cols})")

    # Summary
    print("\n=== SUMMARY ===")
    print(f"Solutions: {original_cols} -> {final_cols} columns (-{original_cols - final_cols})")
    print(f"Milestones: New table with {len(milestones_df)} records")
    print(f"Key messages: Added 6 columns")

    print("\nFinal Solutions columns:")
    for i, col in enumerate(solutions_df.columns):
        print(f"  {i+1}. {col}")

    if args.dry_run:
        print("\n[DRY RUN - No files written]")
    else:
        print("\nWriting files...")

        # Backup originals
        backup_dir = db_dir / 'backups'
        backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        import shutil
        shutil.copy(solutions_path, backup_dir / f'MO-DB_Solutions_backup_{timestamp}.xlsx')
        print(f"  Backup: {backup_dir / f'MO-DB_Solutions_backup_{timestamp}.xlsx'}")

        # Write new files
        solutions_df.to_excel(solutions_path, index=False, sheet_name='Solutions')
        print(f"  Updated: {solutions_path}")

        milestones_df.to_excel(milestones_path, index=False, sheet_name='Milestones')
        print(f"  Created: {milestones_path}")

        print("\n=== CONSOLIDATION COMPLETE ===")


if __name__ == '__main__':
    main()
