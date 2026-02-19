# WIDGET: Masthead (Primary & Secondary)

## User Flow: Masthead Selection

When creating a Masthead widget, the user follows this selection flow:

```
Step 1: Select "Masthead" widget type
    ↓
Step 2: Choose variant → "Primary Masthead" or "Secondary Masthead"
    ↓
Step 3: Configure Multimedia Background (shared input — same for both)
    ↓
Step 4: Configure variant-specific fields
```

Both Primary and Secondary Masthead share the **same multimedia background input and design**. The background media upload (image / video / WebM) works identically for both variants.

---

## Shared: Multimedia Background

The multimedia background configuration is **identical** for both Primary and Secondary Masthead. The same input UI, upload flow, and API payload apply regardless of which variant is selected.

### Supported Media Types

| Type | Code | Formats | File Required |
| :--- | :---: | :--- | :---: |
| **Image** | `"3"` | JPG, PNG, WEBP, GIF | Yes |
| **Video** | `"4"` | MP4, WEBM, MOV | Yes |
| **Lottie** | `"1"` | Animation JSON (embedded in backend) | No |

### Upload Flow (Same for Both)

```
1. User uploads file (image / video / webm) via the sidebar input
    ↓
2. File uploaded to Google Drive → returns {fileId, viewUrl}
    ↓
3. Preview shown immediately using local blob URL
    ↓
4. On deploy: Backend fetches blob from Drive → POST to /api/app/multimedia/
```

### Background Preview Priority (Same for Both)

```
1. Local blob URL        → immediate preview after upload
2. Google Drive thumbnail → via driveFileId
3. Google Drive URL      → driveUrl fallback
4. Solid color fallback  → #0277FA
```

### Multimedia API Payload (Same for Both)

**Endpoint:** `POST /api/app/multimedia/`

```javascript
{
  "name": "{base}_bg",                // e.g., "diwali_2024_bg"
  "multimedia_type": "3",             // "3" = image, "4" = video, "1" = lottie
  "aspect_ratio": "1",               // or "2", "3", "4"
  "file_en": "<binary blob>",        // the uploaded media file
  "transition_color": "#FFFFFF",
  "accent_color": "#0000FF",
  "text_color": "#FFFFFF",
  "icon_bg_color": "#F0F0F0",
  "is_multimedia_dark": "false"
}
```

### Multimedia Fields Reference

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `name` | String | Yes | Unique multimedia slug (`{base}_bg`) | `diwali_2024_bg` |
| `multimedia_type` | String | Yes | `"3"` = Image, `"4"` = Video, `"1"` = Lottie | `3` |
| `file_en` | File | No | Image/video binary blob (not needed for Lottie) | Binary |
| `aspect_ratio` | String | No | Aspect ratio | `1` |
| `transition_color` | String | No | Transition color | `#FFFFFF` |
| `accent_color` | String | No | Icon fill / accent color | `#0000FF` |
| `text_color` | String | No | Label text color | `#FFFFFF` |
| `icon_bg_color` | String | No | Icon background color | `#F0F0F0` |
| `is_multimedia_dark` | String | No | Dark theme flag | `false` |

### Default Color Values

| Color Field | Default |
| :--- | :--- |
| `transition_color` | `#FFFFFF` |
| `accent_color` | `#0000FF` |
| `text_color` | `#FFFFFF` |
| `icon_bg_color` | `#F0F0F0` |

> **Important:** If `background_multimedia` is empty, do **not** include the field in the widget payload — it causes "Background Multimedia Name is invalid" error.

---

---

# Part A: Primary Masthead

## 1. Overview

The **Primary Masthead** is a header-only widget that displays category navigation icons with a configurable multimedia background. It is typically positioned at the top of the app homepage.

**Backend Widget Type:** `masthead_primary`

**Key Characteristics:**
- Header-only component (no body/carousel content)
- Uses the **shared multimedia background** (same as Secondary)
- Links to category panes via `master_key`
- Configurable colors (accent, text, icon background, transition)
- Time-bound activation (`start_time`, `end_time`)

> **Legacy Widget**: This widget uses a hard-coded component and will be migrated to the config-driven system in a future phase.

### Emulator Preview — Primary Masthead

