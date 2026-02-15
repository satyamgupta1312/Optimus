# Frontend Guide

The Optimus frontend is a React 19 Single Page Application (SPA) built with Vite.

## Key Components

### 1. PhoneFrame & DropZone
Simulates the mobile environment. It renders the `DropZone` where users place widgets. This component ensures that the "What You See Is What You Get" (WYSIWYG) promise is kept.

### 2. PropertyEditor
A **config-driven form builder** that adapts based on the selected widget's configuration schema. For config-driven widgets, it:
1. Reads `config.properties` → renders PNC selectors (pills, toggle cards)
2. Reads `config.fields[]` → resolves components via `InputRegistry` → renders with inline validation via `ConfigValidator`
3. Falls back to `LegacyPropertyEditor` for non-migrated widgets

*   **Intelligent Features**:
    *   **Auto-Transliteration**: Uses Google Input Tools API to convert English titles to Hindi.
    *   **Product Fetching**: Resolves Item IDs to product details (image, price, name) using `CatalogService`.
    *   **Real-time Validation**: Uses `ConfigValidator.validateField()` to show inline errors.

### 3. InputRegistry (`src/components/Inputs/InputRegistry.js`)
Central map of component strings → React components. The PropertyEditor resolves `field.component` through this registry.

Available components: `TextInput`, `UrlInput`, `ToggleInput`, `PillSelector`, `NumberInput`, `VersionInput`, `ImageUpload`, `ColorPicker`.

### 4. WidgetLibrary
The palette of available components users can drag onto the canvas. Includes:
*   **Product Rails**: Config-driven, 8 variants (single/double row × optimized × multimedia).
*   **Mastheads**: Primary (Hero) and Secondary (Pills).
*   **Grids**: Category Grids.
*   **Banners**: Banner With Product Listing.

### 5. WidgetRenderer
Resolves the correct React component for each widget. For config-driven widgets, reads `config.rendering.component` via `WidgetRegistry`. Falls back to legacy `componentMap` for non-migrated types.

## State Management

*   **WidgetContext**: The source of truth for the current page layout.
*   **UndoRedoContext**: Implements a history stack to support `Ctrl+Z` (Undo) and `Ctrl+Y` (Redo).
*   **ActivityLogContext**: Tracks user actions to provide an audit trail.
*   **AuthContext**: Authentication state.
*   **AppSettingsContext**: App-wide settings.

## Critical Services

### System Services (`src/services/system/`)
Config-driven generic modules — see [ARCH-Config-Driven-System.md](./ARCH-Config-Driven-System.md):
*   **VariantResolver.js**: PNC → backend `widget_type`.
*   **PayloadBuilder.js**: Config → ordered API payloads.
*   **ConfigValidator.js**: Field + widget validation.

### Business Services
*   **BackendSyncService.js**: Direct deployment to production, bypassing the Sheet Review step.
*   **GoogleSheetService.js**: CRUD operations against the Google Sheet backend.
*   **CatalogService.js**: Product catalog lookup from local CSV.
