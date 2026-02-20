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
│  [Configure  │▌│      │                 │                    │
│   Header]    │▌│      │   (widgets)     │                    │
│              │▌│      │                 │                    │
│  Widget      │▌│      └─────────────────┘                    │
│  Library     │▌│                                             │
│  + Property  │▌│      (dot pattern background)               │
│  Editor      │▌│                                             │
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
│   ├── Mapping button (NEW)
│   ├── History button (NEW)
│   ├── Workflow actions (Submit/Approve/Reject/Re-open)
│   └── User profile + Logout
├── Content (flex, overflow-hidden)
│   ├── Left Sidebar (resizable 280-800px)
│   │   ├── Header Config trigger
│   │   └── Sidebar (WidgetLibrary + PropertyEditor)
│   ├── Drag Handle (w-1, cursor-col-resize)
│   └── Right Workspace (flex-1, dot pattern bg)
│       └── PhoneFrame
├── HeaderConfiguration modal (slide-in left)
├── ManageApprovalUsers modal (slide-in right)
├── HomepageMappingDashboard modal (NEW, slide-in right)
├── WidgetVersionHistory modal (NEW, slide-in right)
├── DeploymentStatusPanel modal (NEW, slide-in right)
└── HelpGuide (FAB)
```

**State:**
```js
showQueue, showHeaderConfig, showManageUsers,
showMapping, showVersionHistory, showDeploy  // NEW
```

---

## Screen 3: Widget Library Sidebar

**Path:** `src/components/Sidebar/WidgetLibrary.jsx`
**Purpose:** Drag source for adding widgets to the phone preview.

```
┌──────────────────────────────┐
│ Widget Library                │
│ ──────────────────────────── │
│ ┌──────────┐ ┌──────────┐   │
│ │ Product  │ │Collection│   │
│ │  Rail    │ │ Banner   │   │
│ └──────────┘ └──────────┘   │
│ ┌──────────┐                 │
│ │ Masthead │                 │
│ │          │                 │
│ └──────────┘                 │
└──────────────────────────────┘
```

**Component Tree:**
```
WidgetLibrary
└── Grid (2-col)
    └── WidgetCard[] (draggable)
        ├── Icon (lucide)
        ├── Label
        └── Description (text-xs)