```
┌─ Phone Emulator ────────────────────────────────┐
│                                                   │
│  ░░░░░░░░░░ BACKGROUND MEDIA ░░░░░░░░░░░░░░░░   │  ← multimedia bg
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │  [🏠 All] [🔁 Buy Again] [🍚 Rice]      │    │
│  │  [🧴 Body Care] [🛒 Kirana] [🥦 Fresh]  │    │
│  └──────────────────────────────────────────┘    │  ← category icons row
│                                                   │
│  (No carousel body — header only)                │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Creation Flow

```mermaid
flowchart LR
    BG["1. Multimedia Background\n{base}_bg\nPOST /api/app/multimedia/"] -.->
    PM["2. Primary Masthead Widget\n{base}_pm_hp\nPOST /api/app/widget/"]
    PM --> Live([Widget LIVE ✓])
```

## 2. Widget Composition

The Primary Masthead is a simple widget — no nested ecosystem or item mappings required.

| Component | Purpose | User-Facing |
| :--- | :--- | :--- |
| **Multimedia (Background)** | Shared background (image/video/webm) — see above | ✅ Yes |
| **Primary Masthead Widget** | The widget container with category icons | ✅ Yes |

## 3. Data Flow Diagram

```mermaid
flowchart TD
    Input([User Input: Slug, Master Key, Background Media]) --> Process[Automation Script / Frontend Deploy]

    subgraph Creation Flow
        direction TB
        Step1[1. Multimedia Background - OPTIONAL]
        Step2[2. Primary Masthead Widget]

        Step1 -.->|background_multimedia slug| Step2
    end

    Process --> Creation Flow
    Step2 --> Output([Final: Primary Masthead Widget Slug])
```

## 4. Backend Object Hierarchy

| Step | Object Type | Slug Pattern | Purpose | API Endpoint |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Multimedia | `{base}_bg` | Background media (image/video/lottie) | `/api/app/multimedia/` |
| **2** | Widget (Primary Masthead) | `{base}_pm_hp` | The masthead widget container | `/api/app/widget/` |

**Fallback slug:** `primary_masthead_{timestamp}` (if no slug provided)

### Object Hierarchy

```
Widget (masthead_primary)
├── slug_name: diwali_2024_pm_hp
├── widget_type: masthead_primary
├── master_key: 1020 (optional)
└── background_multimedia: diwali_2024_bg
    └─→ Multimedia (name: diwali_2024_bg)
        ├── multimedia_type: 3 (image)
        ├── transition_color: #FFFFFF
        ├── accent_color: #0000FF
        ├── text_color: #FFFFFF
        ├── icon_bg_color: #F0F0F0
        └── file_en: [Binary blob]
```

## 5. Key Configuration Fields

### Widget Fields

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `slug_name` | String | Yes | Unique identifier | `diwali_2024_pm_hp` |
| `widget_type` | String | Yes | Must be `masthead_primary` | `masthead_primary` |
| `master_key` | String | No | Link to category pane widget | `1020` |
| `background_multimedia` | String | No | Multimedia slug for background | `diwali_2024_bg` |
| `start_time` | DateTime | No | Activation start | `2024-03-01 10:00:00` |
| `end_time` | DateTime | No | Activation end | `2025-03-01 10:00:00` |
| `media_aspect_ratio` | String | No | Aspect ratio (default `"1"`) | `1` |

> Multimedia fields and colors are documented in the **Shared: Multimedia Background** section above.

## 6. Payload Structure Examples

> Multimedia payload is documented in the **Shared: Multimedia Background** section above.

### Primary Masthead Widget

```javascript
{
  "slug_name": "diwali_2024_pm_hp",
  "widget_type": "masthead_primary",
  "master_key": "1020",
  "background_multimedia": "diwali_2024_bg",
  "media_aspect_ratio": "1",
  "start_time": "2024-03-01 10:00:00",
  "end_time": "2025-03-01 10:00:00",
  "heading": "",
  "heading_en": "",
  "filter_dict": "{}",
  "app_configurations": "{}"
}
```

## 7. Frontend Component

### Component Path

`src/components/Widgets/PrimaryMasthead.jsx`

### Behavior

- Displays category icon buttons (All, Buy Again, Rice, Kirana, Body Care, etc.)
- Renders icons with configurable colors from multimedia config
- Background is inherited from AppHeader (not rendered directly)
- Categories are hardcoded by default but can be overridden via `widget.categories`

### Key Props

| Prop | Source | Purpose |
| :--- | :--- | :--- |
| `widget.multimedia.accent_color` | Multimedia API | Icon fill color when active |
| `widget.multimedia.text_color` | Multimedia API | Label text color |
| `widget.multimedia.icon_bg_color` | Multimedia API | Icon container background |
| `widget.categories` | Widget config | Array of `{name, icon, active}` |

## 8. Mapping Flow

Primary Masthead does **NOT** require item mappings. The widget stands alone.

It can optionally reference an external widget via `master_key`:

```
Primary Masthead Widget
    ↓ (via master_key)
  → Category Pane Widget (e.g., ID 1020)
