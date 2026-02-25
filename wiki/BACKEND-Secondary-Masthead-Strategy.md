# Secondary Masthead — 4-Phase Build Strategy

## Overview
Secondary Mastheads have complex, nested structures: banner → carousel items → page ecosystems → sub-categories. Plus a dedicated **View All** redirect page. We use a 4-Phase strategy to resolve dependencies.

## The 4-Phase Strategy

### Phase 1: Parent Containers
- Create Multimedia Background (`{slug}_bg`)
- Create SM Widget (`{slug}` — user's slug directly)
  - `widget_type: masthead_secondary_carousal_hp`
  - `view_all_action_name: ''` (updated later)
  - `media_aspect_ratio: media_number` (e.g. `'2.5'`)

### Phase 1.5: View All Ecosystem (if `view_all_redirect` = ON)
- Create sub-cat widget items (per state)
  - Category page → from `view_all_sub_categories[]`
  - Product listing → virtual sub-cat from `view_all_state_products`
- Create VA PLP Widget (`{slug}_va_plp`)
- Create VA Page Layout (`{slug}_va_cat_page` or `{slug}_va_plp_page`)
- Map sub-cats → VA PLP
- **If Expand Page ON**: create additional widgets (`{slug}_va_ep_1`, `_ep_2`...) with their own sub-cats
- Map all widgets → VA Page Layout (priority order)
- Map VA Page → Global

### Phase 2: Per Carousel Item Ecosystem
For each carousel item (same logic as CollectionBannerBuilder):
1. Create sub-cat widget items (per state, CREATE or UPDATE)
2. Create PLP Widget (`product_listing`)
3. Create Page Layout (`page_layout_type: '2'`)
4. Map sub-cats → PLP (`mapWidgetItems`)
5. Map PLP → Page (`mapLayoutWidget`)
6. Map Page → Global (`mapPageLayout`)
7. Create Carousel Widget Item with `click_action_params → page_layout_slug_name`

### Phase 3: Final Mapping + View All Update
- Map all carousel items → SM Widget (CSV)
- If `view_all_redirect` ON:
  - Update SM Widget → `view_all_action_name: 'redirect-to-page'`
  - Update SM Widget → `view_all_action_params: {page_type, page_layout_slug_name: VA page slug}`

## Slug Patterns

| Object | Pattern | Example |
| :--- | :--- | :--- |
| Multimedia | `{slug}_bg` | `festive_bg` |
| SM Widget | `{slug}` | `festive` |
| VA PLP | `{slug}_va_plp` | `festive_va_plp` |
| VA Page | `{slug}_va_cat_page` / `{slug}_va_plp_page` | `festive_va_plp_page` |
| VA Expand Widget | `{slug}_va_ep_{n}` | `festive_va_ep_1` |
| Item PLP | `{slug}_item_{n}_plp` | `festive_item_1_plp` |
| Item Page | `{slug}_item_{n}_cat_page` / `_plp_page` | `festive_item_1_cat_page` |
| Item Sub-Cat | `{slug}_item_{n}_subcat_{m}_{state}` | `festive_item_1_subcat_1_global` |
| Item Carousel | `{slug}_item_{n}_carousel` | `festive_item_1_carousel` |

## State-Based Mapping
- **Global**: Visible to everyone (required, always present)
- **JH/CG/WB**: State-specific overrides
- **Dynamic states**: Users can add any state via "Add State" button
- Each state generates its own sub-cat widget item with unique slug suffix
