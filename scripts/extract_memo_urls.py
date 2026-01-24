#!/usr/bin/env python3
"""
Extract Memo URLs from File Log
===============================
Extracts Google Drive URLs for ATP, F2I, ORR, and Closeout memos from the file log.
"""

import pandas as pd
from pathlib import Path
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Solution name mappings from file names
SOLUTION_MAPPINGS = {
    'hls ll': 'hls_ll',
    'hls-ll': 'hls_ll',
    'hls vi': 'hls_vi',
    'hls-vi': 'hls_vi',
    'mwow': 'mwow',
    'gaban': 'gaban',
    'vlm': 'vlm',
    'tempo nrt': 'tempo_nrt',
    'tempo enhanced': 'tempo_enhanced',
    'pbl': 'pbl',
    'pm2.5': 'aq_pm2.5',
    'pm 2.5': 'aq_pm2.5',
    'gmao': 'aq_gmao',
    'pandora': 'aq_pandora',
    'pandora sensors': 'aq_pandora',
    'dcd': 'dcd',
    'sep viewer': 'sep_viewer',  # Internal MO project
}


def get_solution_id(filename):
    """Extract solution ID from filename."""
    filename_lower = filename.lower()

    for pattern, sol_id in SOLUTION_MAPPINGS.items():
        if pattern in filename_lower:
            return sol_id
    return None


def get_memo_type(filename):
    """Determine memo type from filename."""
    filename_lower = filename.lower()

    if 'closeout' in filename_lower:
        return 'closeout_memo'
    elif 'orr' in filename_lower:
        return 'orr_memo'
    elif 'f2i' in filename_lower:
        return 'f2i_memo'
    elif 'atp' in filename_lower:
        return 'atp_memo'
    return None


def build_url(file_id, mime_type):
    """Build Google Drive URL based on file type."""
    if 'document' in mime_type:
        return f"https://docs.google.com/document/d/{file_id}/edit"
    elif 'pdf' in mime_type:
        return f"https://drive.google.com/file/d/{file_id}/view"
    elif 'shortcut' in mime_type:
        # Shortcuts - use the file ID directly
        return f"https://drive.google.com/file/d/{file_id}/view"
    else:
        return f"https://drive.google.com/file/d/{file_id}/view"


def main():
    scripts_dir = Path(__file__).parent
    file_log_path = scripts_dir.parent.parent / 'source-archives' / 'file log - Sheet1.csv'
    final_csv_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'

    print("=" * 70)
    print("EXTRACTING MEMO URLs FROM FILE LOG")
    print("=" * 70)

    # Read file log
    file_log = pd.read_csv(file_log_path)
    print(f"File log: {len(file_log)} entries")

    # Read current final import
    final_df = pd.read_csv(final_csv_path)
    print(f"Final import: {len(final_df)} solutions")

    # Find memo files
    # Column mapping: Unnamed: 4 = file_id, Unnamed: 5 = mime_type
    memo_urls = {}  # {solution_id: {memo_type_url: url}}

    for _, row in file_log.iterrows():
        filename = str(row.get('File Title', ''))
        if not filename or pd.isna(filename):
            continue

        # Check if it's a memo file
        if 'memo' not in filename.lower():
            continue

        # Skip templates
        if 'template' in filename.lower():
            continue

        solution_id = get_solution_id(filename)
        memo_type = get_memo_type(filename)

        if not solution_id or not memo_type:
            continue

        # Get file ID and mime type from correct columns
        file_id = row.get('Unnamed: 4', '')
        mime_type = row.get('Unnamed: 5', '')

        if pd.isna(file_id) or not file_id:
            continue

        file_id = str(file_id).strip()
        mime_type = str(mime_type) if pd.notna(mime_type) else ''

        url = build_url(file_id, mime_type)
        url_field = f"{memo_type}_url"

        if solution_id not in memo_urls:
            memo_urls[solution_id] = {}

        # Only set if not already set (first occurrence wins - usually the canonical one)
        if url_field not in memo_urls[solution_id]:
            memo_urls[solution_id][url_field] = url
            print(f"  [{solution_id}] {url_field}: {url[:60]}...")

    print(f"\nFound URLs for {len(memo_urls)} solutions")

    # Update final dataframe
    updates = 0
    for idx, row in final_df.iterrows():
        sol_id = row['solution_id']
        if sol_id in memo_urls:
            for url_field, url in memo_urls[sol_id].items():
                if url_field in final_df.columns:
                    if pd.isna(final_df.at[idx, url_field]) or final_df.at[idx, url_field] == '':
                        final_df.at[idx, url_field] = url
                        updates += 1

    print(f"Applied {updates} URL updates")

    # Save
    final_df.to_csv(final_csv_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("MEMO URLs EXTRACTED AND MERGED")
    print("=" * 70)
    print(f"Output: {final_csv_path}")

    # Summary
    print("\nURL fields with data:")
    url_cols = [c for c in final_df.columns if c.endswith('_url')]
    for col in url_cols:
        filled = final_df[col].notna() & (final_df[col].astype(str).str.strip() != '')
        count = filled.sum()
        if count > 0:
            print(f"  {col}: {count} solutions")


if __name__ == '__main__':
    main()
