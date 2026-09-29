-- Persist the system grid mode separately from single/three-phase configuration.
ALTER TABLE "EnergySettings" ADD COLUMN "gridType" TEXT NOT NULL DEFAULT 'hybrid';
