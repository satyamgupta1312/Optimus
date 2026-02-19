# Optimus System Wiki

**Optimus** is a specialized Mobile UI Builder & CMS designed for *samaan.apnamart.in*. It enables non-technical users (Makers) to design mobile app layouts using a drag-and-drop interface, while enforcing a strict approval workflow overseen by admins (Checkers).

## Documentation Sections

1.  **Architecture & Overview**
    *   [High-Level Architecture](./ARCHITECTURE-High-Level-Design.md)
    *   [Config-Driven Widget System](./ARCH-Config-Driven-System.md)
    *   [Supported Widgets Reference](./REFERENCE-Widget-Library.md)
2.  **Frontend System**
    *   [Frontend Components](./FRONTEND-Core-Components.md)
3.  **Backend & Automation**
    *   [Backend Workflow (End-to-End)](./Backend-work-flow.md)
    *   [Automation Services](./BACKEND-Automation-Services.md)
    *   [SPR Optimization Logic](./BACKEND-SPR-Optimization-Logic.md)
    *   [Secondary Masthead Strategy](./BACKEND-Secondary-Masthead-Strategy.md)
4.  **Features**
    *   [Maker-Checker Approval Workflow](./Feature-Maker-Checker.md)
    *   [Widget Creation](./Feature-Creation-Widget.md)
    *   [Fetch & Edit Widgets](./FEATURE-Fetch-Widget.md)
    *   [Widget Mapping](./Feature-Mapping-Widget.md)
5.  **Widget Deep-Dives**
    *   [Collection Banner](./WIDGET-Collection-Banner.md) — Carousel (Scroll) and Category Grid (Stick) modes
    *   [Masthead (Primary & Secondary)](./WIDGET-Masthead.md)
    *   [Product Rail](./WIDGET-Product-Rail.md) — All 8 variants (SPR + DPR × Optimized × Multimedia)
    *   [Single Product Row (SPR)](./Widget-spr.md) — SPR-focused deep-dive; see Product Rail for the full 8-variant matrix
6.  **Data & Mappings**
    *   [Homepage Mapping](./Homepage_mapping.md)
    *   [PLP Page & Widget Support](./PLP-PAGE-widget-support.md) — Includes universal filters, builder guide & new-widget checklist
    *   [Slug Naming Patterns](./SLUG_NAME.md)
    *   [Catalog Integration](./DATA-Catalog-Integration.md)
7.  **Processes**
    *   [Deployment Lifecycle](./PROCESS-Deployment-Lifecycle.md)

## Quick Links

- [GitHub Repository](https://github.com/xtmx7/optimus)
- [Production Site](https://samaan.apnamart.in)

## Recent Updates

| Date | Change |
| :--- | :--- |
| Feb 2026 | `PLP-PAGE-widget-support.md` — added Section 7 (Universal Filters), Section 10 (Builder Guide), Section 11 (Adding New Widget) |
| Feb 2026 | `WIDGET-Collection-Banner.md` — Carousel & Category Grid merged into single "Collection Banner" doc |
| Feb 2026 | `WIDGET-Product-Rail.md` — fixed variant matrix (row 8 was missing `_v2`) |
| Feb 2026 | `Widget-spr.md` — expanded to full 8-variant Product Rail matrix |
| Feb 2026 | All wiki files — Mermaid diagrams & ASCII skeleton UIs added |
