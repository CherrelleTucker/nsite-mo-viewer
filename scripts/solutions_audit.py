#!/usr/bin/env python3
"""
Solutions Database Audit
========================
Comprehensive audit comparing:
- MO-DB_Solutions (current database)
- Solution Status Quick Look (master tracking)
- Drive-download files (verification)

Outputs a detailed diff report for review.
"""

import pandas as pd
from pathlib import Path
import sys
import re
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Name mappings
NAME_MAPPINGS = {
    'airborne data management group': 'ADMG',
    'admg': 'ADMG',
    'data curation for discovery': 'DCD',
    'dcd': 'DCD',
    'harmonized landsat and sentinel-2': 'HLS',
    'harmonized landsat sentinel': 'HLS',
    'hls': 'HLS',
    'nisar downlink': 'NISAR Downlink',
    'freeboard': 'ICESat-2 QuickLooks',
    'icethickness': 'ICESat-2 QuickLooks',
    'icesat-2': 'ICESat-2 QuickLooks',
    'gacr': 'GACR',
    'acgeos': 'GACR',
    'gcc from satcorps': 'GCC from SatCORPS',
    'gcc': 'GCC from SatCORPS',
    'radiation and cloud': 'GCC from SatCORPS',
    'internet of animals': 'Internet of Animals',
    'ioa': 'Internet of Animals',
    'nisar sm': 'NISAR SM',
    'nisar soil moisture': 'NISAR SM',
    'opera release 1': 'OPERA Release 1 - DSWx-HLS and DIST-HLS',
    'opera release 2': 'OPERA Release 2 - RTC-S1 and CSLC-S1',
    'opera release 3 - disp': 'OPERA Release 3 - DISP-S1',
    'opera disp': 'OPERA Release 3 - DISP-S1',
    'opera release 3 - dswx': 'OPERA Release 3 - DSWx-S1',
    'opera dswx': 'OPERA Release 3 - DSWx-S1',
    'opera release 4': 'OPERA Release 4 - DSWx-NI',
    'opera release 5': 'OPERA Release 5 - CSLC-NI and DISP-NI',
    'opera release 6': 'OPERA Release 6 - DIST-S1',
    'opera dist': 'OPERA Release 6 - DIST-S1',
    'air quality forecasts - gmao': 'Air Quality - GMAO',
    'air quality - gmao': 'Air Quality - GMAO',
    'air quality forecasts - pandora': 'Air Quality - Pandora Sensors',
    'pandora sensors': 'Air Quality - Pandora Sensors',
    'air quality forecasts - pm2.5': 'Air Quality - PM2.5',
    'pm2.5': 'Air Quality - PM2.5',
    'global hls derived vegetation': 'HLS-VI',
    'hls-vi': 'HLS-VI',
    'pbl gnss-ro': 'PBL',
    'pbl': 'PBL',
    'tempo nrt': 'TEMPO NRT',
    'global algal blooms': 'GABAN',
    'gaban': 'GABAN',
    'hls low latency': 'HLS-LL',
    'hls-ll': 'HLS-LL',
    'mwow': 'MWOW',
    'tempo enhanced': 'TEMPO Enhanced',
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
}


def normalize_name(name):
    if pd.isna(name):
        return ''
    return str(name).strip().lower().replace('(', '').replace(')', '').replace('-', ' ')


def find_solution_match(name, solutions_names):
    if pd.isna(name):
        return None
    norm = normalize_name(name)
    norm = re.sub(r'^cycle \d+\s*', '', norm).strip()

    for pattern, target in NAME_MAPPINGS.items():
        if pattern in norm:
            if target in solutions_names:
                return target

    for sol in solutions_names:
        if normalize_name(sol) == norm:
            return sol

    for sol in solutions_names:
        sol_norm = normalize_name(sol)
        if sol_norm in norm or norm in sol_norm:
            return sol

    return None


def safe_str(val, max_len=60):
    if pd.isna(val) or str(val).strip() == '':
        return ''
    s = str(val).strip()
    if len(s) > max_len:
        return s[:max_len-3] + '...'
    return s


