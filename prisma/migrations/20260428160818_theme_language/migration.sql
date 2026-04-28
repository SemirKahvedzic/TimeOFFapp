-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT 'My Company',
    "tagline" TEXT,
    "logoUrl" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#7c5cff',
    "accentColor" TEXT NOT NULL DEFAULT '#ff8fb1',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'en',
    "workWeek" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "icalToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("accentColor", "brandColor", "countryCode", "createdAt", "icalToken", "id", "logoUrl", "name", "tagline", "timeZone", "updatedAt", "workWeek") SELECT "accentColor", "brandColor", "countryCode", "createdAt", "icalToken", "id", "logoUrl", "name", "tagline", "timeZone", "updatedAt", "workWeek" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_icalToken_key" ON "Company"("icalToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
