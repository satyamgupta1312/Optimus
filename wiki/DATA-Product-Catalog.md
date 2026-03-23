# Product Catalog Integration

## Overview

Optimus fetches product details (name, brand, image, price) from **Mirror** (Metabase → Postgres `smpublic.smpcm_product`) whenever item codes are entered in any widget editor.

**Source:** `smpublic.smpcm_product` (Postgres via Metabase API)
**Metabase:** `mirror.apnamart.in` (database: Samaan, table ID: 154)
**Server endpoint:** `GET /api/local/kinetic/catalog`

---

## Data Schema (from Metabase/Postgres)

| Column | Field | Example |
|:---|:---|:---|
| `id` | Internal DB id | `2` |
| `item_code` | Lookup key | `746` |
| `display_name` | Product name | `Moong Dal Dhuli 1 Kg` |
| `brand` | Brand name | `ASM` |
| `product_image` | CDN image URL | `https://gs.apnamart.in/product/…` |
| `mrp` | Maximum retail price | `159` |
| `selling_price` | Selling price | `140` |

**Lookup key:** `item_code`

---

## Architecture

```
smpublic.smpcm_product (Postgres)
      ↓ Metabase structured query API (mirror.apnamart.in)
Server endpoint (GET /kinetic/catalog) ←→ 30-min in-memory cache
      ↓ LocalApiService.getCatalog()
useCatalog hook  ←→  sessionStorage cache (30 min TTL)
      ↓ getProduct(code)
ProductListInput  →  Shows product card per item code
```

---

## Source Files

| File | Purpose |
|:---|:---|
| `src/config/Feature/ProductCatalogConfig.js` | Cache config, UI settings |
| `src/hooks/useCatalog.js` | Fetch from server, sessionStorage cache, `getProduct()` |
| `src/services/CatalogService.js` | Sync/async product search (local CSV fallback + server) |
| `src/components/Inputs/ProductListInput.jsx` | Shows product cards when codes are added |
| `server/routes/kinetic.js` | `GET /kinetic/catalog` endpoint with in-memory cache |
| `server/scripts/kinetic-setup.js` | Creates `homepage/product-catalog` Kinetic query |

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

- **Server cache** — 30-min in-memory cache on server (avoids repeated ClickHouse queries)
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
| `CATALOG_CACHE.storageKey` | `optimus_product_catalog_v1` | sessionStorage key |
| `CATALOG_CACHE.ttlMs` | `1800000` (30 min) | Cache TTL |
| `CATALOG_UI.maxFullCards` | `30` | Threshold for compact view |
| `CATALOG_UI.currency` | `₹` | Currency symbol |

---

## Data Refresh

1. Product data comes from `smpublic.smpcm_product` in Postgres (via Metabase API at mirror.apnamart.in)
2. Server cache expires after 30 min, sessionStorage cache also expires after 30 min
3. User can clear `sessionStorage` key `optimus_product_catalog_v1` in DevTools to force refresh
4. No code changes needed when products are added/updated upstream

---

## Related Documentation

- [Kinetic Integration](./DATA-Kinetic-Integration.md)
- [Catalog Integration Guide](./DATA-Catalog-Integration.md)
- [Slug Name Reference](./SLUG_NAME.md)
- [Product Rail Widget](./Widget-spr.md)
