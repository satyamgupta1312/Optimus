# Optimus — Design Specification (All Screens)

> Auto-generated reference for the Optimus Mobile UI Builder CMS.
> React 19 + Vite 7 + Tailwind CSS 3.4 | No external UI libraries.

---

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `blue-600` | Buttons, active states, links |
| Neutral bg | `slate-50` | App background |
| Card bg | `white` | Panels, modals, sidebar |
| Input bg | `slate-800` | All form inputs (dark theme) |
| Border | `slate-200` | Cards, dividers (light context) |
| Border (dark) | `slate-700` | Input borders |
| Text primary | `slate-900` | Headings |
| Text secondary | `slate-500` | Helper text, labels |
| Text input | `slate-200` | Input text (dark bg) |
| Error | `red-500` | Error states, validation |
| Success | `green-500` | Approved, active badges |
| Warning | `amber-500` | Pending, UAT badge |
| Radius (card) | `rounded-xl` | Cards, modals |
| Radius (button) | `rounded-lg` | Buttons, inputs |
| Font body | `text-sm` (14px) | Body text |
| Font label | `text-xs` (12px) | Labels, badges |
| Icon lib | `lucide-react` | All icons |

---

## Screen 1: Login Page

**Path:** `src/components/Auth/LoginPage.jsx`
**Purpose:** Google OAuth login gate. Single CTA.

```
┌─────────────────────────────────────────┐
│              (gradient bg)              │
│                                         │
│          ┌───────────────────┐          │
│          │   Optimus Logo    │          │
│          │                   │          │
│          │  [Google Sign In] │          │
│          │                   │          │
│          │  "Mobile UI CMS"  │          │
│          └───────────────────┘          │
│                                         │
└─────────────────────────────────────────┘
```

**Component Tree:**
```
LoginPage
└── Card (centered, rounded-xl, shadow-2xl)
    ├── Logo image
    ├── Title + subtitle
    └── Google Sign In button (blue-600)
```

**Props/State:** None (uses `useAuth()` context)
**Mock Data:** N/A (Google OAuth)

---

## Screen 2: Main Canvas (3-Panel Layout)

**Path:** `src/components/Layout/MainLayout.jsx`
**Purpose:** Primary workspace — header + resizable sidebar + phone preview.

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] [UAT] [iOS/Android] [Undo][Redo] | [Queue][Users]    │
│         [Draft|Pending|Approved]          [Submit]  [Logout] │
├──────────────┬─┬─────────────────────────────────────────────┤
│  Sidebar     │▌│          Preview Area                       │
│  (420px)     │▌│      ┌─────────────────┐                    │
│              │▌│      │   PhoneFrame    │                    │
│  FetchWidget │▌│      │                 │                    │
│  Widget      │▌│      │  (masthead at   │                    │
│  Library     │▌│      │   top, widgets  │                    │
│  + Variant   │▌│      │   below)        │                    │
│  Picker      │▌│      └─────────────────┘                    │
│  + Property  │▌│                                             │
│  Editor      │▌│      (dot pattern background)               │
│  + Submit    │▌│                                             │
├──────────────┴─┴─────────────────────────────────────────────┤
│ [HelpGuide FAB]                                              │
└──────────────────────────────────────────────────────────────┘
```

**Component Tree:**
```
MainLayout
├── Header (h-16, sticky)
│   ├── Logo + UAT badge
│   ├── OS Switcher, Undo/Redo
│   ├── Queue button, Users button (super admin)
│   ├── Status filter tabs (Maker)
│   ├── Mapping button
│   ├── History button
│   ├── Workflow actions (Submit/Approve/Reject/Re-open)
│   └── User profile + Logout
├── Content (flex, overflow-hidden)
│   ├── Left Sidebar (resizable 280-800px)
│   │   └── Sidebar (FetchWidget + WidgetLibrary + PropertyEditor)
│   ├── Drag Handle (w-1, cursor-col-resize)
│   └── Right Workspace (flex-1, dot pattern bg)
│       └── PhoneFrame
├── ManageApprovalUsers modal (slide-in right)
├── HomepageMappingDashboard modal (slide-in right)
├── WidgetVersionHistory modal (slide-in right)
├── DeploymentStatusPanel modal (slide-in right)
└── HelpGuide (FAB)
```

**State:**
```js
showQueue, showManageUsers,
showMapping, showVersionHistory, showDeploy
```

---

## Screen 3: Widget Library Sidebar

**Path:** `src/components/Sidebar/WidgetLibrary.jsx`
**Purpose:** Add widgets to the phone preview. Shows a variant picker popup for widgets with variants.

```
┌──────────────────────────────┐
│ Widget Types                  │
│ ┌────────────────────┐ [+]   │
│ │ Masthead         ▼ │       │
│ └────────────────────┘       │
│                               │
│ ┌ ─ ─ Variant Picker ─ ─ ─ ┐│
│ │ Choose type to add     [x]││
│ │ ┌──────────────────────┐  ││
│ │ │ P  Primary      [+]  │  ││
│ │ │    Masthead — Primary │  ││
│ │ └──────────────────────┘  ││
│ │ ┌──────────────────────┐  ││
│ │ │ S  Secondary    [+]  │  ││
│ │ │    Masthead — Second. │  ││
│ │ └──────────────────────┘  ││
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│
└──────────────────────────────┘
```

**Flow:**
1. User selects widget type from dropdown
2. Clicks "+" button
3. If widget has variant properties (e.g., Masthead: primary/secondary, SPR: single/double row) → variant picker popup appears
4. User clicks desired variant → widget added with that variant pre-set in PNC
5. Widget is **auto-selected** → PropertyEditor opens immediately for the new widget
6. Variant is **locked at add time** — to get a different variant, add a new widget from the library

**Auto-select:** Both `addWithVariant()` and `addDirectly()` call `setSelectedWidgetId(newId)` using the ID returned by `addWidget()`.

**Component Tree:**
```
WidgetLibrary
├── Dropdown (select widget type)
├── Add button (+)
└── VariantPicker popup (conditional)
    └── VariantOption[] (clickable cards)
        ├── Initial letter badge
        ├── Variant label
        └── Plus icon