```

## 9. API Endpoints

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/app/multimedia/` | POST | Create/update background multimedia |
| `/api/app/widget/` | POST | Create Primary Masthead widget |

## 10. Filters & Configurations (Universal)

The following filters and configurations are **universal** — they apply to the Primary Masthead widget. These are handled by `WidgetItemHelper` / `PageViewUtils` on the backend.

### Widget-Level Filters (`filter_dict` on Widget)

| Key | Type | Component | Description |
| :--- | :--- | :--- | :--- |
| `max_order_constraint` | int | `NumberInput` | Show widget only if user's total orders <= Y |
| `min_order_constraint` | int | `NumberInput` | Show widget only if user's total orders >= X |

### App Configurations (`app_configurations` on Widget)

| Key | Type | Default | Component | Description |
| :--- | :--- | :--- | :--- | :--- |
| `allow_android` | boolean | `true` | `ToggleInput` | Toggle visibility on Android |
| `allow_ios` | boolean | `true` | `ToggleInput` | Toggle visibility on iOS |
| `min_android_version` | version | — | `VersionInput` | Show only on Android >= V |
| `max_android_version` | version | — | `VersionInput` | Show only on Android <= V |
| `min_ios_version` | version | — | `VersionInput` | Show only on iOS >= V |
| `max_ios_version` | version | — | `VersionInput` | Show only on iOS <= V |

## 11. Error Handling

- **Empty `background_multimedia`**: Causes "Background Multimedia Name is invalid" — only include the field if it has a value
- **Duplicate slug**: Returns 409 Conflict — use a different slug or append timestamp
- **Rate Limiting**: Script pauses 500ms between rows

## 12. Script Reference

| File | Purpose |
| :--- | :--- |
| `scripts/Primary_Masthead_Automation.gs` | Google Sheets → Backend API creation |
| `src/services/BackendSyncService.js` | Frontend deploy via `deployPrimaryMasthead()` |

---

---

# Part B: Secondary Masthead

## 1. Overview

The **Secondary Masthead** is a promotional banner with a complex nested carousel ecosystem. It features a full-width banner background with multiple carousel items below it, where each carousel item links to its own page (category page or product listing page) with state-specific sub-categories.

**Backend Widget Type:** `masthead_secondary_category_hp`

**Key Characteristics:**
- Full-width banner (header) + carousel items (body)
- Supports multimedia backgrounds (Image, Video, Lottie)
- Each carousel item creates a full page layout ecosystem (Page Layout → PLP → Sub-Categories)
- **Each carousel widget item has its own page type selection** (`category_page` or `product_listing_page`)
- State-based product mapping (Global, JH, CG, WB)
- Uses **3-Phase Creation Logic** to handle nested dependencies
- Configurable aspect ratio (1–4)

### Emulator Preview — Secondary Masthead

```
┌─ Phone Emulator ────────────────────────────────┐
│                                                   │
│  ░░░ FULL-WIDTH BANNER BACKGROUND ░░░░░░░░░░░░  │  ← multimedia bg
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                   │
│  ┌── Carousel Items Below Banner ─────────────┐  │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐       │  │
│  │ │         │ │         │ │         │       │  │
│  │ │  Item1  │ │  Item2  │ │  Item3  │  → │  │
│  │ │  image  │ │  image  │ │  image  │       │  │
│  │ │         │ │         │ │         │       │  │
│  │ │ Festive │ │  Rice   │ │ Kirana  │       │  │
│  │ └─────────┘ └─────────┘ └─────────┘       │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
```

### System Overview — 3-Phase Architecture

```mermaid
flowchart TD
    User([User Input: Banner + Carousel Items]) --> Phase1

    subgraph Phase1 [Phase 1: Parent Containers]
        MM["1. Multimedia Background\n{base}_bg"] -.->
        SMW["2. Secondary Masthead Widget\n{base}_sm_hp"]
    end

    Phase1 --> Phase2

    subgraph Phase2 [Phase 2: Per Carousel Item]
        Page["3. Page Layout\ncategory_page / product_listing_page"]
        PLP["4. PLP Widget\nproduct_listing"]
        SC["5. Sub-Category Items\nper state: global · jh · cg · wb"]
        CI["6. Carousel Widget Item\nclick → page_layout_slug_name"]

        SC -->|widget_item| PLP
        PLP -->|layout_widget| Page
        Page -->|global mapping| GR[Global Registry]
        Page -.->|slug reference| CI
    end

    Phase2 --> Phase3

    subgraph Phase3 [Phase 3: Final Mapping]
        Map["7. Map all Carousel Items → SM Widget"]
    end

    Phase3 --> Live([Widgets LIVE ✓])
```

