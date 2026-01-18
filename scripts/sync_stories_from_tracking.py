#!/usr/bin/env python3
"""
Sync Stories from NSITE Story Tracking Workbook
================================================
Pulls story data from multiple sheets in the NSITE Story Tracking workbook
and transforms it into the MO-DB_Stories schema.

Source: NSITE Story Tracking.xlsx (at STORIES_SHEET_ID in Google Sheets)
Target: MO-DB_Stories.xlsx

Sheets processed:
- Impact Story Pipeline -> content_type: 'story'
- Web Content -> content_type: 'web_content'
- Social Media -> content_type: 'social_media'
- NuggetFeatured Slide -> content_type: 'nugget'
- Key Dates -> content_type: 'key_date'
- Science Advancement Stories -> content_type: 'science_advancement'

Usage:
    python sync_stories_from_tracking.py [--input PATH] [--output PATH]
"""

import pandas as pd
import argparse
from datetime import datetime
from pathlib import Path
import re


def generate_story_id(counter, content_type):
    """Generate unique story ID based on content type."""
    prefix_map = {
        'story': 'STORY',
        'web_content': 'WEB',
        'social_media': 'SOCIAL',
        'nugget': 'NUG',
        'key_date': 'DATE',
        'science_advancement': 'SCI'
    }
    prefix = prefix_map.get(content_type, 'STORY')
    return f"{prefix}-{counter:03d}"


def normalize_status(status_value):
    """Normalize status values to standard enum."""
    if pd.isna(status_value) or not status_value:
        return 'idea'

    status_str = str(status_value).lower().strip()

    # Map various status terms to standard values
    status_map = {
        'under review': 'review',
        'in review': 'review',
        'review': 'review',
        'proposed': 'idea',
        'idea': 'idea',
        'researching': 'researching',
        'research': 'researching',
        'drafting': 'drafting',
        'draft': 'drafting',
        'writing': 'drafting',
        'published': 'published',
        'posted': 'published',
        'live': 'published',
        'archived': 'archived',
        'cancelled': 'archived',
        'on hold': 'idea'
    }

    return status_map.get(status_str, 'idea')


def parse_date(date_value):
    """Parse various date formats to YYYY-MM-DD string."""
    if pd.isna(date_value) or not date_value:
        return ''

    if isinstance(date_value, datetime):
        return date_value.strftime('%Y-%m-%d')

    # Try common date formats
    date_str = str(date_value).strip()
    formats = ['%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%B %d, %Y', '%b %d, %Y']

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue

    return date_str  # Return as-is if can't parse


def extract_url_from_hyperlink(cell_value):
    """Extract URL from cell that might be a hyperlink or plain text."""
    if pd.isna(cell_value):
        return ''

    cell_str = str(cell_value)

    # Check for markdown-style link
    match = re.search(r'\[.*?\]\((https?://[^\)]+)\)', cell_str)
    if match:
        return match.group(1)

    # Check for plain URL
    match = re.search(r'(https?://\S+)', cell_str)
    if match:
        return match.group(1)

    return ''


def process_impact_story_pipeline(df, counter_start):
    """Process Impact Story Pipeline sheet."""
    stories = []
    counter = counter_start

    # Expected columns: Title, Date of Idea, Date of Last Update, Status, Link to Slide, Source, Notes
    for idx, row in df.iterrows():
        title = row.get('Title', '')
        if pd.isna(title) or not str(title).strip():
            continue

        counter += 1
        stories.append({
            'story_id': generate_story_id(counter, 'story'),
            'title': str(title).strip(),
            'content_type': 'story',
            'status': normalize_status(row.get('Status', '')),
            'solution_id': '',
            'solution_names': '',
            'channel': 'Internal',
            'platform': 'Presentation',
            'author': '',
            'comms_poc': '',
            'pitch_doc_url': extract_url_from_hyperlink(row.get('Link to Slide', '')),
            'published_url': '',
            'target_date': '',
            'publish_date': '',
            'idea_date': parse_date(row.get('Date of Idea', '')),
            'last_updated': parse_date(row.get('Date of Last Update', '')),
            'timeliness_notes': '',
            'notes': f"Source: {row.get('Source', '')}. {row.get('Notes', '')}".strip('. '),
            'source_sheet': 'Impact Story Pipeline',
            'source_row': idx + 2,  # +2 for 1-based index + header row
            'created_date': datetime.now().strftime('%Y-%m-%d')
        })

    return stories, counter


