# MO-Viewer Style Guide

This document defines the UI patterns, components, and CSS conventions for the MO-Viewer platform. **Always check this guide before creating new UI components.**

---

## Table of Contents

1. [CSS Variables](#css-variables)
2. [Component Patterns](#component-patterns)
   - [Panels](#panels)
   - [Section Headers](#section-headers)
   - [Buttons](#buttons)
   - [View Toggles](#view-toggles)
   - [Filter Chips](#filter-chips)
   - [Filter Search](#filter-search)
   - [Stats Cards](#stats-cards)
   - [Forms](#forms)
   - [Modals](#modals)
3. [Page Layout](#page-layout)
4. [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## CSS Variables

All styling must use CSS variables defined in `styles.html`. **Never use hardcoded values.**

### Colors
```css
/* Primary brand colors */
--color-primary: #0B3D91;
--color-primary-light: #1E5BB8;
--color-primary-dark: #082B66;

/* Page accent colors */
--color-implementation: #2E7D32;
--color-sep: #1565C0;
--color-comms: #7B1FA2;

/* Semantic colors */
--color-success: #2E7D32;
--color-warning: #ED6C02;
--color-error: #D32F2F;
--color-info: #0288D1;

/* Surface colors */
--color-bg: #F5F5F5;
--color-surface: #FFFFFF;
--color-surface-alt: #FAFAFA;

/* Border colors */
--color-border: #E0E0E0;
--color-border-light: #F0F0F0;
--color-border-dark: #BDBDBD;

/* Text colors */
--color-text: #212121;
--color-text-secondary: #666666;
--color-text-muted: #999999;

/* Gray scale (for subtle backgrounds) */
--color-gray-50: #FAFAFA;
--color-gray-100: #F5F5F5;
--color-gray-200: #EEEEEE;

/* Status colors */
--color-status-pending: #F59E0B;
--color-status-not-started: #6B7280;
--color-status-in-progress: #3B82F6;
--color-status-done: #10B981;
```

### Spacing
```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-xxl: 48px;
```

### Typography
```css
--font-size-xs: 11px;
--font-size-sm: 13px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-xxl: 24px;
```

### Other
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 2px 8px rgba(0,0,0,0.1);
--shadow-lg: 0 4px 16px rgba(0,0,0,0.15);

--transition-fast: 150ms ease;
--transition-normal: 250ms ease;
```

---

## Component Patterns

All shared components are defined in `shared-page-styles.html`.

### Panels

Use for any content container/card.

**HTML:**
```html
<div class="panel">
  <div class="panel-header">
    <h3>Panel Title</h3>
    <button class="btn btn-sm">Action</button>
  </div>
  <div class="panel-content">
    <!-- Content here -->
  </div>
</div>
```

**With accent border (page-colored top border):**
```html
<div class="panel" style="border-top: 3px solid var(--page-accent);">
```

**CSS (already defined):**
```css
.panel {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface-alt);
  border-bottom: 1px solid var(--color-border-light);
}

.panel-content {
  padding: var(--space-md);
}
```

---

### Section Headers

Use inside panels or sections for titles with actions.

**HTML:**
```html
<div class="section-header">
  <h2>Section Title</h2>
  <button class="btn btn-primary btn-sm">Add Item</button>
</div>
```

**CSS (already defined):**
```css
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-header h2 {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin: 0;
}
```

---

### Buttons

**Classes:**
- `.btn` - Base button class (required)
- `.btn-primary` - Primary action (uses page accent color)
- `.btn-secondary` - Secondary action (white with border)
- `.btn-sm` - Small size variant

**HTML:**
```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>
<button class="btn btn-primary btn-sm">Small Primary</button>
```

**Full-width button:**
```html
<button class="btn btn-primary btn-full">Full Width</button>
```

**CSS (already defined):**
```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--page-accent, var(--color-primary));
  color: white;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
}

.btn-full {
  width: 100%;
  justify-content: center;
}
```

---

### View Toggles

Toggle button groups for switching views.

**HTML:**
```html
<div class="view-toggle">
  <button class="view-btn active" data-view="grid">
    <span class="material-icons">grid_view</span>
    <span>Grid</span>
  </button>
  <button class="view-btn" data-view="list">
    <span class="material-icons">list</span>
    <span>List</span>
  </button>
</div>
```

**Compact variant (icon-only, for inline use):**
```html
<div class="view-toggle view-toggle-compact">
  <button class="view-btn active" data-view="grid">
    <span class="material-icons">grid_view</span>
  </button>
  <button class="view-btn" data-view="list">
    <span class="material-icons">list</span>
  </button>
</div>
```

**CSS (already defined):**
```css
.view-toggle {
  display: flex;
  gap: 2px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2px;
  box-shadow: var(--shadow-sm);
}

.view-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.view-btn.active {
  background: var(--page-accent, var(--color-primary));
  color: white;
}

.view-toggle-compact .view-btn {
  padding: var(--space-xs) var(--space-sm);
  gap: 0;
}
```

---

### Filter Chips

Pill-shaped filter buttons.

**HTML:**
```html
<div class="filter-chips">
  <button class="chip active" data-filter="all">All</button>
  <button class="chip" data-filter="open">Open</button>
  <button class="chip" data-filter="done">Done</button>
</div>
```

**CSS (already defined):**
```css
.filter-chips {
  display: flex;
  gap: var(--space-xs);
}

.chip {
  padding: var(--space-xs) var(--space-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 20px;
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chip.active {
  background: var(--page-accent, var(--color-text));
  border-color: var(--page-accent, var(--color-text));
  color: white;
}
```

---

### Filter Search

Search input with icon.

**HTML:**
```html
<div class="filter-search">
  <span class="material-icons">search</span>
  <input type="text" placeholder="Search...">
</div>
```

**CSS (already defined):**
```css
.filter-search {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-search .material-icons {
  position: absolute;
  left: var(--space-sm);
  font-size: 16px;
  color: var(--color-text-muted);
  pointer-events: none;
}

.filter-search input {
  padding: var(--space-xs) var(--space-sm) var(--space-xs) 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-surface);
}
```

---

### Stats Cards

Statistics display in a row.

**HTML:**
```html
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-icon"><span class="material-icons">task_alt</span></div>
    <div class="stat-info">
      <span class="stat-value">42</span>
      <span class="stat-label">Open Tasks</span>
    </div>
  </div>
  <!-- More stat cards... -->
</div>
```

**Variants:**
- `.stat-warning` - Orange icon background
- `.stat-success` - Green icon background
- `.stat-kudos` - Pink icon background

**CSS (already defined):**
```css
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--page-accent) 10%, transparent);
  border-radius: var(--radius-md);
  color: var(--page-accent);
}
```

---

### Forms

**HTML:**
```html
<div class="form-group">
  <label for="field-id">Field Label</label>
  <input type="text" id="field-id" placeholder="Enter value...">
</div>

<div class="form-group">
  <label for="select-id">Select Label</label>
  <select id="select-id">
    <option value="">Choose...</option>
  </select>
</div>

<div class="form-group">
  <label for="textarea-id">Textarea Label</label>
  <textarea id="textarea-id" rows="3"></textarea>
</div>
```

**Two-column layout:**
```html
<div class="form-row">
  <div class="form-group">
    <label>Field 1</label>
    <input type="text">
  </div>
  <div class="form-group">
    <label>Field 2</label>
    <input type="text">
  </div>
</div>
```

**Rich text field (contenteditable):**
```html
<div class="form-group">
  <label>Notes</label>
  <div class="rich-text-field" contenteditable="true" data-placeholder="Enter notes..."></div>
</div>
```

**CRITICAL: Rich text fields MUST have:**
- `background: #fff` (explicit white, not variable)
- `border: 1px solid var(--color-border)`
- Without these, the field will be invisible!

**CSS (already defined):**
```css
.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-bottom: var(--space-xs);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-surface);
}

.rich-text-field {
  width: 100%;
  min-height: 80px;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff; /* MUST be explicit #fff */
  font-size: var(--font-size-sm);
}
```

---

### Modals

**HTML:**
```html
<div class="modal-overlay" id="myModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Modal Title</h3>
      <button class="modal-close" onclick="closeModal('myModal')" aria-label="Close">
        <span class="material-icons">close</span>
      </button>
    </div>
    <div class="modal-body">
      <!-- Form content -->
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal('myModal')">Cancel</button>
      <button class="btn btn-primary" onclick="submitForm()">Save</button>
    </div>
  </div>
</div>
```

**Show/hide with JavaScript:**
```javascript
function showModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}
```

**CSS (already defined):**
```css
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  padding: var(--space-xl);
  overflow-y: auto;
  justify-content: center;
  align-items: flex-start;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 500px;
  margin-top: var(--space-xxl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
}

.modal-body {
  padding: var(--space-md);
}
```

---

## Page Layout

Each page should set `--page-accent` on its viewer container:

```css
.team-viewer {
  --page-accent: var(--color-primary);
  max-width: 1600px;
  margin: 0 auto;
}

.sep-viewer {
  --page-accent: var(--color-sep);
}

.comms-viewer {
  --page-accent: var(--color-comms);
}

.implementation-viewer {
  --page-accent: var(--color-implementation);
}
```

**Standard page structure:**
```html
<div class="[page]-viewer">
  <!-- Page Header -->
  <div class="page-header">
    <div class="page-title">
      <h1>Page Name</h1>
    </div>
    <div class="page-actions">
      <div class="view-toggle">...</div>
      <button class="btn btn-primary">Add</button>
    </div>
  </div>

  <!-- Stats Row (optional) -->
  <div class="stats-row">...</div>

  <!-- View Panels -->
  <div class="view-panel active" id="gridView">...</div>
  <div class="view-panel" id="listView">...</div>
</div>
```

---

## Common Mistakes to Avoid

### 1. Hardcoded colors
```css
/* BAD */
background: #F5F5F5;

/* GOOD */
background: var(--color-bg);
```

### 2. Missing form field backgrounds
```css
/* BAD - invisible contenteditable */
.rich-text-field {
  border: 1px solid #ccc;
}

/* GOOD - visible */
.rich-text-field {
  background: #fff;
  border: 1px solid var(--color-border);
}
```

### 3. Undefined CSS variables
Always check `styles.html` for existing variables before creating new ones.

### 4. Not using shared components
Check `shared-page-styles.html` before writing new CSS. Use existing classes:
- `.panel`, `.panel-header`, `.panel-content`
- `.section-header`
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`
- `.view-toggle`, `.view-btn`
- `.filter-chips`, `.chip`
- `.form-group`, `.form-row`
- `.modal-overlay`, `.modal-content`
- `.stats-row`, `.stat-card`

### 5. Inconsistent z-index
```css
/* Standard z-index hierarchy */
.modal-overlay { z-index: 1000; }
.modal-content { z-index: 1001; }
.toast { z-index: 10001; }
.skip-link { z-index: 10000; }
```

### 6. Missing focus states for accessibility
All interactive elements should have `:focus-visible` styles. These are defined globally in `shared-page-styles.html`.

### 7. Inline styles instead of classes
```html
<!-- BAD -->
<div style="padding: 16px; background: white;">

<!-- GOOD -->
<div class="panel panel-content">
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `styles.html` | CSS variables (colors, spacing, typography) |
| `shared-page-styles.html` | Shared component patterns |
| `[page].html` | Page-specific styles (only what's unique) |

**Before creating new styles:**
1. Check `styles.html` for existing variables
2. Check `shared-page-styles.html` for existing components
3. Only add page-specific CSS for truly unique layouts
