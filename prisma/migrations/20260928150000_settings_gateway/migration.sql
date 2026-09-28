ALTER TABLE "EnergySettings"
  ADD COLUMN "batteryNominalVoltage" INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN "batteryChemistry" TEXT,
  ADD COLUMN "batteryMinReservePct" DOUBLE PRECISION NOT NULL DEFAULT 20,
  ADD COLUMN "batteryMaxChargeA" DOUBLE PRECISION,
  ADD COLUMN "batteryMaxDischargeA" DOUBLE PRECISION,
  ADD COLUMN "inverterRatedPowerKw" DOUBLE PRECISION,
  ADD COLUMN "gridPhase" TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN "retentionDays" INTEGER NOT NULL DEFAULT 365,
  ADD COLUMN "pollIntervalSec" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "lowBatteryPct" DOUBLE PRECISION NOT NULL DEFAULT 20,
  ADD COLUMN "criticalBatteryPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
  ADD COLUMN "gridOutageAlert" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "faultAlert" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "offlineMinutes" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "overloadPct" DOUBLE PRECISION NOT NULL DEFAULT 90,
  ADD COLUMN "channels" TEXT NOT NULL DEFAULT 'in_app',
  ADD COLUMN "quietHoursStart" TEXT,
  ADD COLUMN "quietHoursEnd" TEXT;

ALTER TABLE "InverterConnection"
  ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "connectionMode" TEXT NOT NULL DEFAULT 'gateway',
  ADD COLUMN "gatewayName" TEXT,
  ADD COLUMN "gatewayTokenHash" TEXT,
  ADD COLUMN "gatewayTokenCreatedAt" TIMESTAMP(3),
  ADD COLUMN "lastTestResult" TEXT,
  ADD COLUMN "lastTestLatencyMs" INTEGER,
  ADD COLUMN "lastTestReason" TEXT;

UPDATE "InverterConnection"
SET "isPrimary" = true
WHERE "id" = 'default';

