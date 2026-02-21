# Product Catalog Integration

## Overview

Optimus fetches product details (name, brand, image, price) from a Google Sheet CSV whenever item codes are entered in any widget editor.

**Sheet URL:** [`1h_y6sQ075NMeEWRxBCrF5H6ZHQLv5q1yy_6qrs-hBcw`](https://docs.google.com/spreadsheets/d/1h_y6sQ075NMeEWRxBCrF5H6ZHQLv5q1yy_6qrs-hBcw/edit)

---

## Sheet Schema

| Column | Field | Example |
|:---|:---|:---|
| A | `id` | `2` |
| B | `item code` | `746` |
| C | `Display Name` | `Moong Dal Dhuli 1 Kg` |
| D | `Brand` | `ASM` |
| E | `main_image` | `https://gs.apnamart.in/product/…` |
| F | `MRP` | `159` |
| G | `Price` | `140` |

**Lookup key:** `item code` (column B)

---

## Architecture

```
Google Sheet CSV
      ↓ fetch (once per session)
useCatalog hook  ←→  sessionStorage cache (30 min TTL)
      ↓ getProduct(code)
ProductListInput  →  Shows product card per item code
```

---

## Source Files

| File | Purpose |
|:---|:---|
| `src/config/Feature/ProductCatalogConfig.js` | Sheet URL, column indices, cache config |
| `src/hooks/useCatalog.js` | Fetch, parse CSV, sessionStorage cache, `getProduct()` |
| `src/components/Inputs/ProductListInput.jsx` | Shows product cards when codes are added |

---

## useCatalog Hook

```js
import { useCatalog } from '../hooks/useCatalog';

const { catalog, loading, error, getProduct } = useCatalog();

// Lookup single product
const product = getProduct('746');
// → { itemCode: '746', displayName: 'Moong Dal Dhuli 1 Kg', brand: 'ASM',
//     imageUrl: 'https://…', mrp: 159, price: 140 }

// Returns null for unknown codes
getProduct('99999'); // → null
```

### Cache Strategy

- **Module singleton** — first call fetches, all subsequent hook instances share the result
- **sessionStorage** — persists across page navigates within tab (cleared on tab close)
- **TTL** — 30 minutes; stale cache triggers re-fetch

---

## ProductListInput UX

When item codes are entered:

| State | Display |
|:---|:---|
| Code found in catalog | Product card: thumbnail + name + brand + price/MRP |
| Code not in catalog | `⚠ Unknown product #XXXX` badge |
| Catalog loading | `⟳ Loading catalog…` spinner |
| > 30 products | Compact chip view (no cards) |

---

## Config Reference (`ProductCatalogConfig.js`)

| Export | Value | Description |
|:---|:---|:---|
| `CATALOG_CSV_URL` | Sheet export URL | Fetch endpoint |
| `CATALOG_COLUMNS` | `{ id:0, itemCode:1, … }` | Column index map |
| `CATALOG_CACHE.storageKey` | `optimus_product_catalog_v1` | sessionStorage key |
| `CATALOG_CACHE.ttlMs` | `1800000` (30 min) | Cache TTL |
| `CATALOG_UI.maxFullCards` | `30` | Threshold for compact view |
| `CATALOG_UI.currency` | `₹` | Currency symbol |

---

## Updating the Sheet

1. Add/remove rows in the Google Sheet
2. The cache auto-expires after 30 min, or user can clear `sessionStorage` to force refresh
3. No code changes needed — the CSV URL remains the same

---

## Related Documentation

- [Slug Name Reference](./SLUG_NAME.md)
- [Product Rail Widget](./Widget-spr.md)
