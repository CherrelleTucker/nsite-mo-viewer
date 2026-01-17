"""Create blank MO-DB_Actions database file with schema headers."""

import pandas as pd
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent.parent / "database-files" / "MO-Viewer Databases"
OUTPUT_FILE = OUTPUT_DIR / "MO-DB_Actions.xlsx"

SCHEMA_COLUMNS = [
    "action_id",          # Primary key (ACT_YYYYMMDD_XXXX)
    "source_document",    # Name/title of source document (e.g., "Weekly Internal Planning Meeting")
    "source_date",        # Date of the agenda tab where action was captured (e.g., "2025-01-13")
    "source_url",         # Full URL to source document
    "category",           # MO, SEP, DevSeed, Assessment, AdHoc
    "solution",           # Solution name if action is solution-specific, else category default (MO, SEP, Impl, Comms)
    "status",             # not_started, in_progress, done, blocked
    "assigned_to",        # Person(s) responsible
    "task",               # Task description
    "due_date",           # Optional due date
    "priority",           # high, medium, low
    "notes",              # Additional context
    "created_at",         # When extracted/created
    "updated_at",         # Last status change
    "created_by",         # Who/what created it
]

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
df = pd.DataFrame(columns=SCHEMA_COLUMNS)
df.to_excel(OUTPUT_FILE, index=False, sheet_name="Actions")
print(f"Created: {OUTPUT_FILE}")
