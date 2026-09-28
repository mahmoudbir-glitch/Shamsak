-- Add serial number support to inverter connections and make Syrian pound the default currency.
ALTER TABLE "InverterConnection" ADD COLUMN "serialNumber" TEXT;
UPDATE "EnergySettings" SET "currency" = 'SYP' WHERE "currency" = 'USD';
