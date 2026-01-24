#!/usr/bin/env python3
"""
Generate Solutions Import CSV
=============================
Creates a complete CSV file for importing into MO-DB_Solutions.
Extracts all data from Quick Look including:
- Contact information (Solution PoCs)
- Phase/status (Solution Top Sheet)
- Milestone dates (Solution Top Sheet, SNWG MO Cycles)
- Document status (Doc Tracking)
"""

import pandas as pd
from pathlib import Path
import sys
import re
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Name mappings for matching Quick Look to DB names
NAME_MAPPINGS = {
    'airborne data management group': 'ADMG',
    'admg': 'ADMG',
    'data curation for discovery': 'DCD',
    'dcd': 'DCD',
    'harmonized landsat and sentinel-2': 'HLS',
    'harmonized landsat sentinel': 'HLS',
    'nisar downlink': 'NISAR Downlink',
    'high-resolution north america nisar': 'NISAR Downlink',
    'freeboard': 'ICESat-2 QuickLooks',
    'icethickness': 'ICESat-2 QuickLooks',
    'icesat-2': 'ICESat-2 QuickLooks',
    'low-latency icesat': 'ICESat-2 QuickLooks',
    'gacr': 'GACR',
    'acgeos': 'GACR',
    'geos-5 atmospheric': 'GACR',
    'gcc from satcorps': 'GCC from SatCORPS',
    'global cloud composite': 'GCC from SatCORPS',
    'internet of animals': 'Internet of Animals',
    'animal tracking': 'Internet of Animals',
    'ioa': 'Internet of Animals',
    'nisar sm': 'NISAR SM',
    'nisar soil moisture': 'NISAR SM',
    'global nisar soil moisture': 'NISAR SM',
    'opera release 1': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera dswx-hls': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera global dynamic surface water': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera release 2': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera rtc-s1': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera release 3 - disp': 'OPERA Release 3 - DISP-S1',
    'opera north america surface displacement': 'OPERA Release 3 - DISP-S1',
    'opera release 3 - dswx': 'OPERA Release 3 - DSWx-S1',
    'opera release 4': 'OPERA Release 4 - DSWx-NI',
    'opera release 5': 'OPERA Release 5 - CSLC-NI and DISP-NI',
    'opera release 6': 'OPERA Release 6 - DIST-S1',
    'opera surface disturbance': 'OPERA Release 6 - DIST-S1',
    'air quality forecasts - gmao': 'Air Quality - GMAO',
    'air quality - gmao': 'Air Quality - GMAO',
    'air quality forecasts - pandora': 'Air Quality - Pandora Sensors',
    'pandora sensors': 'Air Quality - Pandora Sensors',
    'air quality forecasts - pm2.5': 'Air Quality - PM2.5',
    'pm2.5': 'Air Quality - PM2.5',
    'global hls derived vegetation': 'HLS-VI',
    'hls-vi': 'HLS-VI',
    'pbl gnss-ro': 'PBL',
    'tempo nrt': 'TEMPO NRT',
    'tempo_goes near real-time': 'TEMPO NRT',
    'global algal blooms': 'GABAN',
    'gaban': 'GABAN',
    'hls low latency': 'HLS-LL',
    'hls-ll': 'HLS-LL',
    'mwow': 'MWOW',
    'multisensor worldwide ocean winds': 'MWOW',
    'tempo enhanced': 'TEMPO Enhanced',
    'tempo nrt so2 and enhanced': 'TEMPO Enhanced',
    'vertical land motion': 'Vertical Land Motion (VLM)',
    'vlm': 'Vertical Land Motion (VLM)',
    'accessible 3d topographic': 'Accessible 3D Topographic Mapping Software',
    'a3tms': 'Accessible 3D Topographic Mapping Software',
    'high-resolution harmonized land surface': 'HLS-LST',
    'lst': 'HLS-LST',
    'fire information': 'FIRMS-2G',
    'firms': 'FIRMS-2G',
    '10-m harmonized landsat': '10-m HLS',
    '10-m hls': '10-m HLS',
    'high-resolution evapotranspiration': 'Global Evapotranspiration',
    'evapotranspiration': 'Global Evapotranspiration',
    'hls-et': 'HLS-ET',
    'ongoing and mobile pandora': 'Ongoing Pandora Measurements',
    'ongoing pandora': 'Ongoing Pandora Measurements',
    'water quality': 'Water Quality Products',
    'nga product support': 'NGA',
}


def normalize_name(name):
    if pd.isna(name):
        return ''
    return str(name).strip().lower().replace('(', '').replace(')', '').replace('-', ' ').replace('_', ' ')


