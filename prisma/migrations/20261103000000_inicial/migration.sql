-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "periodoActual" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'creada',
    "configCasoJson" TEXT NOT NULL,
    "modoCompetitivo" BOOLEAN NOT NULL DEFAULT false,
    "claveHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esHumano" BOOLEAN NOT NULL DEFAULT true,
    "personalidad" TEXT,
    "planta" REAL NOT NULL DEFAULT 50000.0,
    "capital" REAL NOT NULL DEFAULT 70000.0,
    "efectivo" REAL NOT NULL DEFAULT 0.0,
    "stockUnidades" INTEGER NOT NULL DEFAULT 0,
    "stockValorizado" REAL NOT NULL DEFAULT 0.0,
    "capacitacionAcum" REAL NOT NULL DEFAULT 0.0,
    "idAcumulado" REAL NOT NULL DEFAULT 0.0,
    "empleados" INTEGER NOT NULL DEFAULT 0,
    "prestamosBcoA" REAL NOT NULL DEFAULT 0.0,
    "prestamosBcoB" REAL NOT NULL DEFAULT 0.0,
    "utilidadAcumulada" REAL NOT NULL DEFAULT 0.0,
    "feedbackJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoundDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "periodo" INTEGER NOT NULL,
    "precio" REAL NOT NULL,
    "marketing" REAL NOT NULL,
    "invDes" REAL NOT NULL,
    "capacitacion" REAL NOT NULL,
    "nivelProd" INTEGER NOT NULL,
    "amplPlanta" REAL NOT NULL,
    "pedPrestA" REAL NOT NULL,
    "devPrestA" REAL NOT NULL,
    "pedPrestB" REAL NOT NULL,
    "devPrestB" REAL NOT NULL,
    "razonamiento" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundDecision_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoundReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "periodo" INTEGER NOT NULL,
    "resultadoJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundReport_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Game_claveHash_updatedAt_idx" ON "Game"("claveHash", "updatedAt");

-- CreateIndex
CREATE INDEX "Team_gameId_idx" ON "Team"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundDecision_teamId_periodo_key" ON "RoundDecision"("teamId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "RoundReport_gameId_periodo_key" ON "RoundReport"("gameId", "periodo");

