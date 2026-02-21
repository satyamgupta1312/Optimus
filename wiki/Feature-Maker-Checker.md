# Maker-Checker — Approval Workflow

## 1. Overview

Optimus uses a **Maker-Checker** approval workflow to ensure all widget changes are reviewed before going live on the backend. The flow is:

```
Maker (creates/edits) → Submit → Checker (reviews) → Approve/Reject → Backend API Update
```

### Approval Workflow — System Diagram

```mermaid
flowchart TD
    Login([User Logs In]) --> RoleResolve[Role Resolution\nAuthService + Checker Sheet]
    RoleResolve --> MAKER[MAKER\nCreate · Edit · Submit]
    RoleResolve --> CHECKER[CHECKER\nPreview · Approve · Reject · Deploy]
    RoleResolve --> SUPER[SUPER_ADMIN\nAll Checker Powers\n+ Manage Users]

    MAKER --> Canvas[Canvas: Build Widgets]
    Canvas --> Submit[Click Submit → PENDING]
    Submit --> Sheet[Google Sheet\nRequests Storage]
    Sheet --> RequestQueue[RequestQueue UI\nChecker sees PENDING]

    CHECKER --> RequestQueue
    RequestQueue --> Decision{Decision}
    Decision -->|Approve + Select| ApproveFlow[Apps Script\nhandleApprove]
    Decision -->|Reject| Reject[Status: REJECTED\nMaker can re-edit]
    ApproveFlow --> Backend[Backend API Calls\nWidgets LIVE ✓]
    Reject --> Canvas
```

### Maker Sidebar vs Checker Review Queue

```
MAKER UI                                  CHECKER UI
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  OPTIMUS   ░░░ DRAFT [Submit]│          │  OPTIMUS  [RequestQueue]      │
│                              │          │                               │
│  Sidebar │ Canvas  │ Emulator│          │  Review Queue    [Filter ▼]   │
│  ─────── │ ─────── │ ─────── │          │                               │
│  + SPR   │ [SPR-1] │ [Phone] │          │  PENDING: John Doe 2m ago     │
│  + CB    │ [CB-1 ] │ [img  ] │          │  ┌──────────────────────────┐ │
│  + Mast  │         │ [₹99  ] │          │  │ [☑] SPR – Rice Mela      │ │
│          │         │         │          │  │ [☑] Masthead – Diwali    │ │
│  ─────── │         │ ─────── │          │  │ [☐] CB – Summer Sale     │ │
│  [🔍 Fetch Slug ▢ ]          │          │  │                          │ │
│                              │          │  │ [Preview] [Approve] [✕]  │ │
└──────────────────────────────┘          │  └──────────────────────────┘ │
                                          └──────────────────────────────┘
```

| Role | Can Do | Cannot Do |
| :--- | :--- | :--- |
| **Maker** | Create, edit, delete widgets; Submit for review | Approve or reject |
| **Checker** | Preview, approve, reject, re-open; Deploy | Create or edit widgets |

---

> **Auth & Role Assignment** has moved to **[AUTH-Flow.md](./AUTH-Flow.md)** | Config: `src/config/Feature/AuthConfig.js`

---

## 2. Page Status Lifecycle

**Source:** `src/context/WidgetContext.jsx`

### State Machine

```
           submitForReview()
  DRAFT ─────────────────────→ PENDING
    ↑                            │
    │ resetToDraft()    ┌────────┴────────┐
    │                   │                 │
    │              approvePage()     rejectPage()
    │                   │                 │
    │                   ↓                 ↓
    │               APPROVED          REJECTED
    │                                     │
    └─────────────────────────────────────┘
                  (re-edit & re-submit)
```

### Status Details

| Status | Badge | Editable? | Set By | Allowed Actions |
| :--- | :--- | :---: | :--- | :--- |
| `DRAFT` | `░░ DRAFT` (gray) | Yes | System (initial) / Checker (re-open) | Maker: edit, add, delete, submit |
| `PENDING` | `▓▓ PENDING` (amber, pulsing) | No | Maker (submit) | Checker: preview, approve, reject |
| `APPROVED` | `██ APPROVED` (green) | No | Checker (approve) | Checker: re-open, deploy |
| `REJECTED` | `▒▒ REJECTED` (red) | Yes | Checker (reject) | Maker: edit, re-submit |

