# Single Product Row (SPR) V2 - Technical Logic

## Problem Statement
The standard "Single Product Row" widget simply displays products. However, our business requirement involves a complete ecosystem where clicking "View All" on the row leads to a dedicated "Product Listing Page" (PLP). Manually creating a PLP for every single row is tedious and error-prone for users.

## Solution: The "Optimized" Flow
We implemented an automated, multi-step creation process (`SPR_Widget_Optimized.gs`) that handles the entire lifecycle in one go.

### Workflow Steps

1.  **Trigger**: User approves an SPR-V2 widget request.
2.  **Phase 1: The Hidden PLP**
    *   The script first creates a new **Page Layout** dedicated to this row.
    *   It creates a **PLP Widget** (hidden from the main nav) and adds it to this new page.
    *   It maps the products from the user's list to this PLP widget.
3.  **Phase 2: The Visible Row**
    *   The script creates the actual **Row Widget** on the requested parent page.
    *   Crucially, it sets the `view_all_url` of this row to point to the `page_slug` created in Phase 1.
    
### Key Benefits
*   **Zero-Touch PLP**: Users don't need to manually build the destination page.
*   **Consistency**: The PLP always matches the row's content exactly.
*   **Automated Slug Management**: We generate deterministic slugs (e.g., `{base_slug}_plp_w`) to link the components programmatically. 
