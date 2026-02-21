# Slug Name Reference Guide

## 0. SlugBuilder — 8-Part Composition (Optimus UI)

### Overview

The **SlugBuilder** component (`src/components/Inputs/SlugBuilder.jsx`) replaces free-text slug entry with a **structured 8-part composition** via dropdowns, text input, and auto-populated fields. This ensures consistent, standardized slug naming across all widgets.

**Source of truth for all options:** `src/constants/slugBuilderConstants.js`

### Final Slug Format

```
{header}_{identifier}_{widgetType}_{widgetItemType}_{zone}_{location}_{user}_{device}
```

All parts joined with underscore `_`. Multiple location selections also joined with `_`.

### The 8 Parts

| # | Part | Input Type | Values | Example |
|:---:|:---|:---|:---|:---|
| 1 | **Header** | Select dropdown | `monthly_list`, `kirana`, `fresh`, `body_care`, `categories`, `deals`, `electronics`, `kitchen`, `stationery`, `search_page` | `kirana` |
| 2 | **Identifier** | Free text | Any text (sanitized to lowercase + underscores) | `buy_1_get_1` |
| 3 | **Widget Type** | Auto badge (read-only) | Auto-resolved from widget config or legacy type (see code mapping below) | `spr` |
| 4 | **Widget Item Type** | Auto badge (read-only) | Auto-derived from widget type — see auto-map below | `ir`, `sc`, `cl`, `cat` |
| 5 | **Zone** | Select dropdown | `intermediate_zone`, `all_masthead`, `category_section`, `rohp`, `rocp`, `cp_masthead` | `rohp` |
| 6 | **Location** | Smart 2-step select | Level: `Global`, `State`, `City`, `Store` → then multi-select values | `jh` or `jh_wb` or `global` |
| 7 | **User** | Select dropdown | `FTU`, `allusers` | `allusers` |
| 8 | **Device** | Select dropdown | `both`, `ios`, `android` | `both` |

### Example Composed Slugs

| Widget | Header | Identifier | Type | Item Type | Zone | Location | User | Device | **Final Slug** |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| SPR | `kirana` | `buy_1_get_1` | `spr` | `ir` | `rohp` | `jh` | `allusers` | `both` | `kirana_buy_1_get_1_spr_ir_rohp_jh_allusers_both` |
| SPR Optimized | `fresh` | `summer_sale` | `spr` | `sc` | `rohp` | `jh_wb` | `allusers` | `both` | `fresh_summer_sale_spr_sc_rohp_jh_wb_allusers_both` |
| Primary Masthead | `deals` | `diwali_2024` | `pm` | `cl` | `all_masthead` | `global` | `allusers` | `both` | `deals_diwali_2024_pm_cl_all_masthead_global_allusers_both` |
| Carousel | `categories` | `electronics_fest` | `cl` | `cl` | `intermediate_zone` | `jh_cg_up` | `FTU` | `android` | `categories_electronics_fest_cl_cl_intermediate_zone_jh_cg_up_FTU_android` |
| Category Grid | `kitchen` | `cookware` | `cg` | `cat` | `category_section` | `global` | `allusers` | `both` | `kitchen_cookware_cg_cat_category_section_global_allusers_both` |

### Widget Item Type Auto-Derivation (Part 4)

The Widget Item Type field is **auto-populated** from the resolved backend `widget_type` — users never select it.

**Source:** `WIDGET_ITEM_TYPE_AUTO_MAP` in `src/constants/slugBuilderConstants.js`

| Backend `widget_type` | Item Type Code | Item Type |
|:---|:---:|:---|
| `single_product_row` | `ir` | item_rows |
| `double_product_row` | `ir` | item_rows |
| `multimedia_single_product_row` | `ir` | item_rows |
| `multimedia_double_product_row` | `ir` | item_rows |
| `single_product_row_v2` | `sc` | sub_category |
| `double_product_row_v2` | `sc` | sub_category |
| `multimedia_single_product_row_v2` | `sc` | sub_category |
| `multimedia_double_product_row_v2` | `sc` | sub_category |
| `carousel`, `collection_banner`, `banner_with_product_listing` | `cl` | carousel |
| `category`, `category_grid` | `cat` | category |
| `masthead_primary`, `masthead_secondary`, `masthead_secondary_category_hp` | `cl` | carousel |
| `product_listing` | `sc` | sub_category |

