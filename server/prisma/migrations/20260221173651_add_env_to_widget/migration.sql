-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Widget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "env" TEXT NOT NULL DEFAULT 'PROD',
    "title" TEXT NOT NULL DEFAULT '',
    "titleHi" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pnc" TEXT NOT NULL DEFAULT '{}',
    "config" TEXT NOT NULL DEFAULT '{}',
    "products" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Widget_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Widget" ("config", "createdAt", "createdBy", "id", "pnc", "products", "slug", "sortOrder", "status", "title", "titleHi", "type", "updatedAt") SELECT "config", "createdAt", "createdBy", "id", "pnc", "products", "slug", "sortOrder", "status", "title", "titleHi", "type", "updatedAt" FROM "Widget";
DROP TABLE "Widget";
ALTER TABLE "new_Widget" RENAME TO "Widget";
CREATE UNIQUE INDEX "Widget_slug_env_key" ON "Widget"("slug", "env");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
