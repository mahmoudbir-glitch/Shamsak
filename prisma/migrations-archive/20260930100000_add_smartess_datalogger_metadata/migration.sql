ALTER TABLE "InverterConnection"
  ADD COLUMN IF NOT EXISTS "dataloggerPn" TEXT,
  ADD COLUMN IF NOT EXISTS "dataloggerType" TEXT,
  ADD COLUMN IF NOT EXISTS "dataloggerFirmware" TEXT,
  ADD COLUMN IF NOT EXISTS "dataloggerStationName" TEXT,
  ADD COLUMN IF NOT EXISTS "dataloggerDeviceIdentifier" TEXT,
  ADD COLUMN IF NOT EXISTS "dataloggerUpdateIntervalSec" INTEGER,
  ADD COLUMN IF NOT EXISTS "dataloggerCloud" TEXT;
