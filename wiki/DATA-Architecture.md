# DATA Architecture — Express + Supabase (PostgreSQL)

> **Status:** Active
> **Stack:** Express 5 + Supabase (PostgreSQL) + Metabase (Mirror)
> **Port:** 3001 (API) / 5173 (Vite)

---

## Overview

Optimus uses a local Express backend with Supabase (PostgreSQL) for persistence. The Django API at `samaan.apnamart.in` handles actual widget deployment. Widget metadata is mirrored to Metabase at `mirror.apnamart.in`.

```
┌─────────────┐     /api/local/*      ┌──────────────────────┐
│  React App  │ ──────────────────────>│  Express :3001       │
│  (Vite)     │                        │  Supabase (Postgres) │
│  :5173      │     /api/*             └──────────┬───────────┘
│             │ ──────────────────────>  Django (samaan.apnamart.in)
└─────────────┘                                   │
                                                  ▼
                                        mirror.apnamart.in (Metabase)
                                        └── smapp_widgets table
                                            (source of widget_id)
```

---

## The `widget_id` Rule

**`widget_id` is THE canonical identifier for a widget across all tables.**

| Table | Column | Role |
|-------|--------|------|
| `canvas_widgets` | `widget_id` | Canonical widget ID |
| `submissions` | `widget_id` | Same ID — links to canvas_widgets |
| `widget_versions` | `widget_id` | Same ID — links to canvas_widgets |

### Where does `widget_id` come from?

```
Widget created in Optimus (base slug stored)
        │
        ▼
  Step 1: Derive full SMApp slug
  (base_slug + suffix based on type + pnc)
        │
        │  product_rail + is_optimized  → base_spr_opt
        │  product_rail + standard      → base_spr
        │  collection_banner (scroll)   → base_crausel_w
        │  collection_banner (stick)    → base_cm_hp
        │  masthead                     → CONTAINS search (timestamp suffix)
        │
        ▼
  Step 2: Lookup in smapp_widgets table (Metabase)
  (exact match on derived slug, or CONTAINS for mastheads)
        │
   ┌────┴────┐
   │ FOUND   │ NOT FOUND
   ▼         ▼
widget_id =  widget_id =
SMApp ID     UUID (fallback)
(e.g. 9338)  (new widget, not yet deployed)
```

### Slug Derivation: Base → SMApp Slug

**Rule:** Supabase and Mirror store the SAME slug WITH suffix. If frontend sends a slug that already has suffix, `deriveSmappSlug()` returns it as-is (no double suffix). `SlugGenerator` constructor also strips existing suffix before building derived slugs.

**`deriveSmappSlug(baseSlug, type, pnc)` handles this:**

| Widget Type | PNC Condition | Suffix | Example |
|---|---|---|---|
| `product_rail` | `pnc.is_optimized = true` | `_spr_opt` | `base_spr_opt` |
| `product_rail` | `pnc.is_optimized = false` | `_spr` | `base_spr` |
| `collection_banner` | `displayMode = 'scroll'` | `_crausel_w` | `base_crausel_w` |
| `collection_banner` | `displayMode = 'stick'` | `_cm_hp` | `base_cm_hp` |
| `masthead` | any | `null` (CONTAINS search) | searches `base*` |

**Priority order for `widget_id` in `createWidget()`:**
1. Explicitly provided via `data.widgetId`
2. `resolveSmappWidgetId(slug, type, pnc)` — derives full slug, queries Metabase
3. Fallback: auto-generated UUID (widget not yet on backend)

### `id` vs `widget_id`

| Field | Purpose | Who sets it |
|-------|---------|-------------|
| `id` | Supabase internal row PK (UUID) | Supabase auto-generates |
| `widget_id` | Canonical widget identifier | From SMApp (numeric) or UUID (new) |

**All service queries use `widget_id`** (not `id`):
- `getWidgetById()` → `.eq('widget_id', ...)`
- `updateWidget()` → `.eq('widget_id', ...)`
- `deleteWidget()` → `.eq('widget_id', ...)`
- `findWidgetsByIds()` → `.in('widget_id', [...])`
- `updateWidgetStatuses()` → `.in('widget_id', [...])`
- `reorderWidgets()` → `.eq('widget_id', ...)`

### SMApp Widget Lookup

```
Metabase DB: Samaan (id: 3)
Table: smapp_widgets (id: 236)

Key fields:
  2906 = id (int8, PK)         → becomes widget_id
  2910 = slug_name (varchar)   → matched with derived slug
  2904 = widget_type (varchar)
  19578 = heading_en (varchar)
```

Functions in `WidgetDataService.js`:
- `deriveSmappSlug(baseSlug, type, pnc)` → computes full SMApp slug with suffix
- `resolveSmappWidgetId(baseSlug, type, pnc)` → derives slug + looks up ID (exact or CONTAINS)
- `lookupSmappWidgetId(fullSlug)` → exact slug match lookup
- `batchLookupSmappWidgetIds(widgets[])` → batch lookup with slug derivation