## 2. Widget Composition

| Component | Purpose | User-Facing |
| :--- | :--- | :--- |
| **Multimedia (Background)** | Full-width banner background | ✅ Yes |
| **Secondary Masthead Widget** | The widget container | ✅ Yes |
| **Carousel Items** | Banner items with click navigation | ✅ Yes |
| **Page Layout (per item)** | Category page or product listing page structure | ❌ No (navigation target) |
| **PLP Widget (per item)** | Product listing widget for the category page | ❌ No (navigation target) |
| **Sub-Category Items (per item)** | State-specific product lists | ❌ No (data layer) |

## 3. Data Flow Diagram

```mermaid
flowchart TD
    Input([User Input: Slug, Banner, Carousel Items + Sub-Categories]) --> Process[3-Phase Creation Logic]

    subgraph Phase 1 - Parent Containers
        direction TB
        P1A[1. Multimedia Background]
        P1B[2. Secondary Masthead Widget]
        P1A -.->|background_multimedia| P1B
    end

    subgraph Phase 2 - Item Ecosystems per Carousel Item
        direction TB
        P2A[3. Page Layout - category_page / product_listing_page]
        P2B[4. PLP Widget - product_listing]
        P2C[5. Sub-Category Items - state-specific]
        P2D[6. Carousel Widget Item]

        P2C -->|widget_item mapping| P2B
        P2B -->|layout_widget mapping| P2A
        P2A -->|global mapping| Global[Global Page Registry]
        P2A -.->|page_layout_slug_name| P2D
    end

    subgraph Phase 3 - Final Mapping
        P3A[7. Map Carousel Items → SM Widget]
    end

    Process --> Phase 1 - Parent Containers
    Phase 1 - Parent Containers --> Phase 2 - Item Ecosystems per Carousel Item
    Phase 2 - Item Ecosystems per Carousel Item --> Phase 3 - Final Mapping
    Phase 3 - Final Mapping --> Output([Final: Secondary Masthead Widget Slug])
```

## 4. Backend Object Hierarchy

The Secondary Masthead creates the following objects per carousel item:

| Step | Object Type | Slug Pattern | Purpose | API Endpoint |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Multimedia | `{base}_bg` | Banner background | `/api/app/multimedia/` |
| **2** | Widget (SM) | `{base}_sm_hp` | Secondary Masthead container | `/api/app/widget/` |
| **3** | Page Layout | `{base}_item_{n}_page` | Category page or product listing page per carousel item | `/api/app/post_page_layout/` |
| **4** | Widget (PLP) | `{base}_item_{n}_plp` | Product listing per carousel item | `/api/app/widget/` |
| **5** | Widget Item (Sub-Cat) | `{base}_item_{n}_subcat_{m}_{state}` | State-specific product list | `/api/app/post_widget_item/` |
| **6** | Widget Item (Carousel) | `{base}_item_{n}_carousel` | Carousel banner item | `/api/app/post_widget_item/` |

**Fallback slug:** `secondary_masthead_{timestamp}` (if no slug provided)

### Full Object Tree

```
Secondary Masthead Widget (masthead_secondary_category_hp)
├── slug_name: festive_banner_sm_hp
├── background_multimedia: festive_banner_bg
│   └─→ Multimedia (festive_banner_bg)
│       ├── multimedia_type: 3
│       ├── aspect_ratio: 4
│       └── file_en: [Binary blob]
│
├─→ Carousel Item #1 (carousel)
│   ├── slug: festive_banner_item_1_carousel
│   ├── click_action_params → page_layout_slug_name
│   │
│   └─→ Category Page Ecosystem
│       ├── Page Layout: festive_banner_item_1_page
│       ├── PLP Widget: festive_banner_item_1_plp
│       └── Sub-Category Items:
│           ├── festive_banner_item_1_subcat_1_global
│           ├── festive_banner_item_1_subcat_1_jh
│           ├── festive_banner_item_1_subcat_1_cg
│           └── festive_banner_item_1_subcat_1_wb
│
└─→ Carousel Item #2 (carousel)
    ├── slug: festive_banner_item_2_carousel
    └─→ Category Page Ecosystem (same structure)
```

