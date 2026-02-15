# Secondary Masthead - 3-Phase Logic

## Overview
Secondary Mastheads (pill navigations) often have complex, nested structures (e.g., Parent Category -> Child Categories). Creating these linearly can fail if a child item tries to reference a parent that doesn't exist yet. To solve this, we use a 3-Phase Batch Strategy.

## The 3-Phase Strategy

### Phase 1: Preprocessing
*   The script scans the entire request payload.
*   It builds a dependency graph of Parents and Children.
*   It validates that all required images and links are present.

### Phase 2: Parent Creation
*   We first create all **Parent Containers** (Widgets and Layouts).
*   We store the returned IDs from the API in a temporary map (`local_id` -> `production_id`).

### Phase 3: Child Creation & Mapping
*   We iterate through the **Child Items** (individual pills/icons).
*   We resolving their `parent_id` references using the map from Phase 2.
*   this ensures 100% referential integrity—we never try to attach a child to a missing parent.

## Special Handling for User Segments
The mapping logic also respects user segmentation:
*   **Global**: Visible to everyone.
*   **JH/CG/WB**: Specific overrides for Jharkhand, Chhattisgarh, and West Bengal users.
