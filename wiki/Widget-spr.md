# WIDGET: Product Rail (SPR + DPR) — Complete Reference

## 1. Overview

The **Product Rail** is the core product display widget on the homepage. It renders horizontal scrollable rows of product cards with a "View All" link to a PLP page.

The Product Rail family includes:
- **Single Product Row (SPR)** — 1 row of products (`rows=1`)
- **Double Product Row (DPR)** — 2 rows of products (`rows=2`)

All variants are driven by a single `SPRConfig.js` configuration with **8 backend variants** based on three properties: **Rows**, **Optimized**, and **Multimedia**.

### System Architecture

```mermaid
flowchart TD
    User["User Configures Product Rail"] --> Rows{rows?}
    Rows -->|1| Form1["SPR: Single Product Row"]
    Rows -->|2| Form2["DPR: Double Product Row"]
    Form1 --> Form["Fill Sidebar Form\nTitle · Products · Page Type"]
    Form2 --> Form
    Form --> StateProducts["State-Wise Products\nGlobal required + optional states\n(ALL variants)"]
    Form --> Opt{is_optimized?}
    Form --> MM{has_multimedia?}

    Opt -->|false| Std["widget_type: single_product_row\n(no _v2 suffix)"]
    Opt -->|true| Opt2["widget_type: single_product_row_v2\n(_v2 suffix)"]

    StateProducts --> API["PLP Ecosystem + Home Row\nSub-Cat Items + PLP Widget +\nPage Layout + Row Item + Widget\n+ mapping CSV calls"]
    MM -->|true| Media["POST /api/app/multimedia/\nbefore widget create"]

    Std --> API
    Opt2 --> API
    Media --> API
    API --> Live["Widget Live on Backend"]
```

### Emulator Preview — SPR (rows=1)

```
┌─ Phone Emulator (375×812) ─────────────────────┐
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │  ★ Rice Mela                   View All  │    │  ← heading + CTA
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───── │    │
│  │  │       │ │       │ │       │ │      │    │
│  │  │  img  │ │  img  │ │  img  │ │ img  │    │  ← single row (rows=1)
│  │  │       │ │       │ │       │ │      │    │
│  │  │  ₹99  │ │ ₹149  │ │ ₹199  │ │ ₹89  │    │
│  │  │ Rice  │ │ Atta  │ │  Dal  │ │ Oil  │    │
│  │  └───────┘ └───────┘ └───────┘ └───── │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Emulator Preview — DPR (rows=2)

```
┌─ Phone Emulator (375×812) ─────────────────────┐
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │  ★ Namkeens                    View All  │    │  ← heading + CTA
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───── │    │
│  │  │  img  │ │  img  │ │  img  │ │ img  │    │  ← row 1
│  │  │  ₹99  │ │ ₹149  │ │ ₹199  │ │ ₹89  │    │
│  │  └───────┘ └───────┘ └───────┘ └───── │    │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───── │    │
│  │  │  img  │ │  img  │ │  img  │ │ img  │    │  ← row 2
│  │  │  ₹79  │ │ ₹129  │ │ ₹159  │ │ ₹69  │    │
│  │  └───────┘ └───────┘ └───────┘ └───── │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Emulator Preview — Multimedia Variant (SPR/DPR)

```
┌─ Phone Emulator (375×812) ─────────────────────┐
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │ ▓▓▓▓▓▓▓ BACKGROUND MEDIA ▓▓▓▓▓▓▓▓▓▓▓▓ │    │  ← image/video bg
│  │  ★ Diwali Offers               View All  │    │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────── │    │
│  │  │  img │ │  img │ │  img │ │  img  │    │
│  │  │      │ │      │ │      │ │       │    │
│  │  │  ₹99 │ │ ₹149 │ │ ₹199 │ │  ₹79  │    │
│  │  └──────┘ └──────┘ └──────┘ └────── │    │
│  └──────────────────────────────────────────┘    │
│                                                   │
└───────────────────────────────────────────────────┘
```

---

## 2. Variant Resolution

