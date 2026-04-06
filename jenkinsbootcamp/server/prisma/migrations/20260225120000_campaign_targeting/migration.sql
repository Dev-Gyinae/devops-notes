-- AddColumn: target_clusters (which cluster types this campaign targets e.g. RETAIL, CORPORATE)
ALTER TABLE "campaigns" ADD COLUMN "target_clusters" TEXT[] NOT NULL DEFAULT '{}';

-- AddColumn: target_screen_ids (specific screen IDs this campaign targets)
ALTER TABLE "campaigns" ADD COLUMN "target_screen_ids" TEXT[] NOT NULL DEFAULT '{}';

-- AddColumn: screen_snapshots (JSON map of screenId -> originalPlaylistId, saved at activation so we can restore on end)
ALTER TABLE "campaigns" ADD COLUMN "screen_snapshots" JSONB;
