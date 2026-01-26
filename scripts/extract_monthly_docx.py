# -*- coding: utf-8 -*-
"""
Extract Monthly Solution Updates from Word Documents (FY21-FY23)
=================================================================
Parses .docx files from Monthly Project Status Updates folder.
These older files use paragraph-based format (not tables).
Maps solution names to core_ids using MO-DB_Solutions database.
Outputs a CSV for import to MO-DB_Updates.

Usage: python extract_monthly_docx.py
"""

import docx
from docx.oxml.ns import qn
from pathlib import Path
import pandas as pd
import csv
import re
from datetime import datetime
import uuid

# Configuration
BASE_PATH = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\source-archives\Monthly Project Status Updates")
SOLUTIONS_PATH = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\MO-Viewer Databases\MO-DB_Solutions.xlsx")
OUTPUT_PATH = Path(r"C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\monthly_docx_updates_import.csv")

# CSV columns matching MO-DB_Updates
CSV_HEADERS = [
    'update_id', 'solution_id', 'update_text', 'source_document',
    'source_category', 'source_url', 'source_tab', 'meeting_date',
    'created_at', 'created_by'
]

# Known solution patterns for identification
SOLUTION_PATTERNS = [
    # Pattern: "Solution Name- Presenter" or "Solution Name - Presenter"
    r'^(HLS|Harmonized Landsat Sentinel[- ]?2?)\s*[-–—]\s*(.+)$',
    r'^(DCD|Data Curation for Discovery)\s*[-–—]\s*(.+)$',
    r'^(ADMG|Airborne Data Management Group)\s*[-–—]\s*(.+)$',
    r'^(ESDIS)\s*[-–—]\s*(.+)$',
    r'^(LANCE)\s*[-–—]\s*(.+)$',
    r'^(FIRMS)\s*[-–—]\s*(.+)$',
    r'^(OPERA)\s*[-–—]\s*(.+)$',
    r'^(DSWx)\s*[-–—]\s*(.+)$',
    r'^(DIST)\s*[-–—]\s*(.+)$',
    r'^(DISP)\s*[-–—]\s*(.+)$',
    r'^(ICESat-2|ICESAT-2|ICESat2)\s*[-–—]\s*(.+)$',
    r'^(CSDA)\s*[-–—]\s*(.+)$',
    r'^(GABAN|Global Algal Bloom)\s*[-–—]\s*(.+)$',
    r'^(VLM|Vertical Land Motion)\s*[-–—]\s*(.+)$',
    r'^(PBL|Planetary Boundary Layer)\s*[-–—]\s*(.+)$',
    r'^(TEMPO)\s*[-–—]\s*(.+)$',
    r'^(Internet of Animals|IoA)\s*[-–—]\s*(.+)$',
    r'^(Air Quality)\s*[-–—]\s*(.+)$',
    r'^(MWoW|Multi-sensor Water Quality)\s*[-–—]\s*(.+)$',
    r'^(Management Office|SNWG MO|MO)\s*[-–—]\s*(.+)$',
    # Pattern with parentheses: "Solution (details) - Presenter"
    r'^([A-Z][A-Za-z0-9\-]+(?:\s+\([^)]+\))?)\s*[-–—]\s*([A-Z][a-z]+.*)$',
]

# Solution name to core_id mapping
SOLUTION_ALIASES = {
    'hls': 'HLS',
    'harmonized landsat sentinel': 'HLS',
    'harmonized landsat sentinel-2': 'HLS',
    'harmonized landsat sentinel 2': 'HLS',
    'dcd': 'DCD',
    'data curation for discovery': 'DCD',
    'admg': 'ADMG',
    'airborne data management group': 'ADMG',
    'esdis': 'ESDIS',
    'lance': 'LANCE',
    'firms': 'FIRMS',
    'opera': 'OPERA',
    'dswx': 'DSWx',
    'dist': 'DIST',
    'disp': 'DISP',
    'icesat-2': 'ICESat-2',
    'icesat2': 'ICESat-2',
    'csda': 'CSDA',
    'gaban': 'GABAN',
    'global algal bloom': 'GABAN',
    'vlm': 'VLM',
    'vertical land motion': 'VLM',
    'pbl': 'PBL',
    'planetary boundary layer': 'PBL',
    'tempo': 'TEMPO',
    'tempo nrt': 'TEMPO-NRT',
    'internet of animals': 'IoA',
    'ioa': 'IoA',
    'air quality': 'Air-Quality',
    'mwow': 'MWoW',
    'multi-sensor water quality': 'MWoW',
    'management office': 'SNWG-MO',
    'snwg mo': 'SNWG-MO',
    'mo': 'SNWG-MO',
    'snwg management office': 'SNWG-MO',
}