---

## ID Convention Across All Tables

| Table | `id` | `widget_id` |
|-------|------|-------------|
| `canvas_widgets` | INTEGER (SERIAL) | SMApp widget ID (from slug lookup) |
| `submissions` | INTEGER (SERIAL) | Same as canvas_widgets.widget_id |
| `widget_versions` | INTEGER (manual, not auto-increment) | Same as canvas_widgets.widget_id |
| `user_roles` | INTEGER (SERIAL) | — |
| `locations` | UUID (auto) | — |

> **Migration script:** `server/scripts/fix-canvas-id.sql` converts canvas_widgets.id from UUID to SERIAL.

---

## Database Schema (Supabase PostgreSQL)

**Current row counts (as of 2026-04-07):**

| Table | Rows |
|-------|------|
| `canvas_widgets` | 27 |
| `submissions` | 26 |
| `widget_versions` | 26 |
| `user_roles` | 3 |
| `locations` | 89 |

### `canvas_widgets` — 16 columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated by Supabase (gen_random_uuid) |
| `widget_id` | VARCHAR | **Canonical ID** — from SMApp (numeric) or UUID (if not yet deployed) |
| `type` | VARCHAR | `product_rail`, `collection_banner`, `masthead` |
| `slug` | VARCHAR | Human-readable identifier |
| `env` | VARCHAR | `PROD` or `UAT` |
| `title` | VARCHAR | English title |
| `title_hi` | VARCHAR | Hindi title |
| `status` | VARCHAR | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `DEPLOYED` |
| `sort_order` | INT | Display position |
| `pnc` | JSONB | Properties: `{ rows, is_optimized, has_multimedia }` |
| `config` | JSONB | Widget-specific configuration |
| `products` | JSONB | Product code array: `["368", "369"]` |
| `author` | VARCHAR | Creator email |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `submissions` — 23 columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL (PK) | Auto-increment row ID (1, 2, 3...) |
| `request_id` | INT | From PostgreSQL sequence (`nextval_request_id`) |
| `widget_id` | VARCHAR | **Same as canvas_widgets.widget_id** (SMApp ID from slug lookup) |
| `widget_type` | VARCHAR | Widget type at submission time |
| `slug` | VARCHAR | Slug at submission time |
| `title` | VARCHAR | Title at submission time |
| `title_hi` | VARCHAR | Hindi title |
| `item_titles_hi` | JSONB | Hindi titles for carousel/collection items |
| `request_status` | VARCHAR | `PENDING`, `APPROVED`, `REJECTED`, `DEPLOYED` |
| `env` | VARCHAR | `PROD` or `UAT` |
| `products_count` | INT | Number of products |
| `pnc` | JSONB | PNC snapshot |
| `config` | JSONB | Widget config: stateProducts, scrollItems, carouselItems, pageType, etc. |
| `hierarchy` | JSONB | Slug hierarchy for backend creation |
| `rejection_reason` | VARCHAR | Reason if rejected |
| `header_widgets` | JSONB | Header widget state if included |
| `request_type` | VARCHAR | Always `Homepage Update` |
| `sort_order` | INT | Widget position in request |
| `result` | VARCHAR | Deploy result |
| `error_msg` | VARCHAR | Deploy error message |
| `history` | JSONB | Audit trail: `[{ action, by, at }]` |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `widget_versions` — 9 columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER (PK) | Manually set — synced with submissions.id (not auto-increment) |
| `widget_id` | VARCHAR | **Same as canvas_widgets.widget_id** (SMApp ID from slug lookup) |
| `widget_slug` | VARCHAR | Slug at version time |
| `env` | VARCHAR | Environment |
| `version` | INT | Version number (incremental per widget) |
| `snapshot` | JSONB | Full widget state at this version |
| `changed_by` | VARCHAR | User email |
| `change_log` | VARCHAR | Change description |
| `created_at` | TIMESTAMPTZ | Auto |

### `user_roles` — 10 columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Row PK |
| `email` | VARCHAR | User email (unique with env) |
| `name` | VARCHAR | Display name |
| `role` | VARCHAR | `CHECKER` |
| `env` | VARCHAR | `PROD` or `UAT` |
| `is_active` | BOOLEAN | Active flag |
| `added_at` | TIMESTAMPTZ | When added |
| `added_by` | VARCHAR | Admin who added |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