```

---

## Screen 4: Property Editor (Config-Driven Forms)

**Path:** `src/components/Sidebar/PropertyEditor.jsx`
**Purpose:** Edit selected widget's properties via config-driven form.

```
┌─────────────────────────────────┐
│ § Variant Properties (PNC)      │
│ ┌──────────────────────────────┐│
│ │ [pill1] [pill2] (selected)   ││
│ └──────────────────────────────┘│
│ ┌──────────────────────────────┐│
│ │ ◯ Boolean Card option        ││
│ │   Description text           ││
│ └──────────────────────────────┘│
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
│ § Advanced Settings             │
│ ┌──────────────────────────────┐│
│ │ OOS Count   [0]             ││
│ │ PB Tag      [toggle]        ││
│ │ PB Reorder  [toggle]        ││
│ └──────────────────────────────┘│
│                                 │
│ § Filters (NEW)                 │
│ ┌──────────────────────────────┐│
│ │ ▸ Widget Filters             ││
│ │ ▸ Item Filters               ││
│ │ ▸ Product Filters            ││
│ └──────────────────────────────┘│
│                                 │
│ § App Config (NEW)              │
│ ┌──────────────────────────────┐│
│ │ Android [✓] iOS [✓]         ││
│ │ Min Android [___]            ││
│ │ Max Android [___]            ││
│ │ Min iOS     [___]            ││
│ │ Max iOS     [___]            ││
│ └──────────────────────────────┘│
└─────────────────────────────────┘
```

**Component Tree:**
```
PropertyEditor
├── Section 1: PNC (PillSelector / ToggleInput / Card)
├── Section 2: Content Fields (via InputRegistry)
│   ├── SelectInput
│   ├── SlugBuilder
│   ├── TextInput
│   ├── ProductListInput
│   ├── ImageUpload
│   ├── UrlInput
│   ├── ScrollItemEditor / CategoryItemEditor / CarouselItemEditor (nested)
│   └── ...
├── Section 3: Advanced (NumberInput / ToggleInput)
├── Section 4: FilterEditor (NEW)
└── Section 5: AppConfigEditor (NEW)
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
├── DragDropContext
│   └── Droppable
│       └── WidgetRenderer[] (per widget)
│           ├── SingleProductRow
│           ├── PrimaryMasthead / SecondaryMasthead
│           ├── CollectionBanner / BannerWithProductListing
│           └── CategoryGrid
└── Empty state prompt
```

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

## Screen 7: Header Configuration Modal

**Path:** `src/components/Sidebar/HeaderConfiguration.jsx`
**Purpose:** Configure Primary + Secondary Masthead (header widgets).

```
┌─────────────────────────────────────────┐
│ ← Header Configuration          [X]    │
│ (gradient purple/blue header)           │
├─────────────────────────────────────────┤
│                                         │
│ § Primary Masthead                      │
│ ┌─────────────────────────────────────┐ │
│ │ Slug     [_______________]          │ │
│ │ Media    [Upload / drop]            │ │
│ │ Video    [_______________]          │ │
│ │ Colors   [🎨][🎨][🎨][🎨]          │ │
│ │ Key      [____]                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ § Secondary Masthead                    │
│ ┌─────────────────────────────────────┐ │
│ │ Slug     [_______________]          │ │
│ │ Media    [Upload / drop]            │ │
│ │ Carousel Items:                     │ │
│ │  ▸ Item 1 (accordion)              │ │
│ │  ▸ Item 2                          │ │
│ │  [+ Add Item]                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ Changes saved automatically    [Done]   │
└─────────────────────────────────────────┘
```

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

## Screen 10: Homepage Mapping Dashboard (NEW)

**Path:** `src/components/Dashboard/HomepageMappingDashboard.jsx`
**Purpose:** View all widget-to-homepage mappings across environments.

```
┌───────────────────────────────────────────────────────────────────┐
│ ← Homepage Mappings                                        [X]   │
│ (gradient green/teal header)                                     │
├───────────────────────────────────────────────────────────────────┤
│ [PROD] [UAT]  Location: [▼ All]  Search: [_________] [Refresh]  │
├───────────────────────────────────────────────────────────────────┤
│ #  │ Widget Slug            │ Type   │ Heading │ Level │ Pri │ Status│
│ ───┼────────────────────────┼────────┼─────────┼───────┼─────┼───────│
│  1 │ rice_mela_spr_opt      │ SPR v2 │ Rice..  │ state │  1  │ ● Act │
│  2 │ dairy_cat_grid         │ Cat    │ Dairy.. │ global│  2  │ ● Act │
│  3 │ weekly_carousel        │ Carou  │ Week.. │ state │  3  │ ○ Inac│
│  4 │ ...                    │        │         │       │     │       │
│ ───┼────────────────────────┼────────┼─────────┼───────┼─────┼───────│
│                                                                   │
│                    Page 1 of 3  [<] [1] [2] [3] [>]              │
└───────────────────────────────────────────────────────────────────┘
```

**Component Tree:**
```
HomepageMappingDashboard
├── Header (gradient green/teal)
├── Toolbar
│   ├── Environment pills (PROD/UAT)
│   ├── Location selector dropdown
│   ├── Search input
│   └── Refresh button
├── Table
│   ├── Sortable column headers
│   └── Rows (from mock data)
│       ├── Status badge (Active=green / Inactive=slate)
│       └── Click handler → navigate to widget editor
└── Pagination footer
```

**Props:** `{ onClose }`
**State:** `env, locationFilter, searchQuery, sortKey, sortDir, currentPage`
**Mock Data:** `src/data/mockHomepageMappings.js` — 20+ rows

---

## Screen 11: Widget Version History (NEW)

**Path:** `src/components/Dashboard/WidgetVersionHistory.jsx`
**Purpose:** View and restore previous widget versions.

```
┌───────────────────────────────────────────────────────────────────┐
│ ← Version History: {widgetSlug}                            [X]   │
│ (gradient indigo header)                                         │
├────────────────────┬──────────────────────────────────────────────┤
│ Timeline           │ Diff Viewer                                 │
│                    │                                              │
│  ● v3 (current)   │  {                                           │
│  │ 2h ago          │    "title": "Rice Mela"                     │
│  │ satyam.gupta    │  - "products": [101, 102]                   │
│  │ Updated prods   │  + "products": [101, 102, 103]              │
│  │                 │    "pnc": { ... }                            │
│  ○ v2             │  }                                           │
│  │ 1d ago          │                                              │
│  │ checker1        │                                              │
│  │ Approved        │                                              │
│  │                 │                                              │
│  ○ v1             │        [Restore This Version]                │
│    3d ago          │                                              │
│    satyam.gupta    │                                              │
│    Created         │                                              │
│                    │                                              │
├────────────────────┴──────────────────────────────────────────────┤
│                                                           [Close]│
└───────────────────────────────────────────────────────────────────┘
```

**Component Tree:**
```
WidgetVersionHistory
├── Header (gradient indigo)
├── Content (2-panel split)
│   ├── Left: Timeline
│   │   └── VersionDot[] (clickable)
│   │       ├── Version badge
│   │       ├── Timestamp
│   │       ├── User
│   │       └── Change log
│   └── Right: DiffViewer
│       ├── JSON diff (green/red lines)
│       └── Restore button
└── Footer
```

**Props:** `{ widgetId, widgetSlug, onClose }`
**State:** `selectedVersion, versions`
**Mock Data:** `src/data/mockVersionHistory.js` — 5-6 versions per widget

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
// Props
{ label, value: {global: string, [state]: string}, onChange, helperText }
// Uses STATE_DEFINITIONS from MastheadConfig
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
| RequestQueue | `useAuth()` | `GoogleSheetService` |
| HomepageMappingDashboard | — | Mock data (future: HOMEPAGE_VIEW_API) |
| WidgetVersionHistory | — | Mock data (future: GET /widgets/:id/versions) |
| DeploymentStatusPanel | — | Mock data (future: BackendSyncService) |
| FilterEditor | — | Widget config `filters` |
| AppConfigEditor | — | Widget config `appConfigurations` |
