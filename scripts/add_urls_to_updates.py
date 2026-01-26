# -*- coding: utf-8 -*-
"""
Add URLs to Updates from File Log
=================================
Maps source URLs to updates based on meeting dates and source types.

Usage: python add_urls_to_updates.py
"""

import pandas as pd
import re
from pathlib import Path
from datetime import datetime

# Input files
FILE_LOG = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\source-archives\file log - Sheet1.csv")
UPDATES_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\final_updates_import.xlsx")

# Output
OUTPUT_DIR = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files")


def build_url(doc_id, mime_type):
    """Build Google Drive URL from document ID and MIME type"""
    if not doc_id or pd.isna(doc_id):
        return ''

    doc_id = str(doc_id).strip()
    mime_type = str(mime_type).lower() if mime_type else ''

    if 'document' in mime_type:
        return f"https://docs.google.com/document/d/{doc_id}"
    elif 'spreadsheet' in mime_type:
        return f"https://docs.google.com/spreadsheets/d/{doc_id}"
    elif 'presentation' in mime_type:
        return f"https://docs.google.com/presentation/d/{doc_id}"
    else:
        return f"https://drive.google.com/file/d/{doc_id}"


def build_url_mappings(file_log_df):
    """Build URL mappings from file log"""

    # Weekly Internal Planning - by date
    weekly_urls = {}

    # Find the main weekly planning docs (2025, 2026)
    weekly_main = file_log_df[
        file_log_df['file_title'].str.contains('Weekly Internal Planning Meeting_NSITE MO_C0_202[56]', case=False, na=False, regex=True)
    ]
    for _, row in weekly_main.iterrows():
        title = row['file_title']
        url = build_url(row['doc_id'], row['mime_type'])
        if '2026' in title:
            weekly_urls['2026'] = url
        elif '2025' in title:
            weekly_urls['2025'] = url

    # Find older individual weekly docs (YYYY-MM-DD Internal SNWG Meeting)
    weekly_old = file_log_df[
        file_log_df['file_title'].str.match(r'^\d{4}-\d{2}-\d{2}.*Internal.*Meeting', case=False, na=False)
    ]
    for _, row in weekly_old.iterrows():
        match = re.search(r'(\d{4}-\d{2}-\d{2})', row['file_title'])
        if match:
            weekly_urls[match.group(1)] = build_url(row['doc_id'], row['mime_type'])

    print(f"Weekly URL mappings: {len(weekly_urls)}")

    # Monthly Status - by date
    monthly_urls = {}

    # Find all monthly meeting files (documents and presentations)
    monthly_files = file_log_df[
        file_log_df['file_title'].str.contains('Monthly', case=False, na=False) &
        ~file_log_df['mime_type'].str.contains('shortcut', case=False, na=False) &
        (
            file_log_df['mime_type'].str.contains('document', case=False, na=False) |
            file_log_df['mime_type'].str.contains('presentation', case=False, na=False)
        )
    ]

    for _, row in monthly_files.iterrows():
        title = row['file_title']
        url = build_url(row['doc_id'], row['mime_type'])

        # Pattern: YYYY-MM-DD at start
        match = re.search(r'^(\d{4}-\d{2}-\d{2})', title)
        if match:
            date_key = match.group(1)
            monthly_urls[date_key] = url
            # Also add YYYY-MM key for fallback
            month_key = date_key[:7]
            if month_key not in monthly_urls:
                monthly_urls[month_key] = url
            continue

        # Pattern: YYYY-MM at start (presentations)
        match = re.search(r'^(\d{4}-\d{2})\b', title)
        if match:
            key = match.group(1)
            if key not in monthly_urls:
                monthly_urls[key] = url

    print(f"Monthly URL mappings: {len(monthly_urls)}")

    return weekly_urls, monthly_urls


def add_urls_to_dataframe(df, weekly_urls, monthly_urls):
    """Add URLs to dataframe where missing"""

    updated = 0

    for idx, row in df.iterrows():
        # Skip if already has URL
        if pd.notna(row['source_url']) and str(row['source_url']).strip():
            continue

        source_doc = str(row.get('source_document', '')).lower()
        meeting_date = str(row.get('meeting_date', ''))

        if not meeting_date or meeting_date == 'nan' or meeting_date == 'NaT':
            continue

        url = None

        # Weekly Internal Planning
        if 'internal' in source_doc or 'planning' in source_doc:
            # Try exact date match first
            if meeting_date in weekly_urls:
                url = weekly_urls[meeting_date]
            else:
                # Fall back to year document
                year = meeting_date[:4]
                if year in weekly_urls:
                    url = weekly_urls[year]

        # Monthly Status Meeting
        elif 'monthly' in source_doc or 'status' in source_doc:
            # Try exact YYYY-MM-DD match first
            if meeting_date in monthly_urls:
                url = monthly_urls[meeting_date]
            else:
                # Try YYYY-MM match
                if len(meeting_date) >= 7:
                    month_key = meeting_date[:7]
                    if month_key in monthly_urls:
                        url = monthly_urls[month_key]

        if url:
            df.at[idx, 'source_url'] = url
            updated += 1

    return updated


def main():
    print("Adding URLs to updates from file log...")
    print()

    # Load file log
    file_log = pd.read_csv(FILE_LOG)
    file_log.columns = ['file_title', 'doc_title', 'is_programmatic', 'is_working',
                        'doc_id', 'mime_type', 'parent_id'] + list(file_log.columns[7:])

    print(f"File log entries: {len(file_log)}")

    # Build URL mappings
    weekly_urls, monthly_urls = build_url_mappings(file_log)

    # Show some monthly mappings for debugging
    print("\nSample monthly URL mappings:")
    for key in sorted(monthly_urls.keys())[:10]:
        print(f"  {key}")

    # Process each sheet
    sheets_data = {}

    for sheet in ['2026', '2025', '2024', 'Archive']:
        print(f"\nProcessing {sheet}...")
        df = pd.read_excel(UPDATES_FILE, sheet_name=sheet)

        # Count missing before
        missing_before = (df['source_url'].isna() | (df['source_url'] == '')).sum()

        # Add URLs
        updated = add_urls_to_dataframe(df, weekly_urls, monthly_urls)

        # Count missing after
        missing_after = (df['source_url'].isna() | (df['source_url'] == '')).sum()

        print(f"  {sheet}: Updated {updated} entries ({missing_before} -> {missing_after} missing)")

        sheets_data[sheet] = df

    # Save CSVs
    print("\nSaving CSV files...")
    for sheet, df in sheets_data.items():
        csv_path = OUTPUT_DIR / f"updates_import_{sheet}.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8')

        # Final stats
        has_url = df['source_url'].notna() & (df['source_url'] != '')
        print(f"  {sheet}: {has_url.sum()}/{len(df)} have URLs -> {csv_path.name}")

    # Check what's still missing
    print("\nStill missing URLs:")
    for sheet, df in sheets_data.items():
        missing = df[(df['source_url'].isna()) | (df['source_url'] == '')]
        if len(missing) > 0:
            print(f"  {sheet}: {len(missing)} missing")
            dates = missing['meeting_date'].unique()[:5]
            print(f"    Dates: {list(dates)}")

    print("\nDone!")


if __name__ == '__main__':
    main()
