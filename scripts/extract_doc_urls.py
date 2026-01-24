#!/usr/bin/env python3
"""
Extract Document URLs from File Log
====================================
Extracts Google Drive URLs for SOW, Project Plans, IPA, ICD, Risk Registers, Fact Sheets, etc.
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
    'll hls': 'hls_ll',
    'hls vi': 'hls_vi',
    'hls-vi': 'hls_vi',
    'mwow': 'mwow',
    'ocean winds': 'mwow',
    'gaban': 'gaban',
    'hab': 'gaban',  # HAB = Harmful Algal Blooms = GABAN
    'vlm': 'vlm',
    'tempo nrt': 'tempo_nrt',
    'tempo e': 'tempo_enhanced',
    'tempo enhanced': 'tempo_enhanced',
    'pbl': 'pbl',
    'pm2.5': 'aq_pm2.5',
    'pm 2.5': 'aq_pm2.5',
    'gmao': 'aq_gmao',
    'pandora': 'aq_pandora',
    'pandora sensors': 'aq_pandora',
    'dcd': 'dcd',
    'sep viewer': 'sep_viewer',
    'hls_c1': 'hls',
    'hls': 'hls',
    'opera': 'opera_r1',
    'rs training': 'targeted-rs-training',
}


def get_solution_id(filename):
    """Extract solution ID from filename."""
    filename_lower = filename.lower()

    # Try exact matches first
    for pattern, sol_id in SOLUTION_MAPPINGS.items():
        if pattern in filename_lower:
            # Avoid false matches
            if pattern == 'hls' and ('hls ll' in filename_lower or 'hls vi' in filename_lower):
                continue
            if pattern == 'tempo' and 'tempo nrt' in filename_lower:
                continue
            return sol_id
    return None


def get_doc_type(filename):
    """Determine document type from filename."""
    filename_lower = filename.lower()

    # Check for specific document types
    if 'science sow' in filename_lower or 'nasa science sow' in filename_lower:
        return 'science_sow'
    elif 'sow' in filename_lower:
        return 'science_sow'
    elif 'project plan' in filename_lower:
        return 'project_plan'
    elif 'ipa' in filename_lower:
        return 'ipa'
    elif 'icd' in filename_lower:
        return 'icd'
    elif 'risk register' in filename_lower:
        return 'risk_register'
    elif 'fact sheet' in filename_lower:
        return 'fact_sheet'
    elif 'tech eval' in filename_lower:
        return 'tech_eval'
    return None


def build_url(file_id, mime_type):
    """Build Google Drive URL based on file type."""
    if pd.isna(mime_type):
        mime_type = ''
    mime_type = str(mime_type).lower()

    if 'document' in mime_type:
        return f"https://docs.google.com/document/d/{file_id}/edit"
    elif 'spreadsheet' in mime_type:
        return f"https://docs.google.com/spreadsheets/d/{file_id}/edit"
    elif 'presentation' in mime_type:
        return f"https://docs.google.com/presentation/d/{file_id}/edit"
    elif 'pdf' in mime_type:
        return f"https://drive.google.com/file/d/{file_id}/view"
    else:
        return f"https://drive.google.com/file/d/{file_id}/view"


def extract_date_from_filename(filename):
    """Try to extract a date from the filename."""
    # Patterns like _2024-11-01, _C3_2024-04-25, etc.
    patterns = [
        r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
        r'(\d{2}-\d{2}-\d{4})',  # MM-DD-YYYY
    ]

    for pattern in patterns:
        match = re.search(pattern, filename)
        if match:
            date_str = match.group(1)
            # Convert to YYYY-MM-DD if needed
            if len(date_str.split('-')[0]) == 2:
                parts = date_str.split('-')
                return f"{parts[2]}-{parts[0]}-{parts[1]}"
            return date_str
    return None


def main():
    scripts_dir = Path(__file__).parent
    file_log_path = scripts_dir.parent.parent / 'source-archives' / 'file log - Sheet1.csv'
    final_csv_path = scripts_dir / 'SOLUTIONS_FINAL_IMPORT.csv'

    print("=" * 70)
    print("EXTRACTING DOCUMENT URLs FROM FILE LOG")
    print("=" * 70)

    # Read file log
    file_log = pd.read_csv(file_log_path)
    print(f"File log: {len(file_log)} entries")

    # Read current final import
    final_df = pd.read_csv(final_csv_path)
    print(f"Final import: {len(final_df)} solutions")

    # Document types to extract
    doc_types = ['science_sow', 'project_plan', 'ipa', 'icd', 'risk_register', 'fact_sheet', 'tech_eval']

    # Find document files
    doc_data = {}  # {solution_id: {doc_type_url: url, doc_type_date: date}}

    for _, row in file_log.iterrows():
        filename = str(row.get('File Title', ''))
        if not filename or pd.isna(filename):
            continue

        # Skip archived and template files
        if 'template' in filename.lower():
            continue

        solution_id = get_solution_id(filename)
        doc_type = get_doc_type(filename)

        if not solution_id or not doc_type:
            continue

        # Get file ID and mime type
        file_id = row.get('Unnamed: 4', '')
        mime_type = row.get('Unnamed: 5', '')

        if pd.isna(file_id) or not file_id:
            continue

        file_id = str(file_id).strip()

        url = build_url(file_id, mime_type)
        url_field = f"{doc_type}_url"
        # The webapp expects status in the base field (e.g., "project_plan", not "project_plan_date")
        # It interprets dates as "Complete" status
        status_field = doc_type

        # Try to extract date from filename
        date_val = extract_date_from_filename(filename)

        if solution_id not in doc_data:
            doc_data[solution_id] = {}

        # Prefer non-archived, non-shortcut files
        is_archived = 'archived' in filename.lower()
        is_shortcut = 'shortcut' in str(mime_type).lower()

        # Only set if not already set, or if this is a better version
        if url_field not in doc_data[solution_id]:
            doc_data[solution_id][url_field] = url
            # Set status to date if we have one (webapp interprets date as Complete)
            if date_val:
                doc_data[solution_id][status_field] = date_val
            print(f"  [{solution_id}] {doc_type}: {filename[:50]}...")
        elif not is_archived and not is_shortcut:
            # Replace with better version
            doc_data[solution_id][url_field] = url
            if date_val:
                doc_data[solution_id][status_field] = date_val

    print(f"\nFound documents for {len(doc_data)} solutions")

    # Update final dataframe
    url_updates = 0
    status_updates = 0

    for idx, row in final_df.iterrows():
        sol_id = row['solution_id']
        if sol_id in doc_data:
            for field, value in doc_data[sol_id].items():
                if field in final_df.columns:
                    current_val = final_df.at[idx, field]
                    if pd.isna(current_val) or str(current_val).strip() == '':
                        final_df.at[idx, field] = value
                        if field.endswith('_url'):
                            url_updates += 1
                        else:
                            status_updates += 1

    print(f"Applied {url_updates} URL updates, {status_updates} status updates")

    # Save
    final_df.to_csv(final_csv_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("DOCUMENT URLs EXTRACTED AND MERGED")
    print("=" * 70)
    print(f"Output: {final_csv_path}")

    # Summary
    print("\nDocument fields with data:")
    for doc_type in doc_types:
        url_col = f"{doc_type}_url"
        status_col = doc_type  # webapp expects status in the base field

        if url_col in final_df.columns:
            url_filled = final_df[url_col].notna() & (final_df[url_col].astype(str).str.strip() != '')
            url_count = url_filled.sum()
        else:
            url_count = 0

        if status_col in final_df.columns:
            status_filled = final_df[status_col].notna() & (final_df[status_col].astype(str).str.strip() != '')
            status_count = status_filled.sum()
        else:
            status_count = 0

        if url_count > 0 or status_count > 0:
            print(f"  {doc_type}: {url_count} URLs, {status_count} status")


if __name__ == '__main__':
    main()
