#!/usr/bin/env python3
"""
Extract Drive Folder URLs from File Log
========================================
Identifies the main project folder for each solution from file patterns.
"""

import pandas as pd
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Map solution_id to file name patterns
SOLUTION_PATTERNS = {
    'hls_ll': ['HLS LL', 'HLS-LL', 'LL HLS'],
    'hls_vi': ['HLS VI', 'HLS-VI', 'VI HLS'],
    'tempo_nrt': ['TEMPO NRT', 'TEMPO-NRT'],
    'tempo_enhanced': ['TEMPO E', 'TEMPO Enhanced', 'TEMPO-E'],
    'mwow': ['MWOW', 'Ocean Winds'],
    'gaban': ['GABAN', 'HAB_'],
    'vlm': ['VLM', '_VLM_'],
    'pbl': ['PBL', '_PBL_'],
    'aq_pm2.5': ['PM2.5', 'PM 2.5'],
    'aq_gmao': ['GMAO', '_GMAO_'],
    'aq_pandora': ['Pandora'],
    'dcd': ['DCD', '_DCD_'],
    'opera_r1': ['OPERA', 'DSWx'],
    'opera_r2': ['OPERA R2'],
    'opera_r3-disp': ['OPERA DISP', 'OPERA-DISP'],
    'opera_r3-diswx': ['OPERA DSWx-S1'],
    'opera-r6-dist-s1': ['OPERA DIST', 'DIST-S1'],
    'hls': ['HLS_C1', 'HLS C1'],
    'sep_viewer': ['SEP Viewer', 'SEP_Viewer'],
    'sss': ['SSS', '_SSS_'],
    'ioa': ['IoA', '_IoA_'],
    'admg': ['ADMG', '_ADMG_'],
    'csda': ['CSDA', 'Commercial Discovery'],
    'gacr': ['GACR', '_GACR_'],
    'gcc': ['GCC', '_GCC_'],
    'nisar_dl': ['NISAR Downlink', 'NISAR DL'],
    'nisar_sm': ['NISAR SM', 'NISAR Soil'],
    'icesat-2': ['ICESat-2', 'ICESat2'],
    'targeted-rs-training': ['RS Training', 'Targeted RS'],
    'water quality': ['Water Quality', 'WaterQuality'],
    'volcano': ['Volcano', 'Deformation'],
}

# Key document types that indicate "main" solution folder
KEY_DOCS = ['Science SOW', 'Project Plan', 'Risk Register', 'IPA', 'ICD', 'Data Product Table']


def find_solution_folder(df, solution_id, patterns):
    """Find the main folder for a solution based on file patterns."""
    # Find all files matching any pattern
    mask = pd.Series([False] * len(df))
    for pattern in patterns:
        mask |= df['File Title'].str.contains(pattern, case=False, na=False)

    matches = df[mask]
    if len(matches) == 0:
        return None, 0

    # Count key documents per folder
    folder_scores = {}
    for _, row in matches.iterrows():
        folder_id = row.get('Unnamed: 6', '')
        if pd.isna(folder_id) or not folder_id:
            continue
        folder_id = str(folder_id).strip()

        filename = str(row.get('File Title', ''))

        # Skip archived files and shortcuts
        if 'archived' in filename.lower():
            continue
        mime_type = str(row.get('Unnamed: 5', ''))
        if 'shortcut' in mime_type.lower():
            continue

        # Score folder based on key documents
        if folder_id not in folder_scores:
            folder_scores[folder_id] = {'total': 0, 'key_docs': 0}

        folder_scores[folder_id]['total'] += 1

        for doc in KEY_DOCS:
            if doc.lower() in filename.lower():
                folder_scores[folder_id]['key_docs'] += 1
                break

    if not folder_scores:
        return None, 0

    # Pick folder with most key docs, then most total files
    best_folder = max(folder_scores.items(),
                      key=lambda x: (x[1]['key_docs'], x[1]['total']))

    return best_folder[0], best_folder[1]['key_docs']


def build_folder_url(folder_id):
    """Build Google Drive folder URL from folder ID."""
    return f"https://drive.google.com/drive/folders/{folder_id}"


def main():
    scripts_dir = Path(__file__).parent
    file_log_path = scripts_dir.parent.parent / 'source-archives' / 'file log - Sheet1.csv'
    final_csv_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'

    print("=" * 70)
    print("EXTRACTING DRIVE FOLDER URLs FROM FILE LOG")
    print("=" * 70)

    # Read file log
    file_log = pd.read_csv(file_log_path)
    print(f"File log: {len(file_log)} entries")

    # Read current final import
    final_df = pd.read_csv(final_csv_path)
    print(f"Final import: {len(final_df)} solutions")

    # Extract folder URLs
    folder_data = {}  # {solution_id: folder_url}

    for sol_id, patterns in SOLUTION_PATTERNS.items():
        folder_id, key_doc_count = find_solution_folder(file_log, sol_id, patterns)
        if folder_id:
            folder_url = build_folder_url(folder_id)
            folder_data[sol_id] = folder_url
            print(f"  [{sol_id}] Found folder with {key_doc_count} key docs")
        else:
            print(f"  [{sol_id}] No folder found")

    print(f"\nFound folders for {len(folder_data)} solutions")

    # Update final dataframe
    updates = 0
    for idx, row in final_df.iterrows():
        sol_id = row['solution_id']
        if sol_id in folder_data:
            current_url = final_df.at[idx, 'drive_folder_url']
            # Only update if current value is not a valid URL
            if pd.isna(current_url) or not str(current_url).startswith('http'):
                final_df.at[idx, 'drive_folder_url'] = folder_data[sol_id]
                updates += 1

    print(f"Applied {updates} folder URL updates")

    # Save
    final_df.to_csv(final_csv_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("DRIVE FOLDER URLs EXTRACTED AND MERGED")
    print("=" * 70)
    print(f"Output: {final_csv_path}")

    # Summary
    has_url = final_df['drive_folder_url'].str.startswith('http', na=False)
    print(f"\nSolutions with Drive folder URLs: {has_url.sum()} of {len(final_df)}")


if __name__ == '__main__':
    main()