```

---

## Screen 4: Property Editor (Config-Driven Forms)

**Path:** `src/components/Sidebar/PropertyEditor.jsx`
**Purpose:** Edit selected widget's properties via config-driven form.

```
┌─────────────────────────────────┐
│ § PNC Properties (non-variant)  │
│ ┌──────────────────────────────┐│
│ │ ◯ Boolean Card option        ││
│ │   Description text           ││
│ └──────────────────────────────┘│
│ (Variant selectors hidden —     │
│  locked at add time via picker) │
│                                 │
│ § Content Settings              │
│ ┌──────────────────────────────┐│
│ │ Page Type   [▼ dropdown]     ││
│ │ Slug Name   [SlugBuilder]    ││
│ │ Title EN    [___________]    ││
│ │ Title HI    [___________]    ││
│ │ Products    [ProductList]    ││
│ │ Background  [ImageUpload]    ││
│ │ Video URL   [___________]    ││
│ │ Nested Editor (if any)       ││
│ └──────────────────────────────┘│
│                                 │
│ § App Config [▸ collapsed]      │
│ ┌──────────────────────────────┐│
│ │ ⚙ App Config            [▾] ││ ← click to expand
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ││
│ │ ADVANCED SETTINGS            ││
│ │ OOS Count   [0]              ││
│ │ PB Tag      [toggle]         ││
│ │ PB Reorder  [toggle]         ││
│ │                              ││
│ │ FILTERS                      ││
│ │ ▸ Widget Filters             ││
│ │ ▸ Item Filters               ││
│ │ ▸ Product Filters            ││
│ │                              ││
│ │ APP CONFIGURATION            ││
│ │ Android [✓] iOS [✓]         ││
│ │ Min Android [___]            ││
│ │ Max Android [___]            ││
│ │ Min iOS     [___]            ││
│ │ Max iOS     [___]            ││
│ └──────────────────────────────┘│
│                                 │
│ ────────────────────────────── │
│ ┌──────────────────────────────┐│
│ │  ✓  Save Widget             ││
│ └──────────────────────────────┘│
│  Skip — add another widget      │
│  without saving                  │
└─────────────────────────────────┘
```

**Submit Button Behavior:**
1. **"Save Widget"** — validates all visible fields via `ConfigValidator.validateWidget()`
2. If errors → shows toast with first error, stays on editor
3. If valid → shows success toast, deselects widget, scrolls sidebar to top
4. **"Skip"** — deselects widget without validation, returns to Widget Library
5. User can also click "← Widgets" breadcrumb or select another widget in preview to navigate away freely

**Variant Properties Hidden:** Properties with multiple options (variant selectors) are filtered out of Section 1 since they are locked at add time via the WidgetLibrary picker.

**Component Tree:**
```
PropertyEditor
├── Breadcrumb (← Widgets > Masthead (primary))
├── Section 1: PNC (non-variant only — ToggleInput / Card)
├── Section 2: Content Fields (via InputRegistry)
│   ├── SlugBuilder
│   ├── TextInput / NumberInput / UrlInput
│   ├── DateTimeInput
│   ├── ColorPicker
│   ├── ImageUpload
│   ├── PillSelector / ToggleInput
│   ├── ProductListInput
│   ├── ScrollItemEditor / CategoryItemEditor / CarouselItemEditor (nested)
│   └── ...
├── Section 3: App Config (collapsible toggle — Settings2 icon)
│   ├── Advanced Settings (NumberInput / ToggleInput)
│   ├── FilterEditor
│   └── AppConfigEditor
└── Section 4: Submit ("Save Widget" + "Skip" link)
```

---

## Screen 5: Phone Preview (Emulator)

**Path:** `src/components/Preview/PhoneFrame.jsx`
**Purpose:** Live widget preview in mobile phone frame.

```
        ┌───────────────────┐
        │ ▬▬▬ (notch)      │
        │┌─────────────────┐│
        ││ [PrimaryMasthead]││
        ││                  ││
        ││ [SPR Widget]     ││
        ││ ├── product cards││
        ││                  ││
        ││ [CollectionBan]  ││
        ││ ├── carousel     ││
        ││                  ││
        ││ [CategoryGrid]   ││
        ││ ├── 4-col grid   ││
        │└─────────────────┘│
        │    ● (home btn)   │
        └───────────────────┘
