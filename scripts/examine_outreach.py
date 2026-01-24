"""Examine outreach tracker workbook structure."""
import pandas as pd
from pathlib import Path

source = Path(__file__).parent.parent.parent / "source-archives" / "raw-exports" / "Potential Events & Outreach Ideas _ Tracker.xlsx"
print(f"Reading: {source}")

xl = pd.ExcelFile(source)
print(f"Sheets: {xl.sheet_names}")
print()

for sheet in xl.sheet_names:
    df = xl.parse(sheet)
    print(f"=== {sheet} ===")
    print(f"Rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")
    print()
    if len(df) > 0:
        print("Sample row:")
        for col, val in df.iloc[0].items():
            print(f"  {col}: {val}")
    print()
