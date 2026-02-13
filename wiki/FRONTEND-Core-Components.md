# Frontend Guide

The Optimus frontend is a React 19 Single Page Application (SPA) built with Vite.

## Key Components

### 1. PhoneFrame & DropZone
Simulates the mobile environment. It renders the `DropZone` where users place widgets. This component ensures that the "What You See Is What You Get" (WYSIWYG) promise is kept.

### 2. PropertyEditor
A dynamic form builder that adapts based on the selected widget's configuration schema.
*   **Intelligent Features**:
    *   **Auto-Transliteration**: Uses Google Input Tools API to convert English titles to Hindi.
    *   **Product Fetching**: Resolves Item IDs to product details (image, price, name) using `CatalogService`.

### 3. WidgetLibrary
The palette of available components users can drag onto the canvas. Includes:
*   **Mastheads**: Primary (Hero) and Secondary (Pills).
*   **Grids**: Category Grids.
*   **Carousels**: Single Product Rows (SPR), Banner Videos.

## State Management

*   **WidgetContext**: The source of truth for the current page layout.
*   **UndoRedoContext**: Implements a history stack to support `Ctrl+Z` (Undo) and `Ctrl+Y` (Redo).
*   **ActivityLogContext**: Tracks user actions to provide an audit trail.

## Critical Services

### BackendSyncService.js
A direct implementation of the automation logic in JavaScript. It allows admins to bypass the "Sheet Review" step and deploy directly to production from the **Widget Generator** modal.

### MultimediaService.js
Dedicated service for handling "Background Multimedia" assets (Image, Video, Lottie).
