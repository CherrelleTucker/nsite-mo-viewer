"""
Extract Milestones from Solution Status Quick Look Excel

Extracts milestone data from the SNWG MO Cycles sheet and creates
a normalized milestones database with one row per solution-milestone.
"""

import pandas as pd
from datetime import datetime
import re

# File paths
INPUT_FILE = r'C:\Users\cjtucke3\Documents\Personal\MO-development\Solution Status Quick Look_C0_2025_v0.01.xlsx'
OUTPUT_FILE = r'C:\Users\cjtucke3\Documents\Personal\MO-development\nsite-mo-viewer\database-files\MO-DB_Milestones.csv'

# Implementation Milestone type definitions
# Note: SEP Milestones (Working Sessions, Stakeholder Touchpoints) are tracked separately
IMPLEMENTATION_MILESTONES = {
    # Pre-Formulation
    'HQ Kickoff': {'phase': 'Pre-Formulation', 'order': 1, 'category': 'implementation'},
    'PS Kickoff': {'phase': 'Pre-Formulation', 'order': 2, 'category': 'implementation'},
    'Solution Kickoff': {'phase': 'Pre-Formulation', 'order': 2, 'category': 'implementation'},
    'ATP DG': {'phase': 'Pre-Formulation', 'order': 3, 'category': 'implementation'},
    'ATP': {'phase': 'Pre-Formulation', 'order': 3, 'category': 'implementation'},

    # Formulation to Implementation
    'F2I DG': {'phase': 'Formulation', 'order': 4, 'category': 'implementation'},
    'F2I': {'phase': 'Formulation', 'order': 4, 'category': 'implementation'},

    # Implementation
    'ORR': {'phase': 'Implementation', 'order': 5, 'category': 'implementation'},

    # Production
    'Operation Start': {'phase': 'Production', 'order': 6, 'category': 'implementation'},
    'Operation End': {'phase': 'Production', 'order': 7, 'category': 'implementation'},

    # Closeout
    'Closeout DG': {'phase': 'Closeout', 'order': 8, 'category': 'implementation'},
    'Closeout': {'phase': 'Closeout', 'order': 8, 'category': 'implementation'},
}

# Items that are NOT milestones (contract types, etc.)
NOT_MILESTONES = ['ESDIS IPA', 'IPA', 'ICD', 'DAAC ICD', 'DAAC Selection', 'Contract', 'Finalize Project Plan']

# Alias for backward compatibility
MILESTONE_TYPES = IMPLEMENTATION_MILESTONES

