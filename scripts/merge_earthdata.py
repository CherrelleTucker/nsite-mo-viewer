#!/usr/bin/env python3
"""
Merge Earthdata Content into Solutions Import
==============================================
Adds Earthdata URLs, descriptions, platforms, and other metadata.
"""

import pandas as pd
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Map Earthdata solution_key to our solution_id
EARTHDATA_MAPPINGS = {
    'ADMG': 'admg',
    'Air Quality': 'aq_gmao',  # Maps to the umbrella - will handle variants
    'Commercial Discovery NASA': 'csda',
    'DCD': 'dcd',
    'DESIS': None,  # Commercial data access
    'GABAN': 'gaban',
    'GACR': 'gacr',
    'GCC': 'gcc',
    'GHGSat': None,  # Commercial data access
    'HLS': 'hls',
    'HLS-LL': 'hls_ll',
    'HLS-VI': 'hls_vi',
    'High-Res DEMs': None,  # Commercial data access
    'ICESat-2': 'icesat-2',
    'IoA': 'ioa',
    'MWOW': 'mwow',
    'NISAR Downlink': 'nisar_dl',
    'NISAR SM': 'nisar_sm',
    'OPERA DISP': 'opera_r3-disp',
    'OPERA DIST': 'opera-r6-dist-s1',  # or opera_r1 for DIST-HLS
    'OPERA DSWx': 'opera_r1',  # DSWx-HLS is Release 1
    'PBL': 'pbl',
    'Planet Access': None,  # Commercial data access
    'Planet Derived': None,
    'Planet EULA': None,
    'SSS': 'sss',
    'Spire Access': None,  # Commercial data access
    'TEMPO Enhanced': 'tempo_enhanced',
    'TEMPO NRT': 'tempo_nrt',
    'Targeted RS Training': 'targeted-rs-training',
    'VLM': 'vlm',
    'Water Quality': 'water quality',
}

# Additional mappings for Air Quality variants
AIR_QUALITY_SOLUTIONS = ['aq_gmao', 'aq_pandora', 'aq_pm2.5']


def main():
    scripts_dir = Path(__file__).parent
    earthdata_path = scripts_dir.parent.parent / 'database-files' / 'earthdata-content-for-merge.csv'
    final_csv_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'

    print("=" * 70)
    print("MERGING EARTHDATA CONTENT")
    print("=" * 70)

    # Read Earthdata content
    earthdata_df = pd.read_csv(earthdata_path)
    print(f"Earthdata content: {len(earthdata_df)} entries")

    # Read current final import
    final_df = pd.read_csv(final_csv_path)
    print(f"Final import: {len(final_df)} solutions")

    # Check if we need to add new columns
    new_columns = [
        'earthdata_url',
        'purpose_mission',
        'thematic_areas',
        'platform',
        'temporal_frequency',
        'horizontal_resolution',
        'geographic_domain',
        'societal_impact'
    ]

    for col in new_columns:
        if col not in final_df.columns:
            final_df[col] = ''

    # Merge Earthdata content
    updates = 0
    for _, ed_row in earthdata_df.iterrows():
        ed_key = ed_row.get('solution_key', '')
        if pd.isna(ed_key) or not ed_key:
            continue

        # Get mapped solution_id(s)
        sol_ids = []
        if ed_key in EARTHDATA_MAPPINGS:
            mapped = EARTHDATA_MAPPINGS[ed_key]
            if mapped:
                if ed_key == 'Air Quality':
                    sol_ids = AIR_QUALITY_SOLUTIONS
                else:
                    sol_ids = [mapped]

        if not sol_ids:
            print(f"  [SKIP] No mapping for: {ed_key}")
            continue

        for sol_id in sol_ids:
            # Find matching row in final_df
            mask = final_df['solution_id'] == sol_id
            if not mask.any():
                print(f"  [SKIP] Solution not found: {sol_id}")
                continue

            idx = final_df[mask].index[0]

            # Update columns
            for col in new_columns:
                ed_col = col
                if col in ed_row.index:
                    val = ed_row[col]
                    if pd.notna(val) and str(val).strip():
                        current = final_df.at[idx, col]
                        if pd.isna(current) or str(current).strip() == '':
                            final_df.at[idx, col] = val
                            updates += 1

            print(f"  [{sol_id}] Merged Earthdata content")

    print(f"\nApplied {updates} Earthdata updates")

    # Save
    final_df.to_csv(final_csv_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("EARTHDATA CONTENT MERGED")
    print("=" * 70)
    print(f"Output: {final_csv_path}")
    print(f"Total columns now: {len(final_df.columns)}")

    # Summary
    print("\nEarthdata fields with data:")
    for col in new_columns:
        if col in final_df.columns:
            filled = final_df[col].notna() & (final_df[col].astype(str).str.strip() != '')
            count = filled.sum()
            if count > 0:
                print(f"  {col}: {count} solutions")


if __name__ == '__main__':
    main()