Three properties determine the exact `widget_type`:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rows` | `1 \| 2` | `1` | Number of product rows: 1 = Single (SPR), 2 = Double (DPR) |
| `is_optimized` | Boolean | `true` | Adds `_v2` suffix to widget_type for optimized rendering |
| `has_multimedia` | Boolean (implicit) | `false` | Auto-set to `true` when `background_media` is uploaded |

### Complete 8-Variant Matrix

| # | Rows | Optimized? | Multimedia? | Resolved `widget_type` |
| :---: | :---: | :---: | :---: | :--- |
| 1 | **1** | `false` | `false` | `single_product_row` |
| 2 | **1** | `true` | `false` | `single_product_row_v2` |
| 3 | **1** | `false` | `true` | `multimedia_single_product_row` |
| 4 | **1** | `true` | `true` | `multimedia_single_product_row_v2` |
| 5 | **2** | `false` | `false` | `double_product_row` |
| 6 | **2** | `true` | `false` | `double_product_row_v2` |
| 7 | **2** | `false` | `true` | `multimedia_double_product_row` |
| 8 | **2** | `true` | `true` | `multimedia_double_product_row_v2` |

> **Multimedia Constraint:** Non-multimedia variants (`single_product_row`, `single_product_row_v2`, `double_product_row`, `double_product_row_v2`) **IGNORE** `background_multimedia`. Only `multimedia_*` variants render backgrounds.

---

## 3. Page Type Selection

The user selects the **page type** during widget creation. This determines the navigation destination when a user taps "View All" on the SPR widget.

| Page Type | Value | Description |
| :--- | :--- | :--- |
| **Product Listing Page** | `product_listing_page` | Flat product grid — shows all products in a single scrollable list |
| **Category Page** | `category_page` | Categorized browsing — shows sub-category tabs/cards for navigation |

### How Page Type Affects Navigation

| Page Type | "View All" Result |
| :--- | :--- |
| `product_listing_page` | Opens a flat product listing page directly with all mapped products |
| `category_page` | Opens a category page with sub-category cards — user picks a sub-category — then sees products |

> The page type is set on the **Page Layout** object (Step 1/3) and referenced in the widget's `view_all_action_params`. The user selects the page type **per widget** during configuration.

### Frontend Page Type Selection

```
Single Product Row: "Rice Mela Rail"
+-------------------------------------------------+
| Page Type:  [product_listing_page  v]           |
|             [category_page         ]            |
|                                                   |
| Slug:       rice_mela_rail                       |
| Title:      Rice Mela                            |
| Products:   1001, 1002, 1003, 1004              |
+-------------------------------------------------+
```

---

## 4. Form Fields & Validation

Driven from `SPRConfig.fields`:

| Field | Component | Required | Validation | Condition |
| :--- | :--- | :---: | :--- | :--- |
| **Page Type** | `SelectInput` | Yes | `product_listing_page` or `category_page` | Always |
| **Slug** | `SlugBuilder` | Yes | `/^[a-z0-9_]+$/`, 3-100 chars | Always |
| **Title (English)** | `TextInput` | Yes | 2-200 chars, auto-translate | Always |
| **Title (Hindi)** | `TextInput` | No | — | Always |
| **Products** | `ProductListInput` | Yes | 1-200 numeric item codes | Always |
| **Background Media** | `ImageUpload` | No | Supported formats: `.jpeg/.jpg/.png/.webp/.gif/.svg` | Always |
| **Background Video URL** | `UrlInput` | No | Valid URL ending `.mp4/.mov/.webm` | Always |
| **View All Page Slug** | `TextInput` | No | `/^[a-z0-9_-]*$/` | Only when `is_optimized = false` |
| **Start Date & Time** | `DateTimeInput` | Yes | ISO 8601 datetime via calendar + time picker | Always |
| **End Date & Time** | `DateTimeInput` | Yes | ISO 8601 datetime via calendar + time picker | Always |

---

## 5. Deploy Strategies

### 5.1 Unified Creation Flow (ALL Variants — Standard & Optimized)

**All Product Rail variants** — regardless of `is_optimized` — create **two parallel flows**: a PLP ecosystem with state-wise `sub_category` items AND a home row widget with `item_rows`.

> The `is_optimized` flag only affects the `widget_type` name (`_v2` suffix) and the home widget slug suffix (`_spr` vs `_spr_opt`). The creation flow, including state-wise products, is **identical** for all variants.

```
-- Flow 1: PLP Ecosystem (state-wise — ALL variants) --
Step 1: Create Sub-Cat Widget Item   POST /api/app/post_widget_item/   (slug: {base}_sc_wi_{state})
Step 2: Create PLP Widget            POST /api/app/widget/              (slug: {base}_plp_w)
Step 3: Create Page Layout            POST /api/app/post_page_layout/   (slug: {base}_page_p)
Step 4: Map PLP Widget <-> Sub-Cat   (parent: _plp_w, child: _sc_wi — location CSV)
Step 5: Map Page <-> PLP Widget      (parent: _page_p, child: _plp_w)
Step 6: Map Page → Global Registry   (parent: _page_p)

