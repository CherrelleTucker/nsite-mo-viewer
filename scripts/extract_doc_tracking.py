#!/usr/bin/env python3
"""
Extract Document Tracking Data
==============================
Extracts document status from Doc Tracking and SNWG MO Cycles sheets.
Generates CSV with document completion status for each solution.
"""

import pandas as pd
from pathlib import Path
import sys
import re
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Name mappings - more specific patterns first
NAME_MAPPINGS = {
    # Specific HLS variants (check these BEFORE generic HLS)
    'hls low latency': 'HLS-LL',
    'global hls derived vegetation': 'HLS-VI',
    'opera release 1': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera dswx - hls': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',

    # Air Quality variants
    'air quality forecasts pandora': 'Air Quality - Pandora Sensors',
    'air quality forecasts - pandora': 'Air Quality - Pandora Sensors',
    'air quality pandora': 'Air Quality - Pandora Sensors',
    'air quality - pandora': 'Air Quality - Pandora Sensors',
    'pandora sensors': 'Air Quality - Pandora Sensors',
    'air quality forecasts pm2.5': 'Air Quality - PM2.5',
    'air quality forecasts - pm2.5': 'Air Quality - PM2.5',
    'air quality pm2.5': 'Air Quality - PM2.5',
    'air quality - pm2.5': 'Air Quality - PM2.5',
    'pm2.5': 'Air Quality - PM2.5',
    'air quality forecasts gmao': 'Air Quality - GMAO',
    'air quality forecasts - gmao': 'Air Quality - GMAO',
    'air quality gmao': 'Air Quality - GMAO',
    'air quality - gmao': 'Air Quality - GMAO',

    # Cycle 1
    'airborne data management group': 'ADMG',
    'admg': 'ADMG',
    'data curation for discovery': 'DCD',
    'dcd': 'DCD',
    'nisar downlink': 'NISAR Downlink',

    # Cycle 2
    'freeboard': 'ICESat-2 QuickLooks',
    'icethickness': 'ICESat-2 QuickLooks',
    'icesat-2': 'ICESat-2 QuickLooks',
    'gacr': 'GACR',
    'geos-5 atmospheric': 'GACR',
    'gcc from satcorps': 'GCC from SatCORPS',
    'global cloud composite': 'GCC from SatCORPS',
    'satcorps': 'GCC from SatCORPS',
    'internet of animals': 'Internet of Animals',
    'animal tracking': 'Internet of Animals',
    'nisar sm': 'NISAR SM',
    'nisar soil moisture': 'NISAR SM',
    'opera release 2': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera rtc-s1': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera release 3 - disp': 'OPERA Release 3 - DISP-S1',
    'opera release 3 - dswx': 'OPERA Release 3 - DSWx-S1',
    'opera release 4': 'OPERA Release 4 - DSWx-NI',
    'opera release 5': 'OPERA Release 5 - CSLC-NI and DISP-NI',
    'opera release 6': 'OPERA Release 6 - DIST-S1',
    'water quality': 'Water Quality Products',

    # Cycle 3
    'pbl gnss-ro': 'PBL',
    'pbl gnss ro': 'PBL',
    'tempo nrt': 'TEMPO NRT',

    # Cycle 4
    'global algal blooms': 'GABAN',
    'gaban': 'GABAN',
    'mwow': 'MWOW',
    'tempo enhanced': 'TEMPO Enhanced',
    'vertical land motion': 'Vertical Land Motion (VLM)',
    'vlm': 'Vertical Land Motion (VLM)',

    # Generic HLS (check LAST)
    'harmonized landsat sentinel': 'HLS',
    'harmonized landsat and sentinel': 'HLS',
}


def normalize_name(name):
    if pd.isna(name):
        return ''
    result = str(name).strip().lower()
    result = result.replace('(', '').replace(')', '').replace('-', ' ').replace('_', ' ')
    # Collapse multiple spaces
    result = ' '.join(result.split())
    return result


def find_db_name(ql_name, db_names):
    if pd.isna(ql_name):
        return None
    norm = normalize_name(ql_name)
    norm = re.sub(r'^cycle \d+\s*', '', norm).strip()

    # Check mappings in order (specific patterns first due to dict ordering in Python 3.7+)
    for pattern, target in NAME_MAPPINGS.items():
        if pattern in norm:
            if target in db_names:
                return target

    # Exact match
    for db_name in db_names:
        if normalize_name(db_name) == norm:
            return db_name

    # Substring match - but be careful with short names
    for db_name in db_names:
        db_norm = normalize_name(db_name)
        # Only match if it's a significant portion
        if len(db_norm) > 3 and (db_norm in norm or norm in db_norm):
            return db_name

    return None


def count_filled(record):
    """Count non-empty fields in a record."""
    count = 0
    for k, v in record.items():
        if v and str(v).strip() and str(v).strip() not in ['Pending', 'N/A']:
            count += 1
    return count