> **Rule:** Non-optimized Product Rail → `ir` (item_rows). Optimized Product Rail → `sc` (sub_category). Everything else maps by widget family.



| Backend `widget_type` | Short Code |
|:---|:---|
| `single_product_row` | `spr` |
| `single_product_row_v2` | `spr` |
| `double_product_row` | `dpr` |
| `double_product_row_v2` | `dpr` |
| `multimedia_single_product_row` | `mspr` |
| `multimedia_single_product_row_v2` | `mspr` |
| `multimedia_double_product_row` | `mdpr` |
| `masthead_primary` | `pm` |
| `masthead_secondary` | `sm` |
| `category_grid` | `cg` |
| `product_listing` | `plp` |
| `carousel` | `cl` |
| `banner_with_product_listing` | `bplp` |
| `collection_banner` | `cb` |

**Legacy widgets** (direct type name lookup):

| Legacy UI Type | Short Code |
|:---|:---|
| `Primary Masthead` | `pm` |
| `Secondary Masthead` | `sm` |
| `Category Grid` | `cg` |
| `Product Listing Page (CLP)` | `plp` |
| `Single Product Row Optimize` | `spr` |
| `Banner With Product Listing` | `bplp` |

### Location Smart-Select (Part 6)

The location field uses a **2-step selection**:

1. **Step 1** — Pick a level: `Global`, `State`, `City`, or `Store`
2. **Step 2** — If not Global, multi-select specific values via pill buttons

| Level | Available Values | Slug Output |
|:---|:---|:---|
| Global | *(none — auto)* | `global` |
| State | `jh`, `cg`, `wb`, `up`, `patna` | `jh` or `jh_wb` (multi) |
| City | `bengaluru`, `ranchi`, `kolkata` | `bengaluru` or `ranchi_kolkata` |
| Store | `4`, `166` | `4` or `4_166` |

### Where SlugBuilder is Used

| Editor | File | How |
|:---|:---|:---|
| **Config-driven PropertyEditor** | `src/components/Sidebar/PropertyEditor.jsx` | Field config `component: 'SlugBuilder'` resolved via `InputRegistry` |
| **LegacyPropertyEditor** | `src/components/Sidebar/LegacyPropertyEditor.jsx` | Direct `<SlugBuilder>` replacing raw `<input type="text">` |

### Relationship to Object Suffixes

The **base slug** produced by SlugBuilder becomes the `{base}` prefix for all derived object slugs. The automation scripts append suffixes per Section 8:

```
Base slug (from SlugBuilder): kirana_buy_1_get_1_spr_ir_rohp_jh_allusers_both
                                          ↓
    Page Layout:    {base}_page
    Widget Item:    {base}_wi
    SPR Widget:     {base}_spr
    Sub-Category:   {base}_sc_wi
    PLP Widget:     {base}_plp_w
    ...etc (see Section 8 below)
```

---

## 1. Slug Sanitization Rules

All slug names are generated using the `sanitizeSlug()` function:

```javascript
function sanitizeSlug(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')    // Replace non-alphanumeric with _
    .replace(/^_+|_+$/g, '')         // Remove leading/trailing _
    .substring(0, 50);               // Max 50 characters
}
```

**Rules:**
- Only `a-z`, `0-9`, and `_` allowed
- Spaces and special characters → `_`
- Lowercase only (suffixes may have mixed case)
- Max 50 characters for the base
- No leading/trailing underscores

**Example:** `"Summer Sale 2024!"` → `summer_sale_2024`

---

## 2. Timestamp Format

Some widgets append a timestamp to ensure uniqueness:

**Format:** `YYMMDD_HHmmss`

**Example:** `260215_143022` = Feb 15, 2026, 14:30:22

---

## 3. Widget Slug Patterns

### 3.1 Collection Banner — Scroll Mode (Carousel)

| Step | Object | Suffix | Example |
| :---: | :--- | :--- | :--- |
| 1 | Sub-Category Widget Item | `_sub_cat_wi` | `summer_sale_sub_cat_wi` |
| 2 | PLP Widget | `_plp_w` | `summer_sale_plp_w` |
| 3 | Page Layout | `_Page_p` | `summer_sale_Page_p` |
| 4 | Carousel Widget Item | `_cl_wi` | `summer_sale_cl_wi` |
| 5 | Carousel Widget | `_Cl_w_HP` | `summer_sale_Cl_w_HP` |

