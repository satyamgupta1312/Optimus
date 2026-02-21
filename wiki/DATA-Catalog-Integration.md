# Data Catalog Integration

## Overview

Optimus fetches **live product details** (name, brand, image, price) from a Google Sheet CSV whenever item codes are used in any widget. This enables the emulator/phone preview to show real product cards without a production database connection.

---

## Architecture

```
Widget Editor (Sidebar)
  ↓ User enters item codes via ProductListInput
  ↓ useCatalog hook resolves each code → Product object
  ↓ 
 ┌─────────────────────────────────────────────────────┐
 │           useCatalog (src/hooks/useCatalog.js)       │
 │  • Fetches Google Sheet CSV once per session         │
 │  • Parses to Map<itemCode → Product>                 │
 │  • Cached in sessionStorage (30 min TTL)             │
 │  • Module singleton — all components share one fetch │
 └─────────────────────────────────────────────────────┘
  ↓
 ┌─────────────────────────────────────────────────────┐
 │            Widget Preview (Phone Emulator)           │
 │                                                     │
 │  SingleProductRow.jsx  → SPR / DPR product cards    │
 │  BannerWithProductListing.jsx → PLP navigation      │
 └─────────────────────────────────────────────────────┘
```

---

## Google Sheet CSV Source

**URL:** `https://docs.google.com/spreadsheets/d/1h_y6sQ075NMeEWRxBCrF5H6ZHQLv5q1yy_6qrs-hBcw/export?format=csv&gid=0`

**Config:** `src/config/Feature/ProductCatalogConfig.js`

### Sheet Columns

| Index | Field | Description |
|:---|:---|:---|
| 0 | `id` | Internal DB id |
| 1 | `item code` | **Lookup key** |
| 2 | `Display Name` | Product name shown in UI |
| 3 | `Brand` | Brand name |
| 4 | `main_image` | CDN image URL |
| 5 | `MRP` | Maximum retail price |
| 6 | `Price` | Selling price |

---

## useCatalog Hook

**File:** `src/hooks/useCatalog.js`

```js
import { useCatalog } from '../hooks/useCatalog';

const { catalog, loading, error, getProduct } = useCatalog();

const product = getProduct('746');
// → { itemCode:'746', displayName:'Moong Dal...', brand:'ASM',
//     imageUrl:'https://...', mrp:159, price:140 }

getProduct('99999'); // → null (unknown code)
```

### Cache Behaviour
- **Fetch:** Once per session (module-level singleton)
- **sessionStorage key:** `optimus_product_catalog_v1`
- **TTL:** 30 minutes; stale cache triggers re-fetch on next mount

---

## Widget Integration

### Components that use useCatalog

| Component | Field | What it resolves |
|:---|:---|:---|
| `SingleProductRow.jsx` | `widget.products` (string[] of codes) | Full product cards in SPR/DPR emulator preview |
| `BannerWithProductListing.jsx` | `widget.products` + `item.productIds` | Products shown on PLP navigate |

### Product Object Shape (resolved)

```js
{
  id: '746',
  itemCode: '746',
  name: 'Moong Dal Dhuli 1 Kg',
  brand: 'ASM',
  image: 'https://gs.apnamart.in/...',
  price: '₹140',
  mrp: '₹159',
  discount: 12,          // % off, null if no discount
}
```

---

## Sidebar Input: ProductListInput

**File:** `src/components/Inputs/ProductListInput.jsx`

- Displays a product **card** for each code entered (shows thumbnail, name, brand, price)
- Unknown codes → `⚠ Unknown product` badge
- Catalog loading → `⟳ Loading…` spinner
- > 30 products → compact chip view

---

## Config Reference

**File:** `src/config/Feature/ProductCatalogConfig.js`

| Export | Value | Purpose |
|:---|:---|:---|
| `CATALOG_CSV_URL` | Google Sheet export URL | Fetch endpoint |
| `CATALOG_COLUMNS` | `{ id:0, itemCode:1, ... }` | Column index map |
| `CATALOG_CACHE.storageKey` | `optimus_product_catalog_v1` | sessionStorage key |
| `CATALOG_CACHE.ttlMs` | `1800000` | 30-min TTL |
| `CATALOG_UI.maxFullCards` | `30` | Compact view threshold |
| `CATALOG_UI.currency` | `₹` | Currency symbol |

---

## Adding Catalog Support to a New Widget

1. Import the hook:
```js
import { useCatalog } from '../../../hooks/useCatalog';
```

2. Resolve codes in a `useMemo`:
```js
const { getProduct, loading: catalogLoading } = useCatalog();

const products = useMemo(() =>
  (widget.products || []).map(code => {
    const cat = getProduct(String(code));
    if (!cat) return { id: code, name: catalogLoading ? '…' : `#${code}`, image: '', price: '₹—' };
    return {
      id: code, name: cat.displayName, brand: cat.brand,
      image: cat.imageUrl, price: `₹${cat.price}`, mrp: `₹${cat.mrp}`,
      discount: cat.mrp > cat.price ? Math.round((1 - cat.price/cat.mrp)*100) : null,
    };
  }), [widget.products, getProduct, catalogLoading]);
```

3. Render the products array in your widget preview.

---

## Updating the Sheet

1. Add/edit rows in the Google Sheet
2. Cache auto-expires after 30 min, or clear `sessionStorage` key `optimus_product_catalog_v1` in DevTools to force an immediate refresh.
3. No code changes needed — the CSV URL is stable.

---

## Related Files

| File | Role |
|:---|:---|
| `src/config/Feature/ProductCatalogConfig.js` | Config (URL, columns, cache) |
| `src/hooks/useCatalog.js` | Fetch + parse + cache hook |
| `src/components/Inputs/ProductListInput.jsx` | Sidebar input with catalog cards |
| `src/components/Widgets/SPR/SingleProductRow.jsx` | SPR/DPR emulator preview |
| `src/components/Widgets/BannerWithProductListing.jsx` | Banner PLP preview |
| `wiki/DATA-Product-Catalog.md` | Dedicated product catalog wiki |
