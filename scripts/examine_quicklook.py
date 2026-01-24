#!/usr/bin/env python3
"""
Examine Solution Status Quick Look file structure
=================================================
Reads the Quick Look Excel file and displays its structure
to help plan the crosswalk with MO-DB_Solutions.
"""

import pandas as pd
from pathlib import Path
import sys

# Handle Windows encoding
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def safe_str(val):
    """Convert value to string, handling special chars."""
    if pd.isna(val):
        return ''
    return str(val).encode('ascii', 'replace').decode('ascii')

def main():
    base_dir = Path(__file__).parent.parent.parent  # MO-development

    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'

    print("=" * 70)
    print("SOLUTION STATUS QUICK LOOK - FILE EXAMINATION")
    print("=" * 70)

    # Read Quick Look file
    print(f"\nReading: {quicklook_path.name}")

    # First, check what sheets are in the file
    xl = pd.ExcelFile(quicklook_path)
    print(f"\nSheets in Quick Look file: {xl.sheet_names}")

    # Focus on key sheets for crosswalk
    key_sheets = ['Solution Top Sheet', 'SNWG MO Cycles', 'Doc Tracking', 'Solution PoCs']

    for sheet_name in key_sheets:
        if sheet_name not in xl.sheet_names:
            continue

        print(f"\n{'='*70}")
        print(f"SHEET: {sheet_name}")
        print("=" * 70)

        df = pd.read_excel(quicklook_path, sheet_name=sheet_name)
        print(f"\nRows: {len(df)}")
        print(f"Columns: {len(df.columns)}")

        print(f"\n--- COLUMNS ({len(df.columns)}) ---")
        for i, col in enumerate(df.columns):
            # Count non-empty values
            non_empty = df[col].notna().sum()
            fill_pct = (non_empty / len(df)) * 100 if len(df) > 0 else 0
            col_str = safe_str(col)[:40]
            print(f"  {i+1:2}. {col_str:40} [{non_empty:3}/{len(df)} = {fill_pct:5.1f}%]")

    # Parse Solution Top Sheet more carefully
    print(f"\n{'='*70}")
    print("PARSING: Solution Top Sheet")
    print("=" * 70)

    df = pd.read_excel(quicklook_path, sheet_name='Solution Top Sheet', header=None)

    # Find the header row (row with "Solution Project")
    header_row = None
    for i, row in df.iterrows():
        if 'Solution Project' in str(row.values):
            header_row = i
            break

    if header_row is not None:
        # Set the header row
        df.columns = df.iloc[header_row].values
        df = df.iloc[header_row+1:].reset_index(drop=True)

        # Remove empty rows
        df = df.dropna(how='all')

        print(f"\nParsed columns: {list(df.columns)}")
        print(f"\nSolutions found ({len(df)}):")

        for _, row in df.iterrows():
            sol_name = safe_str(row.get('Solution Project', ''))
            phase = safe_str(row.get('Phase', ''))
            if sol_name:
                print(f"  - {sol_name[:50]:50} | {phase}")

    # Now read Solutions database for comparison
    print(f"\n{'='*70}")
    print("CURRENT MO-DB_SOLUTIONS")
    print("=" * 70)

    solutions_df = pd.read_excel(solutions_path)
    print(f"\nRows: {len(solutions_df)}")
    print(f"Columns: {len(solutions_df.columns)}")

    print(f"\n--- KEY COLUMNS ---")
    key_cols = ['solution_id', 'name', 'phase', 'cycle', 'atp_date', 'f2i_date', 'orr_date', 'closeout_date']
    for col in key_cols:
        if col in solutions_df.columns:
            non_empty = solutions_df[col].notna().sum()
            fill_pct = (non_empty / len(solutions_df)) * 100
            print(f"  {col:25} [{non_empty:3}/{len(solutions_df)} = {fill_pct:5.1f}%]")

    # Show solution names for matching
    print(f"\n--- CURRENT SOLUTION NAMES ({len(solutions_df)}) ---")
    if 'name' in solutions_df.columns:
        for name in sorted(solutions_df['name'].dropna().unique()):
            print(f"  - {safe_str(name)}")

if __name__ == '__main__':
    main()
