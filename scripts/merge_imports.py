#!/usr/bin/env python3
"""
Merge Solutions Import CSVs
===========================
Combines SOLUTIONS_IMPORT.csv and DOC_TRACKING_IMPORT.csv into a single file.
"""

import pandas as pd
from pathlib import Path
from datetime import datetime

def main():
    scripts_dir = Path(__file__).parent

    solutions_path = scripts_dir / 'SOLUTIONS_IMPORT.csv'
    doc_path = scripts_dir / 'DOC_TRACKING_IMPORT.csv'
    output_path = scripts_dir / 'SOLUTIONS_COMPLETE_IMPORT.csv'

    print("=" * 70)
    print("MERGING IMPORT FILES")
    print("=" * 70)

    # Read both CSVs
    solutions_df = pd.read_csv(solutions_path)
    doc_df = pd.read_csv(doc_path)

    print(f"\nSOLUTIONS_IMPORT.csv: {len(solutions_df)} rows, {len(solutions_df.columns)} columns")
    print(f"DOC_TRACKING_IMPORT.csv: {len(doc_df)} rows, {len(doc_df.columns)} columns")

    # Drop redundant columns from doc_df before merge
    doc_cols_to_drop = ['name', 'quicklook_name']
    doc_df_clean = doc_df.drop(columns=[c for c in doc_cols_to_drop if c in doc_df.columns])

    # Merge on solution_id
    merged_df = solutions_df.merge(doc_df_clean, on='solution_id', how='left')

    print(f"\nMerged: {len(merged_df)} rows, {len(merged_df.columns)} columns")

    # Reconcile phase columns (prefer phase_from_cycles if solutions phase is empty)
    if 'phase_from_cycles' in merged_df.columns:
        for idx, row in merged_df.iterrows():
            if pd.isna(row.get('phase')) or str(row.get('phase', '')).strip() == '':
                if pd.notna(row.get('phase_from_cycles')):
                    merged_df.at[idx, 'phase'] = row['phase_from_cycles']
        # Drop the redundant column
        merged_df = merged_df.drop(columns=['phase_from_cycles'])

    # Reorder columns for clarity
    priority_cols = [
        'solution_id', 'name', 'phase', 'cycle', 'cycle_year', 'funding_status',
        'solution_lead', 'solution_lead_affiliation',
        'ra_representative', 'ra_representative_affiliation',
        'earth_action_advocate', 'earth_action_affiliation',
        'on_official_webpage', 'has_drive_folder', 'production_start_date',
    ]

    # Document status columns
    status_cols = sorted([c for c in merged_df.columns if c.endswith('_status')])

    # Other columns
    other_cols = [c for c in merged_df.columns
                  if c not in priority_cols and c not in status_cols and c != 'last_updated']

    # Put last_updated at the end
    final_order = priority_cols + status_cols + other_cols + ['last_updated']
    final_order = [c for c in final_order if c in merged_df.columns]

    merged_df = merged_df[final_order]

    # Update last_updated
    merged_df['last_updated'] = datetime.now().strftime('%Y-%m-%d')

    # Write output
    merged_df.to_csv(output_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("MERGED CSV GENERATED")
    print("=" * 70)
    print(f"Output: {output_path}")
    print(f"Records: {len(merged_df)}")
    print(f"Columns: {len(merged_df.columns)}")

    print(f"\nColumn groups:")
    print(f"  Core fields: {len([c for c in priority_cols if c in merged_df.columns])}")
    print(f"  Document status: {len(status_cols)}")
    print(f"  Other: {len(other_cols)}")

    # Show fill rates
    print(f"\nFill rates:")
    for col in merged_df.columns:
        filled = merged_df[col].notna() & (merged_df[col].astype(str).str.strip() != '')
        pct = filled.sum() / len(merged_df) * 100
        if pct > 0:  # Only show columns with data
            print(f"  {col}: {filled.sum()}/{len(merged_df)} ({pct:.0f}%)")


if __name__ == '__main__':
    main()
