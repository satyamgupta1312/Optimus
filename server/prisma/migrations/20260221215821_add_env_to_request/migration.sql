-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL DEFAULT 'Homepage Update',
    "env" TEXT NOT NULL DEFAULT 'PROD',
    "submittedBy" TEXT NOT NULL,
    "rejectionReason" TEXT NOT NULL DEFAULT '',
    "headerWidgets" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("createdAt", "headerWidgets", "id", "rejectionReason", "status", "submittedBy", "type", "updatedAt") SELECT "createdAt", "headerWidgets", "id", "rejectionReason", "status", "submittedBy", "type", "updatedAt" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE INDEX "Request_status_idx" ON "Request"("status");
CREATE INDEX "Request_submittedBy_idx" ON "Request"("submittedBy");
CREATE INDEX "Request_env_idx" ON "Request"("env");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
