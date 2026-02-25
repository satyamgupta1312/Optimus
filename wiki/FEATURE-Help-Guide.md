# Help Guide (Interactive SOP)

## Overview

The **Help Guide** is a floating button (bottom-right corner) that provides step-by-step Standard Operating Procedures for every feature in Optimus. It is fully config-driven — all guide content lives in `HelpGuideConfig.js`, and the component (`HelpGuide.jsx`) renders it without any inline data.

**Where**: Floating `?` button, bottom-right of every page
**How**: Click to open guide selector → pick a category → step through instructions
**Config**: `src/config/Feature/HelpGuideConfig.js`
**Component**: `src/components/HelpGuide.jsx`

---

## Guide Categories

| # | Category | ID | Color | Icon | Content |
|---|----------|----|-------|------|---------|
| 1 | Widget SOPs | `widget-sops` | Indigo | Wrench | 3 sub-guides (Product Rail, Collection Banner, Masthead) |
| 2 | General Creation Flow | `creation-flow` | Blue | Sparkles | 6-step overview of widget creation |
| 3 | Approval Workflow | `workflow` | Purple | Zap | 4-step maker-checker-deploy flow |
| 4 | Dashboard Tools | `dashboard-tools` | Teal | LayoutDashboard | 4 sub-guides (History, Mapping, State Manager, Fetch) |
| 5 | Deployment Guide | `deployment` | Amber | Rocket | 4-step deploy lifecycle |
| 6 | Tips & Tricks | `tips-tricks` | Green | Lightbulb | 5 productivity tips |

---

## Widget SOPs

### Product Rail (6 steps)

1. **Select PNC** — Layout (1/2 rows), Optimized toggle, Multimedia (auto-set)
2. **Page Type & Slug** — PLP or Category Page, unique slug identifier
3. **Title & Products** — English/Hindi titles, comma-separated product codes
4. **State-Wise Products** — Global (required) + state-specific overrides
5. **Background Media** — Optional image/video upload (enables Multimedia variant)
6. **App Config & Submit** — Advanced settings, filters, platform constraints, submit

### Collection Banner (5 steps)

1. **Select PNC** — Scroll (carousel) or Stick (category grid) mode
2. **Slug & Title** — Slug, English title, Hindi title (Stick), media number (Scroll)
3. **Carousel/Category Items** — Scroll: 1-50 carousel items; Stick: 1-20 category items
4. **Sub-Categories & State Products** — Stick: nested sub-categories with state products
5. **App Config & Submit** — Advanced settings, filters, submit

### Masthead (5 steps)

1. **Select PNC** — Primary (category icons) or Secondary (promotional carousel)
2. **Slug** — Unique identifier, auto-generates multimedia slug
3. **Multimedia & Colors** — Background media, transition/accent/text/icon colors, dark theme
4. **Master Key / Carousel Items** — Primary: master key link; Secondary: nested carousel items
5. **App Config & Submit** — Filters, version constraints, submit

---

## General Creation Flow

| Step | Action | Description |
|------|--------|-------------|
| 1 | Select Widget Type | Choose Product Rail, Collection Banner, or Masthead from the Widget Library |
| 2 | Configure PNC | Select variant properties (pills, toggles) that determine the widget variant |
| 3 | Fill Content Fields | Slug, title, products, media — required fields vary by widget type |
| 4 | State Products / Nested Items | Global products (required), state overrides, nested carousel/category items |
| 5 | App Config (Optional) | Advanced settings, filters (3 levels), platform toggles, version constraints |
| 6 | Submit for Approval | Click "Save Request" — widget enters PENDING status for Checker review |

---

## Approval Workflow

| Step | Actor | Action |
|------|-------|--------|
| 1 | Maker | Create widgets in DRAFT mode → Submit via Selection Modal → Status: PENDING |
| 2 | Checker | Review submitted widgets → Approve or Reject → Rejected returns to Maker |
| 3 | System | One-click deployment → 3-layer CSV generation → Backend API creates widgets |
| 4 | Maker | Map deployed widget to page via Homepage Mapping → Widget goes live |

---

## Dashboard Tools