# Lines to skip (headers, agenda items, etc.)
SKIP_PATTERNS = [
    r'^SNWG Monthly Meeting',
    r'^AGENDA:?$',
    r'^Moderator',
    r'^Recording',
    r'^Previous Meeting Notes',
    r'^I\.\s+Introduction',
    r'^II\.\s+Verbal Status',
    r'^III\.',
    r'^IV\.',
    r'^Cycle\s+\d+',
    r'^\d+\.\s+(Introduction|Meeting Series)',
    r'^Announcements:?$',
    r'^Notes on Open Source',
    r'^Quick Verbal Status',
    r'^Action:',
    r'^ACTION:',
]


def generate_update_id():
    """Generate a unique update ID"""
    date_str = datetime.now().strftime('%Y%m%d')
    random_part = str(uuid.uuid4())[:4].upper()
    return f"UPD_{date_str}_{random_part}"


# Post-processing normalization for solution IDs
SOLUTION_ID_NORMALIZATION = {
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
    'aq_pandora': 'AQ-Pandora',
    'aq_pandora-ongoing': 'AQ-Pandora',
    'aq_pm2.5': 'AQ-PM2.5',
    'aq_gmao': 'AQ-GMAO',
    'air-quality': 'Air-Quality',
    'nisar_dl': 'NISAR-DL',
}


def normalize_solution_id(solution_id):
    """Normalize solution ID to canonical form"""
    if not solution_id:
        return solution_id
    lower = solution_id.lower().strip()
    return SOLUTION_ID_NORMALIZATION.get(lower, solution_id)


def build_solution_mapping():
    """Build mapping from solution names/aliases to core_ids"""
    try:
        df = pd.read_excel(SOLUTIONS_PATH)
        mapping = {}

        for _, row in df.iterrows():
            core_id = str(row.get('core_id', '')).strip()
            if not core_id or core_id == 'nan':
                continue

            official_name = str(row.get('core_official_name', '')).strip()
            alternates = str(row.get('core_alternate_names', '')).strip()

            # Add official name
            if official_name and official_name != 'nan':
                mapping[official_name.lower()] = core_id
                clean = re.sub(r'\s*\([^)]+\)\s*', '', official_name).strip()
                if clean:
                    mapping[clean.lower()] = core_id

            mapping[core_id.lower()] = core_id

            if alternates and alternates != 'nan':
                for alt in re.split(r'[|,]', alternates):
                    alt = alt.strip()
                    if alt:
                        mapping[alt.lower()] = core_id
    except Exception as e:
        print(f"Warning: Could not load solutions database: {e}")
        mapping = {}

    # Add manual aliases
    for alias, core_id in SOLUTION_ALIASES.items():
        mapping[alias.lower()] = core_id

    return mapping


def find_core_id(text, solution_mapping):
    """Find core_id for a solution name"""
    if not text:
        return None

    text_clean = text.strip().lower()

    # Direct match
    if text_clean in solution_mapping:
        return solution_mapping[text_clean]

    # Without parenthetical
    no_paren = re.sub(r'\s*\([^)]+\)\s*$', '', text_clean).strip()
    if no_paren in solution_mapping:
        return solution_mapping[no_paren]

    # Partial matches
    for name, core_id in solution_mapping.items():
        if name in text_clean or text_clean in name:
            return core_id

    return None


def extract_date_from_filename(filename):
    """Extract meeting date from filename like '2021-05-10 SNWG Monthly...'"""
    match = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        return match.group(1)
    return None


def should_skip_line(text):
    """Check if line should be skipped"""
    if not text or len(text.strip()) < 5:
        return True

    text_stripped = text.strip()

    for pattern in SKIP_PATTERNS:
        if re.match(pattern, text_stripped, re.IGNORECASE):
            return True

    # Skip date-only lines
    if re.match(r'^[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}', text_stripped):
        return True
    if re.match(r'^\d{1,2}:\d{2}\s*(AM|PM|CT|ET|PT)', text_stripped, re.IGNORECASE):
        return True

    return False


def is_solution_header(text, solution_mapping):
    """Check if text is a solution header and extract solution name"""
    if not text:
        return None, None

    text_stripped = text.strip()

    # Try each pattern
    for pattern in SOLUTION_PATTERNS:
        match = re.match(pattern, text_stripped, re.IGNORECASE)
        if match:
            solution_name = match.group(1).strip()
            presenter = match.group(2).strip() if len(match.groups()) > 1 else None
            core_id = find_core_id(solution_name, solution_mapping)
            if core_id:
                return core_id, presenter

    # Try direct lookup for lines that might be solution names
    words = text_stripped.split()
    if len(words) <= 5:  # Short lines might be solution names
        for i in range(len(words), 0, -1):
            candidate = ' '.join(words[:i])
            core_id = find_core_id(candidate, solution_mapping)
            if core_id:
                presenter = ' '.join(words[i:]).strip('- ') if i < len(words) else None
                return core_id, presenter

    return None, None


