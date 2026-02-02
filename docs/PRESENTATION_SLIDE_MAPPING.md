# Presentation Builder: Speaker Notes Metadata Guide

This document explains how to configure slide metadata for the Presentation Builder feature in MO Viewer.

## Overview

The Presentation Builder generates customized Google Slides presentations by:
1. Copying a boilerplate template
2. Filtering slides based on **metadata in speaker notes**
3. Replacing `{{placeholders}}` with solution-specific data

The metadata in each slide's speaker notes controls which slides appear for each audience, solution, and agency.

---

## Speaker Notes Metadata Format

Add metadata to each slide's **speaker notes** using this format:

```
Slide: [section], [topic/title]
Audience: [internal], [external]
solution: [solution_id], [all]
agency: [agency_name], [all]
```

### Field Descriptions

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `Slide:` | No | section, title | Reference info (section name, slide topic) |
| `Audience:` | Yes | `internal`, `external`, or both | Who sees this slide |
| `solution:` | No | solution_id(s) or `all` | Which solutions this slide applies to |
| `agency:` | No | agency name(s) or `all` | Which agencies this slide applies to |

### Examples

**Slide for all audiences and solutions:**
```
Slide: Overview, NASA SNWG Role
Audience: internal, external
solution: all
agency: all
```

**Slide for internal audience only:**
```
Slide: SEP Process, Co-design Workshop
Audience: internal
solution: all
agency: all
```

**Slide for external audience only:**
```
Slide: Impact, Success Stories
Audience: external
solution: all
agency: all
```

**Slide for specific solutions:**
```
Slide: Solutions, HLS Overview
Audience: internal, external
solution: hls, hls_ll, hls_vi
agency: all
```

**Slide for specific agency:**
```
Slide: Partner Spotlight, USGS Collaboration
Audience: external
solution: all
agency: USGS
```

**Slide for specific solution AND agency:**
```
Slide: Case Study, OPERA Water
Audience: external
solution: opera_dswx
agency: USGS, NOAA
```

---

## Default Behavior

If a slide has **no metadata** in speaker notes:
- Included for **all** audiences (internal and external)
- Included for **all** solutions
- Included for **all** agencies

This means you only need to add metadata to slides that should be filtered.

---

## Setup Instructions

### Step 1: Configure the Template ID

Add this row to **MO-DB_Config**:

| key | value |
|-----|-------|
| `BOILERPLATE_SLIDES_ID` | `<your-google-slides-template-id>` |

Get the template ID from the Google Slides URL:
```
https://docs.google.com/presentation/d/TEMPLATE_ID_HERE/edit
```

### Step 2: Add Metadata to Slides

For each slide in your template:

1. Open the slide
2. View → Speaker notes (or click the speaker notes area at bottom)
3. Add metadata lines following the format above
4. Save

### Step 3: Add Placeholders (Optional)

Add `{{field_name}}` placeholders anywhere in your slides where you want solution-specific data:

| Placeholder | Replaced With |
|-------------|---------------|
| `{{core_official_name}}` | Solution name |
| `{{core_id}}` | Solution ID |
| `{{earthdata_purpose}}` | Purpose/description |
| `{{earthdata_societal_impact}}` | Impact statement |
| `{{team_lead}}` | Project lead |
| `{{GENERATED_DATE}}` | Today's date (full) |
| `{{GENERATED_YEAR}}` | Current year |

---

## How Filtering Works

When a user generates a presentation:

1. **Audience Filter**: If slide has `Audience: internal` and user selected "External", slide is removed
2. **Solution Filter**: If slide has `solution: hls, opera` and user selected a different solution, slide is removed
3. **Agency Filter**: If slide has `agency: USGS` and the solution's agency is different, slide is removed

A slide is **included** only if it passes ALL applicable filters.

---

## Maintenance

### Adding a New Slide

1. Create the slide in the template
2. Add speaker notes metadata
3. No code changes or deployment needed

### Changing Slide Filtering

1. Edit the slide's speaker notes
2. Update the `Audience:`, `solution:`, or `agency:` lines
3. Changes take effect immediately

### Verifying Configuration

Run `getTemplateInfo()` from Apps Script to see:
- Total slides in template
- Slides by audience type
- Detailed metadata for each slide

```javascript
function testTemplateInfo() {
  var result = getTemplateInfo();
  Logger.log(JSON.stringify(result, null, 2));
}
```

---

## Common Patterns

### Section Divider Slides

Include for all but document the section:
```
Slide: SECTION DIVIDER, Solutions Overview
Audience: internal, external
solution: all
```

### Internal Process Slides

SEP, onboarding, assessment details:
```
Slide: SEP, Stakeholder Engagement Process
Audience: internal
solution: all
```

### External Impact Slides

Success stories, case studies:
```
Slide: Impact, User Success Story
Audience: external
solution: all
```

### Solution-Specific Slides

Only show for certain solutions:
```
Slide: Technical, OPERA Product Details
Audience: internal, external
solution: opera_dswx, opera_dist
```

### Agency-Specific Slides

Partner spotlights, collaborations:
```
Slide: Partners, NOAA Integration
Audience: external
solution: all
agency: NOAA
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| All slides included | No metadata in speaker notes | Add `Audience:` line to slides that should be filtered |
| Wrong slides filtered | Typo in metadata | Check spelling of `internal`, `external`, solution IDs |
| Slide not appearing | Multiple filters excluding it | Check that slide passes audience AND solution AND agency |
| Placeholders not replaced | Wrong syntax | Use exactly `{{field_name}}` with double curly braces |

---

## Quick Reference

**Metadata Format:**
```
Slide: [section], [title]
Audience: internal, external
solution: all
agency: all
```

**Audience Values:** `internal`, `external`, or both (comma-separated)

**Solution Values:** `all` or specific solution IDs (comma-separated)

**Agency Values:** `all` or specific agency names (comma-separated)

**Config Key:** `BOILERPLATE_SLIDES_ID` = Google Slides template ID
