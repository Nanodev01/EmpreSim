-- AlterTable
ALTER TABLE "Game" ADD COLUMN "codigoCoordinador" TEXT;

-- Las partidas existentes también reciben su código (64 bits aleatorios).
UPDATE "Game" SET "codigoCoordinador" = upper(hex(randomblob(8)));

-- CreateIndex
CREATE UNIQUE INDEX "Game_codigoCoordinador_key" ON "Game"("codigoCoordinador");
