# -*- coding: utf-8 -*-
"""
Combine and Clean Monthly Updates from PowerPoint and Word Documents
======================================================================
Merges updates, consolidates by solution+date, removes boilerplate.

Usage: python combine_monthly_updates.py
"""

import pandas as pd
import re
from pathlib import Path
import uuid
from datetime import datetime

# Input files
PPTX_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\monthly_updates_import.xlsx")
DOCX_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\monthly_docx_updates_import.csv")

# Output file
OUTPUT_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\monthly_updates_combined.xlsx")

# Columns to keep (matching MO-DB_Updates schema)
KEEP_COLUMNS = [
    'update_id', 'solution_id', 'update_text', 'source_document',
    'source_category', 'source_url', 'source_tab', 'meeting_date',
    'created_at', 'created_by'
]


def generate_update_id():
    """Generate a unique update ID"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_part = str(uuid.uuid4())[:4].upper()
    return f"UPD_{date_str}_{random_part}"


def clean_update_text(text):
    """Clean boilerplate and standardize formatting"""
    if not text or pd.isna(text):
        return ''

    text = str(text)

    # Remove common boilerplate patterns
    removals = [
        r'Project Status\s*\n?',
        r'Project Phase:\s*(Operations|Implementation|Planning|Development|Production \+ Development)\s*\n?',
        r'Project Description\s*\n?',
        r'Solution Products?\s*\(acronyms and definitions\):\s*',
        r'Solution Products?:\s*\n?',
        # Clean up the long question headers (various formats)
        r'What have I done to ensure that my solution is the right fit for end users and/or is achieving its intended impact\?[^\n]*\n?',
        r'What have I done to ensure that my solution is the right fit[^\n]*\n?',
        r'What programmatic/project timeline milestones have occurred this month\?\s*\n?',
        r'What software/hardware/location/product development milestones have occurred this month\?\s*\n?',
        r'The SNWG MO can help me with this roadblock or challenge:\s*\n?',
        # Simplified versions with markdown
        r'\*\*What have I done.*?\*\*\s*\n?',
        r'\*\*What programmatic.*?\*\*\s*\n?',
        r'\*\*What software.*?\*\*\s*\n?',
        r'\*\*The SNWG MO can help.*?\*\*\s*\n?',
        # Without markdown
        r'What have I done to ensure[^\n]*\?\s*\n?',
        r'What programmatic[^\n]*\?\s*\n?',
        r'What software[^\n]*\?\s*\n?',
        r'Production status\?\s*\n?',
        # Other boilerplate
        r'\(e\.?g\.?,?\s*user engagement[^\)]*\)\s*\n?',
        r'products?\s*\(acronyms and definitions\):\s*If needed\s*\n?',
        r'/Implementation\s*\n?',
        r'/Operations\s*\n?',
        r'Provided by the SNWG MO\s*\n?',
        r'^Today\s*\n?',
    ]

    for pattern in removals:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'^\s+', '', text)
    text = re.sub(r'\s+$', '', text)

    return text.strip()


def is_meaningful_update(text):
    """Check if update has real content"""
    if not text or len(text) < 30:
        return False

    # Skip if mostly boilerplate
    boilerplate_only = [
        r'^n/a\s*$',
        r'^none\s*$',
        r'^no\s+update\s*$',
        r'^tbd\s*$',
        r'^operations\s*$',
        r'^provided\s+by\s+the\s+snwg',
        r'^today\s*$',
    ]

    text_lower = text.lower().strip()
    for pattern in boilerplate_only:
        if re.match(pattern, text_lower):
            return False

    return True


def consolidate_updates(df):
    """Consolidate multiple updates for same solution+date into one"""
    consolidated = []

    # Group by solution and date
    for (solution_id, meeting_date), group in df.groupby(['solution_id', 'meeting_date']):
        # Combine all update texts
        texts = []
        for _, row in group.iterrows():
            text = clean_update_text(row['update_text'])
            if text and is_meaningful_update(text):
                texts.append(text)

        if not texts:
            continue

        # Join with separator
        combined_text = '\n\n'.join(texts)

        # Clean again after combining
        combined_text = clean_update_text(combined_text)

        if not is_meaningful_update(combined_text):
            continue

        # Use first row's metadata
        first_row = group.iloc[0]

        consolidated.append({
            'update_id': generate_update_id(),
            'solution_id': solution_id,
            'update_text': combined_text,
            'source_document': first_row.get('source_document', 'Monthly Status Meeting'),
            'source_category': first_row.get('source_category', 'MO'),
            'source_url': first_row.get('source_url', ''),
            'source_tab': first_row.get('source_tab', ''),
            'meeting_date': meeting_date,
            'created_at': datetime.now().isoformat(),
            'created_by': 'monthly_consolidated_import'
        })

    return pd.DataFrame(consolidated)


def main():
    print("Combining and cleaning monthly updates...")
    print()

    # Load PowerPoint updates
    if PPTX_FILE.exists():
        df_pptx = pd.read_excel(PPTX_FILE)
        print(f"PowerPoint updates (raw): {len(df_pptx)}")
    else:
        print(f"Warning: {PPTX_FILE} not found")
        df_pptx = pd.DataFrame()

    # Load Word document updates
    if DOCX_FILE.exists():
        df_docx = pd.read_csv(DOCX_FILE)
        print(f"Word document updates (raw): {len(df_docx)}")
    else:
        print(f"Warning: {DOCX_FILE} not found")
        df_docx = pd.DataFrame()

    # Combine raw data
    df_raw = pd.concat([df_pptx, df_docx], ignore_index=True)
    print(f"Combined raw: {len(df_raw)}")
    print()

    # Consolidate by solution+date
    print("Consolidating by solution + date...")
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

    print(f"After consolidation: {len(df_consolidated)} updates")

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
