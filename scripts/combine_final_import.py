# -*- coding: utf-8 -*-
"""
Combine All Updates + Meeting References for Final Import
==========================================================
Merges extracted updates with meeting references for complete import.

Usage: python combine_final_import.py
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import re

# Input files
UPDATES_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\all_updates_import.xlsx")
REFERENCES_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\meeting_references_import.xlsx")

# Output file
OUTPUT_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\final_updates_import.xlsx")

# Columns for output
KEEP_COLUMNS = [
    'update_id', 'solution_id', 'update_text', 'source_document',
    'source_category', 'source_url', 'source_tab', 'meeting_date',
    'created_at', 'created_by'
]

# Illegal characters for Excel
ILLEGAL_CHARS_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')


def sanitize_text(text):
    """Remove characters that are illegal in Excel"""
    if pd.isna(text):
        return ''
    return ILLEGAL_CHARS_RE.sub('', str(text))


def load_all_sheets(file_path, source_name):
    """Load all sheets from an Excel file"""
    if not file_path.exists():
        print(f"  Warning: {file_path.name} not found")
        return pd.DataFrame()

    all_dfs = []
    xls = pd.ExcelFile(file_path)

    for sheet_name in xls.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if len(df) > 0:
            df['_source'] = source_name
            all_dfs.append(df)

    if not all_dfs:
        return pd.DataFrame()

    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"  {source_name}: {len(combined)} entries")
    return combined


def get_year_from_date(date_str):
    """Extract year from date string"""
    if pd.isna(date_str):
        return None

    try:
        if isinstance(date_str, str):
            match = re.match(r'(\d{4})', str(date_str))
            if match:
                return int(match.group(1))
        elif hasattr(date_str, 'year'):
            return date_str.year
    except:
        pass

    return None


def main():
    print("Combining all updates + meeting references for final import...")
    print()

    # Load files
    print("Loading files:")
    df_updates = load_all_sheets(UPDATES_FILE, "Full Updates")
    df_refs = load_all_sheets(REFERENCES_FILE, "Meeting References")

    # Combine
    all_dfs = [df for df in [df_updates, df_refs] if len(df) > 0]

    if not all_dfs:
        print("No data found!")
        return

    df_combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal combined: {len(df_combined)} entries")

    # Ensure all columns exist
    for col in KEEP_COLUMNS:
        if col not in df_combined.columns:
            df_combined[col] = ''

    # Sanitize text
    for col in ['update_text', 'source_document', 'source_tab']:
        if col in df_combined.columns:
            df_combined[col] = df_combined[col].apply(sanitize_text)

    # Get year
    df_combined['_year'] = df_combined['meeting_date'].apply(get_year_from_date)

    # Stats
    print("\nBy source:")
    source_counts = df_combined['_source'].value_counts()
    for source, count in source_counts.items():
        print(f"  {source}: {count}")

    print("\nBy year:")
    year_counts = df_combined['_year'].value_counts().sort_index(ascending=False)
    for year, count in year_counts.head(10).items():
        if pd.notna(year):
            print(f"  {int(year)}: {count}")

    print("\nTop solutions:")
    sol_counts = df_combined['solution_id'].value_counts()
    for sol, count in sol_counts.head(15).items():
        print(f"  {sol}: {count}")

    # Split by year
    df_2026 = df_combined[df_combined['_year'] == 2026].copy()
    df_2025 = df_combined[df_combined['_year'] == 2025].copy()
    df_2024 = df_combined[df_combined['_year'] == 2024].copy()
    df_archive = df_combined[df_combined['_year'] < 2024].copy()
    df_unknown = df_combined[df_combined['_year'].isna()].copy()

    if len(df_unknown) > 0:
        print(f"\n{len(df_unknown)} entries with unknown dates added to Archive")
        df_archive = pd.concat([df_archive, df_unknown], ignore_index=True)

    # Sort each by date, then solution
    for df in [df_2026, df_2025, df_2024, df_archive]:
        if len(df) > 0:
            df['meeting_date'] = pd.to_datetime(df['meeting_date'], errors='coerce')
            df.sort_values(['meeting_date', 'solution_id'], ascending=[False, True], inplace=True)
            df['meeting_date'] = df['meeting_date'].dt.strftime('%Y-%m-%d')

    # Clean up and select columns
    for df in [df_2026, df_2025, df_2024, df_archive]:
        for col in ['_year', '_source']:
            if col in df.columns:
                df.drop(col, axis=1, inplace=True)

    df_2026 = df_2026[KEEP_COLUMNS] if len(df_2026) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)
    df_2025 = df_2025[KEEP_COLUMNS] if len(df_2025) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)
    df_2024 = df_2024[KEEP_COLUMNS] if len(df_2024) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)
    df_archive = df_archive[KEEP_COLUMNS] if len(df_archive) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)

    print(f"\n{'=' * 60}")
    print("FINAL COUNTS")
    print(f"{'=' * 60}")
    print(f"  2026 tab: {len(df_2026)}")
    print(f"  2025 tab: {len(df_2025)}")
    print(f"  2024 tab: {len(df_2024)}")
    print(f"  Archive tab: {len(df_archive)}")
    print(f"  TOTAL: {len(df_2026) + len(df_2025) + len(df_2024) + len(df_archive)}")

    # Write to Excel
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        df_2026.to_excel(writer, sheet_name='2026', index=False)
        df_2025.to_excel(writer, sheet_name='2025', index=False)
        df_2024.to_excel(writer, sheet_name='2024', index=False)
        df_archive.to_excel(writer, sheet_name='Archive', index=False)

        # Column widths
        for sheet_name in ['2026', '2025', '2024', 'Archive']:
            worksheet = writer.sheets[sheet_name]
            widths = {
                'update_id': 20, 'solution_id': 15, 'update_text': 80,
                'source_document': 25, 'source_category': 15, 'source_url': 50,
                'source_tab': 30, 'meeting_date': 12, 'created_at': 25, 'created_by': 25
            }
            for idx, col in enumerate(KEEP_COLUMNS):
                col_letter = chr(65 + idx) if idx < 26 else f"A{chr(65 + idx - 26)}"
                worksheet.column_dimensions[col_letter].width = widths.get(col, 15)

    print(f"\nFinal import file: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
