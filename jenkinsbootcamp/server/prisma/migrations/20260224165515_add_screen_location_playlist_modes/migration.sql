-- AlterTable
ALTER TABLE "playlists" ADD COLUMN     "aspect_ratio" TEXT NOT NULL DEFAULT '16:9',
ADD COLUMN     "playback_mode" TEXT NOT NULL DEFAULT 'CYCLE',
ADD COLUMN     "total_duration" INTEGER;

-- AlterTable
ALTER TABLE "screens" ADD COLUMN     "address" TEXT,
ADD COLUMN     "area" TEXT,
ADD COLUMN     "cluster" TEXT,
ADD COLUMN     "venue_name" TEXT,
ADD COLUMN     "venue_type" TEXT;