## 5. 3-Phase Creation Strategy

The Secondary Masthead uses a **3-Phase batch creation** approach to resolve nested dependencies:

### Phase 1: Create Parent Containers

```
1. Create Multimedia (background)
2. Create Secondary Masthead Widget (links to multimedia)
```

### Phase 2: Create Item Ecosystems (per carousel item)

```
For each carousel item:
  1. Select Page Type → "category_page" or "product_listing_page"
  2. Create Page Layout (with selected page_type)
  3. Create PLP Widget (product_listing)
  4. Map PLP → Page Layout (layout_widget mapping)
  5. Map Page Layout → Global (page_layout mapping)
  6. Create Sub-Category Items (per state — dynamically added)
  7. Map Sub-Categories → PLP (widget_item mapping)
  8. Create Carousel Widget Item (with click_action_params → page_layout + page_type)
```

### Phase 3: Final Mapping

```
Map all Carousel Items → Secondary Masthead Widget (widget_item mapping)
```

**Why 3 Phases?**
- Dependencies are 100% resolved before child creation
- No orphaned references
- Prevents "slug not found" errors during mapping

## 6. Page Type Selection (Per Carousel Widget Item)

The **page type** is selected on **every carousel widget item** individually. Each carousel item within the same Secondary Masthead can navigate to a different page type.

| Page Type | Value | Description |
| :--- | :--- | :--- |
| **Category Page (CP)** | `category_page` | Navigates to a category page with sub-category browsing |
| **Product Listing Page (PLP)** | `product_listing_page` | Navigates to a PLP showing the mapped products |

The user selects the page type when configuring each carousel widget item. This value is set in the item's **Page Layout** (Step 3) and referenced in the item's `click_action_params`.

### State-Wise Product Details Apply to Both Page Types

Regardless of which page type is selected — **Category Page (CP)** or **Product Listing Page (PLP)** — each carousel item requires **state-wise product details**. The state-based product mapping works the same way for both:

```
Carousel Item (page_type: "category_page" OR "product_listing_page")
│
├── Sub-Category: "Basmati Rice"
│   ├── Global Products:  1001, 1002, 1003
│   ├── JH Products:      1003, 1004
│   ├── CG Products:      1005, 1006
│   ├── UP Products:      1010, 1011      ← dynamically added
│   └── [ + Add State ]
│
├── Sub-Category: "Atta & Flour"
│   ├── Global Products:  2001, 2002
│   ├── JH Products:      2003, 2004
│   └── [ + Add State ]
│
└── [ + Add Sub-Category ]
```

> The sub-categories and their state-wise products are **required for both CP and PLP**. The only difference is how the target page renders them — CP shows sub-category cards for browsing, PLP shows all products in a grid.

**Example — Mixed page types, both with state-wise products:**

```
Carousel Item #1 → page_type: "category_page"        + state-wise products (Global, JH, CG, UP)
Carousel Item #2 → page_type: "product_listing_page"  + state-wise products (Global, JH, WB)
Carousel Item #3 → page_type: "category_page"         + state-wise products (Global, CG, Patna)
```

## 7. Key Configuration Fields

### Widget Fields

| Field | Type | Required | Description | Example |
| :--- | :--- | :---: | :--- | :--- |
| `slug_name` | String | Yes | Unique identifier | `festive_banner_sm_hp` |
| `widget_type` | String | Yes | Must be `masthead_secondary_category_hp` | `masthead_secondary_category_hp` |
| `background_multimedia` | String | No | Multimedia slug (omit if empty) | `festive_banner_bg` |
| `master_key` | String | No | Link to parent | `gl_hp_global_category_pane_wi` |
| `media_aspect_ratio` | String | No | Aspect ratio (default `"4"`) | `4` |
| `start_time` | DateTime | No | Activation start | `2024-03-01 10:00:00` |
| `end_time` | DateTime | No | Activation end | `2025-03-01 10:00:00` |

### Carousel Item Fields

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `text` | String | Yes | Display text / heading |
| `image` | URL/File | Yes | Carousel item image |
| `pageType` | String | Yes | `"category_page"` or `"product_listing_page"` |
| `categoryPage.heading` | String | Yes | Page heading for the target page |
| `subCategories` | Array | Yes | List of sub-categories |