-- Flow 2: Home Row --
Step 7: Create Row Widget Item        POST /api/app/post_widget_item/   (slug: {base}_pr_wi)
Step 8: Create Homepage Widget        POST /api/app/widget/              (slug: {base}_spr / {base}_spr_opt)
Step 9: Map Widget <-> Row Item      (parent: widget, child: _pr_wi)
```

```mermaid
flowchart TD
    subgraph Flow 1 - PLP Ecosystem
        direction TB
        SC_G["Sub-Cat (Global)\nslug: {base}_sc_wi_global\nitem_type: sub_category"]
        SC_JH["Sub-Cat (JH)\nslug: {base}_sc_wi_jh"]
        SC_UP["Sub-Cat (UP)\nslug: {base}_sc_wi_up"]

        PLP["PLP Widget\nslug: {base}_plp_w\nwidget_type: product_listing"]
        Page["Page Layout\nslug: {base}_page_p\npage_type: product_listing_page / category_page"]

        SC_G -->|"global, global, P:1"| PLP
        SC_JH -->|"state, jharkhand, P:2"| PLP
        SC_UP -->|"state, uttar pradesh, P:3"| PLP

        PLP -->|"layout_widget mapping"| Page
        Page -->|"global mapping"| Global[Global Registry]
    end

    subgraph Flow 2 - Home Row
        direction TB
        RI["Row Widget Item\nslug: {base}_pr_wi\nitem_type: item_rows"]
        SPR["Homepage Widget\nslug: {base}_spr or {base}_spr_opt\nwidget_type: from variant matrix"]

        RI -->|"widget_item mapping"| SPR
    end

    SPR -.->|"view_all_action_params"| Page