def check_drive_files(base_dir, solution_name):
    """Check for verification files in drive-download."""
    drive_dir = base_dir / 'source-archives' / 'drive-download'

    # Map solution names to folder patterns
    folder_patterns = {
        'ADMG': ['ADMG', 'Airborne Data Management'],
        'DCD': ['DCD', 'Data Curation'],
        'HLS': ['HLS', 'Harmonized Landsat'],
        'NISAR Downlink': ['NISAR Downlink'],
        'NISAR SM': ['NISAR Soil Moisture'],
        'GACR': ['GACR', 'GEOS-5'],
        'GCC from SatCORPS': ['GCC', 'SatCORPS', 'Cloud Composite'],
        'Internet of Animals': ['Internet of Animals', 'IoA', 'Animal Tracking'],
        'ICESat-2 QuickLooks': ['ICESat-2', 'Lake Ice Freeboard'],
        'Water Quality Products': ['Water Quality'],
        'OPERA': ['OPERA'],
        'Air Quality': ['Air Quality'],
        'PBL': ['PBL', 'GNSS-RO'],
        'TEMPO': ['TEMPO'],
        'GABAN': ['GABAN', 'Algal Bloom'],
        'HLS-LL': ['HLS Low Latency', 'HLS-LL'],
        'MWOW': ['MWOW', 'Ocean Winds'],
        'Vertical Land Motion': ['VLM', 'Vertical Land Motion'],
        'HLS-LST': ['LST', 'Land Surface Temperature'],
        'FIRMS-2G': ['FIRMS', 'Fire Information'],
        'Accessible 3D': ['A3TMS', '3D Topographic'],
    }

    found_dirs = []
    for pattern_key, patterns in folder_patterns.items():
        if pattern_key in solution_name:
            for p in patterns:
                matching = list(drive_dir.rglob(f'*{p}*'))
                if matching:
                    found_dirs.extend([str(m.relative_to(drive_dir)) for m in matching[:3]])

    return found_dirs[:3] if found_dirs else []


