CREATE TABLE IF NOT EXISTS "MonitoringEvent" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonitoringEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MonitoringEvent_timestamp_idx" ON "MonitoringEvent"("timestamp");
CREATE INDEX IF NOT EXISTS "MonitoringEvent_action_timestamp_idx" ON "MonitoringEvent"("action", "timestamp");