**Source:** `scripts/CLP_Automation.gs`

---

### 3.2 Primary Masthead Widget

| Object | Suffix | Example |
| :--- | :--- | :--- |
| Widget | `_pm_w_{timestamp}` | `diwali_2024_pm_w_260215_143022` |
| Multimedia | `_bg` | `diwali_2024_bg` |

**Fallback:** `primary_masthead_{timestamp}` (if no slug provided)

**Source:** `scripts/Primary_Masthead_Automation.gs`

---

### 3.3 Secondary Masthead Widget

| Object | Suffix | Example |
| :--- | :--- | :--- |
| Carousel Item | `_carousel_wi_{timestamp}` | `sale_carousel_wi_260215_143022` |
| Widget | `_sm_w_{timestamp}` | `festive_banner_sm_w_260215_143022` |
| Multimedia | `_bg` | `festive_banner_bg` |

**Fallback:** `secondary_masthead_{timestamp}` (if no slug provided)

**Source:** `scripts/Secondary_Masthead_Automation.gs`, `scripts/Secondary_Masthead_Backend.gs`

---

### 3.4 Product Rail Widget (Standard)

| Step | Object | Suffix | Example |
| :---: | :--- | :--- | :--- |
| 1 | Page Layout | `_page` | `rice_mela_rail_page` |
| 2 | Widget Item | `_wi` | `rice_mela_rail_wi` |
| 3 | Widget (SPR) | `_spr` | `rice_mela_rail_spr` |

**Source:** `src/config/widgets/ProductRailConfig.js`

---

### 3.5 Product Rail Widget (Optimized)

| Step | Object | Suffix | Example |
| :---: | :--- | :--- | :--- |
| 1 | Sub-Category Item | `_sc_wi` | `rice_mela_rail_sc_wi` |
| 2 | PLP Widget | `_plp_w` | `rice_mela_rail_plp_w` |
| 3 | Page Layout | `_page` | `rice_mela_rail_page` |
| 4 | Row Item | `_pr_wi` | `rice_mela_rail_pr_wi` |
| 5 | Widget (SPR Optimized) | `_spr_opt` | `rice_mela_rail_spr_opt` |

**Source:** `src/config/widgets/ProductRailConfig.js`

---

### 3.6 Collection Banner — Stick Mode (Category Grid)

| Step | Object | Suffix | Example |
| :---: | :--- | :--- | :--- |
| 1 | Sub-Category Item | `_sub_cat_wi_{timestamp}` | `electronics_sub_cat_wi_260215_143022` |
| 2 | PLP Widget | `_plp_w_{timestamp}` | `shopping_plp_w_260215_143022` |
| 3 | Page Layout | `_page_{timestamp}` | `shopping_page_260215_143022` |
| 4 | Category Item | `_cat_wi` | `shopping_item_1_cat_wi` |
| 5 | Category Widget | `_cm_hp` | `shopping_cm_hp` |

**Source:** `scripts/Category_Grid_Backend.gs`

---

## 4. Widget Type Values

All valid `widget_type` values used in the backend:

### Mastheads

| Widget Type | Description |
| :--- | :--- |
| `masthead_primary` | Primary Masthead |
| `masthead_secondary_category_hp` | Secondary Masthead |

### Product Rows

| Widget Type | Rows | Optimized | Multimedia |
| :--- | :---: | :---: | :---: |
| `single_product_row` | 1 | No | No |
| `single_product_row_v2` | 1 | Yes | No |
| `multimedia_single_product_row` | 1 | No | Yes |
| `multimedia_single_product_row_v2` | 1 | Yes | Yes |
| `double_product_row` | 2 | No | No |
| `double_product_row_v2` | 2 | Yes | No |
| `multimedia_double_product_row` | 2 | No | Yes |
| `multimedia_double_product_row_v2` | 2 | Yes | Yes |

### Listings & Categories

| Widget Type | Description |
| :--- | :--- |
| `product_listing` | PLP Widget |
| `category` | Category Grid Widget |
| `carousel` | Carousel Widget |

