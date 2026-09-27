CREATE TABLE IF NOT EXISTS "InverterConnection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "systemName" TEXT NOT NULL DEFAULT 'منظومة شمسك',
    "inverterModel" TEXT NOT NULL DEFAULT 'Felicity',
    "protocol" TEXT NOT NULL DEFAULT 'Wi-Fi Datalogger',
    "inverterAddress" TEXT,
    "inverterUsername" TEXT,
    "inverterLinkCode" TEXT,
    "wifiSsid" TEXT,
    "wifiPasswordCipher" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastStatus" TEXT NOT NULL DEFAULT 'disconnected',
    "lastSeenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InverterConnection_pkey" PRIMARY KEY ("id")
);
