# DATA Architecture — Local Express + Prisma + SQLite

> **Status:** Active
> **Stack:** Express 5 + Prisma ORM + SQLite
> **Port:** 3001 (API) / 8888 (Vite proxy)

---

## Overview

Optimus uses a local Express backend to persist widget state, manage the approval workflow, and serve the product catalog. The Django API at `samaan.apnamart.in` remains untouched — it handles actual widget deployment to production.

```
┌─────────────┐     /api/local/*      ┌──────────────────┐
│  React App  │ ──────────────────────▶│  Express :3001   │
│  (Vite)     │                        │  Prisma + SQLite │
│  :8888      │     /api/*             └──────────────────┘
│             │ ──────────────────────▶  Django (samaan.apnamart.in)
└─────────────┘
```

---

## Database Schema

### Entity Relationship

```
User ─────┬──── Widget ──── WidgetVersion
          │        │
          │        ├──── RequestWidget ──── Request
          │        │
          │        └──── Comment
          │
          ├──── Request
          ├──── ActivityLog
          └──── CheckerList

HeaderWidget (standalone, 2 rows)
Product (standalone catalog)
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **User** | All users (upserted on each request) | email (unique), role, name |
| **Widget** | Central widget entity | type, slug (unique), title, status, pnc (JSON), config (JSON), products (JSON) |
| **WidgetVersion** | Persistent undo history | widgetId, version, snapshot (JSON), changeLog |
| **HeaderWidget** | 2 fixed rows for masthead | id (primaryMasthead / secondaryMasthead), config (JSON) |
| **Request** | Approval workflow entries | status, submittedBy, rejectionReason, headerWidgets (JSON) |
| **RequestWidget** | Join: request ↔ widget snapshot | requestId, widgetId, snapshot (JSON), result, error |
| **Comment** | Per-widget discussion | widgetId, authorId, text |
| **ActivityLog** | Audit trail | action, userId, targetId, details (JSON) |
| **Product** | Local product catalog | itemCode (unique), name, brand, image, mrp, price |
| **CheckerList** | Checker role assignments | userId (unique) |

### JSON Fields Convention

SQLite has no native JSON type. These fields are stored as `String` and parsed at the API layer:

- `Widget.pnc` — `{ rows: 1, is_optimized: true, has_multimedia: false }`
- `Widget.config` — `{ pageType: "product_listing_page", filters: {...} }`
- `Widget.products` — `["746", "5005", "2476"]`
- `WidgetVersion.snapshot` — Full widget state at that version
- `RequestWidget.snapshot` — Widget state frozen at submission time
- `HeaderWidget.config` — Full masthead configuration
- `ActivityLog.details` — `{ type: "product_rail", slug: "rice_mela_rail" }`

---

## API Routes

All routes are prefixed with `/api/local/`.

### Widgets

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/widgets` | List all (optional `?status=DRAFT&type=product_rail`) |
| POST | `/widgets` | Create widget |
| PATCH | `/widgets` | Bulk reorder `{ order: [{ id, sortOrder }] }` |
| GET | `/widgets/:id` | Get widget with versions |
| PUT | `/widgets/:id` | Full update |
| PATCH | `/widgets/:id` | Partial update |
| DELETE | `/widgets/:id` | Delete widget |
| POST | `/widgets/:id/duplicate` | Clone widget |
| GET | `/widgets/:id/versions` | Version history |

### Requests (Approval Workflow)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/requests` | List requests (optional `?status=PENDING`) |
| POST | `/requests` | Create request (DRAFT) |
| POST | `/requests/:id/submit` | DRAFT → PENDING (validates widgets) |
| POST | `/requests/:id/approve` | PENDING → APPROVED (CHECKER only) |
| POST | `/requests/:id/reject` | PENDING → REJECTED (CHECKER only) |
| POST | `/requests/:id/reopen` | APPROVED/REJECTED → DRAFT |

### Users

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/users/me` | Current user info |
| GET | `/users/checkers` | List all checkers |
| POST | `/users/checkers` | Add checker (SUPER_ADMIN) |
| DELETE | `/users/checkers` | Remove checker (SUPER_ADMIN) |

### Catalog

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/catalog/search?q=rice&limit=20` | Search by name or code |
| GET | `/catalog/batch?codes=746,5005` | Batch lookup |