### Sub-Category Fields

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `name` | String | Yes | Sub-category name |
| `products.global` | String | Yes | Global product codes (comma-separated) |
| `products.{state}` | String | No | State-specific product codes (dynamically added) |

> State-specific product fields are **not hardcoded**. Users can add any number of states using the **"Add State"** button (see Section 8 below).

## 8. State-Based Product Mapping (Dynamic)

Each sub-category supports **state-specific product lists**. The state list is **not fixed** — new states can be added at any time using the **"Add"** button on the frontend sidebar.

### How It Works

1. **Global** is always present (required — the default/fallback product list)
2. User clicks the **"Add"** button to add a new state
3. User selects or types the state name (e.g., `Uttar Pradesh`, `Patna`)
4. User enters state-specific product codes for that state
5. Each added state generates its own sub-category widget item with a unique slug suffix

### Current States

| State Key | `level_tag` | `level_property` | Slug Suffix |
| :--- | :--- | :--- | :--- |
| Global | `global` | `global` | `_global` |
| JH | `state` | `jharkhand` | `_jh` |
| CG | `state` | `chhattisgarh` | `_cg` |
| WB | `state` | `west bengal` | `_wb` |

### Upcoming / Expandable States (via Add Button)

| State Key | `level_tag` | `level_property` | Slug Suffix |
| :--- | :--- | :--- | :--- |
| UP | `state` | `uttar pradesh` | `_up` |
| Patna | `state` | `patna` | `_patna` |
| *(any new state)* | `state` | `{state_name_lowercase}` | `_{short_key}` |

### Add State — Frontend Behavior

```
Sub-Category: "Basmati Rice"
┌──────────────────────────────────────────────────┐
│ Global Products:  1001, 1002, 1003               │
│                                                    │
│ ┌─ State: Jharkhand ──────────────────────────┐  │
│ │ Products: 1003, 1004                         │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌─ State: Chhattisgarh ───────────────────────┐  │
│ │ Products: 1005, 1006                         │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ ┌─ State: Uttar Pradesh ──────────────────────┐  │
│ │ Products: 1010, 1011, 1012                   │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│  [ + Add State ]                                   │
└──────────────────────────────────────────────────┘
```

- The **"+ Add State"** button appends a new state input row
- Each state row has: **State Name** (text/dropdown) + **Product Codes** (comma-separated)
- States can also be **removed** if no longer needed
- **Global** cannot be removed (it is always required as the fallback)

### Slug Generation for Dynamic States

When a new state is added, its slug suffix is auto-generated from the state key:

```
State Name → lowercase → spaces replaced with _ → truncated to short key

Examples:
  "Uttar Pradesh" → slug suffix: _up
  "Patna"         → slug suffix: _patna
  "West Bengal"   → slug suffix: _wb
  "New State"     → slug suffix: _ns (or _new_state)
```

**Full slug example:**
```
{base}_item_{n}_subcat_{m}_{state_suffix}

festive_banner_item_1_subcat_1_up        ← Uttar Pradesh
festive_banner_item_1_subcat_1_patna     ← Patna
```

### Mapping CSV Format (Dynamic)

The mapping CSV grows dynamically based on how many states the user has added:

```csv
widget_item_slug_name,level_tag,level_property,priority,cohort
item_1_subcat_1_global,global,global,1,
item_1_subcat_1_jh,state,jharkhand,2,
item_1_subcat_1_cg,state,chhattisgarh,3,
item_1_subcat_1_wb,state,west bengal,4,
item_1_subcat_1_up,state,uttar pradesh,5,
item_1_subcat_1_patna,state,patna,6,
```

> **Priority** is auto-assigned incrementally. Global is always priority `1`, then each state gets the next number in order.

## 9. Payload Structure Examples

> Multimedia payload is documented in the **Shared: Multimedia Background** section above.

### Secondary Masthead Widget (Step 2)

```javascript
{
  "slug_name": "festive_banner_sm_hp",
  "widget_type": "masthead_secondary_category_hp",
  "background_multimedia": "festive_banner_bg",
  "media_aspect_ratio": "4",
  "start_time": "2024-03-01 10:00:00",
  "end_time": "2025-03-01 10:00:00",
  "heading": "",
  "filter_dict": "{}",
  "app_configurations": "{}"
}
```

### Page Layout (Step 3 — per carousel item)

```javascript
{
  "slug_name": "festive_banner_item_1_page",
  "page_type": "category_page",  // or "product_listing_page" — selected per carousel item
  "page_heading": "Rice Products",
  "page_layout_type": "2"
}
```