```

**Component Tree:**
```
PhoneFrame
├── Phone chrome (notch, bezels)
├── AppHeader (clickable → selects primary masthead)
│   └── PrimaryMasthead (synced from widgets[] via headerWidgets)
├── SecondaryMasthead banner (clickable → selects secondary masthead)
├── DragDropContext (contentWidgets — mastheads filtered out)
│   └── Droppable
│       └── WidgetRenderer[] (per widget)
│           ├── SingleProductRow
│           ├── CollectionBanner / BannerWithProductListing
│           └── CategoryGrid
└── Empty state prompt
```

**Masthead Preview:** Masthead widgets are filtered from the sortable list. They render in fixed positions — primary in the header, secondary below it. Clicking either area selects the masthead for editing in PropertyEditor.

---

## Screen 6: Fetch Widget Panel

**Path:** `src/components/FetchWidget.jsx`
**Purpose:** Fetch existing widget data from backend API.

```
┌──────────────────────────────────┐
│ Fetch Widget                     │
│ ┌──────────────────────────────┐ │
│ │ Widget/Item: [pills]         │ │
│ │ Slug: [________________]     │ │
│ │ [Fetch]                      │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ Result JSON (syntax colored) │ │
│ │ [Load into Editor]           │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

---

## Screen 7: Masthead Configuration (Config-Driven)

**Path:** Configured via `MastheadConfig.js` → rendered by `PropertyEditor.jsx`
**Purpose:** Masthead is now a config-driven widget. No separate modal — edited inline via PropertyEditor.

**How to add a Masthead:**
1. Select "Masthead" from Widget Library dropdown
2. Click "+" → variant picker shows: **Primary** or **Secondary**
3. Select variant → widget added with variant locked in PNC, **auto-selected**
4. PropertyEditor opens immediately — variant pills are **hidden** (already chosen)
5. Fill fields (slug, colors, media, dates; carousel items for secondary only; master_key for primary only)
6. Click **"Save Widget"** to validate and finalize, or **"Skip"** to move on without saving

**Variant is locked at add time.** To switch from Primary to Secondary (or vice versa), delete the existing masthead and add a new one from the Widget Library.

**Primary Masthead** renders at the top of the phone preview (AppHeader area).
**Secondary Masthead** renders as a banner below the header.

**Data sync:** `WidgetContext` syncs masthead widgets from `widgets[]` → `headerWidgets` automatically for preview rendering.

---

## Screen 8: Request Queue Dashboard

**Path:** `src/components/Dashboard/RequestQueue.jsx`
**Purpose:** Checker approves/rejects submitted widget batches.

