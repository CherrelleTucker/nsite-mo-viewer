#!/usr/bin/env python3
"""
Extract Dates from SNWG MO Cycles Sheet
=======================================
Extracts actual dates from the Quick Look inner tabs and merges with final import.
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Column mapping from SNWG MO Cycles sheet
COLUMN_MAP = {
    # Column index: (field_name, description)
    5: ('planned_closeout_date', 'Planned Project Closeout'),
    8: ('hq_kickoff_date', 'Conduct HQ Kickoff Meeting'),
    11: ('task_plan_approved_date', 'Task Plan Approved'),
    12: ('solution_kickoff_date', 'Conduct Solution Kickoff Meeting'),
    14: ('atp_date', 'Conduct ATP Meeting'),
    15: ('atp_memo_date', 'ATP DG Memo'),
    20: ('contracts_approved_date', 'Contract / Agreements Approved'),
    26: ('f2i_date', 'Conduct F2I Meeting'),
    27: ('f2i_memo_date', 'F2I DG Memo'),
    30: ('icd_date', 'DAAC ICD'),
    32: ('orr_date', 'Conduct ORR Meeting'),
    33: ('orr_memo_date', 'ORR Memo'),
    35: ('production_start_date', 'Operation Start'),
    37: ('production_end_date', 'Operation End'),
    39: ('closeout_date', 'Closeout DG'),
    40: ('closeout_memo_date', 'Closeout DG Memo'),
}

# Name mapping - uses keyword matching (more specific first)
NAME_KEYWORDS = {
    # Cycle 1 - be explicit
    'admg': ['admg', 'airborne data management group'],
    'dcd': ['dcd', 'data curation for discovery'],
    'nisar_dl': ['nisar downlink'],

    # Cycle 2 OPERA - need specific matching
    'opera_r1': ['opera release 1'],
    'opera_r2': ['opera release 2'],
    'opera_r3-disp': ['opera release 3', 'disp-s1'],
    'opera_r3-diswx': ['opera release 3', 'dswx-s1'],
    'opera_r4': ['opera release 4'],
    'opera_r5': ['opera release 5'],
    'opera-r6-dist-s1': ['opera release 6'],

    # Cycle 2 others
    'icesat-2': ['icesat-2', 'icethickness', 'freeboard'],
    'ioa': ['internet of animals'],
    'gacr': ['gacr', 'acgeos'],
    'gcc': ['gcc from satcorps', 'satcorps'],
    'nisar_sm': ['nisar sm'],
    'water quality': ['water quality product'],

    # Cycle 3
    'aq_pandora': ['air quality forecasts - pandora', 'air quality', 'pandora sensor'],
    'aq_pm2.5': ['air quality forecasts - pm2.5', 'pm2.5'],
    'aq_gmao': ['air quality forecasts - gmao', 'air quality', 'gmao'],
    'hls_vi': ['vegetation indices'],
    'pbl': ['pbl gnss-ro', 'pbl'],
    'tempo_nrt': ['tempo nrt'],
    'sss': ['sea surface salinity'],

    # Cycle 4
    'gaban': ['gaban', 'algal blooms'],
    'hls_ll': ['hls low latency'],
    'tempo_enhanced': ['tempo enhanced'],
    'vlm': ['vlm', 'vertical land motion'],
    'mwow': ['mwow'],

    # Cycle 5
    '3d-topo-software': ['3d topographic', 'topographic mapping software'],
    'hls_lst': ['land surface temperature', 'lst) products'],
    'firms-2g': ['firms-2g', 'fire information'],
    'hls_10m': ['10-m harmonized', '10-m hls'],
    'hls_et': ['evapotranspiration (et)', 'et) product'],
    'aq_pandora-ongoing': ['ongoing', 'mobile pandora', 'smoky'],

    # HLS parent - must be last, most specific matching
    'hls': ['cycle 1 harmonized landsat'],
}


def normalize_name(name):
    """Normalize solution name for matching."""
    if pd.isna(name):
        return ''
    result = str(name).strip().lower()
    result = result.replace('(', '').replace(')', '').replace('-', ' ').replace('_', ' ')
    result = ' '.join(result.split())
    return result


def parse_date(val):
    """Parse a date value - could be datetime, string, or text with date."""
    if pd.isna(val):
        return None

    # Already a datetime
    if isinstance(val, (datetime, pd.Timestamp)):
        return val.strftime('%Y-%m-%d')

    val_str = str(val).strip()
    if not val_str:
        return None

    # Skip non-date values
    skip_values = ['working', 'tbd', 'pending', 'x', 'nan', 'snwg monthly', 'est.', 'estimated']
    if val_str.lower() in skip_values or val_str.lower().startswith('est'):
        return None

    # Try to extract date from string like "03/26/2024\nWorking" or "SADR 6/25/2024"
    date_patterns = [
        r'(\d{1,2}/\d{1,2}/\d{4})',  # MM/DD/YYYY or M/D/YYYY
        r'(\d{4}-\d{2}-\d{2})',       # YYYY-MM-DD
    ]

    for pattern in date_patterns:
        match = re.search(pattern, val_str)
        if match:
            date_str = match.group(1)
            try:
                if '/' in date_str:
                    dt = datetime.strptime(date_str, '%m/%d/%Y')
                else:
                    dt = datetime.strptime(date_str, '%Y-%m-%d')
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue

    return None


def get_solution_id(name):
    """Get solution_id from Quick Look name using keyword matching."""
    if pd.isna(name):
        return None

    name_lower = str(name).lower().strip()

    # Direct keyword matching - first match wins (more specific keywords first in dict)
    for sol_id, keywords in NAME_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in name_lower:
                # Special case: OPERA Release 3 has two variants
                if sol_id == 'opera_r3-disp' and 'disp-s1' not in name_lower:
                    continue
                if sol_id == 'opera_r3-diswx' and 'dswx-s1' not in name_lower:
                    continue
                # Air quality has multiple variants
                if sol_id == 'aq_pandora' and 'gmao' in name_lower:
                    continue
                if sol_id == 'aq_pandora' and 'pm2.5' in name_lower:
                    continue
                if sol_id == 'aq_gmao' and 'pandora' in name_lower:
                    continue
                if sol_id == 'aq_gmao' and 'pm2.5' in name_lower:
                    continue
                return sol_id

    return None


def main():
    scripts_dir = Path(__file__).parent
    quicklook_path = scripts_dir.parent.parent / 'source-archives' / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    final_csv_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'
    output_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'

    print("=" * 70)
    print("EXTRACTING DATES FROM SNWG MO CYCLES")
    print("=" * 70)

    # Read Quick Look
    xlsx = pd.ExcelFile(quicklook_path)
    cycles_df = pd.read_excel(xlsx, sheet_name='SNWG MO Cycles', header=None)
    print(f"SNWG MO Cycles: {cycles_df.shape[0]} rows, {cycles_df.shape[1]} columns")

    # Read current final import
    final_df = pd.read_csv(final_csv_path)
    print(f"Current final import: {len(final_df)} solutions")

    # Extract dates from cycles sheet (data starts at row 7)
    dates_extracted = {}

    for row_idx in range(7, cycles_df.shape[0]):
        row = cycles_df.iloc[row_idx]
        solution_name = row.iloc[0]

        if pd.isna(solution_name):
            continue

        solution_id = get_solution_id(solution_name)
        if not solution_id:
            print(f"  [SKIP] No mapping for: {solution_name}")
            continue

        # Extract dates from mapped columns
        dates = {}
        for col_idx, (field_name, desc) in COLUMN_MAP.items():
            if col_idx < len(row):
                date_val = parse_date(row.iloc[col_idx])
                if date_val:
                    dates[field_name] = date_val

        if dates:
            if solution_id not in dates_extracted:
                dates_extracted[solution_id] = {}
            dates_extracted[solution_id].update(dates)
            print(f"  [{solution_id}] Found {len(dates)} dates")

    print(f"\nExtracted dates for {len(dates_extracted)} solutions")

    # Merge dates into final dataframe
    updates = 0
    for idx, row in final_df.iterrows():
        sol_id = row['solution_id']
        if sol_id in dates_extracted:
            for field, date_val in dates_extracted[sol_id].items():
                if field in final_df.columns:
                    if pd.isna(final_df.at[idx, field]) or final_df.at[idx, field] == '':
                        final_df.at[idx, field] = date_val
                        updates += 1

    print(f"Applied {updates} date updates")

    # Save updated CSV
    final_df.to_csv(output_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("DATES EXTRACTED AND MERGED")
    print("=" * 70)
    print(f"Output: {output_path}")

    # Show summary of dates found
    print("\nDate fields with data:")
    date_cols = [c for c in final_df.columns if c.endswith('_date')]
    for col in date_cols:
        filled = final_df[col].notna() & (final_df[col].astype(str).str.strip() != '')
        count = filled.sum()
        if count > 0:
            print(f"  {col}: {count} solutions")


if __name__ == '__main__':
    main()
