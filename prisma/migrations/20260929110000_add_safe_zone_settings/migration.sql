-- Add standardized Safe Zone battery and priority settings.
ALTER TABLE "EnergySettings"
  ADD COLUMN "bulkChargeVoltage" DOUBLE PRECISION DEFAULT 56.4,
  ADD COLUMN "floatChargeVoltage" DOUBLE PRECISION DEFAULT 54.0,
  ADD COLUMN "lowDcCutoffVoltage" DOUBLE PRECISION DEFAULT 45.0,
  ADD COLUMN "backToGridVoltage" DOUBLE PRECISION DEFAULT 46.0,
  ADD COLUMN "maxChargeCurrentA" DOUBLE PRECISION DEFAULT 50,
  ADD COLUMN "outputSourcePriority" TEXT NOT NULL DEFAULT 'SBU',
  ADD COLUMN "chargerSourcePriority" TEXT NOT NULL DEFAULT 'CSO';

UPDATE "EnergySettings"
SET
  "bulkChargeVoltage" = COALESCE("bulkChargeVoltage", CASE WHEN "batteryNominalVoltage" = 24 THEN 28.2 ELSE 56.4 END),
  "floatChargeVoltage" = COALESCE("floatChargeVoltage", CASE WHEN "batteryNominalVoltage" = 24 THEN 27.0 ELSE 54.0 END),
  "lowDcCutoffVoltage" = COALESCE("lowDcCutoffVoltage", CASE WHEN "batteryNominalVoltage" = 24 THEN 22.5 ELSE 45.0 END),
  "backToGridVoltage" = COALESCE("backToGridVoltage", CASE WHEN "batteryNominalVoltage" = 24 THEN 23.0 ELSE 46.0 END),
  "maxChargeCurrentA" = COALESCE("maxChargeCurrentA", 50),
  "outputSourcePriority" = COALESCE("outputSourcePriority", 'SBU'),
  "chargerSourcePriority" = COALESCE("chargerSourcePriority", 'CSO');