# Config-Driven Widget Architecture

## Overview

Optimus uses a **config-driven architecture** where each widget type is defined by a single configuration file that serves as the **single source of truth** for variant resolution, form rendering, API payload generation, validation, and rendering.

> **Core Principle: Config Declares, Consumers Execute.**
> The config file declares *what* a widget supports. Consumer modules read the config to decide *how* to render, validate, build payloads, and execute APIs.

## Problem Solved

Widget knowledge was scattered across multiple files with hard-coded logic:

| Knowledge | Was In | Now In |
| :--- | :--- | :--- |
| Variant resolution | `ProductRailBuilder.js` (hard-coded if/else) | `variantMatrix` in config |
| API payload shapes | `WidgetApiService.js`, `BackendSyncService.js` | `deployStrategies` in config |
| Supported filters | `widget_item_helper.py` (backend only) | `filters` in config |
| Multimedia constraints | `widget_enum.py` (implicit) | `multimedia` in config |
| Form fields + validation | `ProductRailConfig.getFields()` (UI only) | `fields[]` with `component`, `validation`, `errorMessage` |
| Rendering hints | `WidgetRenderer.jsx` `componentMap` | `rendering.component` in config |

---

## Data Flow

```
WidgetConfig → WidgetRegistry → Consumers
                                   ├── PropertyEditor (fields → InputRegistry → React components)
                                   ├── ConfigValidator (fields[].validation → error messages)
                                   ├── VariantResolver (PNC → backend widget_type)
                                   ├── PayloadBuilder  (deployStrategies → API calls)
                                   └── WidgetRenderer  (rendering.component → React component)
```

## Directory Structure

```
src/config/
├── WidgetRegistry.js              # Central type → config lookup
└── widgets/
    ├── ProductRailConfig.js       # Full config (source of truth)
    ├── CategoryGrid.config.js     # Future
    ├── Masthead.config.js         # Future
    └── Banner.config.js           # Future

src/components/Inputs/             # Reusable input components
├── InputRegistry.js               # component string → React component
├── TextInput.jsx
├── UrlInput.jsx
├── ToggleInput.jsx
├── PillSelector.jsx
├── NumberInput.jsx
└── VersionInput.jsx

src/services/system/
├── VariantResolver.js             # PNC → widgetType
├── PayloadBuilder.js              # Config → API payloads
└── ConfigValidator.js             # Field validation + pre-deploy checks
```

---

## Config File Schema

Each config file exports a single object with these sections:

### Identity
`type`, `label`, `icon`, `description` — used by WidgetLibrary and Registry.

### Properties (PNC)
Variant-defining properties (e.g. `rows`, `is_optimized`). Rendered as pills/toggles in the PropertyEditor header. `has_multimedia` is implicit from `background_media` presence.

### Variant Matrix
Maps PNC permutations → exact backend `widget_type` string. Example for Product Rail (8 variants):

| rows | is_optimized | has_multimedia | widget_type |
|:---:|:---:|:---:|:---|
| 1 | false | false | `single_product_row` |
| 1 | true | false | `single_product_row_v2` |
| 1 | false | true | `multimedia_single_product_row` |
| 1 | true | true | `multimedia_single_product_row_v2` |
| 2 | false | false | `double_product_row` |
| 2 | true | false | `double_product_row_v2` |
| 2 | false | true | `multimedia_double_product_row` |
| 2 | true | true | `multimedia_double_product_row` |

### Fields (UI Schema)
Every field declares:
- **`component`**: Maps to a React component via `InputRegistry` (e.g. `'TextInput'`, `'ImageUpload'`)
- **`validation`**: Rules like `required`, `pattern`, `minLength`, `maxItems`, `itemValidator`
- **`errorMessage`**: Shown when validation fails
- **`condition`**: `(pnc) => boolean` — field only visible when true

### Filters
Three levels, all universal across variants:
- **Widget-level**: `max_order_constraint`, `min_order_constraint`
- **Item-level**: `in_stk_item_codes`
- **Product-level**: `category`, `sub_category`, `mrp`, `sp`, `discount`

### App Configurations
Platform allow/deny + version range: `allow_android`, `allow_ios`, `min_android_version`, etc.

### Deploy Strategies
Ordered API call sequences per variant strategy (`STANDARD` vs `OPTIMIZED`). Each step specifies `entity`, `endpoint`, `slugSuffix`, and `fieldMap` with `$variable` placeholders resolved at build time.

### Rendering Hints
`component` name for `WidgetRenderer`, `previewMaxProducts` for canvas preview.

---

## Consumer Modules

### VariantResolver (`src/services/system/VariantResolver.js`)
Pure function: `resolveVariant(config, pnc, widget) → widgetType`. Matches PNC properties against `variantMatrix`. Falls back to first entry if no match.

### PayloadBuilder (`src/services/system/PayloadBuilder.js`)
Reads `config.deployStrategies[strategy]` and generates ordered payloads. Resolves `$variable` placeholders from widget state. Replaces hard-coded `ProductRailBuilder.js` and `WidgetApiService.createSingleProductRow`.

### ConfigValidator (`src/services/system/ConfigValidator.js`)
- `validateField(field, value)` — single field validation, returns error string or null
- `validateWidget(config, widgetState)` — full widget validation, returns `{ fieldName: error }` map
- `isDeployReady(config, widgetState)` — boolean check for pre-deploy

Shared between PropertyEditor (real-time inline errors) and deploy flow (pre-submit blocking).

### InputRegistry (`src/components/Inputs/InputRegistry.js`)
Central map of component strings → React components. The PropertyEditor resolves `field.component` through this registry. Available components:

| Component | Used For |
|:---|:---|
| `TextInput` | Slug, title, text fields |
| `UrlInput` | Video URLs |
| `ToggleInput` | Boolean flags |
| `PillSelector` | Enum options (rows: [1, 2]) |
| `NumberInput` | Order constraints, OOS count |
| `VersionInput` | App version strings |
| `ImageUpload` | Background media |
| `ColorPicker` | Color selection |

### PropertyEditor (`src/components/Sidebar/PropertyEditor.jsx`)
Generic rendering loop:
1. Reads `config.properties` → renders PNC selectors (pills, toggle cards)
2. Reads `config.fields` → filters by `condition(pnc)` → resolves `InputRegistry[field.component]` → passes `validateField()` errors inline
3. Reads `config.additionalProperties` → renders advanced settings

Falls back to `LegacyPropertyEditor` for non-config-driven widgets.

### WidgetRenderer (`src/components/Widgets/WidgetRenderer.jsx`)
Reads `config.rendering.component` to resolve the React component. Falls back to legacy `componentMap` for non-migrated types.

---

## Adding a New Widget Type

1. Create `src/config/widgets/NewWidget.config.js` with the schema
2. Import in `WidgetRegistry.js` and add to `configMap`
3. Add React component to `configComponentMap` in `WidgetRenderer.jsx`
4. **Done** — no changes needed in PropertyEditor, InputRegistry, PayloadBuilder, or ConfigValidator
