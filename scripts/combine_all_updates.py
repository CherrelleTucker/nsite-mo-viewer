# -*- coding: utf-8 -*-
"""
Combine All Extracted Updates by Year for Database Import
==========================================================
Merges weekly, monthly, and SEP updates into a single Excel file
with year-based tabs matching MO-DB_Updates structure.

Usage: python combine_all_updates.py
"""

import pandas as pd
from pathlib import Path
from datetime import datetime
import re

# Input files
WEEKLY_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\weekly_updates_combined.xlsx")
MONTHLY_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\monthly_updates_combined.xlsx")
SEP_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\sep_updates_combined.xlsx")

# Output file
OUTPUT_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\all_updates_import.xlsx")

# Columns for output (matching MO-DB_Updates schema)
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


def load_updates(file_path, source_name):
    """Load updates from an Excel file"""
    if not file_path.exists():
        print(f"  Warning: {file_path.name} not found")
        return pd.DataFrame()

    df = pd.read_excel(file_path)
    df['_source'] = source_name
    print(f"  {source_name}: {len(df)} updates")
    return df


def get_year_from_date(date_str):
    """Extract year from date string"""
    if pd.isna(date_str):
        return None

    try:
        # Handle various date formats
        if isinstance(date_str, str):
            # Try YYYY-MM-DD format
            match = re.match(r'(\d{4})', str(date_str))
            if match:
                return int(match.group(1))
        elif hasattr(date_str, 'year'):
            return date_str.year
    except:
        pass

    return None


def main():
    print("Combining all extracted updates by year...")
    print()

    # Load all update files
    print("Loading update files:")
    df_weekly = load_updates(WEEKLY_FILE, "Weekly Internal")
    df_monthly = load_updates(MONTHLY_FILE, "Monthly Status")
    df_sep = load_updates(SEP_FILE, "SEP")

    # Combine all
    all_dfs = [df for df in [df_weekly, df_monthly, df_sep] if len(df) > 0]

    if not all_dfs:
        print("No updates found to combine!")
        return

    df_combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal combined: {len(df_combined)} updates")

    # Ensure all required columns exist
    for col in KEEP_COLUMNS:
        if col not in df_combined.columns:
            df_combined[col] = ''

    # Sanitize text fields
    for col in ['update_text', 'source_document', 'source_tab']:
        if col in df_combined.columns:
            df_combined[col] = df_combined[col].apply(sanitize_text)

    # Extract year from meeting_date
    df_combined['_year'] = df_combined['meeting_date'].apply(get_year_from_date)

    # Stats by year
    print("\nUpdates by year:")
    year_counts = df_combined['_year'].value_counts().sort_index(ascending=False)
    for year, count in year_counts.items():
        if pd.notna(year):
            print(f"  {int(year)}: {count}")
        else:
            print(f"  Unknown: {count}")

    # Stats by source
    print("\nUpdates by source:")
    source_counts = df_combined['_source'].value_counts()
    for source, count in source_counts.items():
        print(f"  {source}: {count}")

    # Split by year
    df_2026 = df_combined[df_combined['_year'] == 2026].copy()
    df_2025 = df_combined[df_combined['_year'] == 2025].copy()
    df_2024 = df_combined[df_combined['_year'] == 2024].copy()
    df_archive = df_combined[df_combined['_year'] < 2024].copy()  # 2023 and earlier
    df_unknown = df_combined[df_combined['_year'].isna()].copy()

    # Add unknown dates to archive
    if len(df_unknown) > 0:
        print(f"\n{len(df_unknown)} updates with unknown dates added to Archive")
        df_archive = pd.concat([df_archive, df_unknown], ignore_index=True)

    # Sort each by date descending, then solution
    for df in [df_2026, df_2025, df_2024, df_archive]:
        if len(df) > 0:
            df['meeting_date'] = pd.to_datetime(df['meeting_date'], errors='coerce')
            df.sort_values(['meeting_date', 'solution_id'], ascending=[False, True], inplace=True)
            df['meeting_date'] = df['meeting_date'].dt.strftime('%Y-%m-%d')

    # Remove helper columns and keep only needed
    for df in [df_2026, df_2025, df_2024, df_archive]:
        for col in ['_year', '_source']:
            if col in df.columns:
                df.drop(col, axis=1, inplace=True)

    df_2026 = df_2026[KEEP_COLUMNS] if len(df_2026) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)
    df_2025 = df_2025[KEEP_COLUMNS] if len(df_2025) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)
    df_2024 = df_2024[KEEP_COLUMNS] if len(df_2024) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)
    df_archive = df_archive[KEEP_COLUMNS] if len(df_archive) > 0 else pd.DataFrame(columns=KEEP_COLUMNS)

    print(f"\nFinal counts:")
    print(f"  2026: {len(df_2026)}")
    print(f"  2025: {len(df_2025)}")
    print(f"  2024: {len(df_2024)}")
    print(f"  Archive (2023 and earlier): {len(df_archive)}")

    # Write to Excel with multiple sheets
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        df_2026.to_excel(writer, sheet_name='2026', index=False)
        df_2025.to_excel(writer, sheet_name='2025', index=False)
        df_2024.to_excel(writer, sheet_name='2024', index=False)
        df_archive.to_excel(writer, sheet_name='Archive', index=False)

        # Auto-adjust column widths for each sheet
        for sheet_name in ['2026', '2025', '2024', 'Archive']:
            worksheet = writer.sheets[sheet_name]
            for idx, col in enumerate(KEEP_COLUMNS):
                # Set reasonable width based on column type
                if col == 'update_text':
                    width = 80
                elif col == 'source_url':
                    width = 50
                elif col in ['source_document', 'source_tab']:
                    width = 30
                elif col == 'meeting_date':
                    width = 12
                else:
                    width = 15

                col_letter = chr(65 + idx) if idx < 26 else f"A{chr(65 + idx - 26)}"
                worksheet.column_dimensions[col_letter].width = width

    print(f"\nCombined file written to: {OUTPUT_FILE}")

    # Print summary for user
    print("\n" + "=" * 60)
    print("SUMMARY - Ready for import to MO-DB_Updates")
    print("=" * 60)
    print(f"Total updates: {len(df_combined)}")
    print()
    print("Sheet breakdown:")
    print(f"  2026 tab: {len(df_2026)} updates")
    print(f"  2025 tab: {len(df_2025)} updates")
    print(f"  2024 tab: {len(df_2024)} updates")
    print(f"  Archive tab: {len(df_archive)} updates")
    print()
    print("Sources included:")
    print("  - Weekly Internal Planning meetings")
    print("  - Monthly Status meetings (PowerPoint + Word)")
    print("  - SEP meetings")
    print()
    print("Additional meeting types NOT yet processed (from file log):")
    print("  - Deep Dive notes (GCC, GACR, IoA, ICESat-2, NISAR SM, etc.)")
    print("  - Lunch & Learn notes (OPERA, SPoRT, OpenET)")
    print("  - Solution-specific meetings (PBL, TEMPO, GABAN, etc.)")
    print("  - ESDIS weekly meetings")
    print("  - Various stakeholder meetings")


if __name__ == '__main__':
    main()