### Status Transition Rules

```
DRAFT      → PENDING     Only Maker can submit (submitForReview)
PENDING    → APPROVED    Only Checker can approve (approvePage)
PENDING    → REJECTED    Only Checker can reject (rejectPage)
APPROVED   → DRAFT       Only Checker can re-open (resetToDraft)
REJECTED   → PENDING     Maker edits and re-submits (submitForReview)
```

### Edit Guards

All editing operations check page status before proceeding:

```javascript
// WidgetContext.jsx
const addWidget = (widget) => {
    if (pageStatus !== 'DRAFT' && pageStatus !== 'REJECTED') {
        showToast.warning("Cannot edit while in review or approved");
        return;
    }
    // ... add widget
};
```

**Guarded operations:** `addWidget`, `updateWidget`, `deleteWidget`, `moveWidget`, `duplicateWidget`, `bulkDelete`

### Submit / Approve Button Visibility

| Page Status | Submit (Maker) | Approve/Reject (Checker) | Re-open (Checker) | Deploy (Checker) |
| :--- | :---: | :---: | :---: | :---: |
| `DRAFT` | Visible | — | — | — |
| `PENDING` | Hidden | Visible | — | — |
| `APPROVED` | Hidden | — | Visible | Visible |
| `REJECTED` | Visible (re-submit) | — | — | — |

---

## 3. Maker Flow — Create & Submit

### Step-by-Step

```
1. Maker creates/edits widgets on the canvas
2. Maker previews changes in the emulator (PhoneFrame)
3. Maker clicks "Submit" button
4. WidgetContext.submitForReview() is called
5. ValidationService.validateAndCheckSlugs() runs pre-submit checks
6. Header widgets are cleaned (File objects removed for serialization)
7. Request payload is built:
    {
        widgets: [...all canvas widgets],
        headerWidgets: { primaryMasthead, secondaryMasthead }
    }
8. LocalApiService.createRequest() sends to Express backend (POST /api/local/requests)
9. Prisma creates Widget records + Request record + RequestWidget snapshots in one transaction
10. pageStatus changes to PENDING
11. Toast: "Page submitted for review!"
12. All editing is now locked
```

### What Gets Submitted

| Data | Source | Stored In |
| :--- | :--- | :--- |
| Request ID | `uuid()` (Prisma auto-generated) | `Request.id` |
| Submitter | `req.user.id` (from auth middleware) | `Request.submittedBy` → `User` |
| Request Type | `"Homepage Update"` | `Request.type` |
| Status | `"PENDING"` | `Request.status` |
| Timestamp | `@default(now())` | `Request.createdAt` |
| Widgets | All canvas widgets (JSON snapshots) | `RequestWidget.snapshot` (per widget) |
| Header Widgets | Primary + Secondary Masthead (cleaned JSON) | `Request.headerWidgets` |

---

## 4. Fetch Widget → Edit → Submit → Approve Flow

This section documents the complete lifecycle when a user **fetches an existing widget** from the backend, edits it, and submits it for approval.

### 4.1 Fetch (Retrieve Existing Widget)

**Source:** `src/components/FetchWidget.jsx`

```
1. User enters slug name in FetchWidget input
2. System tries multiple API endpoints:
    a. /api/app/widget/?slug_name={slug}              (primary)
    b. /api/app/get_widget/?slug_name={slug}           (fallback)
    c. /api/app/widget_item/?slug_name={slug}          (if not a widget)
    d. /api/app/get_widget_item/?widget_item_slug_name={slug}  (fallback)
3. API response is transformed into internal widget format
4. Widget is marked with:
    _fetched: true              ← identifies as fetched (not newly created)
    _rawData: {original API response}  ← preserves original data for comparison
    slug: "original_slug_name"  ← preserves backend slug
5. Widget passed to canvas via onWidgetFetched() callback
```