def process_web_content(df, counter_start):
    """Process Web Content sheet."""
    stories = []
    counter = counter_start

    # Columns: Solution(s), Hyperlinked Title, Status, Pitch document, Primary outlet,
    #          Author(s), Comms POC, Published link, Publish date, Cross-posting,
    #          Social media, Timeliness consideration, Notes
    for idx, row in df.iterrows():
        title = row.get('Hyperlinked Title', '')
        if pd.isna(title) or not str(title).strip():
            continue

        counter += 1
        stories.append({
            'story_id': generate_story_id(counter, 'web_content'),
            'title': str(title).strip(),
            'content_type': 'web_content',
            'status': normalize_status(row.get('Status', '')),
            'solution_id': '',
            'solution_names': str(row.get('Solution(s)', '')).strip() if not pd.isna(row.get('Solution(s)', '')) else '',
            'channel': str(row.get('Primary outlet', 'Earthdata')).strip() if not pd.isna(row.get('Primary outlet', '')) else 'Earthdata',
            'platform': 'Website',
            'author': str(row.get('Author(s)', '')).strip() if not pd.isna(row.get('Author(s)', '')) else '',
            'comms_poc': str(row.get('Comms POC', '')).strip() if not pd.isna(row.get('Comms POC', '')) else '',
            'pitch_doc_url': extract_url_from_hyperlink(row.get('Pitch document', '')),
            'published_url': extract_url_from_hyperlink(row.get('Published link ', '')),
            'target_date': '',
            'publish_date': parse_date(row.get('Publish date', '')),
            'idea_date': '',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'timeliness_notes': str(row.get('Timeliness consideration', '')).strip() if not pd.isna(row.get('Timeliness consideration', '')) else '',
            'notes': f"Cross-posting: {row.get('Cross-posting', '')}. Social: {row.get('Social media', '')}. {row.get('Notes', '')}".strip('. '),
            'source_sheet': 'Web Content',
            'source_row': idx + 2,
            'created_date': datetime.now().strftime('%Y-%m-%d')
        })

    return stories, counter


def process_social_media(df, counter_start):
    """Process Social Media sheet."""
    stories = []
    counter = counter_start

    # Columns: Publish date, Published Link/Content Summary, Featured Solution(s),
    #          Platform, Comms POC, Status, Cross-posting, Notes
    for idx, row in df.iterrows():
        content = row.get('Published Link/Content Summary', '')
        if pd.isna(content) or not str(content).strip():
            continue

        counter += 1
        # Use content as title (truncated)
        title = str(content).strip()[:100] + ('...' if len(str(content)) > 100 else '')

        stories.append({
            'story_id': generate_story_id(counter, 'social_media'),
            'title': title,
            'content_type': 'social_media',
            'status': normalize_status(row.get('Status', '')),
            'solution_id': '',
            'solution_names': str(row.get('Featured Solution(s)', '')).strip() if not pd.isna(row.get('Featured Solution(s)', '')) else '',
            'channel': 'Social Media',
            'platform': str(row.get('Platform', '')).strip() if not pd.isna(row.get('Platform', '')) else '',
            'author': '',
            'comms_poc': str(row.get('Comms POC', '')).strip() if not pd.isna(row.get('Comms POC', '')) else '',
            'pitch_doc_url': '',
            'published_url': extract_url_from_hyperlink(content),
            'target_date': '',
            'publish_date': parse_date(row.get('Publish date', '')),
            'idea_date': '',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'timeliness_notes': '',
            'notes': f"Cross-posting: {row.get('Cross-posting', '')}. {row.get('Notes', '')}".strip('. '),
            'source_sheet': 'Social Media',
            'source_row': idx + 2,
            'created_date': datetime.now().strftime('%Y-%m-%d')
        })

    return stories, counter


