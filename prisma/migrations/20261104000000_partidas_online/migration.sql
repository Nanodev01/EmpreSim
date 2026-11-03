-- AlterTable
ALTER TABLE "Team" ADD COLUMN "claveHash" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "periodoActual" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'creada',
    "configCasoJson" TEXT NOT NULL,
    "modoCompetitivo" BOOLEAN NOT NULL DEFAULT false,
    "claveHash" TEXT NOT NULL,
    "dispositivos" TEXT NOT NULL DEFAULT 'unico',
    "codigo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Game" ("casoId", "claveHash", "configCasoJson", "createdAt", "estado", "id", "modo", "modoCompetitivo", "nombre", "periodoActual", "updatedAt") SELECT "casoId", "claveHash", "configCasoJson", "createdAt", "estado", "id", "modo", "modoCompetitivo", "nombre", "periodoActual", "updatedAt" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_codigo_key" ON "Game"("codigo");
CREATE INDEX "Game_claveHash_updatedAt_idx" ON "Game"("claveHash", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Team_claveHash_idx" ON "Team"("claveHash");

-- CreateIndex
CREATE UNIQUE INDEX "Team_gameId_claveHash_key" ON "Team"("gameId", "claveHash");