def parse_doc_status(val):
    """Parse document status/completion value."""
    if pd.isna(val):
        return ''
    val = str(val).strip()

    # Check for URL (considered complete)
    if val.startswith('http') or 'drive.google' in val.lower() or 'docs.google' in val.lower():
        return 'Complete (has URL)'

    val_upper = val.upper()

    if val_upper in ['X', 'COMPLETE', 'COMPLETED', 'DONE', 'YES', '✓', '✔']:
        return 'Complete'
    if val_upper in ['IN WORK', 'IN PROGRESS', 'WORKING', 'WIP', 'IN-WORK']:
        return 'In Progress'
    if val_upper in ['TBD', 'PENDING', 'NOT STARTED', 'FUTURE']:
        return 'Pending'
    if val_upper in ['N/A', 'NA', '-', 'NOT APPLICABLE']:
        return 'N/A'

    # If it has content, assume it's a note or partial status
    if val.strip():
        return f'Note: {val[:30]}'

    return ''


def main():
    base_dir = Path(__file__).parent.parent.parent
    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'
    output_path = base_dir / 'nsite-mo-viewer' / 'scripts' / 'DOC_TRACKING_IMPORT.csv'

    print("=" * 80)
    print("EXTRACTING DOCUMENT TRACKING DATA")
    print("=" * 80)

    # Read current database for solution names
    db_df = pd.read_excel(solutions_path)
    db_names = db_df['name'].dropna().tolist()
    print(f"\nDatabase has {len(db_names)} solutions")

    # =========================================================================
    # Parse Doc Tracking Sheet
    # =========================================================================
    print("\n--- Doc Tracking Sheet ---")
    doc_df = pd.read_excel(quicklook_path, sheet_name='Doc Tracking', header=None)

    # Row 2 has the document headers
    doc_headers = doc_df.iloc[2].tolist()
    print(f"Document headers found: {[h for h in doc_headers if pd.notna(h) and str(h).strip()]}")

    # Map column indices to document types
    doc_col_map = {}
    for idx, header in enumerate(doc_headers):
        if pd.isna(header):
            continue
        h = str(header).strip().lower()
        if 'science sow' in h:
            doc_col_map['science_sow'] = idx
        elif 'hq kickoff' in h:
            doc_col_map['hq_kickoff_charts'] = idx
        elif 'solution kickoff' in h:
            doc_col_map['solution_kickoff_charts'] = idx
        elif 'mo atp' in h or 'atp dg chart' in h:
            doc_col_map['atp_dg_charts'] = idx
        elif 'solution atp' in h:
            doc_col_map['solution_atp_dg_charts'] = idx
        elif 'atp dg memo' in h or 'atp memo' in h:
            doc_col_map['atp_memo'] = idx
        elif 'risk register' in h:
            doc_col_map['risk_register'] = idx
        elif 'daac selection' in h:
            doc_col_map['daac_selection'] = idx
        elif 'ipa' in h:
            doc_col_map['ipa'] = idx
        elif 'mo f2i' in h or 'f2i dg chart' in h:
            doc_col_map['f2i_dg_charts'] = idx
        elif 'solution f2i' in h:
            doc_col_map['solution_f2i_dg_charts'] = idx
        elif 'f2i dg memo' in h or 'f2i memo' in h:
            doc_col_map['f2i_memo'] = idx
        elif 'project plan' in h:
            doc_col_map['project_plan'] = idx
        elif 'contacts' in h or 'agreement' in h:
            doc_col_map['contacts_agreements'] = idx
        elif 'jpl task' in h:
            doc_col_map['jpl_task_plan'] = idx
        elif 'tech eval' in h:
            doc_col_map['tech_eval'] = idx
        elif 'sow' in h and 'science' not in h:
            doc_col_map['sow'] = idx
        elif 'icd' in h:
            doc_col_map['icd'] = idx
        elif 'fact sheet' in h:
            doc_col_map['fact_sheet'] = idx
        elif 'mo orr' in h or 'orr dg chart' in h:
            doc_col_map['orr_dg_charts'] = idx
        elif 'solution orr' in h:
            doc_col_map['solution_orr_dg_charts'] = idx
        elif 'orr dg memo' in h or 'orr memo' in h:
            doc_col_map['orr_memo'] = idx
        elif 'mo ca' in h or 'ca chart' in h:
            doc_col_map['ca_charts'] = idx
        elif 'ca decision' in h:
            doc_col_map['ca_decision_memo'] = idx
        elif 'mo closeout' in h or 'closeout dg chart' in h:
            doc_col_map['closeout_dg_charts'] = idx
        elif 'solution closeout dg' in h:
            doc_col_map['solution_closeout_dg_charts'] = idx
        elif 'closeout dg memo' in h or 'closeout memo' in h:
            doc_col_map['closeout_memo'] = idx
        elif 'closeout announcement' in h:
            doc_col_map['closeout_announcement'] = idx
        elif 'closeout report' in h:
            doc_col_map['closeout_report'] = idx

    print(f"Mapped {len(doc_col_map)} document columns")

    # Extract data starting from row 3 (solutions start there)
    doc_records = []
    for row_idx in range(3, len(doc_df)):
        sol_name_ql = doc_df.iloc[row_idx, 2]  # Column 2 has solution names
        if pd.isna(sol_name_ql) or not str(sol_name_ql).strip():
            continue

        db_name = find_db_name(sol_name_ql, db_names)
        if not db_name:
            print(f"  No match for: {sol_name_ql}")
            continue

        record = {'name': db_name, 'quicklook_name': str(sol_name_ql).strip()}

        for doc_type, col_idx in doc_col_map.items():
            val = doc_df.iloc[row_idx, col_idx]
            record[f'{doc_type}_status'] = parse_doc_status(val)

        doc_records.append(record)

    # Deduplicate - keep record with most filled data for each solution
    deduped_records = {}
    for record in doc_records:
        name = record['name']
        if name not in deduped_records:
            deduped_records[name] = record
        else:
            # Keep the one with more filled data
            if count_filled(record) > count_filled(deduped_records[name]):
                deduped_records[name] = record

    doc_records = list(deduped_records.values())
    print(f"Extracted {len(doc_records)} unique solution records from Doc Tracking")

    # =========================================================================
    # Parse SNWG MO Cycles Sheet (for additional milestone data)
    # =========================================================================
    print("\n--- SNWG MO Cycles Sheet ---")
    cycles_df = pd.read_excel(quicklook_path, sheet_name='SNWG MO Cycles', header=None)

    # Find the row with solution data (look for "Cycle" pattern in first columns)
    sol_start_row = None
    for i in range(len(cycles_df)):
        first_val = str(cycles_df.iloc[i, 0]) if pd.notna(cycles_df.iloc[i, 0]) else ''
        if 'Cycle' in first_val and any(c.isdigit() for c in first_val):
            sol_start_row = i
            break

    if sol_start_row is None:
        # Try column 0 for solution names starting after headers
        for i in range(7, len(cycles_df)):
            first_val = str(cycles_df.iloc[i, 0]) if pd.notna(cycles_df.iloc[i, 0]) else ''
            if 'Cycle' in first_val or any(name.lower() in first_val.lower() for name in ['ADMG', 'HLS', 'OPERA', 'DCD']):
                sol_start_row = i
                break

    if sol_start_row:
        print(f"Solution data starts at row {sol_start_row}")

        # Try to extract phase and status from columns 1-2
        for row_idx in range(sol_start_row, len(cycles_df)):
            sol_name_ql = cycles_df.iloc[row_idx, 0]
            if pd.isna(sol_name_ql) or not str(sol_name_ql).strip():
                continue

            db_name = find_db_name(sol_name_ql, db_names)
            if not db_name:
                continue

            # Find existing record or create new
            existing = next((r for r in doc_records if r['name'] == db_name), None)
            if existing:
                # Add phase/status if available
                phase = cycles_df.iloc[row_idx, 1] if cycles_df.shape[1] > 1 else None
                status = cycles_df.iloc[row_idx, 2] if cycles_df.shape[1] > 2 else None

                if pd.notna(phase) and str(phase).strip():
                    existing['phase_from_cycles'] = str(phase).strip()
                if pd.notna(status) and str(status).strip():
                    existing['status_from_cycles'] = str(status).strip()
    else:
        print("Could not find solution data start row in Cycles sheet")

    # =========================================================================
    # Create output DataFrame
    # =========================================================================
    print("\n--- Creating Output ---")

    if not doc_records:
        print("No records extracted!")
        return

    output_df = pd.DataFrame(doc_records)

    # Add solution_id from database
    sol_id_map = dict(zip(db_df['name'], db_df['solution_id']))
    output_df['solution_id'] = output_df['name'].map(sol_id_map)

    # Reorder columns
    priority_cols = ['solution_id', 'name', 'quicklook_name']
    status_cols = [c for c in output_df.columns if c.endswith('_status')]
    other_cols = [c for c in output_df.columns if c not in priority_cols and c not in status_cols]

    final_cols = priority_cols + sorted(status_cols) + other_cols
    final_cols = [c for c in final_cols if c in output_df.columns]
    output_df = output_df[final_cols]

    # Write CSV
    output_df.to_csv(output_path, index=False, encoding='utf-8')

    print(f"\n{'='*80}")
    print("DOCUMENT TRACKING CSV GENERATED")
    print("=" * 80)
    print(f"Output: {output_path}")
    print(f"Records: {len(output_df)}")
    print(f"Columns: {len(output_df.columns)}")

    print(f"\nDocument status columns:")
    for col in status_cols:
        filled = output_df[col].notna() & (output_df[col].astype(str).str.strip() != '')
        print(f"  {col}: {filled.sum()}/{len(output_df)} filled")

    # Show sample
    print(f"\nSample record:")
    if len(output_df) > 0:
        sample = output_df.iloc[0].to_dict()
        for k, v in sample.items():
            if v and str(v).strip():
                print(f"  {k}: {v}")


if __name__ == '__main__':
    main()
