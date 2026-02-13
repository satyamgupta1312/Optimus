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
│   │   ├── Preview/           # Phone Emulator components
│   │   ├── Sidebar/           # Widget Library & Property Editor
│   │   └── Widgets/           # Individual Widget implementations
│   ├── context/               # Global State (WidgetContext, UndoRedo, Auth)
│   ├── services/              # API & Business Logic (GoogleSheetService, BackendSyncService)
│   └── data/                  # Static assets and mock data
├── scripts/                   # Google Apps Script (Backend Logic)
│   ├── Approval_Automation.gs # Main Trigger for Approvals
│   ├── SPR_Widget_Optimized.gs # Complex SPR Creation Logic
│   └── Secondary_Masthead_Automation.gs # 3-Phase Batch Creation
└── vite.config.js             # Prozy configuration for API calls
```
