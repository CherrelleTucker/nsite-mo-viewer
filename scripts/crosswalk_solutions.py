#!/usr/bin/env python3
"""
Crosswalk Solution Status Quick Look → MO-DB_Solutions
======================================================
Updates MO-DB_Solutions database with data from the Solution Status
Quick Look spreadsheet.

Source: Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx
Target: MO-DB_Solutions.xlsx

Data crosswalked from Solution PoCs sheet:
- Solution Lead, Solution Lead Affiliation
- R&A Representative, R&A Representative Affiliation
- Earth Action Representative, Earth Action Representative Affiliation
- Funded/Unfunded status
- On Official Webpage, Has drive folder, Commercial

Usage:
    python crosswalk_solutions.py [--dry-run]
"""

import pandas as pd
from pathlib import Path
import argparse
from datetime import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


# Name mapping: Quick Look name patterns → MO-DB_Solutions name
# The Quick Look uses full names like "Cycle 1 Harmonized Landsat and Sentinel-2 (HLS)"
# MO-DB_Solutions uses short names like "HLS"
NAME_MAPPINGS = {
    # Cycle 1
    'airborne data management group': 'ADMG',
    'admg': 'ADMG',
    'data curation for discovery': 'DCD',
    'dcd': 'DCD',
    'harmonized landsat and sentinel-2': 'HLS',
    'harmonized landsat sentinel': 'HLS',
    'hls': 'HLS',
    'nisar downlink': 'NISAR Downlink',

    # Cycle 2
    'freeboard': 'ICESat-2 QuickLooks',
    'icethickness': 'ICESat-2 QuickLooks',
    'icesat-2': 'ICESat-2 QuickLooks',
    'gacr': 'GACR',
    'acgeos': 'GACR',
    'gcc from satcorps': 'GCC from SatCORPS',
    'gcc': 'GCC from SatCORPS',
    'radiation and cloud': 'GCC from SatCORPS',
    'internet of animals': 'Internet of Animals',
    'ioa': 'Internet of Animals',
    'nisar sm': 'NISAR SM',

    # OPERA releases
    'opera release 1': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera dswx-hls': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera release 2': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera rtc-s1': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera release 3 - disp': 'OPERA Release 3 - DISP-S1',
    'opera disp-s1': 'OPERA Release 3 - DISP-S1',
    'opera release 3 - dswx': 'OPERA Release 3 - DSWx-S1',
    'opera dswx-s1': 'OPERA Release 3 - DSWx-S1',
    'opera release 4': 'OPERA Release 4 - DSWx-NI',
    'opera dswx-ni': 'OPERA Release 4 - DSWx-NI',
    'opera release 5': 'OPERA Release 5 - CSLC-NI and DISP-NI',
    'opera release 6': 'OPERA Release 6 - DIST-S1',
    'opera dist-s1': 'OPERA Release 6 - DIST-S1',

    # Cycle 3
    'air quality forecasts - gmao': 'Air Quality - GMAO',
    'air quality - gmao': 'Air Quality - GMAO',
    'air quality forecasts - pandora': 'Air Quality - Pandora Sensors',
    'air quality - pandora': 'Air Quality - Pandora Sensors',
    'pandora sensors': 'Air Quality - Pandora Sensors',
    'air quality forecasts - pm2.5': 'Air Quality - PM2.5',
    'air quality - pm2.5': 'Air Quality - PM2.5',
    'pm2.5': 'Air Quality - PM2.5',
    'global hls derived vegetation': 'HLS-VI',
    'hls-vi': 'HLS-VI',
    'pbl gnss-ro': 'PBL',
    'pbl': 'PBL',
    'tempo nrt': 'TEMPO NRT',

    # Cycle 4
    'global algal blooms': 'GABAN',
    'gaban': 'GABAN',
    'hls low latency': 'HLS-LL',
    'hls-ll': 'HLS-LL',
    'mwow': 'MWOW',
    'tempo enhanced': 'TEMPO Enhanced',
    'vertical land motion': 'Vertical Land Motion (VLM)',
    'vlm': 'Vertical Land Motion (VLM)',

    # Cycle 5
    'accessible 3d topographic': 'Accessible 3D Topographic Mapping Software',
    '3d topographic mapping': 'Accessible 3D Topographic Mapping Software',
    'high-resolution harmonized land surface': 'HLS-LST',
    'hls-lst': 'HLS-LST',
    'fire information': 'FIRMS-2G',
    'firms': 'FIRMS-2G',
    '10-m harmonized landsat': '10-m HLS',
    '10-m hls': '10-m HLS',
    'high-resolution evapotranspiration': 'Global Evapotranspiration',
    'evapotranspiration': 'Global Evapotranspiration',
    'hls-et': 'HLS-ET',
    'ongoing and mobile pandora': 'Ongoing Pandora Measurements',
    'ongoing pandora': 'Ongoing Pandora Measurements',
}


