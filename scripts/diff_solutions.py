#!/usr/bin/env python3
"""
Diff Quick Look vs MO-DB_Solutions
==================================
Shows differences between Quick Look (source of truth) and current database.
"""

import pandas as pd
from pathlib import Path
import sys
import re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Name mappings for matching
NAME_MAPPINGS = {
    'airborne data management group': 'ADMG',
    'admg': 'ADMG',
    'data curation for discovery': 'DCD',
    'dcd': 'DCD',
    'harmonized landsat and sentinel-2': 'HLS',
    'harmonized landsat sentinel': 'HLS',
    'hls': 'HLS',
    'nisar downlink': 'NISAR Downlink',
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
    'opera release 1': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera dswx-hls': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera release 2': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera rtc-s1': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera release 3 - disp': 'OPERA Release 3 - DISP-S1',
    'opera disp-s1': 'OPERA Release 3 - DISP-S1',
    'opera disp': 'OPERA Release 3 - DISP-S1',
    'opera release 3 - dswx': 'OPERA Release 3 - DSWx-S1',
    'opera dswx-s1': 'OPERA Release 3 - DSWx-S1',
    'opera dswx': 'OPERA Release 3 - DSWx-S1',
    'opera release 4': 'OPERA Release 4 - DSWx-NI',
    'opera dswx-ni': 'OPERA Release 4 - DSWx-NI',
    'opera release 5': 'OPERA Release 5 - CSLC-NI and DISP-NI',
    'opera release 6': 'OPERA Release 6 - DIST-S1',
    'opera dist-s1': 'OPERA Release 6 - DIST-S1',
    'opera dist': 'OPERA Release 6 - DIST-S1',
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
    'global algal blooms': 'GABAN',
    'gaban': 'GABAN',
    'hls low latency': 'HLS-LL',
    'hls-ll': 'HLS-LL',
    'mwow': 'MWOW',
    'tempo enhanced': 'TEMPO Enhanced',
    'vertical land motion': 'Vertical Land Motion (VLM)',
    'vlm': 'Vertical Land Motion (VLM)',
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
    if pd.isna(name):
        return ''
    return str(name).strip().lower().replace('(', '').replace(')', '').replace('-', ' ')


def find_solution_match(quicklook_name, solutions_names):
    if pd.isna(quicklook_name):
        return None

    ql_norm = normalize_name(quicklook_name)
    ql_norm = re.sub(r'^cycle \d+\s*', '', ql_norm).strip()

    for pattern, target in NAME_MAPPINGS.items():
        if pattern in ql_norm:
            if target in solutions_names:
                return target

    for sol_name in solutions_names:
        if normalize_name(sol_name) == ql_norm:
            return sol_name

    for sol_name in solutions_names:
        sol_norm = normalize_name(sol_name)
        if sol_norm in ql_norm or ql_norm in sol_norm:
            return sol_name

    return None


def safe_str(val, max_len=50):
    if pd.isna(val) or str(val).strip() == '':
        return '[empty]'
    s = str(val).strip()
    if len(s) > max_len:
        return s[:max_len-3] + '...'
    return s


def main():
    base_dir = Path(__file__).parent.parent.parent

    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'

    print("=" * 90)
    print("DIFF: Quick Look (source of truth) vs MO-DB_Solutions")
    print("=" * 90)

    # Read Solution PoCs
    pocs_df = pd.read_excel(quicklook_path, sheet_name='Solution PoCs')

    # Find header row
    for i, row in pocs_df.iterrows():
        if 'Solution' in str(row.values) and 'Title' in str(row.values):
            pocs_df.columns = pocs_df.iloc[i].values
            pocs_df = pocs_df.iloc[i+1:].reset_index(drop=True)
            break

    solutions_df = pd.read_excel(solutions_path)
    solutions_names = solutions_df['name'].dropna().tolist()

    # Column mappings
    column_map = {
        'Solution Lead': 'solution_lead',
        'Solution Lead Affiliation': 'solution_lead_affiliation',
        'R&A Representative': 'ra_representative',
        'R&A Representative Affiliation': 'ra_representative_affiliation',
        'Earth Action Representative': 'earth_action_advocate',
        'Earth Action Representative Affiliation': 'earth_action_affiliation',
    }

    differences = []
    empty_in_db = []

    for _, poc_row in pocs_df.iterrows():
        ql_name = poc_row.get('Solution') or poc_row.get('Title')
        if pd.isna(ql_name) or not str(ql_name).strip():
            continue

        match = find_solution_match(ql_name, solutions_names)
        if not match:
            continue

        sol_row = solutions_df[solutions_df['name'] == match].iloc[0]

        for ql_col, sol_col in column_map.items():
            if ql_col not in poc_row.index:
                continue

            ql_val = poc_row[ql_col]
            db_val = sol_row.get(sol_col) if sol_col in sol_row.index else None

            ql_empty = pd.isna(ql_val) or str(ql_val).strip() == ''
            db_empty = pd.isna(db_val) or str(db_val).strip() == ''

            if ql_empty:
                continue  # No data in Quick Look

            if db_empty:
                empty_in_db.append({
                    'solution': match,
                    'field': sol_col,
                    'quicklook_value': safe_str(ql_val)
                })
            elif str(ql_val).strip() != str(db_val).strip():
                differences.append({
                    'solution': match,
                    'field': sol_col,
                    'db_value': safe_str(db_val),
                    'quicklook_value': safe_str(ql_val)
                })

    # Report
    print(f"\n{'='*90}")
    print(f"EMPTY IN DATABASE (can be filled from Quick Look): {len(empty_in_db)}")
    print("=" * 90)
    for item in empty_in_db:
        print(f"  {item['solution']:35} {item['field']:30}")
        print(f"    QuickLook: {item['quicklook_value']}")

    print(f"\n{'='*90}")
    print(f"DIFFERENCES (QuickLook != Database): {len(differences)}")
    print("=" * 90)
    for item in differences:
        print(f"\n  {item['solution']:35} {item['field']}")
        print(f"    DB:        {item['db_value']}")
        print(f"    QuickLook: {item['quicklook_value']}")

    print(f"\n{'='*90}")
    print("SUMMARY")
    print("=" * 90)
    print(f"  Empty in DB (to fill): {len(empty_in_db)}")
    print(f"  Different values:      {len(differences)}")


if __name__ == '__main__':
    main()
