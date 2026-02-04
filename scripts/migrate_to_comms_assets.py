"""
Migrate existing comms content to MO-DB_CommsAssets

This script extracts:
1. Key messages from MO-DB_Solutions (comms_* columns)
2. Highlighter blurbs from MO-DB_Stories (content_type = 'highlighter_blurb')

And converts them to the new CommsAssets schema.

Usage:
    python migrate_to_comms_assets.py

Output:
    database-files/comms-assets-migrated.csv
"""

import pandas as pd
import os
from datetime import datetime

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_DIR = os.path.join(BASE_DIR, 'database-files', 'MO-Viewer Databases')
OUTPUT_FILE = os.path.join(BASE_DIR, 'database-files', 'comms-assets-migrated.csv')

def load_solutions():
    """Load MO-DB_Solutions and extract comms columns."""
    solutions_path = os.path.join(DATABASE_DIR, 'MO-DB_Solutions.xlsx')
    if not os.path.exists(solutions_path):
        # Try CSV
        solutions_path = os.path.join(DATABASE_DIR, 'MO-DB_Solutions.csv')

    if not os.path.exists(solutions_path):
        print(f"Warning: Solutions file not found at {solutions_path}")
        return pd.DataFrame()

    print(f"Loading solutions from: {solutions_path}")
    if solutions_path.endswith('.xlsx'):
        df = pd.read_excel(solutions_path)
    else:
        df = pd.read_csv(solutions_path)

    return df

def load_stories():
    """Load MO-DB_Stories and filter for highlighter blurbs."""
    stories_path = os.path.join(DATABASE_DIR, 'MO-DB_Stories.xlsx')
    if not os.path.exists(stories_path):
        stories_path = os.path.join(DATABASE_DIR, 'MO-DB_Stories.csv')

    if not os.path.exists(stories_path):
        print(f"Warning: Stories file not found at {stories_path}")
        return pd.DataFrame()

    print(f"Loading stories from: {stories_path}")
    if stories_path.endswith('.xlsx'):
        df = pd.read_excel(stories_path)
    else:
        df = pd.read_csv(stories_path)

    # Filter for highlighter blurbs
    if 'content_type' in df.columns:
        df = df[df['content_type'] == 'highlighter_blurb']

    return df

def extract_key_messages(solutions_df):
    """Extract key messages from solutions into CommsAssets format."""
    assets = []
    asset_id_counter = 1

    # Columns to extract
    comms_columns = [
        ('comms_key_messages', 'talking_point', 'Key Messages'),
        ('comms_science', 'fact', 'Scientific Advancement'),
        ('comms_agency_impact', 'connection', 'Agency Use & Impact'),
        ('comms_industry', 'connection', 'Industry Connections'),
    ]

    for _, row in solutions_df.iterrows():
        solution_id = row.get('core_id', '')
        solution_name = row.get('core_official_name', solution_id)

        if not solution_id:
            continue

        for col, asset_type, title_prefix in comms_columns:
            content = row.get(col, '')
            if pd.isna(content) or not str(content).strip():
                continue

            content = str(content).strip()

            # Split by double newlines or bullet points to create separate assets
            # For now, keep as single asset per column
            asset = {
                'asset_id': f'CA-{asset_id_counter:03d}',
                'asset_type': asset_type,
                'title': f'{solution_name} - {title_prefix}',
                'content': content,
                'source_name': 'MO-DB_Solutions',
                'source_type': 'internal',
                'source_url': '',
                'attribution_text': 'NSITE MO',
                'date_captured': datetime.now().strftime('%Y-%m-%d'),
                'solution_ids': solution_id,
                'agency_ids': '',
                'contact_ids': '',
                'tags': f'{solution_id},{asset_type}',
                'audience': 'all',
                'channels': 'all',
                'tone': 'formal',
                'usage_notes': f'Migrated from MO-DB_Solutions.{col}',
                'status': 'approved',
                'approved_by': 'Migration Script',
                'approved_date': datetime.now().strftime('%Y-%m-%d'),
                'expiration_date': '',
                'created_by': 'Migration Script',
                'created_at': datetime.now().strftime('%Y-%m-%d'),
                'updated_at': datetime.now().strftime('%Y-%m-%d'),
                'use_count': 0,
                'last_used_date': ''
            }
            assets.append(asset)
            asset_id_counter += 1

    return assets