### PLP Widget (Step 4 — per carousel item)

```javascript
{
  "slug_name": "festive_banner_item_1_plp",
  "widget_type": "product_listing",
  "start_time": "2024-03-01 10:00:00",
  "end_time": "2025-03-01 10:00:00",
  "app_configurations": "{\"show_sub_cat\": true}"
}
```

### Sub-Category Widget Item (Step 5 — per state)

```javascript
{
  "slug_name": "festive_banner_item_1_subcat_1_jh",
  "item_type": "sub_category",
  "text_en": "Basmati Rice",
  "product_list": "1003,1004",
  "filter_lst": "[{\"condition\":\"in_stk_item_codes\",\"value\":[1003,1004]}]",
  "deactivated_flag": "no",
  "is_clickable": "yes",
  "pl_edit": "PL"
}
```

### Carousel Widget Item (Step 6 — per carousel item)

```javascript
{
  "slug_name": "festive_banner_item_1_carousel",
  "item_type": "carousel",
  "item_click_action": "redirect-to-page",
  "click_action_params": "{\"page_type\":\"category_page\",\"page_layout_slug_name\":\"festive_banner_item_1_page\"}",
  // page_type can be "category_page" or "product_listing_page" — selected per item
  "media_en": "<binary blob>",
  "is_clickable": "yes",
  "deactivated_flag": "no"
}
```

### Carousel Items → SM Widget Mapping (Step 7)

```csv
widget_item_slug_name,level_tag,level_property,priority,cohort
festive_banner_item_1_carousel,global,global,1,
festive_banner_item_2_carousel,global,global,2,
festive_banner_item_3_carousel,global,global,3,
```

## 10. Frontend Component

### Component Path

`src/components/Widgets/SecondaryMasthead.jsx`

### Display Behavior

- Renders a full-width (h-32) rounded banner with background image/video
- Below the banner, displays a 3-column grid of carousel items
- Each item shows: category heading + category image

> Background preview priority is documented in the **Shared: Multimedia Background** section above.

### Click Behavior

Depends on the **page type** selected for that carousel item:

**If page_type = `category_page`:**
```
User clicks Carousel Item
    ↓
navigateTo('category', {
  heading: item.categoryPage.heading,
  subCategories: item.subCategories
})
    ↓
CategoryPage renders sub-categories as cards
    ↓
Each sub-category clickable → product listing
```

**If page_type = `product_listing_page`:**
```
User clicks Carousel Item
    ↓
navigateTo('listing', {
  heading: item.categoryPage.heading,
  products: item.products
})
    ↓
Product Listing Page renders products in grid layout
```

> Multimedia handling (upload flow, media types, preview priority) is documented in the **Shared: Multimedia Background** section above.