### Widget History
- Browse saved widget configs by date
- In-memory cache for fast browsing
- Load any entry to canvas for editing (creates new draft, preserves original)

### Homepage Mapping
- View all widgets currently mapped to the homepage
- Environment-scoped (dev/staging/production)
- Shows widget type, slug, priority, position

### State Manager
- View and manage available states (Global, Jharkhand, Chhattisgarh, etc.)
- Each state has a unique slug suffix (e.g. `_jh`, `_cg`)
- Shared configuration across all widget types supporting state-wise products

### Fetch Widget
- Enter a widget slug to load an existing deployed widget
- Loads into Property Editor with all data populated
- Edit and re-submit as new request (non-destructive)

---

## Deployment Guide

| Step | Phase | Description |
|------|-------|-------------|
| 1 | Pre-Deploy | Verify Approved status, required fields, state products, media uploads |
| 2 | Execute | One-click deploy triggers backend automation pipeline |
| 3 | CSV Mapping | System generates 3-layer CSV: Widget → Items → Products |
| 4 | Post-Deploy | Verify in Homepage Mapping, Fetch Widget, and emulator preview |

---

## Tips & Tricks

1. **Keyboard Shortcuts** — Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo, drag to reorder
2. **Image Upload** — Drag & drop, clipboard paste, JPG/PNG/WEBP/GIF, max 5MB
3. **Product Search** — Type code + Enter to search catalog, auto-populates details
4. **Slug Auto-Generation** — Generated from title, lowercase + underscores, manually overridable
5. **Widget Duplication** — Clone widgets via copy icon, drag to reorder, priority auto-updates

---

## How to Update

All guide content is in **`src/config/Feature/HelpGuideConfig.js`**. No component changes needed.

### Add a new guide category
1. Add a new object to the `GUIDE_CATEGORIES` array
2. Include: `id`, `title`, `icon` (string key), `color` (key from `GUIDE_COLORS`), `steps` array
3. Optionally add `subGuides` for categories with nested topics
4. If using a new icon, add it to `ICON_MAP` in `HelpGuide.jsx`

### Add a new color
1. Add a new key to `GUIDE_COLORS` with Tailwind gradient classes
2. Use the key in your guide category's `color` field

### Modify existing content
1. Find the category in `GUIDE_CATEGORIES` by `id`
2. Edit `steps[].title`, `steps[].description`, `steps[].tip`
3. For sub-guides, edit within the `subGuides` array

---

## Config Reference

### Exports from `HelpGuideConfig.js`

| Export | Type | Description |
|--------|------|-------------|
| `GUIDE_COLORS` | `Object<string, string>` | Tailwind gradient classes keyed by color name |
| `GUIDE_CATEGORIES` | `Array<GuideCategory>` | All 6 guide categories with steps and sub-guides |
| `RELATED_FILES` | `Object` | File paths to related configs and wiki docs |

### GuideCategory shape

```
{
  id: string,           // Unique identifier
  title: string,        // Display title
  icon: string,         // Key into ICON_MAP (e.g. 'Wrench', 'Sparkles')
  color: string,        // Key into GUIDE_COLORS (e.g. 'indigo', 'blue')
  steps: Step[],        // Array of step objects
  subGuides?: SubGuide[] // Optional nested guides (e.g. Widget SOPs, Dashboard Tools)
}
```

### Step shape

```
{
  title: string,        // Step title
  description: string,  // Markdown-compatible description (supports **bold**, bullet lists)
  tip?: string          // Optional "Pro Tip" shown in amber callout box
}
```

---

## Related Documentation

- [Create Widget — User Selection Journey](./STEP-Create-Widget.md) — Detailed field-by-field creation flow
- [Maker-Checker Approval Workflow](./Feature-Maker-Checker.md) — Approval process deep-dive
- [Fetch & Edit Widgets](./FEATURE-Fetch-Widget.md) — Fetch Widget tool docs
- [Widget Mapping](./Feature-Mapping-Widget.md) — Homepage mapping process
- [Deployment Lifecycle](./PROCESS-Deployment-Lifecycle.md) — Full deploy pipeline
- [Widget Drag & Drop](./FEATURE-WIDGET-drag-and-drop.md) — Emulator reorder docs