def find_db_name(ql_name, db_names):
    """Find matching database solution name for a Quick Look name."""
    if pd.isna(ql_name):
        return None

    norm = normalize_name(ql_name)
    # Remove cycle prefix
    norm = re.sub(r'^cycle \d+\s*', '', norm).strip()

    # Check mappings
    for pattern, target in NAME_MAPPINGS.items():
        if pattern in norm:
            if target in db_names:
                return target

    # Exact match
    for db_name in db_names:
        if normalize_name(db_name) == norm:
            return db_name

    # Substring match
    for db_name in db_names:
        db_norm = normalize_name(db_name)
        if db_norm in norm or norm in db_norm:
            return db_name

    return None


def parse_date(val):
    """Parse date value to YYYY-MM-DD format."""
    if pd.isna(val):
        return ''
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    if isinstance(val, str):
        val = val.strip()
        if val.lower() in ['working', 'in work', 'tbd', 'n/a', '']:
            return ''
        # Try to parse
        try:
            dt = pd.to_datetime(val)
            return dt.strftime('%Y-%m-%d')
        except:
            return ''
    return ''


def parse_doc_status(val):
    """Parse document status value."""
    if pd.isna(val):
        return ''
    val = str(val).strip().upper()
    if val in ['X', 'COMPLETE', 'COMPLETED', 'DONE', 'YES']:
        return 'Complete'
    if val in ['IN WORK', 'IN PROGRESS', 'WORKING', 'WIP']:
        return 'In Progress'
    if val in ['TBD', 'PENDING', 'NOT STARTED']:
        return 'Pending'
    if val in ['N/A', 'NA', '-']:
        return 'N/A'
    return ''


def standardize_phase(phase):
    """Standardize phase names."""
    if pd.isna(phase):
        return ''
    phase = str(phase).strip()
    phase_map = {
        'PREFORMULATION': 'Pre-Formulation',
        'PRE-FORMULATION': 'Pre-Formulation',
        'FORMULATION': 'Formulation',
        'IMPLEMENTATION': 'Implementation',
        'PRODUCTION / OPERATIONAL': 'Production / Operational',
        'PRODUCTION/OPERATIONAL': 'Production / Operational',
        'OPERATIONAL': 'Production / Operational',
        'CLOSEOUT': 'Closeout',
    }
    return phase_map.get(phase.upper(), phase)


def fix_typos(val):
    """Fix known typos in Quick Look data."""
    if pd.isna(val):
        return ''
    val = str(val).strip()

    # Fix known typos
    typo_fixes = {
        'Tropspheric': 'Tropospheric',
        'CaltTech': 'CalTech',
        'Madhu Sridar': 'Madhu Sridhar',
        'Carlos De Castillo': 'Carlos del Castillo',
    }

    for typo, fix in typo_fixes.items():
        val = val.replace(typo, fix)

    return val