---

## 5. Widget Item Type Values

All valid `item_type` values:

| Item Type | Used For | Widget Context |
| :--- | :--- | :--- |
| `item_rows` | Product row items | Product Rail, Carousel ecosystem |
| `sub_category` | Sub-category / PLP items | Category Grid, Carousel, Product Rail (Optimized) |
| `carousel` | Carousel banner items | Carousel Widget, Secondary Masthead |
| `category` | Category redirect items | Category Grid |

---

## 6. Page Type Values

All valid `page_type` values for Page Layout:

| Page Type | Description | Used By |
| :--- | :--- | :--- |
| `product_listing_page` | Product listing / PLP page | Product Rail, Carousel, Category Grid |
| `category_page` | Category browsing page | Category Grid, Carousel, Secondary Masthead |

---

## 7. Multimedia Slug Patterns

| Widget Type | Multimedia Suffix | Example |
| :--- | :--- | :--- |
| Primary Masthead | `_bg` | `diwali_2024_bg` |
| Secondary Masthead | `_bg` | `festive_banner_bg` |
| Product Rail | from `background_media` field | auto-generated |

**Multimedia Type Values:**

| Value | Type |
| :---: | :--- |
| `1` | Lottie |
| `2` | Video |
| `3` | Image |

---

## 8. Quick Reference — All Suffixes

| Suffix | Object | Widget |
| :--- | :--- | :--- |
| `_sub_cat_wi` | Sub-Category Widget Item | Carousel |
| `_sub_cat_wi_{ts}` | Sub-Category Widget Item | Category Grid |
| `_sc_wi` | Sub-Category Widget Item | Product Rail (Optimized) |
| `_plp_w` | PLP Widget | Carousel, Product Rail (Optimized) |
| `_plp_w_{ts}` | PLP Widget | Category Grid |
| `_Page_p` | Page Layout | Carousel |
| `_page` | Page Layout | Product Rail |
| `_page_{ts}` | Page Layout | Category Grid |
| `_cl_wi` | Carousel Widget Item | Carousel |
| `_carousel_wi_{ts}` | Carousel Widget Item | Secondary Masthead |
| `_Cl_w_HP` | Carousel Widget | Carousel |
| `_pm_w_{ts}` | Primary Masthead Widget | Primary Masthead |
| `_sm_w_{ts}` | Secondary Masthead Widget | Secondary Masthead |
| `_wi` | Row Widget Item | Product Rail (Standard) |
| `_pr_wi` | Row Widget Item | Product Rail (Optimized) |
| `_spr` | SPR Widget | Product Rail (Standard) |
| `_spr_opt` | SPR Optimized Widget | Product Rail (Optimized) |
| `_cat_wi` | Category Widget Item | Category Grid |
| `_cm_hp` | Category Widget | Category Grid |
| `_bg` | Multimedia | Mastheads |

> `{ts}` = timestamp in `YYMMDD_HHmmss` format

---

## 9. Slug Handling — Direct Pass-Through

### Overview

Jo slug SlugBuilder se create hota hai, **wahi directly store hota hai** — koi uniqueness check nahi, koi auto-increment nahi. Same slug Prisma DB mein jaata hai.

**Validation:** Sirf required field check — slug empty nahi hona chahiye.

### Flow

```
SlugBuilder composes slug from 8 parts
    ↓
widget.slug = "rice_mela_spr_sc_rohp_global_allusers_both"
    ↓
Submit → ValidationService checks slug is not empty ✓
    ↓
Same slug in request payload → Prisma DB
```

### Rules

| Rule | Detail |
|:---|:---|
| Uniqueness check | **None** — same slug allowed |
| Auto-increment | **None** — slug used as-is |
| Fetched widgets | Slug preserved from backend via `ApiMapper.js` |
| Required | Yes — empty slug blocks submit |

---

## 10. Related Documentation

- [Collection Banner Widget](./WIDGET-Collection-Banner.md)
- [Product Rail Widget](./Widget-spr.md)
- [Masthead Widget](./WIDGET-Masthead.md)
- [Backend Automation Services](./BACKEND-Automation-Services.md)
- [Config-Driven System](./ARCH-Config-Driven-System.md)
