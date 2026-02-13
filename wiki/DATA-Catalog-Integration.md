# Data Catalog Integration

## Overview
Optimus needs to display real product information (Names, Images, Prices) in the "Preview" mode, even though it doesn't have a live database connection to the production ERP.

## The Dual-Fetch Strategy

To balance speed and freshness, we use a two-tiered approach:

### Tier 1: Local Catalog (`catalog.csv`)
*   **Source**: A static CSV file located in `src/data/catalog.csv`.
*   **Pros**: Instant access, works offline/during development.
*   **Cons**: Can become stale.
*   **Usage**: The `CatalogService` parses this CSV on app load into an in-memory map. When a user types an Item ID, we verify against this map first.

### Tier 2: Live Lookup (Google Sheet API)
*   **Source**: A Google Apps Script specific Web App endpoint.
*   **Trigger**: If an ID is not found in the local CSV.
*   **Mechanism**: The frontend calls `Product_Fetch_Service`. The script queries the master Google Sheet (which IS connected to the ERP) and returns the latest details.
*   **Pros**: Always accurate.
*   **Cons**: Slower (network round-trip).

## Data Schema
Common fields we sync:
*   `item_code`: Unique Identifier.
*   `item_name`: Display Name.
*   `mrp`: Maximum Retail Price.
*   `selling_price`: Actual Price.
*   `image_url`: Link to CDN image.
