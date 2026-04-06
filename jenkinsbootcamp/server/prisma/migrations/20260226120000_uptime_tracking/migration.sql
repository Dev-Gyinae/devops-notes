CREATE TABLE "uptime_events" (
  "id" TEXT NOT NULL,
  "screen_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uptime_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "uptime_events_screen_id_timestamp_idx" ON "uptime_events"("screen_id", "timestamp");

ALTER TABLE "uptime_events" ADD CONSTRAINT "uptime_events_screen_id_fkey"
  FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
