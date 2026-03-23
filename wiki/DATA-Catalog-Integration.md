# Data Catalog Integration

## Overview

Optimus fetches **live product details** (name, brand, image, price) from **Mirror** (Metabase → Postgres `smpublic.smpcm_product`) whenever item codes are used in any widget. This enables the emulator/phone preview to show real product cards without a production database connection.

---

## Architecture

```
Widget Editor (Sidebar)
  ↓ User enters item codes via ProductListInput
  ↓ useCatalog hook resolves each code → Product object
  ↓
 ┌─────────────────────────────────────────────────────┐
 │           useCatalog (src/hooks/useCatalog.js)       │
 │  • Fetches from server (Metabase/Postgres)            │
 │  • Maps to Map<itemCode → Product>                   │
 │  • Cached in sessionStorage (30 min TTL)             │
 │  • Module singleton — all components share one fetch │
 └─────────────────────────────────────────────────────┘
  ↓
 ┌─────────────────────────────────────────────────────┐
 │        Server (GET /api/local/kinetic/catalog)       │
 │  • Calls Metabase API (mirror.apnamart.in)            │
 │  • In-memory cache (30 min TTL, ~16k rows)           │
 │  • Source: smpublic.smpcm_product (Postgres)         │
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

## Data Source

**Postgres table:** `smpublic.smpcm_product` (via Metabase structured query API)
**Metabase:** `mirror.apnamart.in` (database: Samaan id:3, table id:154)
**Server endpoint:** `GET /api/local/kinetic/catalog`

### Response Columns

| Column | Description |
|:---|:---|
| `id` | Internal DB id |
| `item_code` | **Lookup key** |
| `display_name` | Product name shown in UI |
| `brand` | Brand name |
| `product_image` | CDN image URL |
| `mrp` | Maximum retail price |
| `selling_price` | Selling price |

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
- **Server:** 30-min in-memory cache (avoids repeated ClickHouse queries)
- **Frontend fetch:** Once per session (module-level singleton)
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
  displayName: 'Moong Dal Dhuli 1 Kg',
  brand: 'ASM',
  imageUrl: 'https://gs.apnamart.in/...',
  mrp: 159,
  price: 140,
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

## Data Refresh

1. Product data comes from `smpublic.smpcm_product` in Postgres (via Metabase API at mirror.apnamart.in)
2. Server cache expires after 30 min, sessionStorage cache also expires after 30 min
3. Clear `sessionStorage` key `optimus_product_catalog_v1` in DevTools to force an immediate refresh
4. No code changes needed when products are added/updated upstream

---

## Related Files

| File | Role |
|:---|:---|
| `src/config/Feature/ProductCatalogConfig.js` | Config (cache, UI settings) |
| `src/hooks/useCatalog.js` | Fetch + map + cache hook |
| `src/services/CatalogService.js` | Sync/async product search (local CSV fallback + server) |
| `src/components/Inputs/ProductListInput.jsx` | Sidebar input with catalog cards |
| `src/components/Widgets/SPR/SingleProductRow.jsx` | SPR/DPR emulator preview |
| `src/components/Widgets/BannerWithProductListing.jsx` | Banner PLP preview |
| `server/routes/kinetic.js` | `GET /kinetic/catalog` endpoint |
| `server/scripts/kinetic-setup.js` | Creates Kinetic saved query |
| `wiki/DATA-Product-Catalog.md` | Dedicated product catalog wiki |