```
┌─────────────────────────────────┐
│ Request Queue            [X]    │
│ [Pending] [History]             │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 👤 Maker Name               │ │
│ │ Submitted 2h ago            │ │
│ │ Status: ● PENDING           │ │
│ │                             │ │
│ │ Widgets:                    │ │
│ │ ☑ SPR — Rice Mela          │ │
│ │ ☑ Cat Grid — Dairy          │ │
│ │ ☐ Carousel — Weekly Sale    │ │
│ │                             │ │
│ │ [Preview] [Approve] [Reject]│ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ (next request card...)      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Screen 9: Manage Approval Users

**Path:** `src/components/AdminPanel/ManageApprovalUsers.jsx`
**Purpose:** Super admin adds/removes checker users.

```
┌─────────────────────────────────────────┐
│ ← Manage Approval Users          [X]   │
│ (gradient amber/orange header)          │
├─────────────────────────────────────────┤
│ Add Checker:                            │
│ [email@example.com______] [Add]         │
│                                         │
│ Current Checkers:                       │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 checker1@company.com    [Remove] │ │
│ │ 👤 checker2@company.com    [Remove] │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│                                  [Done] │
└─────────────────────────────────────────┘
```

---

## Screen 10: Homepage Mapping Dashboard

**Path:** `src/components/Dashboard/HomepageMappingDashboard.jsx`
**Purpose:** View all widgets from Prisma database, scoped by current environment.

```
┌───────────────────────────────────────────────────────────────────┐
│ ← Homepage Mappings  [PROD]                                [X]   │
│ (gradient green/teal header, env badge next to title)            │
├───────────────────────────────────────────────────────────────────┤
│ Search: [___________]  [Refresh]             12 widgets          │
├───────────────────────────────────────────────────────────────────┤
│ #  │ Slug                   │ Type   │ Title  │ Status│ Sort│ ...│
│ ───┼────────────────────────┼────────┼────────┼───────┼─────┼────│
│  1 │ rice_mela_spr_opt      │ SPR v2 │ Rice.. │ DRAFT │  0  │    │
│  2 │ dairy_cat_grid         │ Cat    │ Dairy..│ APPR. │  1  │    │
│  3 │ weekly_carousel        │ Carou  │ Week.. │ PEND. │  2  │    │
│ ───┼────────────────────────┼────────┼────────┼───────┼─────┼────│
│                                                                   │
│                    Page 1 of 3  [<] [1] [2] [3] [>]              │
└───────────────────────────────────────────────────────────────────┘
```

**Env Badge:** Header shows PROD/UAT badge next to "Homepage Mappings" title (amber for UAT, emerald for PROD). Data is auto-filtered — `LocalApiService` sends `X-Optimus-Env` header, backend returns only widgets matching `req.env`.

**Component Tree:**
```
HomepageMappingDashboard
├── Header (gradient green/teal + env badge)
├── Toolbar
│   ├── Search input
│   ├── Refresh button
│   └── Widget count
├── Table
│   ├── SortableHeader[] (React.memo)
│   └── Rows (from Prisma via LocalApiService.getWidgets())
│       └── Status badge (DRAFT/PENDING/APPROVED/REJECTED)
└── Pagination footer
```

**Props:** `{ onClose }`
**State:** `widgets, loading, searchQuery, sortKey, sortDir, currentPage`
**Data Source:** `LocalApiService.getWidgets()` (Prisma, env-scoped via `X-Optimus-Env` header)
**Optimizations:** `useCallback` on `formatTime`, `statusBadge`; `React.memo` on `SortableHeader`

---

## Screen 11: Widget Version History

**Path:** `src/components/Dashboard/WidgetVersionHistory.jsx`
**Purpose:** View, compare, preview, and restore previous widget versions.

```
┌───────────────────────────────────────────────────────────────────┐
│ ← Version History: {widgetSlug}                            [X]   │
│ (gradient indigo header)                                         │
├────────────────────┬──────────────────────────────────────────────┤
│ Timeline           │ Version 3 — Updated prods  [Restore]        │
│                    │                                              │
│  ● v3 (current)   │ [Diff] [Preview]                             │
│  │ 2h ago          │                                              │
│  │ satyam.gupta    │ ┌── Diff Tab ──────────────────────────────┐│
│  │ Updated prods   │ │  {                                       ││
│  │                 │ │    "title": "Rice Mela"                  ││
│  ○ v2             │ │  - "products": [101, 102]                ││
│  │ 1d ago          │ │  + "products": [101, 102, 103]          ││
│  │ checker1        │ │  }                                       ││
│  │ Approved        │ └──────────────────────────────────────────┘│
│  │                 │                                              │
│  ○ v1             │ ┌── Preview Tab (alt view) ─────────────────┐│
│    3d ago          │ │  v2 (Previous)      v3 (Selected)        ││
│    satyam.gupta    │ │  ┌──────────┐      ┌──────────┐         ││
│    Created         │ │  │[Widget   ]│      │[Widget   ]│        ││
│                    │ │  │ Render   ]│      │ Render   ]│        ││
│ [Load older vers.] │ │  └──────────┘      └──────────┘         ││
│                    │ └──────────────────────────────────────────┘│
├────────────────────┴──────────────────────────────────────────────┤
│ 20 versions loaded (more available)                       [Close]│
└───────────────────────────────────────────────────────────────────┘
```

**Component Tree:**
```
WidgetVersionHistory
├── Header (gradient indigo)
├── Content (2-panel split)
│   ├── Left: Timeline
│   │   ├── TimelineEntry[] (React.memo, clickable)
│   │   │   ├── Version badge + "current" label
│   │   │   ├── Timestamp (relative)
│   │   │   ├── User (email prefix)
│   │   │   └── Change log
│   │   └── "Load older versions" button (cursor pagination)
│   └── Right: Tab Switcher + Content
│       ├── Tab: [Diff] [Preview]
│       ├── Diff tab: JSON diff (green/red lines, memoized)
│       ├── Preview tab: side-by-side SnapshotPreview
│       │   ├── Left: previous version visual render (if exists)
│       │   └── Right: selected version visual render
│       └── Restore button (for non-current versions)
└── Footer (version count + hasMore indicator)
```

**New Component:** `SnapshotPreview.jsx` — Visual widget renderer from version snapshot
- Maps `snapshot.type` to component (SingleProductRow, CollectionBanner, etc.)
- Same componentMap as `WidgetRenderer.jsx` (config-driven + legacy + Prisma type names)
- Wraps in stub `WidgetContext.Provider` (no-op functions)
- 360px wide container (phone width, scaled 0.85x)

**Props:** `{ widgetId, widgetSlug, onClose, onRestore }`
**State:** `versions, loading, loadingMore, hasMore, nextCursor, selectedVersion, rightTab`
**Data Source:** `LocalApiService.getWidgetVersions(id, { limit, cursor })` — paginated
**Optimizations:** `React.memo` on `TimelineEntry`; `useMemo` on diff + parsed snapshots; `useCallback` on `formatTime`

---

## Screen 12: Deployment Status Panel (NEW)

**Path:** `src/components/Dashboard/DeploymentStatusPanel.jsx`
**Purpose:** Show real-time deploy progress and per-widget results.

```
┌───────────────────────────────────────────────────────────────────┐
│ ← Deployment Status                                        [X]   │
│ (gradient blue/cyan header)                                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Progress: ████████████░░░░  8/12 widgets                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ ✅ rice_mela_spr_opt         — Deployed successfully       │  │
│  │ ✅ dairy_cat_grid            — Deployed successfully       │  │
│  │ ❌ weekly_carousel           — Error: slug conflict        │  │
│  │    └─ [▸ View Log]           [Retry]                       │  │
│  │ ⏭ namkeen_dspr              — Skipped (dependency)        │  │
│  │ ⏳ fresh_fruits_spr          — Deploying...                │  │
│  │ ○  snacks_carousel           — Pending                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│ 8 succeeded · 1 failed · 1 skipped · 2 pending        [Close]   │
└───────────────────────────────────────────────────────────────────┘
```

**Component Tree:**
```
DeploymentStatusPanel
├── Header (gradient blue/cyan)
├── Progress bar (N/M, animated)
├── Results list
│   └── ResultRow[]
│       ├── Status icon (CheckCircle/XCircle/SkipForward/Loader)
│       ├── Widget slug + name
│       ├── Status message
│       ├── Expandable log viewer (monospace, bg-slate-900)
│       └── Retry button (if failed)
└── Footer (summary counts + Close)
```

**Props:** `{ results, onClose, onRetry }`
**State:** `expandedLogs`
**Mock Data:** `src/data/mockDeployResults.js`

---

## Screen 13: Activity Log Panel

**Path:** `src/components/ActivityLogPanel.jsx`
**Purpose:** In-memory audit trail of all user actions.

```
┌─────────────────────────────────┐
│ Activity Log              [X]   │
├─────────────────────────────────┤
│ [All] [Widgets] [Workflow]      │
│                                 │
│ 10:42  Added SPR widget         │
│ 10:41  Updated title            │
│ 10:39  Submitted for review     │
│ 10:35  Created new page         │
│ ...                             │
│                                 │
│ Showing 24 of 100 entries       │
│ [Export JSON]                   │
└─────────────────────────────────┘
```

---

## Screen 14: Widget Comments Panel

**Path:** `src/components/WidgetComments.jsx`
**Purpose:** Per-widget comment thread for maker/checker communication.

```
┌─────────────────────────────────┐
│ Comments: {widgetName}    [X]   │
├─────────────────────────────────┤
│                                 │
│ 👤 Checker — 2h ago            │
│ "Please update product list"   │
│                                 │
│ 👤 Maker — 1h ago              │
│ "Done, added 5 new products"   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Type a comment...     [Send]│ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## New Component Interfaces

