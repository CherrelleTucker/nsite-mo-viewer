# -*- coding: utf-8 -*-
"""
Extract Meeting Note References from File Log
==============================================
Creates simple update entries for meeting notes with just the linked file title.
No content extraction - just date + linked title.

Usage: python extract_meeting_references.py
"""

import pandas as pd
import re
from pathlib import Path
from datetime import datetime
import uuid

# Input/Output
FILE_LOG = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\source-archives\file log - Sheet1.csv")
OUTPUT_FILE = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\meeting_references_import.xlsx")

# CSV columns (based on file structure)
# File Title, Document Title, Programmatic?, Working/Notes?, doc_id, mime_type, parent_id, ..., Template?

# Keywords that indicate meeting notes
MEETING_KEYWORDS = [
    'meeting', 'notes', 'deep dive', 'lunch', 'tag-up', 'tagup', 'tag up',
    'kickoff', 'kick-off', 'kick off', 'workshop', 'discussion',
    'stakeholder meeting', 'review meeting', 'brainstorm'
]

# Skip these patterns (already processed or not useful)
SKIP_PATTERNS = [
    r'Weekly Internal Planning Meeting_NSITE',  # Already in weekly extraction
    r'Weekly SEP Meeting',  # Already in SEP extraction
    r'Monthly.*Status.*Meeting',  # Already in monthly extraction
    r'template',
    r'Template',
    r'YYYY-MM-DD',  # Templates
    r'Agendas & Meeting Notes',  # Folder shortcuts
    r'recording\.mp4',
    r'Recording\.mp4',
    r'\.mp4$',
    r'\.pdf$',
    r'shortcut',
]

# Solution ID patterns to extract from filename
SOLUTION_PATTERNS = {
    'HLS': r'\bHLS\b',
    'HLS-LL': r'\bHLS[- ]?LL\b',
    'HLS-VI': r'\bHLS[- ]?VI\b',
    'PBL': r'\bPBL\b',
    'OPERA': r'\bOPERA\b',
    'TEMPO': r'\bTEMPO\b',
    'TEMPO-NRT': r'\bTEMPO[- ]?NRT\b',
    'TEMPO-NRT-Enhanced': r'\bTEMPO[- ]?E\b',
    'ICESat-2': r'\bICESat-?2\b',
    'GABAN': r'\bGABAN\b',
    'IoA': r'\bIoA\b|Internet of Animals',
    'GACR': r'\bGACR\b',
    'GCC': r'\bGCC\b',
    'NISAR-SM': r'\bNISAR[- ]?SM\b',
    'NISAR-DL': r'\bNISAR[- ]?DL\b',
    'MWoW': r'\bMWoW\b|Multi-?sensor Water',
    'DSWx': r'\bDSWx\b',
    'DIST': r'\bDIST\b',
    'DISP': r'\bDISP\b',
    'VLM': r'\bVLM\b',
    'ADMG': r'\bADMG\b',
    'DCD': r'\bDCD\b',
    'CSDA': r'\bCSDA\b',
    'ESDIS': r'\bESDIS\b',
    'LANCE': r'\bLANCE\b',
    'FIRMS': r'\bFIRMS\b',
    'Air-Quality': r'Air Quality|AQ[_-]',
    'AQ-Pandora': r'Pandora',
    'AQ-PM2.5': r'PM2\.?5',
    'AQ-GMAO': r'GMAO',
    'Water-Quality': r'Water Quality|WQ\b',
    'SPoRT': r'\bSPoRT\b',
    'OpenET': r'\bOpenET\b',
    'RS-Training': r'RS Training|Remote Sensing Training',
    'SNWG-MO': r'SNWG MO|NSITE MO|Management Office',
}