def process_nugget_slides(df, counter_start):
    """Process NuggetFeatured Slide sheet."""
    stories = []
    counter = counter_start

    # Columns: Date (hyperlink to slide), Title/Summary, Featured Solution(s),
    #          Forum/context, Leadership feedback, Notes
    for idx, row in df.iterrows():
        title = row.get('Title/Summary', '')
        if pd.isna(title) or not str(title).strip():
            continue

        counter += 1
        stories.append({
            'story_id': generate_story_id(counter, 'nugget'),
            'title': str(title).strip(),
            'content_type': 'nugget',
            'status': 'published',  # Nuggets are typically already presented
            'solution_id': '',
            'solution_names': str(row.get('Featured Solution(s)', '')).strip() if not pd.isna(row.get('Featured Solution(s)', '')) else '',
            'channel': 'Internal',
            'platform': 'Presentation',
            'author': '',
            'comms_poc': '',
            'pitch_doc_url': extract_url_from_hyperlink(row.get('Date (hyperlink to slide)', '')),
            'published_url': '',
            'target_date': '',
            'publish_date': parse_date(row.get('Date (hyperlink to slide)', '')),
            'idea_date': '',
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'timeliness_notes': '',
            'notes': f"Forum: {row.get('Forum/context for slide (nugget, part of a broader strategy presentation, etc.)', '')}. Feedback: {row.get('Leadership feedback, if any', '')}. {row.get('Notes/reflections for next time', '')}".strip('. '),
            'source_sheet': 'NuggetFeatured Slide',
            'source_row': idx + 2,
            'created_date': datetime.now().strftime('%Y-%m-%d')
        })

    return stories, counter


def process_key_dates(df, counter_start):
    """Process Key Dates sheet."""
    stories = []
    counter = counter_start

    # Columns: Date, Milestone (hyperlink if relevant), Related Solution(s), Additional Notes
    for idx, row in df.iterrows():
        milestone = row.get('Milestone (hyperlink if relevant)', '')
        if pd.isna(milestone) or not str(milestone).strip():
            continue

        counter += 1
        stories.append({
            'story_id': generate_story_id(counter, 'key_date'),
            'title': str(milestone).strip(),
            'content_type': 'key_date',
            'status': 'idea',  # Key dates are opportunities
            'solution_id': '',
            'solution_names': str(row.get('Related Solution(s)', '')).strip() if not pd.isna(row.get('Related Solution(s)', '')) else '',
            'channel': '',
            'platform': '',
            'author': '',
            'comms_poc': '',
            'pitch_doc_url': extract_url_from_hyperlink(milestone),
            'published_url': '',
            'target_date': parse_date(row.get('Date', '')),
            'publish_date': '',
            'idea_date': datetime.now().strftime('%Y-%m-%d'),
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'timeliness_notes': str(row.get('Additional Notes', '')).strip() if not pd.isna(row.get('Additional Notes', '')) else '',
            'notes': '',
            'source_sheet': 'Key Dates',
            'source_row': idx + 2,
            'created_date': datetime.now().strftime('%Y-%m-%d')
        })

    return stories, counter


