# Deployment Workflows

## Standard Workflow (Maker-Checker)

1.  **Drafting (Maker)**
    *   User builds the layout in the React App.
    *   State is local (in-memory).
2.  **Submission**
    *   User clicks "Submit for Approval".
    *   `GoogleSheetService` serializes the layout to JSON and appends a row to the "Request Queue" Sheet.
    *   Status: `PENDING`.
3.  **Review (Checker)**
    *   Admin reviews the queued request (either in the App's Dashboard or the Sheet).
    *   If valid, Admin clicks "Approve".
4.  **Deployment (Automation)**
    *   The `Approval_Automation` script triggers.
    *   It parses the JSON.
    *   It makes authenticated calls to the production Django API to create/update widgets and pages.
    *   Status: `APPROVED`.

## Direct Sync (Bypass)

For trusted admins, **BackendSyncService** allows direct deployment from the UI, bypassing the sheet queue. This is useful for quick fixes or trusted super-users.

| Feature | Standard Workflow | Direct Sync |
| :--- | :--- | :--- |
| **Speed** | Slower (Async) | Instant |
| **Safety** | High (Review Required) | Low (No Review) |
| **Audit** | Full Sheet Log | Local Log Only |
| **Use Case** | Marketing Campaigns | Hotfixes |
