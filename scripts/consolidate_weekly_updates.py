# -*- coding: utf-8 -*-
"""
Consolidate and Clean Weekly Internal Planning Updates
========================================================
Reads the extracted CSV, normalizes solution IDs, removes boilerplate,
consolidates by solution+date, and outputs clean Excel file.

Usage: python consolidate_weekly_updates.py
"""

import pandas as pd
import re
from pathlib import Path
import uuid
from datetime import datetime

# Input/Output files
INPUT_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\historical_updates_import.csv")
OUTPUT_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\weekly_updates_combined.xlsx")

# Columns for output
KEEP_COLUMNS = [
    'update_id', 'solution_id', 'update_text', 'source_document',
    'source_category', 'source_url', 'source_tab', 'meeting_date',
    'created_at', 'created_by'
]

# Solution ID normalization
SOLUTION_ID_NORMALIZATION = {
    'mo': 'SNWG-MO',
    'snwg-mo': 'SNWG-MO',
    'snwg mo': 'SNWG-MO',
    'hls': 'HLS',
    'pbl': 'PBL',
    'vlm': 'VLM',
    'admg': 'ADMG',
    'esdis': 'ESDIS',
    'gaban': 'GABAN',
    'lance': 'LANCE',
    'firms': 'FIRMS',
    'csda': 'CSDA',
    'ioa': 'IoA',
    'opera': 'OPERA',
    'dswx': 'DSWx',
    'dist': 'DIST',
    'disp': 'DISP',
    'gacr': 'GACR',
    'mwow': 'MWoW',
    'dcd': 'DCD',
    'tempo': 'TEMPO',
    'tempo_enhanced': 'TEMPO-NRT-Enhanced',
    'tempo_nrt': 'TEMPO-NRT',
    'aq_pandora': 'AQ-Pandora',
    'aq_pm2.5': 'AQ-PM2.5',
    'aq_gmao': 'AQ-GMAO',
    'icesat-2': 'ICESat-2',
    'icesat2': 'ICESat-2',
    'nisar_sm': 'NISAR-SM',
    'nisar_dl': 'NISAR-DL',
    'nisar': 'NISAR',
    'hls-ll': 'HLS-LL',
    'hls_ll': 'HLS-LL',
    'hls-vi': 'HLS-VI',
    'hls_vi': 'HLS-VI',
    '3d-topo': '3D-Topo',
    'rtc-s1': 'RTC-S1',
    # Additional mappings
    'gcc': 'GCC',  # Global Carbon Cycle
    'nga': 'NGA',  # National Geospatial-Intelligence Agency related
    'water-quality': 'Water-Quality',
    'opera_calval': 'OPERA-CalVal',
    'opera calval': 'OPERA-CalVal',
    'usgs': 'USGS',
    'noaa': 'NOAA',
}

# Maximum text length for updates (truncate very long ones)
MAX_UPDATE_LENGTH = 3000


