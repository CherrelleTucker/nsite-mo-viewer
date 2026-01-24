#!/usr/bin/env python3
"""
Generate Final Solutions Import CSV
===================================
Uses the existing MO-DB_Solutions.xlsx structure (which the webapp expects)
and updates it with new data from extraction scripts.
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def clean_value(val):
    """Clean a value for export."""
    if pd.isna(val):
        return ''
    val = str(val).strip()
    if val.lower() in ['nan', 'none', 'nat']:
        return ''
    return val


def main():
    scripts_dir = Path(__file__).parent
    db_dir = scripts_dir.parent.parent / 'database-files' / 'MO-Viewer Databases'

    # Read the existing MO-DB_Solutions.xlsx (has correct schema for webapp)
    source_path = db_dir / 'MO-DB_Solutions.xlsx'
    output_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'

    print("=" * 70)
    print("GENERATING FINAL IMPORT CSV (WEBAPP-COMPATIBLE SCHEMA)")
    print("=" * 70)

    df = pd.read_excel(source_path)
    print(f"Source: {source_path.name}")
    print(f"Records: {len(df)} solutions")
    print(f"Columns: {len(df.columns)}")

    # Clean all values
    for col in df.columns:
        df[col] = df[col].apply(clean_value)

    # Update last_updated
    df['last_updated'] = datetime.now().strftime('%Y-%m-%d')

    # Rename daac column if needed (webapp expects daac_assignment)
    if 'assigned_daac_location' in df.columns and 'daac_assignment' not in df.columns:
        df['daac_assignment'] = df['assigned_daac_location']

    # Add missing columns that webapp expects (document status and URLs)
    # These will be populated by extraction scripts later
    new_columns = [
        # Document status columns (webapp checks these for Complete/In Progress/Not Started)
        'project_plan', 'science_sow', 'ipa', 'icd', 'tta', 'risk_register', 'fact_sheet',
        # Memo status columns
        'atp_memo', 'f2i_memo', 'orr_memo', 'closeout_memo',
        # Document URL columns
        'project_plan_url', 'science_sow_url', 'ipa_url', 'icd_url', 'tta_url', 'risk_register_url', 'fact_sheet_url',
        # Memo URL columns
        'atp_memo_url', 'f2i_memo_url', 'orr_memo_url', 'closeout_memo_url',
    ]
    for col in new_columns:
        if col not in df.columns:
            df[col] = ''

    # Write CSV
    df.to_csv(output_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("FINAL IMPORT CSV GENERATED")
    print("=" * 70)
    print(f"Output: {output_path}")
    print(f"Records: {len(df)}")
    print(f"Columns: {len(df.columns)}")

    # Show key columns
    print("\nKey columns included:")
    key_cols = ['solution_id', 'name', 'full_title', 'solution_group', 'cycle', 'phase',
                'show_in_default', 'funded_by_ison', 'daac_assignment',
                'solution_lead', 'purpose_mission', 'status_summary',
                'drive_folder_url', 'snwg_solution_page_url',
                'atp_date', 'f2i_date', 'orr_date', 'closeout_date']

    for col in key_cols:
        if col in df.columns:
            filled = df[col].notna() & (df[col].astype(str).str.strip() != '')
            count = filled.sum()
            print(f"  {col}: {count}/{len(df)} populated")
        else:
            print(f"  {col}: MISSING")


if __name__ == '__main__':
    main()