def parse_date(date_val):
    """Parse various date formats to ISO date string."""
    if pd.isna(date_val) or date_val == '' or date_val is None:
        return ''

    # If already a datetime
    if isinstance(date_val, datetime):
        return date_val.strftime('%Y-%m-%d')

    date_str = str(date_val).strip()
    if not date_str or date_str.lower() in ['nan', 'none', 'nat', 'tbd', 'n/a']:
        return ''

    # Try various formats
    formats = [
        '%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d', '%d/%m/%Y',
        '%B %d, %Y', '%b %d, %Y', '%m-%d-%Y', '%m-%d-%y'
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue

    # Try to extract just a year if present
    year_match = re.search(r'\b(20\d{2})\b', date_str)
    if year_match:
        return year_match.group(1)

    return ''

def determine_status(target_date, actual_date, is_complete):
    """Determine milestone status based on dates and completion."""
    if is_complete or actual_date:
        return 'completed'
    elif target_date:
        try:
            target = datetime.strptime(target_date, '%Y-%m-%d')
            if target < datetime.now():
                return 'overdue'
            else:
                return 'planned'
        except:
            return 'planned'
    return 'not_started'


def extract_milestones():
    """Extract milestones from the Quick Look Excel file."""
    print("=" * 60)
    print("EXTRACTING MILESTONES")
    print("=" * 60)

    # Read the SNWG MO Cycles sheet
    print(f"\nReading: {INPUT_FILE}")

    try:
        df = pd.read_excel(INPUT_FILE, sheet_name='SNWG MO Cycles', header=None)
    except Exception as e:
        print(f"Error reading Excel: {e}")
        return

    print(f"Sheet dimensions: {df.shape[0]} rows x {df.shape[1]} columns")

    # Find the header row (usually row 3-6 area based on previous analysis)
    # The structure has merged headers, so we need to find the data rows

    # Look for row with "Solution Project" or similar
    header_row = None
    for i in range(10):
        row_values = df.iloc[i].astype(str).str.lower().tolist()
        if any('solution' in v and 'project' in v for v in row_values):
            header_row = i
            break

    if header_row is None:
        # Try finding by looking for phase names
        for i in range(10):
            row_values = df.iloc[i].astype(str).tolist()
            if 'PREFORMULATION' in row_values or 'Preformulation' in row_values:
                header_row = i - 1
                break

    if header_row is None:
        header_row = 5  # Default guess

    print(f"Using header row: {header_row}")

    # Get headers from multiple rows if needed (merged cells)
    headers = df.iloc[header_row].fillna('').astype(str).tolist()
    print(f"Sample headers: {headers[:10]}")

    # Find the solution name column
    solution_col = 0
    for i, h in enumerate(headers):
        if 'solution' in h.lower() or 'project' in h.lower():
            solution_col = i
            break

    print(f"Solution column: {solution_col}")

    # Extract data rows (skip header rows)
    data_start = header_row + 1
    milestones = []
    milestone_id = 1

    # We need to map columns to milestone types
    # Let's scan the headers and sub-headers to find milestone columns
    # For now, let's use a simpler approach: look at the phase and next milestone columns

    # Columns 0-7 based on previous analysis:
    # 0: Solution Project name
    # 1: Phase
    # 2: Status
    # 3: Next Milestone
    # 4: Next Significant/Milestone Date
    # 5: Planned Project Closeout
    # 6: Thematic Area
    # 7: Provider

    for idx in range(data_start, min(data_start + 50, len(df))):
        row = df.iloc[idx]

        solution_name = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ''
        if not solution_name or solution_name.lower() in ['nan', '', 'none']:
            continue
        if 'cycle' in solution_name.lower() and len(solution_name) < 15:
            continue  # Skip cycle header rows

        current_phase = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ''
        status = str(row.iloc[2]).strip() if len(row) > 2 and pd.notna(row.iloc[2]) else ''
        next_milestone = str(row.iloc[3]).strip() if len(row) > 3 and pd.notna(row.iloc[3]) else ''
        next_date = parse_date(row.iloc[4]) if len(row) > 4 else ''
        closeout_date = parse_date(row.iloc[5]) if len(row) > 5 else ''

        # Clean strings of Unicode characters
        def clean_str(s):
            return ''.join(c for c in s if ord(c) < 128).strip()

        solution_name = clean_str(solution_name)
        current_phase = clean_str(current_phase)
        next_milestone = clean_str(next_milestone)

        # Skip header/instruction rows
        if 'automatically updates' in current_phase.lower() or 'solution project' in solution_name.lower():
            continue

        # Clean solution name (remove provider suffix like "(MSFC)")
        solution_clean = re.sub(r'\s*\([^)]+\)\s*$', '', solution_name).strip()
        # Remove "Cycle X " prefix
        solution_clean = re.sub(r'^Cycle \d+ ', '', solution_clean).strip()

        # Extract cycle number
        cycle_match = re.search(r'Cycle (\d+)', solution_name)
        cycle = cycle_match.group(1) if cycle_match else ''

        # Determine solution_id
        solution_id = solution_clean.upper().replace(' ', '_').replace('-', '_')
        solution_id = re.sub(r'[^A-Z0-9_]', '', solution_id)
        if len(solution_id) > 20:
            solution_id = solution_id[:20]

        print(f"  {solution_clean}: Phase={current_phase}, Next={next_milestone}, Date={next_date}")

        # Create milestone for next milestone if present
        if next_milestone and next_milestone.lower() not in ['nan', 'none', '']:
            # Skip non-milestones (contract types, etc.)
            is_not_milestone = any(nm.lower() in next_milestone.lower() for nm in NOT_MILESTONES)
            if is_not_milestone:
                print(f"    Skipping non-milestone: {next_milestone}")
            else:
                # Normalize milestone type
                ms_type = next_milestone
                for key in IMPLEMENTATION_MILESTONES:
                    if key.lower() in next_milestone.lower():
                        ms_type = key
                        break

                # Clean up common variations
                if 'kickoff' in ms_type.lower() and 'hq' in ms_type.lower():
                    ms_type = 'HQ Kickoff'
                elif 'kickoff' in ms_type.lower():
                    ms_type = 'PS Kickoff'
                elif 'f2i' in ms_type.lower():
                    ms_type = 'F2I DG'
                elif 'atp' in ms_type.lower():
                    ms_type = 'ATP DG'
                elif 'orr' in ms_type.lower():
                    ms_type = 'ORR'
                elif 'closeout' in ms_type.lower():
                    ms_type = 'Closeout DG'
                elif 'operation start' in ms_type.lower():
                    ms_type = 'Operation Start'
                elif 'operation end' in ms_type.lower():
                    ms_type = 'Operation End'

                milestones.append({
                    'milestone_id': f'M{milestone_id:04d}',
                    'solution_id': solution_id,
                    'solution_name': solution_clean,
                    'cycle': cycle,
                    'type': ms_type,
                    'category': 'implementation',
                    'phase': IMPLEMENTATION_MILESTONES.get(ms_type, {}).get('phase', current_phase),
                    'target_date': next_date,
                    'actual_date': '',
                    'status': 'planned' if next_date else 'not_started',
                    'notes': f'Current phase: {current_phase}',
                    'source': 'Quick Look',
                    'last_updated': datetime.now().strftime('%Y-%m-%d')
                })
                milestone_id += 1

        # If we have a closeout date, add closeout milestone
        if closeout_date:
            milestones.append({
                'milestone_id': f'M{milestone_id:04d}',
                'solution_id': solution_id,
                'solution_name': solution_clean,
                'cycle': cycle,
                'type': 'Closeout DG',
                'category': 'implementation',
                'phase': 'Closeout',
                'target_date': closeout_date,
                'actual_date': '',
                'status': 'planned',
                'notes': 'Planned closeout date',
                'source': 'Quick Look',
                'last_updated': datetime.now().strftime('%Y-%m-%d')
            })
            milestone_id += 1

        # For operational solutions, add Operation Start as completed
        if 'operational' in current_phase.lower() or 'production' in current_phase.lower():
            milestones.append({
                'milestone_id': f'M{milestone_id:04d}',
                'solution_id': solution_id,
                'solution_name': solution_clean,
                'cycle': cycle,
                'type': 'Operation Start',
                'category': 'implementation',
                'phase': 'Production',
                'target_date': '',
                'actual_date': '',
                'status': 'completed',
                'notes': 'Currently in operations',
                'source': 'Quick Look',
                'last_updated': datetime.now().strftime('%Y-%m-%d')
            })
            milestone_id += 1

    print(f"\nExtracted {len(milestones)} milestones")

    # Create DataFrame and save
    if milestones:
        result_df = pd.DataFrame(milestones)
        result_df.to_csv(OUTPUT_FILE, index=False)
        print(f"Saved to: {OUTPUT_FILE}")

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total milestones: {len(milestones)}")
        print(f"Unique solutions: {result_df['solution_id'].nunique()}")
        print(f"\nMilestones by type:")
        print(result_df['type'].value_counts().to_string())
        print(f"\nMilestones by status:")
        print(result_df['status'].value_counts().to_string())

        # Sample output
        print("\n" + "=" * 60)
        print("SAMPLE DATA")
        print("=" * 60)
        print(result_df[['solution_name', 'type', 'status', 'target_date']].head(15).to_string())
    else:
        print("No milestones extracted!")


if __name__ == '__main__':
    extract_milestones()
