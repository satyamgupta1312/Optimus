-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CheckerList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "env" TEXT NOT NULL DEFAULT 'PROD',
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckerList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CheckerList" ("addedAt", "id", "userId") SELECT "addedAt", "id", "userId" FROM "CheckerList";
DROP TABLE "CheckerList";
ALTER TABLE "new_CheckerList" RENAME TO "CheckerList";
CREATE UNIQUE INDEX "CheckerList_userId_env_key" ON "CheckerList"("userId", "env");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
