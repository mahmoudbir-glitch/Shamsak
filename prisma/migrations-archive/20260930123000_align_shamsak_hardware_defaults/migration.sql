-- Align production defaults with the actual Shamsak hardware configuration.
-- This changes defaults only; it does not overwrite existing user data.
ALTER TABLE "EnergySettings"
  ALTER COLUMN "batteryCapacityWh" SET DEFAULT 4800;

ALTER TABLE "InverterConnection"
  ALTER COLUMN "inverterModel" SET DEFAULT 'NEXT - Victor Max 8.2KW',
  ALTER COLUMN "protocol" SET DEFAULT 'Wi-Fi Datalogger',
  ALTER COLUMN "timeoutMs" SET DEFAULT 1000;