### 4.2 Widget Type Mapping (API → Internal)

| Backend `widget_type` | Internal `type` |
| :--- | :--- |
| `carousel` | Banner With Product Listing |
| `single_product_row` | Single Product Row |
| `single_product_row_v2` | Single Product Row Optimize |
| `product_listing` | Product Listing Page (CLP) |
| `masthead_secondary_category_hp` | Secondary Masthead |
| `category` | Category Grid |

### 4.3 Edit (Modify Fetched Widget)

```
1. Fetched widget appears on canvas with original data pre-filled
2. User modifies any fields (title, products, images, timing, etc.)
3. Each edit goes through WidgetContext.updateWidget():
    - Edit guard checks: pageStatus must be DRAFT or REJECTED
    - Widget updated in state
    - _fetched flag and slug are PRESERVED (not removed)
    - Activity logged: widget_updated with changed field names
4. Undo/redo history tracks all changes
```

### 4.4 Submit (Send Edited Widget for Review)

```
1. Maker clicks "Submit" button
2. WidgetContext.submitForReview() packages ALL canvas widgets
3. The submitted payload includes:
    - Newly created widgets (no _fetched flag)
    - Fetched+edited widgets (with _fetched: true, slug, _rawData)
4. Complete snapshot sent to Google Sheet
5. Status changes to PENDING
```

### 4.5 Approve (Checker Reviews & Approves)

```
1. Checker opens RequestQueue, sees PENDING request
2. Checker previews — fetched widgets are restored to canvas
3. Checker selects widgets to approve (checkboxes)
4. Checker clicks "Approve"
5. GoogleSheetService.approveRequest() sends selected widgets to Google Apps Script
6. Apps Script routes each widget to its automation function:
    - If widget has _fetched: true and slug → EDIT existing widget
    - If widget is newly created → CREATE new widget
7. Backend API calls create/update widgets
8. Status updated to APPROVED
```

### 4.6 Data Flow Diagram

```mermaid
flowchart TD
    subgraph Fetch
        F1["Enter slug name"] --> F2["API: /api/app/widget/?slug_name=XXX"]
        F2 --> F3["Response → formatWidgetData()"]
        F3 --> F4["Widget on canvas\n_fetched: true\nslug: original_slug"]
    end

    subgraph Edit
        F4 --> E1["User modifies fields\n(title, products, timing...)"]
        E1 --> E2["updateWidget()\n_fetched flag preserved"]
        E2 --> E3["Preview in emulator"]
    end

    subgraph Submit
        E3 --> S1["Click Submit"]
        S1 --> S2["submitForReview()\npackage all widgets"]
        S2 --> S3["Google Sheet\n(widgets with _fetched + _rawData)"]
        S3 --> S4["Status: PENDING\nEditing locked"]
    end

    subgraph Approve
        S4 --> A1["Checker opens RequestQueue"]
        A1 --> A2["Preview + Select widgets"]
        A2 --> A3["Click Approve"]
        A3 --> A4["approveRequest()\nSend to Apps Script"]
        A4 --> A5{"_fetched?"}
        A5 -->|Yes| A6["UPDATE existing\nwidget via API"]
        A5 -->|No| A7["CREATE new\nwidget via API"]
        A6 --> A8["Status: APPROVED"]
        A7 --> A8
    end
```

### 4.7 Fetched vs Created Widget — Comparison

| Property | Newly Created Widget | Fetched + Edited Widget |
| :--- | :--- | :--- |
| `_fetched` | `undefined` | `true` |
| `slug` | *(empty or auto-generated)* | Original backend slug |
| `_rawData` | `undefined` | Original API response |
| **On Approve** | Create new backend records | Update existing backend records |
| **Slug on backend** | New slug with suffix | Original slug preserved |

---

## 5. Checker Flow — Review & Approve/Reject

### RequestQueue UI

**Source:** `src/components/Dashboard/RequestQueue.jsx`