def process_science_advancement(df, counter_start):
    """Process Science Advancement Stories sheet."""
    stories = []
    counter = counter_start

    # Columns: Project, Related Files, Notes
    for idx, row in df.iterrows():
        project = row.get('Project', '')
        if pd.isna(project) or not str(project).strip():
            continue

        counter += 1
        stories.append({
            'story_id': generate_story_id(counter, 'science_advancement'),
            'title': str(project).strip(),
            'content_type': 'science_advancement',
            'status': 'idea',
            'solution_id': '',
            'solution_names': '',
            'channel': '',
            'platform': '',
            'author': '',
            'comms_poc': '',
            'pitch_doc_url': extract_url_from_hyperlink(row.get('Related Files', '')),
            'published_url': '',
            'target_date': '',
            'publish_date': '',
            'idea_date': datetime.now().strftime('%Y-%m-%d'),
            'last_updated': datetime.now().strftime('%Y-%m-%d'),
            'timeliness_notes': '',
            'notes': str(row.get('Notes', '')).strip() if not pd.isna(row.get('Notes', '')) else '',
            'source_sheet': 'Science Advancement Stories',
            'source_row': idx + 2,
            'created_date': datetime.now().strftime('%Y-%m-%d')
        })

    return stories, counter


def main():
    parser = argparse.ArgumentParser(description='Sync stories from NSITE Story Tracking workbook')
    parser.add_argument('--input', '-i',
                        default='source-archives/raw-exports/NSITE Story Tracking.xlsx',
                        help='Path to NSITE Story Tracking workbook')
    parser.add_argument('--output', '-o',
                        default='database-files/MO-Viewer Databases/MO-DB_Stories.xlsx',
                        help='Path to output MO-DB_Stories file')
    args = parser.parse_args()

    # Resolve paths
    base_dir = Path(__file__).parent.parent.parent  # Go up to MO-development
    input_path = base_dir / args.input
    output_path = base_dir / args.output

    print(f"Reading from: {input_path}")
    print(f"Writing to: {output_path}")

    all_stories = []
    counter = 0

    # Process each sheet
    sheet_processors = [
        ('Impact Story Pipeline', process_impact_story_pipeline),
        ('Web Content', process_web_content),
        ('Social Media', process_social_media),
        ('NuggetFeatured Slide', process_nugget_slides),
        ('Key Dates', process_key_dates),
        ('Science Advancement Stories', process_science_advancement),
    ]

    for sheet_name, processor in sheet_processors:
        try:
            df = pd.read_excel(input_path, sheet_name=sheet_name)
            stories, counter = processor(df, counter)
            print(f"  {sheet_name}: {len(stories)} stories extracted")
            all_stories.extend(stories)
        except Exception as e:
            print(f"  {sheet_name}: Error - {e}")

    # Create DataFrame and save
    if all_stories:
        result_df = pd.DataFrame(all_stories)

        # Ensure column order
        columns = [
            'story_id', 'title', 'content_type', 'status', 'solution_id',
            'solution_names', 'channel', 'platform', 'author', 'comms_poc',
            'pitch_doc_url', 'published_url', 'target_date', 'publish_date',
            'idea_date', 'last_updated', 'timeliness_notes', 'notes',
            'admin_priorities', 'source_sheet', 'source_row', 'created_date'
        ]
        # Add admin_priorities column if missing (for stories without priority tags)
        if 'admin_priorities' not in result_df.columns:
            result_df['admin_priorities'] = ''
        result_df = result_df[columns]

        # Save to Excel
        result_df.to_excel(output_path, index=False, sheet_name='Stories')

        print(f"\n=== SYNC COMPLETE ===")
        print(f"Total stories: {len(all_stories)}")
        print(f"Output: {output_path}")

        # Summary by content type
        print("\nBy content type:")
        for ct in result_df['content_type'].unique():
            count = len(result_df[result_df['content_type'] == ct])
            print(f"  {ct}: {count}")

        # Summary by status
        print("\nBy status:")
        for status in result_df['status'].unique():
            count = len(result_df[result_df['status'] == status])
            print(f"  {status}: {count}")
    else:
        print("\nNo stories found to sync.")


if __name__ == '__main__':
    main()
