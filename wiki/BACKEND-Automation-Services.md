# Backend & Automation

The "Backend" of Optimus is a set of Google Apps Scripts (GAS) acting as intelligent agents triggered by Google Sheet updates.

## Core Scripts

### `Approval_Automation.gs`
The central router. When a request is marked "APPROVED" in the Google Sheet:
1.  It reads the JSON payload from the sheet row.
2.  It authenticates with the production backend (Samaan).
3.  It dispatches the payload to the specific creation logic based on widget type.

### `SPR_Widget_Optimized.gs`
Handles the complex "Single Product Row" flow. Unlike simple widgets, an SPR requires a full ecosystem:
1.  **Phase 1**: Creates a hidden Product Listing Page (PLP) and maps items to it.
2.  **Phase 2**: Creates the front-facing "Row Widget" and links its "View All" button to the PLP created in Phase 1.

### `Secondary_Masthead_Automation.gs`
Manages a 3-phase batch creation process for nested navigation:
1.  **Preprocessing**: Identifies Parent/Child relationships.
2.  **Creation**: Creates all Parents (Widgets, Layouts) first.
3.  **Mapping**: Creates Children (Items) and maps them to parents in a final pass.

## Maintenance Notes

*   **Auth Cookies**: Automation scripts use a hardcoded `COOKIE_STRING`. This must be updated every ~30 days if the session invalidates.
*   **Slug Consistency**: The automation scripts use deterministic suffixes (e.g., `_plp_w`). Manual changes to these slugs in production may break the automation mapping.