```
┌─────────────────────────────────────────────┐
│  Review Queue                    [Filter ▼]  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  John Doe              2 min ago     │   │
│  │  PENDING    3 widgets                │   │
│  │                                      │   │
│  │  [x] Single Product Row - Rice Mela  │   │
│  │  [x] Category Grid - Grocery         │   │
│  │  [x] Primary Masthead                │   │
│  │                                      │   │
│  │  [Preview]  [Approve]  [Reject]      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Jane Smith            1 hour ago    │   │
│  │  APPROVED   5 widgets   [Deploy]     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Checker Actions

#### Preview

- Restores the maker's widgets to the canvas
- Renders them in the emulator for visual review
- Does **not** change request status
- Toast: "Previewing {user}'s request"

#### Approve

```
1. Checker selects which widgets to approve (checkboxes)
2. Clicks "Approve"
3. GoogleSheetService.approveRequest() is called
4. Payload sent to Google Apps Script:
    {
        action: "approve",
        id: requestId,
        widgets: [selected widgets only],
        headerWidgets: { selected header widgets }
    }
5. Apps Script routes each widget to its automation:
    - "Single Product Row Optimize"  → createSPROptimizedWidget()
    - "Single Product Row"           → createSPRStandardWidget()
    - "Banner With Product Listing"  → createCLPWidget()
    - "Primary Masthead"             → createPrimaryMastheadFromApproval()
    - "Category Grid"                → createCategoryGridFromApproval()
    - "Secondary Masthead"           → (Secondary Masthead Backend)
6. Each automation creates/updates widgets via backend API
7. Sheet status updated to "APPROVED"
8. Response returned with results:
    {
        success: true,
        results: [
            { widget: "Rice Mela", status: "success", slug: "rice_mela_spr_opt" },
            { widget: "Grocery", status: "success", slug: "grocery_cm_hp" }
        ]
    }
9. Toast: "Widgets approved! Automation triggered successfully"
```

#### Reject

```
1. Checker clicks "Reject"
2. GoogleSheetService.updateStatus(id, 'REJECTED') is called
3. Sheet status updated to "REJECTED"
4. Maker can now edit and re-submit
5. Toast: "Page rejected. Maker can edit and resubmit"
```

#### Re-open (Approved → Draft)

```
1. Checker views an APPROVED request
2. Clicks "Re-open"
3. WidgetContext.resetToDraft() is called
4. pageStatus set to "DRAFT"
5. Editing unlocked for both maker and checker
6. Toast: "Page reset to draft mode"
```

#### Deploy (Manual Sync)

```
1. Checker views an APPROVED request
2. Clicks "Deploy"
3. Prompted for CSRF token
4. BackendSyncService.deployRequest() is called
5. Direct API calls to backend (bypassing Google Sheet)
6. Used for manual re-deployment if automation failed
```

---

## 6. Approval Automation — Express Backend

**Source:** `server/routes/requests.js`

### Approve Flow

```javascript
// POST /api/local/requests/:id/approve
// 1. Validates role: CHECKER or SUPER_ADMIN only
// 2. Checks request status is PENDING
// 3. Optionally approves only selected widgets (selectedWidgetIds)
// 4. Updates Request.status → APPROVED
// 5. Updates Widget.status → APPROVED for all selected widgets
// 6. Logs ActivityLog entry (action: 'approve')
```

### Reject Flow

```javascript
// POST /api/local/requests/:id/reject
// 1. Validates role: CHECKER or SUPER_ADMIN only
// 2. Checks request status is PENDING
// 3. Updates Request.status → REJECTED + stores rejectionReason
// 4. Updates Widget.status → REJECTED for all widgets in request
// 5. Logs ActivityLog entry (action: 'reject')
```

### Reopen Flow

```javascript
// POST /api/local/requests/:id/reopen
// 1. Checks request status is APPROVED or REJECTED
// 2. Updates Request.status → DRAFT + clears rejectionReason
// 3. Updates Widget.status → DRAFT for all widgets
// 4. Logs ActivityLog entry (action: 'reopen')
```

### Authentication

The Express backend uses **header-based auth** via `server/middleware/auth.js`:

```
Every request:
  1. Read X-Optimus-User header (email)
  2. Upsert User in Prisma DB
  3. Check CheckerList table for CHECKER role
  4. Set req.user = { id, email, name, role }
