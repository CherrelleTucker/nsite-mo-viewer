#!/usr/bin/env python3
"""
Extract Earthdata Solution Content for Database Merge
======================================================
Extracts key fields from earthdata-solutions-content.json into a CSV
that can be merged into MO-DB_Solutions database.

Output columns:
- solution_key: The key used in the JSON (e.g., "Air Quality", "HLS")
- solution_name: Full solution name from earthdata
- earthdata_url: Link to earthdata.nasa.gov solution page
- purpose_mission: Purpose/mission statement
- thematic_areas: Comma-separated thematic areas
- platform: Platform(s) used
- temporal_frequency: How often data is collected
- horizontal_resolution: Spatial resolution
- geographic_domain: Coverage area
- societal_impact: Impact statement
"""

import json
import csv
from pathlib import Path


def extract_thematic_areas(characteristics: dict) -> str:
    """Extract thematic areas from solution characteristics."""
    if not characteristics:
        return ""

    thematic = characteristics.get("thematic_areas", "")
    if isinstance(thematic, list):
        return ", ".join(thematic)
    return str(thematic) if thematic else ""


def extract_platform(characteristics: dict) -> str:
    """Extract platform(s) from solution characteristics."""
    if not characteristics:
        return ""

    # Check both 'platform' and 'platforms' keys
    platform = characteristics.get("platform") or characteristics.get("platforms", "")
    if isinstance(platform, list):
        return ", ".join(platform)
    return str(platform) if platform else ""


def main():
    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    database_dir = project_dir.parent / "database-files"

    input_file = database_dir / "earthdata-solutions-content.json"
    output_file = database_dir / "earthdata-content-for-merge.csv"

    print(f"Reading from: {input_file}")

    if not input_file.exists():
        print(f"ERROR: Input file not found: {input_file}")
        return

    # Load JSON
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    solutions = data.get("solutions", {})
    print(f"Found {len(solutions)} solutions")

    # Prepare CSV data
    rows = []
    for solution_key, content in solutions.items():
        chars = content.get("solution_characteristics", {})

        row = {
            "solution_key": solution_key,
            "solution_name": content.get("name", ""),
            "earthdata_url": content.get("url", ""),
            "purpose_mission": content.get("purpose_mission", ""),
            "thematic_areas": extract_thematic_areas(chars),
            "platform": extract_platform(chars),
            "temporal_frequency": chars.get("temporal_frequency", ""),
            "horizontal_resolution": chars.get("horizontal_resolution", ""),
            "geographic_domain": chars.get("geographic_domain") or chars.get("geographic_coverage", ""),
            "societal_impact": content.get("societal_impact", ""),
        }
        rows.append(row)

    # Sort by solution_key
    rows.sort(key=lambda x: x["solution_key"])

    # Write CSV
    fieldnames = [
        "solution_key", "solution_name", "earthdata_url", "purpose_mission",
        "thematic_areas", "platform", "temporal_frequency", "horizontal_resolution",
        "geographic_domain", "societal_impact"
    ]

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to: {output_file}")

    # Print summary
    print("\nSolution keys in output:")
    for row in rows[:10]:
        print(f"  - {row['solution_key']}: {row['solution_name'][:50]}...")
    if len(rows) > 10:
        print(f"  ... and {len(rows) - 10} more")

    # Also create a simplified JSON for script properties
    simple_content = {}
    for solution_key, content in solutions.items():
        chars = content.get("solution_characteristics", {})
        simple_content[solution_key] = {
            "name": content.get("name", ""),
            "purpose_mission": content.get("purpose_mission", ""),
            "thematic_areas": extract_thematic_areas(chars),
            "societal_impact": content.get("societal_impact", ""),
            "solution_characteristics": {
                "platform": extract_platform(chars),
                "temporal_frequency": chars.get("temporal_frequency", ""),
                "horizontal_resolution": chars.get("horizontal_resolution", ""),
                "geographic_domain": chars.get("geographic_domain") or chars.get("geographic_coverage", ""),
            }
        }

    # Write simplified JSON
    simple_output = database_dir / "earthdata-content-simplified.json"
    with open(simple_output, "w", encoding="utf-8") as f:
        json.dump(simple_content, f, indent=2)

    print(f"\nWrote simplified JSON to: {simple_output}")
    print("(This can be loaded into Google Apps Script Properties)")


if __name__ == "__main__":
    main()