def main():
    base_dir = Path(__file__).parent.parent.parent

    quicklook_path = base_dir / 'Solution Status Quick Look_NSITE MO_C0_01-16-2026.xlsx'
    solutions_path = base_dir / 'database-files' / 'MO-Viewer Databases' / 'MO-DB_Solutions.xlsx'

    report_path = base_dir / 'nsite-mo-viewer' / 'scripts' / 'SOLUTIONS_AUDIT_REPORT.md'

    # Read data
    solutions_df = pd.read_excel(solutions_path)
    solutions_names = solutions_df['name'].dropna().tolist()

    # Read Quick Look sheets
    xl = pd.ExcelFile(quicklook_path)

    # Solution PoCs (contacts)
    pocs_df = pd.read_excel(quicklook_path, sheet_name='Solution PoCs')
    for i, row in pocs_df.iterrows():
        if 'Solution' in str(row.values) and 'Title' in str(row.values):
            pocs_df.columns = pocs_df.iloc[i].values
            pocs_df = pocs_df.iloc[i+1:].reset_index(drop=True)
            break

    # Solution Top Sheet (phases, milestones)
    top_df = pd.read_excel(quicklook_path, sheet_name='Solution Top Sheet', header=None)
    for i, row in top_df.iterrows():
        if 'Solution Project' in str(row.values):
            top_df.columns = top_df.iloc[i].values
            top_df = top_df.iloc[i+1:].reset_index(drop=True)
            break

    # Build report
    lines = []
    lines.append("# Solutions Database Audit Report")
    lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"\n## Data Sources")
    lines.append(f"- **MO-DB_Solutions**: {len(solutions_df)} solutions")
    lines.append(f"- **Quick Look PoCs**: {len(pocs_df)} entries")
    lines.append(f"- **Quick Look Top Sheet**: {len(top_df)} entries")
    lines.append(f"\n---\n")

    # Summary tables
    changes_contacts = []
    changes_status = []
    unmatched_ql = []

    # Process each solution in database
    lines.append("## Solutions Audit\n")

    for _, sol_row in solutions_df.iterrows():
        sol_name = sol_row['name']
        lines.append(f"### {sol_name}")
        lines.append("")

        # Find matching Quick Look entries
        poc_match = None
        top_match = None

        for _, poc_row in pocs_df.iterrows():
            ql_name = poc_row.get('Solution') or poc_row.get('Title')
            if find_solution_match(ql_name, [sol_name]):
                poc_match = poc_row
                break

        for _, top_row in top_df.iterrows():
            ql_name = top_row.get('Solution Project')
            if find_solution_match(ql_name, [sol_name]):
                top_match = top_row
                break

        # Contact Information
        lines.append("**Contact Information:**")
        lines.append("| Field | Database | Quick Look | Action |")
        lines.append("|-------|----------|------------|--------|")

        contact_fields = [
            ('solution_lead', 'Solution Lead'),
            ('solution_lead_affiliation', 'Solution Lead Affiliation'),
            ('ra_representative', 'R&A Representative'),
            ('ra_representative_affiliation', 'R&A Representative Affiliation'),
            ('earth_action_advocate', 'Earth Action Representative'),
            ('earth_action_affiliation', 'Earth Action Representative Affiliation'),
        ]

        for db_col, ql_col in contact_fields:
            db_val = safe_str(sol_row.get(db_col, ''))
            ql_val = safe_str(poc_match[ql_col] if poc_match is not None and ql_col in poc_match.index else '')

            if not db_val and not ql_val:
                action = "MISSING"
            elif not db_val and ql_val:
                action = "**FILL**"
                changes_contacts.append((sol_name, db_col, '', ql_val))
            elif db_val and not ql_val:
                action = "KEEP"
            elif db_val == ql_val:
                action = "OK"
            else:
                action = "**DIFF**"
                changes_contacts.append((sol_name, db_col, db_val, ql_val))

            lines.append(f"| {db_col} | {db_val or '-'} | {ql_val or '-'} | {action} |")

        # Status Information
        lines.append("")
        lines.append("**Status Information:**")
        lines.append("| Field | Database | Quick Look | Action |")
        lines.append("|-------|----------|------------|--------|")

        # Phase from Top Sheet
        db_phase = safe_str(sol_row.get('phase', ''))
        ql_phase = safe_str(top_match['Phase'] if top_match is not None and 'Phase' in top_match.index else '')

        if not db_phase and ql_phase:
            action = "**FILL**"
            changes_status.append((sol_name, 'phase', '', ql_phase))
        elif db_phase == ql_phase:
            action = "OK"
        elif db_phase and ql_phase and db_phase != ql_phase:
            action = "**DIFF**"
            changes_status.append((sol_name, 'phase', db_phase, ql_phase))
        else:
            action = "KEEP"

        lines.append(f"| phase | {db_phase or '-'} | {ql_phase or '-'} | {action} |")

        # Funding status from PoCs
        db_funding = safe_str(sol_row.get('funding_status', ''))
        ql_funding = ''
        if poc_match is not None and 'Funded or Unfunded? F/U' in poc_match.index:
            f_val = poc_match['Funded or Unfunded? F/U']
            if pd.notna(f_val):
                f_str = str(f_val).strip().upper()
                if f_str == 'F' or 'FUNDED' in f_str:
                    ql_funding = 'Funded'
                elif f_str == 'U' or 'UNFUNDED' in f_str:
                    ql_funding = 'Unfunded'

        if not db_funding and ql_funding:
            action = "**FILL**"
        elif db_funding == ql_funding:
            action = "OK"
        elif db_funding and ql_funding and db_funding != ql_funding:
            action = "**DIFF**"
        else:
            action = "KEEP"

        lines.append(f"| funding_status | {db_funding or '-'} | {ql_funding or '-'} | {action} |")

        # Cycle info
        db_cycle = safe_str(sol_row.get('cycle', ''))
        ql_cycle = safe_str(poc_match['Cycle'] if poc_match is not None and 'Cycle' in poc_match.index else '')

        if not db_cycle and ql_cycle:
            action = "**FILL**"
        elif db_cycle == ql_cycle:
            action = "OK"
        elif db_cycle and ql_cycle and db_cycle != ql_cycle:
            action = "**DIFF**"
        else:
            action = "KEEP"

        lines.append(f"| cycle | {db_cycle or '-'} | {ql_cycle or '-'} | {action} |")

        # Verification files
        verify_files = check_drive_files(base_dir, sol_name)
        if verify_files:
            lines.append("")
            lines.append("**Verification files found:**")
            for f in verify_files:
                lines.append(f"- `{f}`")

        lines.append("")
        lines.append("---")
        lines.append("")

    # Summary
    lines.append("## Summary of Recommended Changes\n")

    lines.append("### Contact Changes")
    if changes_contacts:
        lines.append("| Solution | Field | Current | Recommended |")
        lines.append("|----------|-------|---------|-------------|")
        for sol, field, old, new in changes_contacts:
            lines.append(f"| {sol} | {field} | {old or '-'} | {new} |")
    else:
        lines.append("No contact changes needed.")

    lines.append("")
    lines.append("### Status Changes")
    if changes_status:
        lines.append("| Solution | Field | Current | Recommended |")
        lines.append("|----------|-------|---------|-------------|")
        for sol, field, old, new in changes_status:
            lines.append(f"| {sol} | {field} | {old or '-'} | {new} |")
    else:
        lines.append("No status changes needed.")

    # Write report
    report_path.write_text('\n'.join(lines), encoding='utf-8')
    print(f"Report written to: {report_path}")
    print(f"\nSummary:")
    print(f"  Contact changes: {len(changes_contacts)}")
    print(f"  Status changes: {len(changes_status)}")


if __name__ == '__main__':
    main()