def parse_document(doc_path, solution_mapping):
    """Parse a Word document and extract updates"""
    try:
        doc = docx.Document(doc_path)
    except Exception as e:
        print(f"  Error opening {doc_path.name}: {e}")
        return []

    meeting_date = extract_date_from_filename(doc_path.name)
    updates = []

    current_solution = None
    current_updates = []

    for para in doc.paragraphs:
        text = para.text.strip()

        if should_skip_line(text):
            continue

        # Check if this is a solution header
        solution_id, presenter = is_solution_header(text, solution_mapping)

        if solution_id:
            # Save previous solution's updates
            if current_solution and current_updates:
                combined_text = '\n'.join(current_updates)
                if len(combined_text) >= 20:
                    updates.append({
                        'update_id': generate_update_id(),
                        'solution_id': normalize_solution_id(current_solution),
                        'update_text': combined_text,
                        'source_document': 'Monthly Status Meeting',
                        'source_category': 'MO',
                        'source_url': '',
                        'source_tab': doc_path.name,
                        'meeting_date': meeting_date,
                        'created_at': datetime.now().isoformat(),
                        'created_by': 'monthly_docx_import'
                    })

            # Start new solution
            current_solution = solution_id
            current_updates = []
        elif current_solution:
            # This is content under the current solution
            if len(text) >= 10:
                # Clean up bullet characters
                text = re.sub(r'^[\s•○●▪◦\-–—]\s*', '', text)
                if text:
                    current_updates.append(text)

    # Don't forget the last solution
    if current_solution and current_updates:
        combined_text = '\n'.join(current_updates)
        if len(combined_text) >= 20:
            updates.append({
                'update_id': generate_update_id(),
                'solution_id': normalize_solution_id(current_solution),
                'update_text': combined_text,
                'source_document': 'Monthly Status Meeting',
                'source_category': 'MO',
                'source_url': '',
                'source_tab': doc_path.name,
                'meeting_date': meeting_date,
                'created_at': datetime.now().isoformat(),
                'created_by': 'monthly_docx_import'
            })

    return updates


def main():
    all_updates = []
    files_processed = 0

    print("Building solution name to core_id mapping...")
    solution_mapping = build_solution_mapping()
    print(f"  Loaded {len(solution_mapping)} name/alias mappings")
    print()

    print("Extracting monthly updates from Word documents...")
    print(f"Base path: {BASE_PATH}")
    print()

    # Process FY folders that have .docx files
    for fy_folder in ['FY21', 'FY22', 'FY23']:
        folder_path = BASE_PATH / fy_folder
        if not folder_path.exists():
            continue

        docx_files = list(folder_path.glob("*.docx"))
        if not docx_files:
            continue

        print(f"Processing {fy_folder} ({len(docx_files)} files)...")
        fy_updates = 0

        for doc_file in sorted(docx_files):
            # Skip biweekly meeting notes (different format)
            if 'biweekly' in doc_file.name.lower():
                continue

            updates = parse_document(doc_file, solution_mapping)
            if updates:
                fy_updates += len(updates)
                all_updates.extend(updates)
            files_processed += 1

        print(f"  Found {fy_updates} updates from {fy_folder}")

    print()
    print("=" * 60)
    print(f"Total files processed: {files_processed}")
    print(f"Total updates found: {len(all_updates)}")

    # Count by solution
    by_solution = {}
    for u in all_updates:
        sol = u['solution_id']
        by_solution[sol] = by_solution.get(sol, 0) + 1

    print(f"Unique solutions: {len(by_solution)}")
    print("\nTop solutions by update count:")
    for sol, count in sorted(by_solution.items(), key=lambda x: -x[1])[:15]:
        print(f"  {sol}: {count}")

    # Count by date
    by_date = {}
    for u in all_updates:
        date = u.get('meeting_date', 'Unknown')
        by_date[date] = by_date.get(date, 0) + 1

    print(f"\nUpdates by meeting date:")
    for date, count in sorted(by_date.items()):
        print(f"  {date}: {count}")

    # Write CSV
    if all_updates:
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
            writer.writeheader()
            writer.writerows(all_updates)
        print(f"\nCSV written to: {OUTPUT_PATH}")
    else:
        print("\nNo updates found to export.")


if __name__ == '__main__':
    main()