def main():
    base_dir = Path(__file__).parent.parent.parent

    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'
    output_path = base_dir / 'nsite-mo-viewer' / 'scripts' / 'SOLUTIONS_IMPORT.csv'

    print("=" * 70)
    print("GENERATING SOLUTIONS IMPORT CSV")
    print("=" * 70)

    # Read current database
    print("\nReading current MO-DB_Solutions...")
    db_df = pd.read_excel(solutions_path)
    db_names = db_df['name'].dropna().tolist()
    print(f"  Found {len(db_df)} solutions")

    # Read Quick Look sheets
    print("\nReading Quick Look sheets...")
    xl = pd.ExcelFile(quicklook_path)

    # 1. Solution PoCs (contacts)
    pocs_df = pd.read_excel(quicklook_path, sheet_name='Solution PoCs')
    for i, row in pocs_df.iterrows():
        if 'Solution' in str(row.values) and 'Title' in str(row.values):
            pocs_df.columns = pocs_df.iloc[i].values
            pocs_df = pocs_df.iloc[i+1:].reset_index(drop=True)
            break
    print(f"  Solution PoCs: {len(pocs_df)} entries")

    # 2. Solution Top Sheet (phases, key milestones)
    top_df = pd.read_excel(quicklook_path, sheet_name='Solution Top Sheet', header=None)
    for i, row in top_df.iterrows():
        if 'Solution Project' in str(row.values):
            top_df.columns = top_df.iloc[i].values
            top_df = top_df.iloc[i+1:].reset_index(drop=True)
            break
    top_df = top_df.dropna(how='all')
    print(f"  Solution Top Sheet: {len(top_df)} entries")

    # 3. Doc Tracking
    doc_df = pd.read_excel(quicklook_path, sheet_name='Doc Tracking', header=None)
    # Find header row
    for i, row in doc_df.iterrows():
        if 'SOLUTION PROJECT' in str(row.values).upper():
            doc_df.columns = doc_df.iloc[i].values
            doc_df = doc_df.iloc[i+1:].reset_index(drop=True)
            break
    doc_df = doc_df.dropna(how='all')
    print(f"  Doc Tracking: {len(doc_df)} entries")

    # 4. SNWG MO Cycles (detailed milestones)
    cycles_df = pd.read_excel(quicklook_path, sheet_name='SNWG MO Cycles', header=None)
    # This sheet has complex structure - find the header row with document names
    header_row = None
    for i, row in cycles_df.iterrows():
        row_str = str(row.values)
        if 'Science SOW' in row_str or 'ATP DG Memo' in row_str:
            header_row = i
            break

    if header_row is not None:
        cycles_df.columns = cycles_df.iloc[header_row].values
        cycles_df = cycles_df.iloc[header_row+1:].reset_index(drop=True)
    print(f"  SNWG MO Cycles: {len(cycles_df)} entries")

    # Build import data
    print("\nBuilding import data...")

    import_records = []

    for _, db_row in db_df.iterrows():
        sol_name = db_row['name']
        sol_id = db_row.get('solution_id', '')

        record = {
            'solution_id': sol_id,
            'name': sol_name,
        }

        # Find matching PoCs entry
        poc_match = None
        for _, poc_row in pocs_df.iterrows():
            ql_name = poc_row.get('Solution') or poc_row.get('Title')
            if find_db_name(ql_name, [sol_name]) == sol_name:
                poc_match = poc_row
                break

        # Find matching Top Sheet entry
        top_match = None
        for _, top_row in top_df.iterrows():
            ql_name = top_row.get('Solution Project')
            if find_db_name(ql_name, [sol_name]) == sol_name:
                top_match = top_row
                break

        # Find matching Doc Tracking entry
        doc_match = None
        for _, doc_row in doc_df.iterrows():
            ql_name = doc_row.get('SOLUTION PROJECT')
            if find_db_name(ql_name, [sol_name]) == sol_name:
                doc_match = doc_row
                break

        # Find matching Cycles entry
        cycles_match = None
        for _, cyc_row in cycles_df.iterrows():
            # Solution name is in first non-null column typically
            for col in cycles_df.columns:
                ql_name = cyc_row.get(col)
                if isinstance(ql_name, str) and ql_name.strip():
                    if find_db_name(ql_name, [sol_name]) == sol_name:
                        cycles_match = cyc_row
                        break
            if cycles_match is not None:
                break

        # === Contact Information (from PoCs) ===
        if poc_match is not None:
            record['solution_lead'] = fix_typos(poc_match.get('Solution Lead', ''))
            record['solution_lead_affiliation'] = fix_typos(poc_match.get('Solution Lead Affiliation', ''))
            record['ra_representative'] = fix_typos(poc_match.get('R&A Representative', ''))
            record['ra_representative_affiliation'] = fix_typos(poc_match.get('R&A Representative Affiliation', ''))
            record['earth_action_advocate'] = fix_typos(poc_match.get('Earth Action Representative', ''))
            record['earth_action_affiliation'] = fix_typos(poc_match.get('Earth Action Representative Affiliation', ''))

            # Cycle info
            cycle_val = poc_match.get('Cycle')
            if pd.notna(cycle_val):
                record['cycle'] = int(float(cycle_val)) if isinstance(cycle_val, (int, float)) else cycle_val

            cycle_year = poc_match.get('Cycle Year')
            if pd.notna(cycle_year):
                record['cycle_year'] = int(float(cycle_year)) if isinstance(cycle_year, (int, float)) else cycle_year

            # Funding status
            funded = poc_match.get('Funded or Unfunded? F/U')
            if pd.notna(funded):
                f_str = str(funded).strip().upper()
                if f_str == 'F' or 'FUNDED' in f_str:
                    record['funding_status'] = 'Funded'
                elif f_str == 'U' or 'UNFUNDED' in f_str:
                    record['funding_status'] = 'Unfunded'

            # Boolean flags
            on_web = poc_match.get('On Official Webpage')
            if pd.notna(on_web):
                record['on_official_webpage'] = str(on_web).strip().upper() in ['YES', 'Y', 'X', 'TRUE', '1']

            has_folder = poc_match.get('Has folder in NSITE MO drive?')
            if pd.notna(has_folder):
                record['has_drive_folder'] = str(has_folder).strip().upper() in ['YES', 'Y', 'X', 'TRUE', '1']

            is_commercial = poc_match.get('Commerical Solution?')
            if pd.notna(is_commercial):
                record['is_commercial'] = str(is_commercial).strip().upper() in ['YES', 'Y', 'X', 'TRUE', '1']

        # === Phase (from Top Sheet) ===
        if top_match is not None:
            phase = top_match.get('Phase')
            if pd.notna(phase):
                record['phase'] = standardize_phase(phase)

            # Key milestone dates from Top Sheet
            production_start = top_match.get('Production Start')
            if pd.notna(production_start) and str(production_start).strip().lower() not in ['working', 'tbd', '']:
                record['production_start_date'] = parse_date(production_start)

        # === Document Status (from Doc Tracking) ===
        if doc_match is not None:
            # Map doc tracking columns to database columns
            # The doc tracking sheet has various document columns
            pass  # Doc tracking has complex structure, will extract what we can

        # === Milestone Dates (from Cycles sheet) ===
        if cycles_match is not None:
            # ATP
            atp_memo = cycles_match.get('ATP DG Memo')
            if pd.notna(atp_memo):
                record['atp_memo_status'] = parse_doc_status(atp_memo)

            # F2I
            f2i_memo = cycles_match.get('F2I DG Memo')
            if pd.notna(f2i_memo):
                record['f2i_memo_status'] = parse_doc_status(f2i_memo)

            # ORR
            orr_memo = cycles_match.get('ORR DG Memo')
            if pd.notna(orr_memo):
                record['orr_memo_status'] = parse_doc_status(orr_memo)

            # Closeout
            closeout_memo = cycles_match.get('Closeout DG Memo')
            if pd.notna(closeout_memo):
                record['closeout_memo_status'] = parse_doc_status(closeout_memo)

            # Science SOW
            science_sow = cycles_match.get('Science SOW')
            if pd.notna(science_sow):
                record['science_sow_status'] = parse_doc_status(science_sow)

            # Project Plan
            project_plan = cycles_match.get('Project Plan')
            if pd.notna(project_plan):
                record['project_plan_status'] = parse_doc_status(project_plan)

            # IPA
            ipa = cycles_match.get('IPA')
            if pd.notna(ipa):
                record['ipa_status'] = parse_doc_status(ipa)

            # ICD
            icd = cycles_match.get('ICD')
            if pd.notna(icd):
                record['icd_status'] = parse_doc_status(icd)

            # Risk Register
            risk_reg = cycles_match.get('Risk Register')
            if pd.notna(risk_reg):
                record['risk_register_status'] = parse_doc_status(risk_reg)

        # Add last_updated timestamp
        record['last_updated'] = datetime.now().strftime('%Y-%m-%d')

        import_records.append(record)

    # Create DataFrame
    import_df = pd.DataFrame(import_records)

    # Reorder columns
    priority_cols = [
        'solution_id', 'name', 'phase', 'cycle', 'cycle_year', 'funding_status',
        'solution_lead', 'solution_lead_affiliation',
        'ra_representative', 'ra_representative_affiliation',
        'earth_action_advocate', 'earth_action_affiliation',
        'on_official_webpage', 'has_drive_folder', 'is_commercial',
        'science_sow_status', 'project_plan_status', 'ipa_status', 'icd_status',
        'atp_memo_status', 'f2i_memo_status', 'orr_memo_status', 'closeout_memo_status',
        'risk_register_status', 'production_start_date', 'last_updated'
    ]

    # Only include columns that exist
    final_cols = [c for c in priority_cols if c in import_df.columns]
    # Add any remaining columns
    remaining = [c for c in import_df.columns if c not in final_cols]
    final_cols.extend(remaining)

    import_df = import_df[final_cols]

    # Write CSV
    import_df.to_csv(output_path, index=False, encoding='utf-8')

    print(f"\n{'='*70}")
    print("IMPORT CSV GENERATED")
    print("=" * 70)
    print(f"Output: {output_path}")
    print(f"Records: {len(import_df)}")
    print(f"Columns: {len(import_df.columns)}")
    print(f"\nColumns included:")
    for col in import_df.columns:
        non_empty = import_df[col].notna() & (import_df[col].astype(str).str.strip() != '')
        print(f"  {col}: {non_empty.sum()}/{len(import_df)} filled")


if __name__ == '__main__':
    main()