def generate_update_id():
    """Generate a unique update ID"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_part = str(uuid.uuid4())[:4].upper()
    return f"UPD_{date_str}_{random_part}"


def extract_date_from_text(text):
    """Extract date from filename or title"""
    if not text:
        return None, None

    text = str(text)

    # Pattern: YYYY-MM-DD at start
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', text)
    if match:
        try:
            year = int(match.group(1))
            month = int(match.group(2))
            day = int(match.group(3))
            if 2018 <= year <= 2027 and 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year}-{month:02d}-{day:02d}", year
        except:
            pass

    # Pattern: MM-DD-YYYY or MM/DD/YYYY
    match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', text)
    if match:
        try:
            month = int(match.group(1))
            day = int(match.group(2))
            year = int(match.group(3))
            if 2018 <= year <= 2027 and 1 <= month <= 12 and 1 <= day <= 31:
                return f"{year}-{month:02d}-{day:02d}", year
        except:
            pass

    # Pattern: just YYYY (use as year only)
    match = re.search(r'\b(202[0-6])\b', text)
    if match:
        year = int(match.group(1))
        return f"{year}-01-01", year  # Default to Jan 1 of that year

    return None, None


def extract_solution_id(text):
    """Extract solution ID from filename"""
    if not text:
        return 'SNWG-MO'  # Default

    text = str(text)

    # Check each pattern
    for solution_id, pattern in SOLUTION_PATTERNS.items():
        if re.search(pattern, text, re.IGNORECASE):
            return solution_id

    return 'SNWG-MO'  # Default for general meeting notes


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


def is_meeting_note(file_title, doc_title):
    """Check if file is a meeting note based on title"""
    combined = f"{file_title or ''} {doc_title or ''}".lower()

    # Must contain a meeting keyword
    has_keyword = any(kw in combined for kw in MEETING_KEYWORDS)
    if not has_keyword:
        return False

    # Must not match skip patterns
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, f"{file_title or ''} {doc_title or ''}", re.IGNORECASE):
            return False

    return True


def main():
    print("Extracting meeting note references from file log...")
    print()

    # Load file log
    df = pd.read_csv(FILE_LOG, header=0)

    # Get column names
    cols = df.columns.tolist()
    print(f"Columns: {cols[:7]}...")

    # Rename columns for easier access
    df.columns = ['file_title', 'doc_title', 'is_programmatic', 'is_working',
                  'doc_id', 'mime_type', 'parent_id'] + list(df.columns[7:])

    print(f"Total files in log: {len(df)}")

    # Filter for meeting notes
    meeting_notes = []

    for _, row in df.iterrows():
        file_title = row.get('file_title', '')
        doc_title = row.get('doc_title', '')
        doc_id = row.get('doc_id', '')
        mime_type = row.get('mime_type', '')

        # Skip shortcuts
        if 'shortcut' in str(mime_type).lower():
            continue

        # Skip non-document types
        if not any(t in str(mime_type).lower() for t in ['document', 'spreadsheet', 'presentation']):
            continue

        # Check if it's a meeting note
        if not is_meeting_note(file_title, doc_title):
            continue

        # Extract info
        combined_title = file_title if file_title else doc_title
        meeting_date, year = extract_date_from_text(combined_title)
        solution_id = extract_solution_id(combined_title)
        url = build_url(doc_id, mime_type)

        if not meeting_date:
            # Try doc_title for date
            meeting_date, year = extract_date_from_text(doc_title)

        if not meeting_date:
            continue  # Skip if no date found

        # Create update text as linked title
        update_text = f"[{combined_title}]({url})" if url else combined_title

        meeting_notes.append({
            'update_id': generate_update_id(),
            'solution_id': solution_id,
            'update_text': update_text,
            'source_document': 'File Log Reference',
            'source_category': 'Meeting Notes',
            'source_url': url,
            'source_tab': '',
            'meeting_date': meeting_date,
            'created_at': datetime.now().isoformat(),
            'created_by': 'file_log_reference_import',
            '_year': year
        })

    print(f"Meeting notes found: {len(meeting_notes)}")

    if not meeting_notes:
        print("No meeting notes found!")
        return

    df_notes = pd.DataFrame(meeting_notes)

    # Stats
    print("\nBy solution:")
    by_solution = df_notes['solution_id'].value_counts()
    for sol, count in by_solution.head(15).items():
        print(f"  {sol}: {count}")

    print("\nBy year:")
    by_year = df_notes['_year'].value_counts().sort_index(ascending=False)
    for year, count in by_year.items():
        print(f"  {int(year)}: {count}")

    # Split by year
    df_2026 = df_notes[df_notes['_year'] == 2026].copy()
    df_2025 = df_notes[df_notes['_year'] == 2025].copy()
    df_2024 = df_notes[df_notes['_year'] == 2024].copy()
    df_archive = df_notes[df_notes['_year'] < 2024].copy()

    # Remove helper column
    keep_cols = ['update_id', 'solution_id', 'update_text', 'source_document',
                 'source_category', 'source_url', 'source_tab', 'meeting_date',
                 'created_at', 'created_by']

    for df_year in [df_2026, df_2025, df_2024, df_archive]:
        if '_year' in df_year.columns:
            df_year.drop('_year', axis=1, inplace=True)

    df_2026 = df_2026[keep_cols] if len(df_2026) > 0 else pd.DataFrame(columns=keep_cols)
    df_2025 = df_2025[keep_cols] if len(df_2025) > 0 else pd.DataFrame(columns=keep_cols)
    df_2024 = df_2024[keep_cols] if len(df_2024) > 0 else pd.DataFrame(columns=keep_cols)
    df_archive = df_archive[keep_cols] if len(df_archive) > 0 else pd.DataFrame(columns=keep_cols)

    print(f"\nFinal counts:")
    print(f"  2026: {len(df_2026)}")
    print(f"  2025: {len(df_2025)}")
    print(f"  2024: {len(df_2024)}")
    print(f"  Archive: {len(df_archive)}")

    # Write to Excel
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        df_2026.to_excel(writer, sheet_name='2026', index=False)
        df_2025.to_excel(writer, sheet_name='2025', index=False)
        df_2024.to_excel(writer, sheet_name='2024', index=False)
        df_archive.to_excel(writer, sheet_name='Archive', index=False)

    print(f"\nMeeting references written to: {OUTPUT_FILE}")

    # Show sample entries
    print("\nSample entries:")
    for _, row in df_notes.head(5).iterrows():
        print(f"  {row['meeting_date']} | {row['solution_id']} | {row['update_text'][:60]}...")


if __name__ == '__main__':
    main()
