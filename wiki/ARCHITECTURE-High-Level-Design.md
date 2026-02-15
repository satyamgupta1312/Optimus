# Architecture Overview

Optimus operates as a hybrid system, combining a modern React frontend with a serverless backend powered by Google Apps Script and Google Sheets.

## Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 7, Tailwind CSS 3.4 | Main application framework |
| **State** | React Context API | Global state management (Widgets, Auth, Settings) |
| **Data** | Google Sheets | Acts as the "Review Database" and "Catalog Backup" |
| **D&D** | `@dnd-kit/core` | Smooth drag-and-drop widget reordering |
| **Backend** | Google Apps Script (GAS) | Automation logic and deployment triggers |
| **API** | Django (Proxy) | Direct communication with production server via Vite proxy |

## Directory Structure

```text
optimus/
├── src/
│   ├── components/
│   │   ├── Dashboard/         # Request Queue & Widget Generator UI
│   │   ├── Inputs/            # Reusable input components (TextInput, PillSelector, etc.)
│   │   ├── Preview/           # Phone Emulator components
│   │   ├── Sidebar/           # Widget Library & Property Editor
│   │   └── Widgets/           # Individual Widget implementations
│   ├── config/
│   │   ├── WidgetRegistry.js  # Central type → config lookup
│   │   └── widgets/           # Per-widget config files (ProductRailConfig.js, etc.)
│   ├── context/               # Global State (WidgetContext, UndoRedo, Auth)
│   ├── services/
│   │   ├── system/            # Generic config consumers (VariantResolver, PayloadBuilder, ConfigValidator)
│   │   └── *.js               # API & Business Logic (GoogleSheetService, BackendSyncService)
│   └── data/                  # Static assets and mock data
├── scripts/                   # Google Apps Script (Backend Logic)
│   ├── Approval_Automation.gs
│   ├── CLP_Automation.gs
│   ├── Primary_Masthead_Automation.gs
│   ├── Product_Fetch_Service.gs
│   ├── SPR_Widget_Optimized.gs
│   ├── SPR_Optimized_Automation.gs
│   ├── Secondary_Masthead_Automation.gs
│   └── Secondary_Masthead_Backend.gs
├── wiki/                      # Project documentation
└── vite.config.js             # Proxy configuration for API calls
```

> See also: [Config-Driven Architecture](./ARCH-Config-Driven-System.md) for details on the `config/` and `services/system/` layers.

