# Supported Widget Library

The following widgets are currently supported in the Optimus builder.

## Config-Driven Widgets

These widgets are defined by a single config file that controls variant resolution, form rendering, validation, and API payload generation.

| Widget | Config File | Variants | Key Feature |
| :--- | :--- | :--- | :--- |
| **Product Rail** | `ProductRailConfig.js` | 8 variants (1/2 row × standard/optimized × plain/multimedia) | Full config-driven lifecycle |
| **Collection Banner** | `CollectionBannerConfig.js` | 2 modes (Scroll → carousel, Stick → category grid) | PLP ecosystem creation for both modes |
| **Masthead** | `MastheadConfig.js` | 2 variants (Primary → hero banner, Secondary → pill navigation) | Multimedia background, 3-phase batch for Secondary |
| **Single Product Row** | `SPRConfig.js` | 4 variants (standard/optimized × plain/multimedia) | Subset of Product Rail (rows=1), state-based mapping |

### Product Rail Variants

| Variant | Backend `widget_type` |
| :--- | :--- |
| Single Row | `single_product_row` |
| Single Row Optimized | `single_product_row_v2` |
| Double Row | `double_product_row` |
| Double Row Optimized | `double_product_row_v2` |
| Multimedia Single Row | `multimedia_single_product_row` |
| Multimedia Single Row Optimized | `multimedia_single_product_row_v2` |
| Multimedia Double Row | `multimedia_double_product_row` |
| Multimedia Double Row Optimized | `multimedia_double_product_row` |

> See [ARCH-Config-Driven-System.md](./ARCH-Config-Driven-System.md) for the architecture.
> See [Widget-spr.md](./Widget-spr.md) for detailed Product Rail documentation.
> See [Widget-spr.md](./Widget-spr.md) for Single Product Row deep-dive.

---

## Collection Banner Modes

| Mode | Backend `widget_type` | Display |
| :--- | :--- | :--- |
| Scroll | `carousel` | Horizontal scrollable banner carousel |
| Stick | `category` | 4-column grid of category icons |

> See [WIDGET-Collection-Banner.md](./WIDGET-Collection-Banner.md) for the unified Collection Banner documentation.

---

## System/Special Widgets

Managed via Header Settings, not directly user-addable from the Sidebar Library.

| Widget Name | Component | Usage |
| :--- | :--- | :--- |
| **Primary Masthead** | `PrimaryMasthead` | Top-level Hero banner |
| **Secondary Masthead** | `SecondaryMasthead` | Pill navigation (3-phase batch creation) |

> See [WIDGET-Masthead.md](./WIDGET-Masthead.md) for Primary & Secondary Masthead documentation.

---

## Shared Infrastructure

| Config | File | Used By |
| :--- | :--- | :--- |
| **PLP Ecosystem** | `PLP-PAGE-widget-support.js` | All widgets that create click-through pages (3-layer structure) |
| **Slug Patterns** | `slugPatterns.js` | Slug generation and validation across all widget types |

> See [PLP-PAGE-widget-support.md](./PLP-PAGE-widget-support.md) for the 3-layer PLP ecosystem.
> See [SLUG_NAME.md](./SLUG_NAME.md) for slug naming patterns.