def generate_update_id():
    """Generate a unique update ID"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_part = str(uuid.uuid4())[:4].upper()
    return f"UPD_{date_str}_{random_part}"


def normalize_solution_id(solution_id):
    """Normalize solution ID to canonical form"""
    if not solution_id or pd.isna(solution_id):
        return None
    lower = str(solution_id).lower().strip()
    return SOLUTION_ID_NORMALIZATION.get(lower, solution_id)


def clean_update_text(text):
    """Clean boilerplate and standardize formatting"""
    if not text or pd.isna(text):
        return ''

    text = str(text)

    # Remove common boilerplate patterns
    removals = [
        r'^\s*•\s*',  # Leading bullet
        r'^\s*○\s*',  # Leading circle
        r'^\s*■\s*',  # Leading square
        r'Action:\s*.*$',  # Action items (multiline)
        r'ACTION:\s*.*$',
        r'\[Action\].*$',
    ]

    for pattern in removals:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)

    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'^\s+', '', text)
    text = re.sub(r'\s+$', '', text)

    return text.strip()


def is_meaningful_update(text):
    """Check if update has real content"""
    if not text or len(text) < 30:
        return False

    text_lower = text.lower().strip()

    # Skip if mostly boilerplate or administrative notes
    skip_patterns = [
        r'^n/a\s*$',
        r'^none\s*$',
        r'^no\s+update\s*$',
        r'^tbd\s*$',
        r'^no\s+new\s+updates?\s*$',
        r'^\s*$',
        r'^air quality\s*\(gsfc\)',  # Header only
        r'^gmao\s*$',
        r'^pm2\.5\s*$',
        r'^pandora\s+sensors?\s*$',
        r'^poc:\s*',  # Point of contact lines
        r'^next\s+steps?:\s*wait',  # Waiting placeholders
        r'^next\s+deliverable.*:$',  # Empty deliverable lines
        r'^updates?\s+pending\s+',  # Pending updates
        r'^delay\s+this\s+',  # Delay notes
        r'^note:\s*\w+\s+on\s+leave',  # Leave notices
        r'^verify\s+data\s+input',  # Admin tasks
        r'^pi\s+objectives\s+review',  # Just headers
        r'deep\s+dive.*\d{1,2}[;:]\s*\d',  # Event scheduling
    ]

    for pattern in skip_patterns:
        if re.match(pattern, text_lower):
            return False

    return True


def consolidate_updates(df):
    """Consolidate multiple updates for same solution+date into one"""
    consolidated = []

    # Group by solution and date
    for (solution_id, meeting_date), group in df.groupby(['solution_id', 'meeting_date']):
        if pd.isna(solution_id) or not solution_id:
            continue

        # Normalize solution ID
        normalized_id = normalize_solution_id(solution_id)
        if not normalized_id:
            continue

        # Combine all update texts
        texts = []
        for _, row in group.iterrows():
            text = clean_update_text(row.get('update_text', ''))
            if text and is_meaningful_update(text):
                texts.append(text)

        if not texts:
            continue

        # Join with bullet points for readability
        if len(texts) == 1:
            combined_text = texts[0]
        else:
            combined_text = '\n'.join(f"• {t}" for t in texts)

        # Clean again after combining
        combined_text = clean_update_text(combined_text)

        if not is_meaningful_update(combined_text):
            continue

        # Truncate very long updates
        if len(combined_text) > MAX_UPDATE_LENGTH:
            combined_text = combined_text[:MAX_UPDATE_LENGTH] + '...[truncated]'

        # Use first row's metadata
        first_row = group.iloc[0]

        consolidated.append({
            'update_id': generate_update_id(),
            'solution_id': normalized_id,
            'update_text': combined_text,
            'source_document': first_row.get('source_document', 'Internal Planning'),
            'source_category': first_row.get('source_category', 'MO'),
            'source_url': first_row.get('source_url', ''),
            'source_tab': first_row.get('source_tab', ''),
            'meeting_date': meeting_date,
            'created_at': datetime.now().isoformat(),
            'created_by': 'weekly_consolidated_import'
        })

    return pd.DataFrame(consolidated)


def main():
    print("Consolidating and cleaning weekly internal planning updates...")
    print()

    # Load extracted updates
    if not INPUT_FILE.exists():
        print(f"Error: {INPUT_FILE} not found. Run extract_historical_updates.py first.")
        return

    df_raw = pd.read_csv(INPUT_FILE)
    print(f"Raw updates loaded: {len(df_raw)}")

    # Show raw solution distribution
    print("\nRaw solution IDs (before normalization):")
    raw_counts = df_raw['solution_id'].value_counts().head(10)
    for sol, count in raw_counts.items():
        print(f"  {sol}: {count}")

    print("\nConsolidating by solution + date...")
    df_consolidated = consolidate_updates(df_raw)

    # Keep only needed columns
    for col in KEEP_COLUMNS:
        if col not in df_consolidated.columns:
            df_consolidated[col] = ''

    df_consolidated = df_consolidated[KEEP_COLUMNS]

    # Sort by date descending, then solution
    df_consolidated['meeting_date'] = pd.to_datetime(df_consolidated['meeting_date'], errors='coerce')
    df_consolidated = df_consolidated.sort_values(['meeting_date', 'solution_id'], ascending=[False, True])
    df_consolidated['meeting_date'] = df_consolidated['meeting_date'].dt.strftime('%Y-%m-%d')

    # Remove rows with invalid dates
    df_consolidated = df_consolidated[df_consolidated['meeting_date'].notna()]

    print(f"\nAfter consolidation: {len(df_consolidated)} updates")

    # Stats
    by_solution = df_consolidated['solution_id'].value_counts()
    print(f"Unique solutions: {len(by_solution)}")
    print("\nTop 20 solutions by update count:")
    for sol, count in by_solution.head(20).items():
        print(f"  {sol}: {count}")

    # Verify consolidation worked
    grouped = df_consolidated.groupby(['solution_id', 'meeting_date']).size()
    print(f"\nUpdates per solution per meeting: always {grouped.max()} (consolidated)")

    # Text length stats
    df_consolidated['_len'] = df_consolidated['update_text'].str.len()
    print(f"\nText length: min={df_consolidated['_len'].min()}, median={df_consolidated['_len'].median():.0f}, max={df_consolidated['_len'].max()}")

    short = df_consolidated[df_consolidated['_len'] < 50]
    print(f"Short updates (<50 chars): {len(short)}")

    df_consolidated = df_consolidated.drop('_len', axis=1)

    # Date range
    dates = pd.to_datetime(df_consolidated['meeting_date'], errors='coerce')
    print(f"Date range: {dates.min().strftime('%Y-%m-%d')} to {dates.max().strftime('%Y-%m-%d')}")

    # Write to Excel
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        df_consolidated.to_excel(writer, sheet_name='Updates', index=False)

        # Auto-adjust column widths
        worksheet = writer.sheets['Updates']
        for idx, col in enumerate(df_consolidated.columns):
            max_length = max(
                df_consolidated[col].astype(str).map(len).max(),
                len(col)
            )
            adjusted_width = min(max_length + 2, 60)
            col_letter = chr(65 + idx) if idx < 26 else f"A{chr(65 + idx - 26)}"
            worksheet.column_dimensions[col_letter].width = adjusted_width

    print(f"\nConsolidated file written to: {OUTPUT_FILE}")


if __name__ == '__main__':
    main()