## 11. API Endpoints (Secondary Masthead)

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/app/multimedia/` | POST | Create background multimedia |
| `/api/app/widget/` | POST | Create SM widget & PLP widgets |
| `/api/app/post_page_layout/` | POST | Create page layouts |
| `/api/app/post_widget_item/` | POST | Create carousel & sub-category items |
| `/api/app/update_widget_widget_item_mapping/` | POST | Item → Widget mapping (CSV) |
| `/api/app/update_layout_widget_mapping/` | POST | Widget → Layout mapping (CSV) |
| `/api/app/update_page_page_layout_mapping/` | POST | Layout → Page mapping (CSV) |

## 12. Filters & Configurations (Universal)

The following filters and configurations are **universal** — they apply to the Secondary Masthead widget and all its child widget items (carousel items, sub-category items, PLP widgets). These are handled by `WidgetItemHelper` / `PageViewUtils` on the backend.

### Widget-Level Filters (`filter_dict` on Widget)

| Key | Type | Component | Description |
| :--- | :--- | :--- | :--- |
| `max_order_constraint` | int | `NumberInput` | Show widget only if user's total orders <= Y |
| `min_order_constraint` | int | `NumberInput` | Show widget only if user's total orders >= X |

### Item-Level Filters (`filter_dict` on WidgetItem)

| Key | Type | Component | Description |
| :--- | :--- | :--- | :--- |
| `in_stk_item_codes` | list of int | `ProductListInput` | Mandatory in-stock item codes — widget item only shown if these items are in stock |

### Product-Level Filters (`product_filter_dict` on WidgetItem)

| Key | Operators | Component | Description |
| :--- | :--- | :--- | :--- |
| `category` | `in`, `equal` | `TextInput` | Filter by product category |
| `sub_category` | `in`, `equal` | `TextInput` | Filter by sub-category |
| `mrp` | `lte`, `gte`, `lt`, `gt`, `equal` | `NumberInput` | Filter by MRP |
| `sp` | `lte`, `gte`, `lt`, `gt`, `equal` | `NumberInput` | Filter by Selling Price |
| `discount` | `lte`, `gte`, `lt`, `gt`, `equal` | `NumberInput` | Filter by discount percentage |

### App Configurations (`app_configurations` on Widget)

| Key | Type | Default | Component | Description |
| :--- | :--- | :--- | :--- | :--- |
| `allow_android` | boolean | `true` | `ToggleInput` | Toggle visibility on Android |
| `allow_ios` | boolean | `true` | `ToggleInput` | Toggle visibility on iOS |
| `min_android_version` | version | — | `VersionInput` | Show only on Android >= V |
| `max_android_version` | version | — | `VersionInput` | Show only on Android <= V |
| `min_ios_version` | version | — | `VersionInput` | Show only on iOS >= V |
| `max_ios_version` | version | — | `VersionInput` | Show only on iOS <= V |

### Widget Item Additional Properties (`additional_properties` on WidgetItem)

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `oos_product_count` | int | `0` | Number of Out-of-Stock products to append at end |
| `show_pb_tag` | boolean | `true` | Show "Previously Bought" tag on product cards |
| `pb_reorder` | boolean | `true` | Re-sort to show Previously Bought items first |

## 13. Error Handling

- **"Background Multimedia Name is invalid"**: Empty `background_multimedia` field — omit the field if no value
- **"Page Layout failed"**: Missing `page_type` or `page_heading`
- **"Sub-category mapping failed"**: Invalid product codes or incorrect state keys
- **Duplicate slug (409 Conflict)**: Widget/item slug already exists — use timestamp suffix
- **`filter_lst` product codes must be numbers**: Use `[1001,1002]` not `["1001","1002"]`
- **`page_layout_type` must be string**: Use `"2"` not `2`

## 14. Script Reference

| File | Purpose |
| :--- | :--- |
| `scripts/Secondary_Masthead_Automation.gs` | Google Sheets → Backend API creation |
| `scripts/Secondary_Masthead_Backend.gs` | 3-Phase batch creation logic |
| `src/services/BackendSyncService.js` | Frontend deploy via `deploySecondaryMasthead()` |
| `src/components/Sidebar/HeaderConfiguration.jsx` | UI form for configuring both mastheads |

---

---

# Part C: Primary vs Secondary Comparison

| Aspect | Primary Masthead | Secondary Masthead |
| :--- | :--- | :--- |
| **Widget Type** | `masthead_primary` | `masthead_secondary_category_hp` |
| **Purpose** | Category navigation icons | Promotional banner + carousel |
| **Display** | Icon buttons with background | Full banner + carousel items grid |
| **Complexity** | Simple (1 widget + multimedia) | Complex (multi-item ecosystem) |
| **Creation Phases** | 1 phase | 3 phases |
| **Requires Item Mapping** | No | Yes |
| **Supports State Mapping** | No | Yes (Global/JH/CG/WB) |
| **Multimedia Background** | Shared input & design (image/video/webm) | Shared input & design (image/video/webm) |
| **Carousel Items** | None | Dynamic carousel items |
| **Sub-Categories** | N/A | Yes (with state-specific products) |
| **Page Type Selection** | N/A | Per carousel item (`category_page` or `product_listing_page`) |
| **Click Behavior** | Links to category pane via `master_key` | Navigates to category page or product listing page (per item) |
| **Default Aspect Ratio** | `1` | `4` |
| **Frontend Component** | `PrimaryMasthead.jsx` | `SecondaryMasthead.jsx` |
| **Widget Slug Suffix** | `_pm_hp` | `_sm_hp` |

---

## Related Documentation

- [Slug Name Reference](./SLUG_NAME.md) — All slug patterns across widgets
- [Collection Banner Widget](./WIDGET-Collection-Banner.md) — Carousel (Scroll) and Category Grid (Stick) modes
- [Product Rail Widget](./WIDGET-Product-Rail.md) — Similar PLP ecosystem
- [Secondary Masthead Strategy](./BACKEND-Secondary-Masthead-Strategy.md) — 3-Phase creation deep dive
- [Backend Automation Services](./BACKEND-Automation-Services.md) — Overview of automation scripts
- [Config-Driven System](./ARCH-Config-Driven-System.md) — Future migration target
