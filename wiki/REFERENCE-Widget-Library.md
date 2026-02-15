# Supported Widget Library

The following widgets are currently supported in the Optimus builder.

## Config-Driven Widgets

These widgets are defined by a single config file that controls variant resolution, form rendering, validation, and API payload generation.

| Widget | Config File | Variants | Key Feature |
| :--- | :--- | :--- | :--- |
| **Product Rail** | `ProductRailConfig.js` | 8 variants (1/2 row × standard/optimized × plain/multimedia) | Full config-driven lifecycle |

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
> See [WIDGET-Product-Rail.md](./WIDGET-Product-Rail.md) for detailed Product Rail documentation.

---

## Legacy Widgets

These widgets use hard-coded component maps and will be migrated to config-driven in future phases.

| Widget Name | Component | Key Features |
| :--- | :--- | :--- |
| **Banner With Product Listing** | `BannerWithProductListing` | Image banner with category title (legacy CLP style) |
| **Category Grid** | `CategoryGrid` | Grid of category icons (2-4 cols), navigation to sub-categories |

## System/Special Widgets

Managed via Header Settings, not directly user-addable from the Sidebar Library.

| Widget Name | Component | Usage |
| :--- | :--- | :--- |
| **Primary Masthead** | `PrimaryMasthead` | Top-level Hero banner |
| **Secondary Masthead** | `SecondaryMasthead` | Pill navigation (3-phase batch creation) |