def extract_blurbs(stories_df):
    """Extract highlighter blurbs from stories into CommsAssets format."""
    assets = []
    asset_id_counter = 500  # Start at 500 to avoid collision with key messages

    for _, row in stories_df.iterrows():
        story_id = row.get('story_id', '')
        title = row.get('title', 'Untitled Blurb')
        content = row.get('blurb_content', row.get('content', row.get('notes', '')))
        solution_id = row.get('solution_id', '')
        target_date = row.get('target_date', '')
        status = row.get('status', 'draft')

        if pd.isna(content) or not str(content).strip():
            continue

        # Map status
        status_map = {
            'published': 'approved',
            'review': 'approved',
            'drafting': 'draft',
            'idea': 'draft'
        }
        new_status = status_map.get(status, 'draft')

        asset = {
            'asset_id': f'CA-{asset_id_counter:03d}',
            'asset_type': 'blurb',
            'title': str(title),
            'content': str(content).strip(),
            'source_name': 'Weekly Internal Planning',
            'source_type': 'internal',
            'source_url': '',
            'attribution_text': 'NSITE MO Team',
            'date_captured': str(target_date) if not pd.isna(target_date) else datetime.now().strftime('%Y-%m-%d'),
            'solution_ids': str(solution_id) if not pd.isna(solution_id) else '',
            'agency_ids': '',
            'contact_ids': '',
            'tags': 'blurb,hq-reporting',
            'audience': 'external',
            'channels': 'email,report',
            'tone': 'formal',
            'usage_notes': f'Migrated from MO-DB_Stories (story_id: {story_id})',
            'status': new_status,
            'approved_by': 'Migration Script' if new_status == 'approved' else '',
            'approved_date': datetime.now().strftime('%Y-%m-%d') if new_status == 'approved' else '',
            'expiration_date': '',
            'created_by': 'Migration Script',
            'created_at': datetime.now().strftime('%Y-%m-%d'),
            'updated_at': datetime.now().strftime('%Y-%m-%d'),
            'use_count': 0,
            'last_used_date': ''
        }
        assets.append(asset)
        asset_id_counter += 1

    return assets

def main():
    print("=" * 60)
    print("MO-DB_CommsAssets Migration Script")
    print("=" * 60)

    all_assets = []

    # Extract from Solutions
    print("\n1. Extracting key messages from MO-DB_Solutions...")
    solutions_df = load_solutions()
    if not solutions_df.empty:
        key_message_assets = extract_key_messages(solutions_df)
        print(f"   Extracted {len(key_message_assets)} key message assets")
        all_assets.extend(key_message_assets)

    # Extract from Stories
    print("\n2. Extracting highlighter blurbs from MO-DB_Stories...")
    stories_df = load_stories()
    if not stories_df.empty:
        blurb_assets = extract_blurbs(stories_df)
        print(f"   Extracted {len(blurb_assets)} blurb assets")
        all_assets.extend(blurb_assets)

    # Create output DataFrame
    print(f"\n3. Writing {len(all_assets)} assets to CSV...")
    if all_assets:
        output_df = pd.DataFrame(all_assets)

        # Ensure column order matches schema
        columns = [
            'asset_id', 'asset_type', 'title', 'content',
            'source_name', 'source_type', 'source_url', 'attribution_text', 'date_captured',
            'solution_ids', 'agency_ids', 'contact_ids', 'tags',
            'audience', 'channels', 'tone', 'usage_notes',
            'status', 'approved_by', 'approved_date', 'expiration_date',
            'created_by', 'created_at', 'updated_at', 'use_count', 'last_used_date'
        ]
        output_df = output_df[columns]

        output_df.to_csv(OUTPUT_FILE, index=False)
        print(f"   Output written to: {OUTPUT_FILE}")
    else:
        print("   No assets to write!")

    # Summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    if all_assets:
        types = {}
        for a in all_assets:
            t = a['asset_type']
            types[t] = types.get(t, 0) + 1
        print(f"Total assets: {len(all_assets)}")
        for t, count in sorted(types.items()):
            print(f"  - {t}: {count}")

    print("\nNext steps:")
    print("1. Review the output CSV file")
    print("2. Import into Google Sheets as MO-DB_CommsAssets")
    print("3. Add COMMS_ASSETS_SHEET_ID to MO-DB_Config")
    print("4. Deploy updated library and wrapper files")

if __name__ == '__main__':
    main()
