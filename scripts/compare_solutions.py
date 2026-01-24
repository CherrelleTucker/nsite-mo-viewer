#!/usr/bin/env python3
"""
Compare current MO-DB_Solutions with Quick Look data
====================================================
Shows side-by-side comparison of key fields.
"""

import pandas as pd
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def main():
    base_dir = Path(__file__).parent.parent.parent

    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'

    print("=" * 80)
    print("MO-DB_SOLUTIONS - KEY FIELDS STATUS")
    print("=" * 80)

    df = pd.read_excel(solutions_path)

    # Key contact columns
    contact_cols = ['solution_lead', 'solution_lead_affiliation',
                    'ra_representative', 'ra_representative_affiliation',
                    'earth_action_advocate', 'earth_action_affiliation']

    # Status columns
    status_cols = ['funding_status', 'on_official_webpage', 'has_drive_folder', 'is_commercial']

    # Milestone columns
    milestone_cols = ['atp_date', 'f2i_date', 'orr_date', 'closeout_date']

    print(f"\nTotal solutions: {len(df)}\n")

    # Fill rates for contact columns
    print("CONTACT FIELDS FILL RATES:")
    print("-" * 50)
    for col in contact_cols:
        if col in df.columns:
            filled = df[col].notna() & (df[col].astype(str).str.strip() != '')
            pct = filled.sum() / len(df) * 100
            print(f"  {col:35} {filled.sum():3}/{len(df)} ({pct:5.1f}%)")
        else:
            print(f"  {col:35} MISSING COLUMN")

    print("\nSTATUS FIELDS FILL RATES:")
    print("-" * 50)
    for col in status_cols:
        if col in df.columns:
            filled = df[col].notna() & (df[col].astype(str).str.strip() != '')
            pct = filled.sum() / len(df) * 100
            print(f"  {col:35} {filled.sum():3}/{len(df)} ({pct:5.1f}%)")
        else:
            print(f"  {col:35} MISSING COLUMN")

    print("\nMILESTONE FIELDS FILL RATES:")
    print("-" * 50)
    for col in milestone_cols:
        if col in df.columns:
            filled = df[col].notna() & (df[col].astype(str).str.strip() != '')
            pct = filled.sum() / len(df) * 100
            print(f"  {col:35} {filled.sum():3}/{len(df)} ({pct:5.1f}%)")
        else:
            print(f"  {col:35} MISSING COLUMN")

    # Show solutions missing key contacts
    print("\n" + "=" * 80)
    print("SOLUTIONS MISSING KEY CONTACTS")
    print("=" * 80)

    for _, row in df.iterrows():
        name = row['name']
        missing = []

        if 'solution_lead' in df.columns:
            if pd.isna(row['solution_lead']) or str(row['solution_lead']).strip() == '':
                missing.append('lead')

        if 'ra_representative' in df.columns:
            if pd.isna(row['ra_representative']) or str(row['ra_representative']).strip() == '':
                missing.append('R&A')

        if 'earth_action_advocate' in df.columns:
            if pd.isna(row['earth_action_advocate']) or str(row['earth_action_advocate']).strip() == '':
                missing.append('EAA')

        if missing:
            print(f"  {name:45} missing: {', '.join(missing)}")

if __name__ == '__main__':
    main()