### ProductListInput
```jsx
// Props (InputRegistry interface)
{ label, value: string[], onChange: (codes: string[]) => void, error, helperText, required,
  minItems, maxItems, itemValidator }
```

### SelectInput
```jsx
// Props (InputRegistry interface)
{ label, value, onChange, options: [{label, value, description?}], error, helperText, required }
```

### StateProductEditor
```jsx
// Props (InputRegistry interface)
{ label, value: {global: string, [state]: string}, onChange, helperText, error, required, disabled }
// Uses STATE_DEFINITIONS from MastheadConfig
// Click-outside listener closes the "Add State" dropdown
```

### FilterEditor
```jsx
// Props
{ config: {widget, item, product}, value: object, onChange }
```

### AppConfigEditor
```jsx
// Props
{ config: appConfigurations, value: object, onChange }
```

### ScrollItemEditor
```jsx
// Props (InputRegistry interface)
{ label, value: ScrollItem[], onChange, helperText, itemSchema }
```

### CategoryItemEditor
```jsx
// Props (InputRegistry interface)
{ label, value: CategoryItem[], onChange, helperText, itemSchema }
```

### CarouselItemEditor
```jsx
// Props (InputRegistry interface)
{ label, value: CarouselItem[], onChange, helperText, itemSchema }
```

