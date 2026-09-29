ALTER TABLE "InverterConnection"
  ADD COLUMN "dataloggerPn" TEXT,
  ADD COLUMN "dataloggerType" TEXT,
  ADD COLUMN "dataloggerFirmware" TEXT,
  ADD COLUMN "dataloggerStationName" TEXT,
  ADD COLUMN "dataloggerDeviceIdentifier" TEXT,
  ADD COLUMN "dataloggerUpdateIntervalSec" INTEGER,
  ADD COLUMN "dataloggerCloud" TEXT;