```

### Response Format

```javascript
// Approve response
{
    id: "uuid",
    status: "APPROVED",
    updatedAt: "2026-02-21T09:43:27.547Z"
}
    ],
    errors: []                      // Array of failed widget objects
}
```

---

## 7. Google Sheet — Data Storage

**Sheet Name:** `Requests`
**Apps Script ID:** `AKfycbwGI4r4nDqo5iKIYubUGpAUTaDN-Z1Su_fsD8EmQ7bxIP3XB0HmEdfXFG89hk0uMVZfBQ`

### Sheet Columns

| Column | Field | Type | Example |
| :--- | :--- | :--- | :--- |
| A | `id` | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| B | `user` | string | `john.doe@apnamart.in` |
| C | `type` | string | `Homepage Update` |
| D | `status` | string | `PENDING` / `APPROVED` / `REJECTED` |
| E | `date` | ISO datetime | `2026-02-17T10:30:00.000Z` |
| F | `widgets` | JSON string | `[{type:"Single Product Row",...}]` |
| G | `headerWidgets` | JSON string | `{primaryMasthead:{...},secondaryMasthead:{...}}` |

### Sheet API Actions

| Action | Method | Payload | Description |
| :--- | :--- | :--- | :--- |
| `create` | POST | Full request object | Maker submits new request |
| `update_status` | POST | `{id, status}` | Checker approves/rejects |
| `approve` | POST | `{id, widgets, headerWidgets}` | Checker approves + triggers automation |
| `fetch_products` | POST | `{item_codes: [...]}` | Lookup product details |
| `uploadMedia` | POST | `{fileName, mimeType, fileData (base64)}` | Upload media to Google Drive |
| *(GET)* | GET | — | Fetch all requests |

---

## 8. Activity Logging

**Source:** `src/context/ActivityLogContext.jsx`

All actions are logged for audit trail:

| Action | Logged Details | Triggered By |
| :--- | :--- | :--- |
| `widget_added` | `{widgetId, type, title}` | addWidget() |
| `widget_updated` | `{widgetId, changes: [fieldNames]}` | updateWidget() |
| `widget_deleted` | `{widgetId, type}` | deleteWidget() |
| `widget_duplicated` | `{originalId, newId}` | duplicateWidget() |
| `bulk_delete` | `{count, widgetIds}` | bulkDelete() |
| `state_restored` | `{timestamp}` | restoreFromHistory() |
| `comment_added` | `{widgetId, commentId}` | addComment() |
| `comment_deleted` | `{commentId}` | deleteComment() |

**Activity Log Limits:** Keeps last 100 entries.

---

## 9. End-to-End Flow Diagram

```mermaid
flowchart TD
    subgraph Maker
        M0["Fetch existing widget\n(FetchWidget.jsx)"] --> M1
        M1["Create/Edit widgets\non canvas"] --> M2["Preview in emulator"]
        M2 --> M3["Click Submit"]
        M3 --> M4["GoogleSheetService\n.createRequest()"]
        M4 --> M5["Status: PENDING\nEditing locked"]
    end

    subgraph Google Sheet
        M4 --> GS["Requests Sheet\n(id, user, status, widgets, headerWidgets)"]
        GS --> C1
    end

    subgraph Checker
        C1["Open RequestQueue\nSee PENDING requests"]
        C1 --> C2["Preview widgets\nin emulator"]
        C2 --> C3{Decision}
        C3 -->|Approve| C4["Select widgets\nClick Approve"]
        C3 -->|Reject| C5["Click Reject"]
    end

    subgraph Rejection
        C5 --> R1["GoogleSheetService\n.updateStatus(id, REJECTED)"]
        R1 --> R2["Status: REJECTED"]
        R2 --> R3["Maker can re-edit\nand re-submit"]
        R3 --> M1
    end

    subgraph Approval
        C4 --> A1["GoogleSheetService\n.approveRequest()"]
        A1 --> A2["Approval_Automation.gs\nhandleApprove()"]
    end

    subgraph Backend API Calls
        A2 --> B1["Route by widget type"]
        B1 --> B2["createSPROptimizedWidget()"]
        B1 --> B3["createCLPWidget()"]
        B1 --> B4["createCategoryGridFromApproval()"]
        B1 --> B5["createPrimaryMastheadFromApproval()"]
        B2 --> B6["POST /api/app/widget/\nPOST /api/app/post_widget_item/\nPOST /api/app/post_page_layout/\nMapping CSV uploads"]
        B3 --> B6
        B4 --> B6
        B5 --> B6
        B6 --> B7["Status: APPROVED\nWidgets live on backend"]
    end
