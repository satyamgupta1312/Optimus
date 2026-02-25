-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "env" TEXT NOT NULL DEFAULT 'PROD',
    "levelTag" TEXT NOT NULL,
    "levelProperty" TEXT NOT NULL,
    "slugSuffix" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Location_env_idx" ON "Location"("env");

-- CreateIndex
CREATE UNIQUE INDEX "Location_key_env_key" ON "Location"("key", "env");
