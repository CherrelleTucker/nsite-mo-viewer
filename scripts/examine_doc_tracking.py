#!/usr/bin/env python3
"""
Examine Doc Tracking and SNWG MO Cycles sheets
===============================================
Understand the structure to extract document status data.
"""

import pandas as pd
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def safe_str(val):
    if pd.isna(val):
        return ''
    return str(val).encode('ascii', 'replace').decode('ascii')[:50]

def main():
    base_dir = Path(__file__).parent.parent.parent
    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'

    print("=" * 80)
    print("EXAMINING DOC TRACKING SHEET")
    print("=" * 80)

    # Read raw without headers
    doc_df = pd.read_excel(quicklook_path, sheet_name='Doc Tracking', header=None)

    print(f"\nShape: {doc_df.shape}")
    print(f"\nFirst 10 rows (raw):")
    for i in range(min(10, len(doc_df))):
        row_vals = [safe_str(v) for v in doc_df.iloc[i].values]
        print(f"  Row {i}: {row_vals[:8]}...")

    # Find where solution names start
    print(f"\n\nLooking for solution names in column patterns...")
    for col_idx in range(min(5, doc_df.shape[1])):
        print(f"\n  Column {col_idx}:")
        for i in range(min(15, len(doc_df))):
            val = safe_str(doc_df.iloc[i, col_idx])
            if val:
                print(f"    Row {i}: {val}")

    print("\n" + "=" * 80)
    print("EXAMINING SNWG MO CYCLES SHEET")
    print("=" * 80)

    cycles_df = pd.read_excel(quicklook_path, sheet_name='SNWG MO Cycles', header=None)

    print(f"\nShape: {cycles_df.shape}")
    print(f"\nFirst 5 rows (all columns):")
    for i in range(min(5, len(cycles_df))):
        row_vals = [safe_str(v) for v in cycles_df.iloc[i].values]
        print(f"  Row {i}: {row_vals}")

    # Look for document header row
    print(f"\n\nSearching for document column headers...")
    for i in range(min(10, len(cycles_df))):
        row_str = ' | '.join([safe_str(v) for v in cycles_df.iloc[i].values if safe_str(v)])
        if 'SOW' in row_str or 'ATP' in row_str or 'Memo' in row_str or 'IPA' in row_str:
            print(f"  Row {i} (potential header): {row_str[:200]}")

    # Show column structure around row 1-2 (likely headers)
    print(f"\n\nDetailed column headers (rows 0-2):")
    for col_idx in range(min(40, cycles_df.shape[1])):
        col_vals = [safe_str(cycles_df.iloc[i, col_idx]) for i in range(min(3, len(cycles_df)))]
        if any(col_vals):
            print(f"  Col {col_idx}: {col_vals}")

if __name__ == '__main__':
    main()