```

---

## 10. UI Components

| Component | File | Role |
| :--- | :--- | :--- |
| **MainLayout** | `src/components/Layout/MainLayout.jsx` | Status badge, Submit/Re-open buttons |
| **RequestQueue** | `src/components/Dashboard/RequestQueue.jsx` | Checker review UI, approve/reject/deploy |
| **FetchWidget** | `src/components/FetchWidget.jsx` | Fetch existing widgets by slug |
| **WidgetContext** | `src/context/WidgetContext.jsx` | State management, submit/approve/reject functions |
| **AuthContext** | `src/context/AuthContext.jsx` | Role assignment (MAKER/CHECKER), switchRole |
| **ActivityLogContext** | `src/context/ActivityLogContext.jsx` | Audit trail |
| **GoogleSheetService** | `src/services/GoogleSheetService.js` | Google Sheet API client |
| **BackendSyncService** | `src/services/BackendSyncService.js` | Direct backend deployment |
| **AuthService** | `src/services/AuthService.js` | Login, role assignment, CSRF |
| **Approval_Automation.gs** | `scripts/Approval_Automation.gs` | Server-side approval routing |

---

## 11. Error Handling

| Scenario | Behavior |
| :--- | :--- |
| Submit fails (network error) | Toast: "Failed to submit to sheet" — stays in DRAFT |
| Approval fails (automation error) | Toast: "Failed to trigger automation: {error}" — stays PENDING |
| Individual widget creation fails | Returned in `results` as `status: "failed"` with error message |
| Session cookies expired | Backend returns 403 — need to refresh cookies in Approval_Automation.gs |
| Unsupported widget type | Skipped with `status: "skipped"` |
| Editing while PENDING/APPROVED | Toast: "Cannot edit while in review or approved" |
| Fetch widget not found | Toast: "Widget not found with slug: {slug}" |
| Empty `background_multimedia` on deploy | "Background Multimedia Name is invalid" — omit field if empty |

---

## 12. Related Documentation

- [AUTH-Flow.md](./AUTH-Flow.md) — Login flow, role assignment, CSRF, checker management
- [DATA-Architecture.md](./DATA-Architecture.md) — Database schema, API routes, local backend
- [Feature-Creation-Widget.md](./Feature-Creation-Widget.md) — Widget creation steps and API payloads
- [Feature-Mapping-Widget.md](./Feature-Mapping-Widget.md) — All mapping types and CSV formats
- [FEATURE-Fetch-Widget.md](./FEATURE-Fetch-Widget.md) — Fetch, edit, and update existing widgets
- [Product Rail (SPR + DPR)](./Widget-spr.md) — Product Rail variants and filters
- [WIDGET-Collection-Banner.md](./WIDGET-Collection-Banner.md) — Carousel (Scroll) and Category Grid (Stick)
- [WIDGET-Masthead.md](./WIDGET-Masthead.md) — Primary & Secondary Masthead
- [Homepage_mapping.md](./Homepage_mapping.md) — GL-HP-global homepage mapping
- [PLP-PAGE-widget-support.md](./PLP-PAGE-widget-support.md) — 3-layer PLP ecosystem