```

**Field Mapping:**

| Step | Entity | Slug Suffix | Key Fields |
| :--- | :--- | :--- | :--- |
| 1 | Sub-Cat Widget Item | `_sc_wi_{state}` | `item_type: sub_category`, `product_list`, `filter_lst` |
| 2 | PLP Widget | `_plp_w` | `widget_type: product_listing`, `heading: $title` |
| 3 | Page Layout | `_page_p` | `page_type: $selectedPageType`, `page_heading: $title`, `page_layout_type: 2` |
| 7 | Row Widget Item | `_pr_wi` | `item_type: item_rows`, `product_list` |
| 8 | Homepage Widget | `_spr` / `_spr_opt` | `widget_type: $resolvedWidgetType`, `heading_en/hi`, `view_all: redirect-to-page`, `background_multimedia`, `filter_dict`, `app_configurations` |

---

## 6. Slug Naming Convention

### ALL Variants (Unified Slug Pattern)

| Object | Slug Pattern | Example |
| :--- | :--- | :--- |
| Sub-Cat (Global) | `{base}_sc_wi_global` | `rice_mela_rail_sc_wi_global` |
| Sub-Cat (State) | `{base}_sc_wi_{state_key}` | `rice_mela_rail_sc_wi_jh` |
| PLP Widget | `{base}_plp_w` | `rice_mela_rail_plp_w` |
| Page Layout | `{base}_page_p` | `rice_mela_rail_page_p` |
| Row Widget Item | `{base}_pr_wi` | `rice_mela_rail_pr_wi` |
| Homepage Widget (Standard) | `{base}_spr` | `rice_mela_rail_spr` |
| Homepage Widget (Optimized) | `{base}_spr_opt` | `rice_mela_rail_spr_opt` |

---

## 7. Location / State-Based Product Mapping

Applies to **ALL** Product Rail variants (Standard and Optimized, Single and Double, with or without Multimedia). Creates one sub-category widget item per state for location-specific product lists. States are **dynamic** — added via "+ Add State" button.

### State Reference

| State | `level_tag` | `level_property` | Slug Suffix | Required? |
| :--- | :--- | :--- | :--- | :---: |
| Global (Default) | `global` | `global` | `_global` | Always |
| Jharkhand | `state` | `jharkhand` | `_jh` | Optional |
| Chhattisgarh | `state` | `chhattisgarh` | `_cg` | Optional |
| West Bengal | `state` | `west bengal` | `_wb` | Optional |
| Uttar Pradesh | `state` | `uttar pradesh` | `_up` | Optional |
| Patna | `state` | `patna` | `_patna` | Optional |
| *(any new)* | `state` | `{state_name_lowercase}` | `_{short_key}` | Optional |

### Mapping CSV Format

```csv
widget_item_slug_name,level_tag,level_property,priority,cohort
rice_mela_rail_sc_wi_global,global,global,1,
rice_mela_rail_sc_wi_jh,state,jharkhand,2,
rice_mela_rail_sc_wi_cg,state,chhattisgarh,3,
rice_mela_rail_sc_wi_up,state,uttar pradesh,4,
```

> Priority is auto-assigned incrementally. Global is always priority `1`.

---

## 8. Filters & Configurations

All filters are **universal** across all 8 variants (SPR + DPR) — handled by `WidgetItemHelper` / `PageViewUtils`.

### Widget-Level Filters (`filter_dict` on Widget)

| Key | Type | Component | Description |
| :--- | :--- | :--- | :--- |
| `max_order_constraint` | int | `NumberInput` | Show only if user orders <= Y |
| `min_order_constraint` | int | `NumberInput` | Show only if user orders >= X |

### Item-Level Filters (`filter_dict` on WidgetItem)

| Key | Type | Component |
| :--- | :--- | :--- |
| `in_stk_item_codes` | list of int | `ProductListInput` |

### Product-Level Filters (`product_filter_dict` on WidgetItem)

| Key | Operators | Component |
| :--- | :--- | :--- |
| `category` | `in`, `equal` | `TextInput` |
| `sub_category` | `in`, `equal` | `TextInput` |
| `mrp` | `lte`, `gte`, `lt`, `gt`, `equal` | `NumberInput` |
| `sp` | `lte`, `gte`, `lt`, `gt`, `equal` | `NumberInput` |
| `discount` | `lte`, `gte`, `lt`, `gt`, `equal` | `NumberInput` |

### App Configurations

| Key | Type | Default | Component |
| :--- | :--- | :--- | :--- |
| `allow_android` | boolean | `true` | `ToggleInput` |
| `allow_ios` | boolean | `true` | `ToggleInput` |
| `min_android_version` | version | — | `VersionInput` |
| `max_android_version` | version | — | `VersionInput` |
| `min_ios_version` | version | — | `VersionInput` |
| `max_ios_version` | version | — | `VersionInput` |

### Widget Item Additional Properties

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `oos_product_count` | int | `0` | OOS products appended at end |
| `show_pb_tag` | boolean | `true` | Show "Previously Bought" tag |
| `pb_reorder` | boolean | `true` | Re-sort PB items first |

---

## 9. Navigation — "View All" Link

SPR uses `view_all_action_params` to link to its PLP page:

```javascript
{
  "view_all_action_name": "redirect-to-page",
  "view_all_action_params": {
    "page_type": "product_listing_page",   // or "category_page"
    "page_layout_slug_name": "{base}_page_p"
  }
}
```

Both `product_listing_page` and `category_page` are supported — user selects during configuration.

---

## 10. Rendering

| Property | Value |
| :--- | :--- |
| Config Source | `SPRConfig.js` |
| Registry | Config-driven via `WidgetRegistry.configMap` (type: `product_rail`) |
| SPR Renderer | `WidgetRenderer.jsx` → `configComponentMap['SingleProductRow']` |
| DPR Renderer | `WidgetRenderer.jsx` → `configComponentMap['ProductRail']` |

| Variant | Emulator Component |
| :--- | :--- |
| `single_product_row*` (all 4 SPR) | `SingleProductRow` |
| `double_product_row*` (all 4 DPR) | `ProductRail` |

### Initial State

```javascript
{
    type: 'product_rail',
    title: 'New Collection',
    products: [],
    pageType: 'product_listing_page',
    start_time: '',
    end_time: '',
    pnc: { rows: 1, is_optimized: true, has_multimedia: false }
}
```

---

## 11. API Endpoints

| Action | Endpoint | Type |
| :--- | :--- | :--- |
| Create Page Layout | `/api/app/post_page_layout/` | JSON |
| Create Widget Item | `/api/app/post_widget_item/` | Multipart |
| Create Widget | `/api/app/widget/` | Multipart |
| Map Widget <-> Widget Item | `/api/app/update_widget_widget_item_mapping/` | CSV |
| Map Page <-> Widget | `/api/app/update_layout_widget_mapping/` | — |
| Map Page <-> Global Registry | `/api/app/update_page_page_layout_mapping/` | — |

---

## 12. Related Documentation

- [PLP Page Widget Support](./PLP-PAGE-widget-support.md) — Universal 3-layer PLP ecosystem, location mapping
- [Slug Name Reference](./SLUG_NAME.md) — All slug patterns across widgets
- [Widget Library Reference](./REFERENCE-Widget-Library.md) — All supported widgets and variants