### Other

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/activity?page=1&limit=50` | Paginated audit log |
| GET | `/comments/widget/:id` | Comments for a widget |
| POST | `/comments` | Add comment |
| DELETE | `/comments/:id` | Delete comment (author only) |
| GET | `/header-widgets` | Get header widget state |
| PUT | `/header-widgets` | Update header widgets |
| GET | `/health` | Server health check |

---

> **Auth & Role Assignment** has moved to **[AUTH-Flow.md](./AUTH-Flow.md)** | Config: `src/config/Feature/AuthConfig.js`

---

## Widget Lifecycle

```
Canvas (DRAFT)
    │
    ▼
Create Widget ──▶ POST /api/local/widgets
    │                    │
    ▼                    ▼
Edit / Preview       DB: Widget (DRAFT)
    │                    │
    ▼                    ▼
Submit ──────────▶ POST /api/local/requests
    │              POST /api/local/requests/:id/submit
    ▼                    │
PENDING                  ▼
    │              DB: Widget (PENDING), Request (PENDING)
    ▼
Checker Reviews
    │
    ├─▶ Approve ──▶ POST /api/local/requests/:id/approve
    │                    │
    │                    ▼
    │              DB: Widget (APPROVED), Request (APPROVED)
    │                    │
    │                    ▼
    │              Deploy to Django (/api/app/widget/) ← unchanged
    │
    └─▶ Reject ───▶ POST /api/local/requests/:id/reject
                         │
                         ▼
                   DB: Widget (REJECTED), Request (REJECTED)
                         │
                         ▼
                   Maker re-edits → resubmits
```

---

## Request Workflow

```
                    ┌────────────────────┐
                    │      DRAFT         │
                    │  (Maker creates)   │
                    └────────┬───────────┘
                             │ submit
                             ▼
                    ┌────────────────────┐
              ┌─────│     PENDING        │─────┐
              │     │  (Checker reviews) │     │
              │     └────────────────────┘     │
              │ approve                 reject │
              ▼                                ▼
    ┌──────────────────┐           ┌──────────────────┐
    │    APPROVED       │           │    REJECTED       │
    │  (Deploy ready)   │           │  (Maker re-edits) │
    └──────────────────┘           └──────────────────┘
              │                                │
              └────────── reopen ──────────────┘
                             │
                             ▼
                         DRAFT (cycle)
```

---

## Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `concurrently vite + nodemon` | Start both frontend + backend |
| `npm run dev:client` | `vite` | Frontend only |
| `npm run dev:server` | `nodemon server/index.js` | Backend only |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run db:migrate` | `prisma migrate dev` | Run database migrations |
| `npm run db:seed` | `node server/prisma/seed.js` | Seed catalog + admin + headers |
| `npm run db:studio` | `prisma studio` | Visual DB browser |

---

## File Structure

```
server/
├── index.js                  ← Express app (port 3001)
├── prisma/
│   ├── schema.prisma         ← Database schema
│   ├── client.js             ← Prisma singleton
│   ├── seed.js               ← Import catalog, create admin + headers
│   ├── optimus.db            ← SQLite database (gitignored)
│   └── migrations/           ← Auto-generated by Prisma
├── middleware/
│   ├── auth.js               ← Email → server-side role resolution + upsert
│   ├── validate.js           ← Server-side widget validation
│   └── errorHandler.js       ← Centralized error responses
└── routes/
    ├── widgets.js             ← Widget CRUD, duplicate, reorder, versions
    ├── requests.js            ← Submit, approve, reject, reopen
    ├── users.js               ← /me, checker management
    ├── catalog.js             ← Product search, batch lookup
    ├── activity.js            ← Paginated audit log
    ├── comments.js            ← Widget comments
    └── headerWidgets.js       ← Header widget slots

src/services/
└── LocalApiService.js        ← Frontend API client (fetch wrapper)
```

---

## Migration from Google Sheets

| Google Sheet Feature | Local DB Replacement |
|---------------------|---------------------|
| Request Queue sheet | `Request` + `RequestWidget` tables |
| Approval Users sheet | `CheckerList` table |
| Audit Log sheet | `ActivityLog` table |
| Catalog sheet | `Product` table |
| Widget state (React) | `Widget` table |
| Undo history (memory) | `WidgetVersion` table |

The `GoogleSheetService.js` methods map 1:1 to `LocalApiService.js` methods. Frontend code can switch between them.