def normalize_name(name):
    """Normalize solution name for matching."""
    if pd.isna(name):
        return ''
    return str(name).strip().lower().replace('(', '').replace(')', '').replace('-', ' ')


def find_solution_match(quicklook_name, solutions_names):
    """Find the best matching solution name from MO-DB_Solutions."""
    if pd.isna(quicklook_name):
        return None

    ql_norm = normalize_name(quicklook_name)

    # Remove "Cycle N" prefix for matching
    import re
    ql_norm = re.sub(r'^cycle \d+\s*', '', ql_norm).strip()

    # 1. Check direct mappings
    for pattern, target in NAME_MAPPINGS.items():
        if pattern in ql_norm:
            if target in solutions_names:
                return target

    # 2. Exact match (after normalization)
    for sol_name in solutions_names:
        if normalize_name(sol_name) == ql_norm:
            return sol_name

    # 3. Substring match
    for sol_name in solutions_names:
        sol_norm = normalize_name(sol_name)
        if sol_norm in ql_norm or ql_norm in sol_norm:
            return sol_name

    # 4. Word overlap > 50%
    ql_words = set(ql_norm.split())
    for sol_name in solutions_names:
        sol_words = set(normalize_name(sol_name).split())
        overlap = len(ql_words & sol_words)
        total = max(len(ql_words), len(sol_words))
        if total > 0 and overlap / total > 0.5:
            return sol_name

    return None


def parse_funded_status(val):
    """Parse funded/unfunded value."""
    if pd.isna(val):
        return None
    val = str(val).strip().upper()
    if val == 'F' or 'FUNDED' in val:
        return 'Funded'
    if val == 'U' or 'UNFUNDED' in val:
        return 'Unfunded'
    return None


def parse_boolean(val):
    """Parse yes/no/x to boolean."""
    if pd.isna(val):
        return None
    val = str(val).strip().upper()
    if val in ['YES', 'Y', 'X', 'TRUE', '1']:
        return True
    if val in ['NO', 'N', 'FALSE', '0', '']:
        return False
    return None


