-- Configure the monitored installation from the owner's current Felicitysolar nameplate.
-- Inverter: Felicitysolar IVEM6048-II, 6000W / 6000VA, 48V DC.
-- Battery: user reports the new 148Ah LiFePO4 unit. Capacity in Wh is derived
-- from the configured 48V nominal system voltage until the battery nameplate
-- confirms its exact nominal voltage.
ALTER TABLE "EnergySettings"
  ADD COLUMN IF NOT EXISTS "batteryCapacityAh" DOUBLE PRECISION NOT NULL DEFAULT 148;

UPDATE "EnergySettings"
SET
  "batteryCapacityAh" = 148,
  "batteryCapacityWh" = 7104,
  "batteryNominalVoltage" = 48,
  "batteryChemistry" = 'LiFePO4',
  "inverterRatedPowerKw" = 6.0;

ALTER TABLE "InverterConnection"
  ALTER COLUMN "inverterModel" SET DEFAULT 'Felicitysolar IVEM6048-II 6kW';

UPDATE "InverterConnection"
SET "inverterModel" = 'Felicitysolar IVEM6048-II 6kW'
WHERE "inverterModel" IS NULL
   OR "inverterModel" = ''
   OR "inverterModel" = 'NEXT - Victor Max 8.2KW';