### `locations` — 13 columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Row PK |
| `key` | VARCHAR | Short code: `jh`, `mum` |
| `env` | VARCHAR | `PROD` or `UAT` |
| `level_tag` | VARCHAR | `state` or `city` |
| `level_property` | VARCHAR | `jharkhand`, `mumbai` |
| `slug_suffix` | VARCHAR | `_jh`, `_mum` |
| `label` | VARCHAR | Display name |
| `type` | VARCHAR | `state` or `city` |
| `is_default` | BOOLEAN | Protected from toggle/delete |
| `is_enabled` | BOOLEAN | Active flag |
| `is_custom` | BOOLEAN | User-created |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |

---

## Activity / Audit Trail

**No separate `activity_log` table.** All audit data lives in `submissions.history` JSONB column:

```json
[
  { "action": "submit", "by": "maker@example.com", "at": "2026-04-04T10:00:00Z" },
  { "action": "approve", "by": "checker@example.com", "at": "2026-04-04T11:00:00Z" },
  { "action": "deploy", "by": "admin@example.com", "at": "2026-04-04T12:00:00Z" }
]
```

The `/api/local/activity` endpoint reads and flattens these history arrays.

---

## Request Workflow

```
              ┌─────────────────────┐
              │      PENDING        │
              │  (Maker submits)    │
              └─────────┬──────────┘
                        │
              ┌─────────┴──────────┐
         approve               reject
              │                    │
              ▼                    ▼
    ┌──────────────────┐  ┌──────────────────┐
    │    APPROVED       │  │    REJECTED       │
    └──────────────────┘  └──────────────────┘
              │                    │
              └──── reopen ────────┘
                        │
                        ▼
                    PENDING (can be re-approved/rejected)
                        │
              (if approved)
                        ▼
                    DEPLOYED (via /kinetic/deploy-sync)
```

### Deploy Sync — Mirror ID Update

After browser deploy (DeploymentService → Django API), `deploy-sync` is called:

```
Browser Deploy (DeploymentService.js)
    │
    ▼ Creates widget in Django → mirror gets slug + ID (e.g., 9352)
    │
    ▼ POST /kinetic/deploy-sync { requestId, widgetId, slugs }
    │
    ▼ SubmissionService.syncDeploy():
        1. Lookup mirror ID by slug → lookupSmappWidgetId(slug) → 9352
        2. Update submissions.widget_id = 9352
        3. Update canvas_widgets.widget_id = 9352
        4. Update widget_versions.widget_id = 9352
        5. Set request_status = DEPLOYED
        6. Append 'deploy' to history
```

### Config Column

`submissions.config` stores widget-specific configuration (stateProducts, scrollItems, carouselItems, pageType, etc.) so that Preview and Deploy can access full widget data from the queue.

```json
{
  "stateProducts": { "global": "90513,90518" },
  "pageType": "product_listing_page",
  "start_time": "2026-04-06T00:00:00",
  "end_time": "2027-04-06T23:59:00"
}
```

### Queue Display Order

Requests are sorted **descending by created_at** — latest submissions appear first in the queue.

### Atomic Approval (DB-level CAS)

No in-memory locks (useless on Vercel serverless). Instead:
```sql
UPDATE submissions SET request_status = 'APPROVED'
WHERE request_id = ? AND request_status = 'PENDING'
```
If 0 rows affected → concurrent update detected → 409 Conflict.

---

## Role-Based Access Control

| Role | Who | Can do |
|------|-----|--------|
| `SUPER_ADMIN` | Hardcoded: `satyam.gupta@apnamart.in`, `satyam` | Everything + auto-approve |
| `CHECKER` | Hardcoded: `manoj.kumar` + `user_roles` table | Create widgets, submit, approve, reject, reopen, deploy, manage locations/headers |
| `MAKER` | Everyone else | Create widgets, submit requests |

---

## Services Layer

| Service | File | Purpose |
|---------|------|---------|
| `SupabaseService` | `server/services/SupabaseService.js` | Supabase client init |
| `WidgetDataService` | `server/services/WidgetDataService.js` | Widgets, versions, checkers, locations, products, **SMApp widget lookup** |
| `SubmissionService` | `server/services/SubmissionService.js` | Submissions, request status, history, deploy sync |
| `DriveService` | `server/services/DriveService.js` | Google Drive media uploads |

---

## External Integrations

| System | URL | Purpose |
|--------|-----|---------|
| Supabase | `SUPABASE_URL` env var | PostgreSQL database |
| Metabase | `mirror.apnamart.in` | Product catalog + SMApp widget ID lookup |
| Django Backend | `samaan.apnamart.in` (PROD), `smapi-cu.apnamart.in` (UAT) | Widget deployment |
| Google Drive | Apps Script endpoint | Media uploads |

### Metabase Tables Used

| Table | DB | Table ID | Purpose |
|-------|-----|----------|---------|
| `smpcm_product` | Samaan (3) | 154 | Product catalog search |
| `smapp_widgets` | Samaan (3) | 236 | **Widget ID lookup by slug** |