### SubCategoryList (shared)
```jsx
// Props
{ items: SubCategory[], onChange, itemSchema }
```

---

## Mock Data Shapes

### mockHomepageMappings.js
```js
[{
  id: 1,
  widget_id: 5735,
  widget__slug_name: 'rice_mela_spr_opt',
  widgetType: 'single_product_row_v2',
  heading: 'Rice Mela',
  level_tag: 'state',
  level_property: 'jharkhand',
  priority: 1,
  widget__start_time: '2026-01-01T00:00:00Z',
  widget__end_time: '2026-12-31T23:59:59Z',
  updated_at: '2026-02-15T10:30:00Z',
  widget__deactivated_flag: false,
}]
```

### mockVersionHistory.js
```js
[{
  version: 3,
  timestamp: '2026-02-20T10:00:00Z',
  user: 'satyam.gupta@apnamart.in',
  changeLog: 'Updated product list',
  snapshot: { title: 'Rice Mela', products: [101, 102, 103], pnc: {...} },
}]
```

### mockDeployResults.js
```js
[{
  widgetId: 'w1',
  slug: 'rice_mela_spr_opt',
  name: 'Rice Mela',
  status: 'success', // 'success' | 'error' | 'skipped' | 'pending' | 'deploying'
  message: 'Deployed successfully',
  log: ['Step 1: Created page layout...', ...],
  error: null,
}]
```

### mockProducts.js
```js
[{
  item_code: 100001,
  name: 'Tata Salt 1kg',
  mrp: 28,
  sp: 25,
  discount: 11,
  category: 'Grocery',
  sub_category: 'Salt & Sugar',
  image: '/placeholder-product.png',
  in_stock: true,
}]
```

---

## Integration Points

| Component | Context | Service |
|-----------|---------|---------|
| LoginPage | `useAuth()` | Google OAuth |
| MainLayout | `useAuth()`, `useWidgetContext()`, `useAppSettings()` | — |
| PropertyEditor | `useWidgetContext()` | `WidgetRegistry`, `InputRegistry`, `ConfigValidator` |
| PhoneFrame | `useWidgetContext()` | DnD library |
| RequestQueue | `useAuth()` | `LocalApiService` |
| HomepageMappingDashboard | — | `LocalApiService.getWidgets()` (env-scoped via `X-Optimus-Env` header) |
| WidgetVersionHistory | — | `LocalApiService.getWidgetVersions()` (paginated: limit + cursor) |
| DeploymentStatusPanel | — | Mock data (future: BackendSyncService) |
| FilterEditor | — | Widget config `filters` |
| AppConfigEditor | — | Widget config `appConfigurations` |
