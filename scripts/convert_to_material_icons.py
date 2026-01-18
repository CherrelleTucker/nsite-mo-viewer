#!/usr/bin/env python3
"""
Convert Feather Icons to Material Icons
========================================
Replaces all Feather icon usages with Google Material Icons for better stability.

Changes:
- <span data-feather="icon-name"></span> -> <span class="material-icons">icon_name</span>
- Removes feather.replace() calls
- Updates dynamic icon insertions in JavaScript
"""

import re
from pathlib import Path

# Feather to Material Icons mapping
ICON_MAP = {
    # Common icons
    'users': 'group',
    'user': 'person',
    'user-check': 'how_to_reg',
    'user-x': 'person_off',
    'info': 'info',
    'file-text': 'description',
    'file': 'insert_drive_file',
    'calendar': 'calendar_today',
    'alert-circle': 'error',
    'alert-triangle': 'warning',
    'search': 'search',
    'plus': 'add',
    'eye': 'visibility',
    'external-link': 'open_in_new',
    'folder': 'folder',
    'chevron-down': 'expand_more',
    'chevron-up': 'expand_less',
    'chevron-right': 'chevron_right',
    'chevron-left': 'chevron_left',
    'database': 'storage',
    'check-circle': 'check_circle',
    'check-square': 'check_box',
    'bar-chart-2': 'bar_chart',
    'refresh-cw': 'refresh',
    'message-square': 'chat',
    'grid': 'grid_view',
    'clock': 'schedule',
    'shield': 'security',
    'mail': 'email',
    'inbox': 'inbox',
    'home': 'home',
    'flag': 'flag',
    'download': 'download',
    'compass': 'explore',
    'columns': 'view_column',
    'briefcase': 'work',
    'zap': 'flash_on',
    'x': 'close',
    'x-circle': 'cancel',
    'phone': 'phone',
    'maximize-2': 'fullscreen',
    'map-pin': 'place',
    'map': 'map',
    'lock': 'lock',
    'list': 'list',
    'layout': 'dashboard',
    'edit': 'edit',
    'edit-2': 'edit',
    'edit-3': 'edit',
    'book': 'menu_book',
    'video': 'videocam',
    'trending-up': 'trending_up',
    'tool': 'build',
    'tag': 'label',
    'table': 'table_chart',
    'star': 'star',
    'share-2': 'share',
    'server': 'dns',
    'send': 'send',
    'repeat': 'repeat',
    'play-circle': 'play_circle',
    'pie-chart': 'pie_chart',
    'monitor': 'monitor',
    'layers': 'layers',
    'globe': 'public',
    'git-merge': 'merge',
    'github': 'code',
    'git-branch': 'account_tree',
    'filter': 'filter_list',
    'dollar-sign': 'attach_money',
    'cpu': 'memory',
    'award': 'emoji_events',
    'archive': 'archive',
    # Additional mappings
    'settings': 'settings',
    'save': 'save',
    'trash': 'delete',
    'trash-2': 'delete',
    'copy': 'content_copy',
    'link': 'link',
    'link-2': 'link',
    'help-circle': 'help',
    'more-vertical': 'more_vert',
    'more-horizontal': 'more_horiz',
}

def convert_static_icons(content):
    """Convert static data-feather attributes to Material Icons."""
    def replace_icon(match):
        icon_name = match.group(1)
        material_icon = ICON_MAP.get(icon_name, icon_name.replace('-', '_'))
        return f'<span class="material-icons">{material_icon}</span>'

    # Replace <span data-feather="icon-name"></span>
    pattern = r'<span[^>]*data-feather="([^"]+)"[^>]*></span>'
    return re.sub(pattern, replace_icon, content)

def convert_dynamic_icons(content):
    """Convert dynamic icon insertions in JavaScript."""
    # Pattern: data-feather="' + variable + '"
    # This needs special handling - convert to class="material-icons">' + variable + '<

    # Replace patterns like: data-feather="' + icon + '"
    content = re.sub(
        r'data-feather="\'\s*\+\s*(\w+)\s*\+\s*\'"',
        r'class="material-icons">\' + \1 + \'<',
        content
    )

    # Also handle: <span data-feather="' + iconVar + '"></span>
    content = re.sub(
        r'<span([^>]*)data-feather="\'\s*\+\s*(\w+)\s*\+\s*\'"([^>]*)></span>',
        r'<span\1class="material-icons"\3>\' + \2 + \'</span>',
        content
    )

    return content

def remove_feather_calls(content):
    """Remove feather.replace() calls."""
    # Remove standalone feather.replace();
    content = re.sub(r'\s*feather\.replace\(\);\s*', '\n', content)

    # Remove if blocks that only call feather.replace
    content = re.sub(
        r'if\s*\([^)]*\)\s*\{\s*feather\.replace\(\);\s*\}',
        '',
        content
    )

    return content

def update_icon_mapping_in_js(content):
    """Update JavaScript code that builds icons dynamically."""
    # This handles cases where icons are mapped in JS objects
    for feather_name, material_name in ICON_MAP.items():
        # Replace string literals
        content = content.replace(f"'{feather_name}'", f"'{material_name}'")
        content = content.replace(f'"{feather_name}"', f'"{material_name}"')

    return content

def process_file(filepath):
    """Process a single HTML file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Apply conversions
    content = convert_static_icons(content)
    content = convert_dynamic_icons(content)
    content = remove_feather_calls(content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    deploy_dir = Path(__file__).parent.parent / 'deploy'

    print("Converting Feather Icons to Material Icons")
    print("=" * 50)

    html_files = list(deploy_dir.glob('*.html'))
    modified = 0

    for filepath in html_files:
        if process_file(filepath):
            print(f"  Updated: {filepath.name}")
            modified += 1
        else:
            print(f"  Skipped: {filepath.name} (no changes)")

    print(f"\nModified {modified} files")
    print("\nRemember to:")
    print("1. Add Material Icons CSS to index.html")
    print("2. Remove Feather Icons script from index.html")
    print("3. Update any remaining dynamic icon code")

if __name__ == '__main__':
    main()