def main():
    parser = argparse.ArgumentParser(description='Crosswalk Quick Look to MO-DB_Solutions')
    parser.add_argument('--dry-run', action='store_true', help='Show changes without writing')
    parser.add_argument('--overwrite', action='store_true', help='Overwrite existing values with Quick Look data')
    args = parser.parse_args()

    base_dir = Path(__file__).parent.parent.parent  # MO-development

    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'

    print("=" * 70)
    print("CROSSWALK: Solution Status Quick Look → MO-DB_Solutions")
    print("=" * 70)

    # Read Solution PoCs sheet from Quick Look
    print(f"\nReading: {quicklook_path.name}")
    pocs_df = pd.read_excel(quicklook_path, sheet_name='Solution PoCs')

    # Skip header rows if needed (find row with "Solution" header)
    for i, row in pocs_df.iterrows():
        if 'Solution' in str(row.values) and 'Title' in str(row.values):
            pocs_df.columns = pocs_df.iloc[i].values
            pocs_df = pocs_df.iloc[i+1:].reset_index(drop=True)
            break

    print(f"  PoCs entries: {len(pocs_df)}")

    # Read current Solutions database
    print(f"\nReading: {solutions_path.name}")
    solutions_df = pd.read_excel(solutions_path)
    print(f"  Solutions: {len(solutions_df)}")

    # Get list of solution names for matching
    solutions_names = solutions_df['name'].dropna().tolist()

    # Column mappings from Quick Look to MO-DB_Solutions
    column_map = {
        'Solution Lead': 'solution_lead',
        'Solution Lead Affiliation': 'solution_lead_affiliation',
        'R&A Representative': 'ra_representative',
        'R&A Representative Affiliation': 'ra_representative_affiliation',
        'Earth Action Representative': 'earth_action_advocate',
        'Earth Action Representative Affiliation': 'earth_action_affiliation',
        'Cycle': 'cycle',
        'Cycle Year': 'cycle_year',
    }

    # Boolean/special columns
    bool_columns = {
        'On Official Webpage': 'on_official_webpage',
        'Has folder in NSITE MO drive?': 'has_drive_folder',
        'Commerical Solution?': 'is_commercial',
    }

    # Track updates
    matched = []
    unmatched = []
    updates_made = 0

    print(f"\n{'='*70}")
    print("MATCHING SOLUTIONS")
    print("=" * 70)

    for _, poc_row in pocs_df.iterrows():
        # Get solution name from Quick Look (try both 'Solution' and 'Title')
        ql_name = poc_row.get('Solution') or poc_row.get('Title')
        if pd.isna(ql_name) or not str(ql_name).strip():
            continue

        # Find matching solution in MO-DB_Solutions
        match = find_solution_match(ql_name, solutions_names)

        if match:
            matched.append((ql_name, match))

            # Find the row index in solutions_df
            sol_idx = solutions_df[solutions_df['name'] == match].index
            if len(sol_idx) == 0:
                continue
            sol_idx = sol_idx[0]

            # Update columns
            for ql_col, sol_col in column_map.items():
                if ql_col in poc_row.index:
                    new_val = poc_row[ql_col]
                    if pd.notna(new_val) and str(new_val).strip():
                        old_val = solutions_df.at[sol_idx, sol_col] if sol_col in solutions_df.columns else None
                        is_empty = pd.isna(old_val) or str(old_val).strip() == ''
                        is_different = not is_empty and str(old_val).strip() != str(new_val).strip()

                        should_update = is_empty or (args.overwrite and is_different)

                        if should_update:
                            if sol_col not in solutions_df.columns:
                                solutions_df[sol_col] = ''

                            action = "FILL" if is_empty else "UPDATE"
                            solutions_df.at[sol_idx, sol_col] = str(new_val).strip()
                            updates_made += 1
                            print(f"  [{action}] {match}: {sol_col}")
                            if is_different:
                                print(f"          OLD: {str(old_val).strip()[:50]}")
                            print(f"          NEW: {str(new_val).strip()[:50]}")

            # Handle funded status
            funded_val = poc_row.get('Funded or Unfunded? F/U')
            parsed_funded = parse_funded_status(funded_val)
            if parsed_funded:
                old_val = solutions_df.at[sol_idx, 'funding_status'] if 'funding_status' in solutions_df.columns else None
                is_empty = pd.isna(old_val) or str(old_val).strip() == ''
                is_different = not is_empty and str(old_val).strip() != parsed_funded

                if is_empty or (args.overwrite and is_different):
                    if 'funding_status' not in solutions_df.columns:
                        solutions_df['funding_status'] = ''
                    action = "FILL" if is_empty else "UPDATE"
                    solutions_df.at[sol_idx, 'funding_status'] = parsed_funded
                    updates_made += 1
                    print(f"  [{action}] {match}: funding_status = {parsed_funded}")

            # Handle boolean columns
            for ql_col, sol_col in bool_columns.items():
                if ql_col in poc_row.index:
                    parsed_bool = parse_boolean(poc_row[ql_col])
                    if parsed_bool is not None:
                        old_val = solutions_df.at[sol_idx, sol_col] if sol_col in solutions_df.columns else None
                        is_empty = pd.isna(old_val) or str(old_val).strip() == ''
                        is_different = not is_empty and old_val != parsed_bool

                        if is_empty or (args.overwrite and is_different):
                            if sol_col not in solutions_df.columns:
                                solutions_df[sol_col] = ''
                            action = "FILL" if is_empty else "UPDATE"
                            solutions_df.at[sol_idx, sol_col] = parsed_bool
                            updates_made += 1
                            print(f"  [{action}] {match}: {sol_col} = {parsed_bool}")
        else:
            unmatched.append(ql_name)

    # Update last_updated timestamp
    solutions_df['last_updated'] = datetime.now().strftime('%Y-%m-%d')

    # Summary
    print(f"\n{'='*70}")
    print("SUMMARY")
    print("=" * 70)
    print(f"Matched: {len(matched)}/{len(pocs_df)} solutions")
    print(f"Updates made: {updates_made}")

    if unmatched:
        print(f"\nUnmatched Quick Look entries ({len(unmatched)}):")
        for name in unmatched:
            print(f"  - {name}")

    if args.dry_run:
        print("\n[DRY RUN - No files written]")
    else:
        # Backup original
        backup_dir = solutions_path.parent / 'backups'
        backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = backup_dir / f'MO-DB_Solutions_backup_{timestamp}.xlsx'

        import shutil
        shutil.copy(solutions_path, backup_path)
        print(f"\nBackup: {backup_path}")

        # Write updated file
        solutions_df.to_excel(solutions_path, index=False, sheet_name='Solutions')
        print(f"Updated: {solutions_path}")

        print("\n=== CROSSWALK COMPLETE ===")


if __name__ == '__main__':
    main()
