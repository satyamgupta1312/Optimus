# Backend & Automation

The "Backend" of Optimus is a set of Google Apps Scripts (GAS) acting as intelligent agents triggered by Google Sheet updates.

## Core Scripts

### `Approval_Automation.gs`
The central router. When a request is marked "APPROVED" in the Google Sheet:
1.  It reads the JSON payload from the sheet row.
2.  It authenticates with the production backend (Samaan).
3.  It dispatches the payload to the specific creation logic based on widget type.

### `SPR_Widget_Optimized.gs`
Handles the complex "Single Product Row" flow. Creates the full PLP ecosystem:
1.  **Phase 1**: Creates a hidden Product Listing Page (PLP) and maps items to it.
2.  **Phase 2**: Creates the front-facing "Row Widget" and links its "View All" button to the PLP.

### `SPR_Optimized_Automation.gs`
Orchestration layer for optimized SPR creation. Coordinates the multi-step process and handles error recovery.

### `Secondary_Masthead_Automation.gs`
Manages a 3-phase batch creation process for nested navigation:
1.  **Preprocessing**: Identifies Parent/Child relationships.
2.  **Creation**: Creates all Parents (Widgets, Layouts) first.
3.  **Mapping**: Creates Children (Items) and maps them to parents in a final pass.

### `Secondary_Masthead_Backend.gs`
Backend helper utilities for Secondary Masthead operations. Handles API interaction and data transformation.

### `Primary_Masthead_Automation.gs`
Automation for Primary Masthead (Hero banner) creation. Handles image upload and widget configuration.

### `CLP_Automation.gs`
Automation for Category Landing Page (CLP) / Banner With Product Listing widget creation.

### `Product_Fetch_Service.gs`
Web App endpoint for live product catalog lookup. Called as Tier 2 fallback when a product ID is not found in the local `catalog.csv`.

## Maintenance Notes

*   **Auth Cookies**: Automation scripts use a hardcoded `COOKIE_STRING`. This must be updated every ~30 days if the session invalidates.
*   **Slug Consistency**: The automation scripts use deterministic suffixes (e.g., `_plp_w`, `_sc_wi`, `_spr_opt`). Manual changes to these slugs in production may break the automation mapping.

> **Note**: The config-driven architecture (see [ARCH-Config-Driven-System.md](./ARCH-Config-Driven-System.md)) encodes these same slug suffixes in `deployStrategies`, ensuring frontend and GAS scripts use identical conventions.
