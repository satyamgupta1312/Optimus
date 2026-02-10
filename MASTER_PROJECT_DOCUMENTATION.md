# 📘 Optimus Project - Master Documentation & Logic Analysis

> **Version**: 1.1.0 
> **Date**: 2026-02-09
> **Scope**: Full Stack (React Frontend + Google Apps Script Automation + API Integration)

---

## 1. 🎯 Project Executive Summary

**Optimus** is a sophisticated **Mobile UI Builder & CMS** for *samaan.apnamart.in*. It provides a visual, drag-and-drop interface for non-technical users (Makers) to create app layouts, while enforcing a strict approval workflow for admins (Checkers). 

### High-Level Architecture
- **Frontend**: React 19 (Vite) - Interactive UI with real-time phone preview.
- **State Layer**: Context-driven with full **Undo/Redo** and **Activity Logging**.
- **Automation Layer**: Google Apps Script (GAS) handles complex multi-step API deployments.
- **Deployment Paths**:
    - **Workflow Path**: Maker creates → Sheet Queue → Checker Approves → Script Deploys.
    - **Sync Path**: Direct deployment from frontend using `BackendSyncService` (Bypasses Sheets).

---

## 2. 🏗️ System Architecture

### 2.1 Technology Stack

| Layer | Technology | Role |
|-------|------------|------|
| **Core** | React 19, Vite 7 | Main application framework |
| **Styling** | Tailwind CSS 3.4 | Modern UI with utility classes |
| **State** | Context API | Global state management (Widgets, Auth, Settings) |
| **Data Persistence** | Google Sheets | Acts as the "Review Database" and "Catalog Backup" |
| **D&D** | @dnd-kit | Smooth drag-and-drop widget reordering |
| **API Integration** | Django (Proxy) | Direct communication with production server via Vite proxy |

### 2.2 Directory Structure

```text
optimus/
├── src/
│   ├── components/
│   │   ├── Dashboard/         # Request Queue & Widget Generator
│   │   ├── Preview/           # Phone Emulator (iOS/Android simulation)
│   │   ├── Sidebar/           # Widget Library & Property Editor
│   │   └── Widgets/           # Component implementations (CategoryGrid, SPR, etc.)
│   ├── context/               # Global state (WidgetContext, undoRedo, etc.)
│   ├── services/              # Logic Layer (Sync, Multimedia, Sheet API)
│   └── data/                  # Source data (catalog.csv, homepage_api_mock.json)
├── scripts/                   # Google Apps Script (Backend Logic)
│   ├── Approval_Automation.gs # Master Router for Sheet Approvals
│   ├── CLP_Automation.gs      # Complex Category Landing Page Logic
│   ├── SPR_Widget_Optimized.gs # Flow-based SPR Creation (Full Ecosystem)
│   └── Secondary_Masthead_Automation.gs # 3-Phase Batch Creation
└── vite.config.js             # Vite Proxy Configuration
```

---

## 3. 🧠 Core Logic & Flows

### 3.1 State Management System
The application uses a nested context architecture:
1.  **WidgetContext**: Manages the list of widgets, header widgets, and **Workflow Status** (`DRAFT`, `PENDING`, `APPROVED`, `REJECTED`).
2.  **UndoRedoContext**: Tracks state snapshots of widgets whenever they are updated, allowing `Ctrl+Z` / `Ctrl+Y` functionality.
3.  **ActivityLogContext**: Records every user action (e.g., `widget_added`, `widget_duplicated`) for audit purposes.

### 3.2 Workflow Logic (Maker-Checker)
1.  **Action: Create**: User builds layout. Status is `DRAFT`.
2.  **Action: Submit**: Calls `GoogleSheetService.createRequest`. 
    - Saves widget JSON to a Google Sheet.
    - Status flips to `PENDING`.
    - **Locking**: Edit actions are disabled in `PENDING` status.
3.  **Action: Approve (Checker)**:
    - Calls `GoogleSheetService.approveRequest`.
    - Triggers `doPost` in `Approval_Automation.gs`.
    - Script creates actual entities on `samaan.apnamart.in`.
    - Updates Status to `APPROVED`.

### 3.3 Dynamic Property Logic
Inside `PropertyEditor.jsx`, several intelligent behaviors exist:
- **Auto-Transliteration**: Typing in English "Title" automatically calls Google Input Tools API to populate "Hindi Title".
- **Intelligent Product Fetching**:
    1.  User entered Item IDs in a textarea.
    2.  Pressing "Enter" triggers a dual-lookup.
    3.  **Step 1**: Tries `fetchProductsByItemCodes` (Google Sheet Web App).
    4.  **Step 2**: If unsuccessful, searches the local `catalog.csv` via `CatalogService.js`.
    5.  Populates the preview with real names, prices, and images.

---

## 4. 🧩 Widget Implementation Matrix

| Widget Name | Type Code (API) | Logic Flow |
|-------------|----------------|------------|
| **Primary Masthead** | `masthead_primary` | Header-only. Supports multimedia backgrounds. |
| **Secondary Masthead** | `masthead_secondary` | Supports batch 3-phase creation (Parent → Child → Map). |
| **Category Grid** | `category` | Maps sub-categories to leaf IDs. Support square icons. |
| **Single Product Row (Optimized)** | `single_product_row_v2` | Implements **Flow 1** (Hidden PLP Ecosystem) + **Flow 2** (Row Widget). Ensures "View All" works. |
| **Banner With Product Listing** | `product_listing` | Legacy CLP behavior. Fetches products from CSV URL if provided. |

---

## 5. 🤖 Automation Deep Dive (GAS)

### 5.1 SPR Optimized Flow (`SPR_Widget_Optimized.gs`)
Unlike standard widgets, the Optimized SPR requires a full ecosystem:
1.  **Phase 1 (Listing)**: Create Sub-Category Item ➝ Create PLP Widget ➝ Create Page Layout ➝ Map Items to PLP ➝ Map PLP to Page.
2.  **Phase 2 (Widget)**: Create Row Widget Item ➝ Create SPR-V2 Widget ➝ **Link "View All"** to the Page Layout created in Phase 1.

### 5.2 Secondary Masthead 3-Phase Logic
1.  **Preprocessing**: Identifies Parent/Child relationships in the sheet (e.g., which carousel item belongs to which layout).
2.  **Creation**: Creates all Parents (Widgets, Layouts) first.
3.  **Mapping**: Creates Children (Items) and maps them to parents in a final pass.
    - Includes **State-Based Mapping**: Differentiates between Global, JH, CG, and WB users.

---

## 6. 🛠️ Critical Services

### 6.1 BackendSyncService.js
A direct implementation of the automation logic in JavaScript.
- Uses `FormData` to handle image uploads and JSON metadata.
- Allows admins to bypass the "Sheet Review" step and deploy directly to production from the **Widget Generator** modal.

### 6.2 MultimediaService.js
Dedicated service for handling "Background Multimedia" assets.
- Support Image, Video, and Lottie assets.
- Maps internal types to API codes (`image: 3`, `video: 2`, `lottie: 1`).

---

## 7. ⚠️ Maintenance & Troubleshooting

1.  **Proxy Issues**: Ensure `npm run dev` is running, as all API calls go through the Vite proxy to avoid CORS.
2.  **Auth Cookies**: Automation scripts use a hardcoded `COOKIE_STRING`. This must be updated every ~30 days if session invalidates.
3.  **Slug Consistency**: The automation scripts use deterministic suffixes (e.g., `_plp_w`). Manual changes to these slugs in production may break the automation mapping.

---
*Generated by Antigravity AI for Apnamart Optimus Project*
