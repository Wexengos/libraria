-- CreateEnum
CREATE TYPE "LibraryStatus" AS ENUM ('WATCHLIST', 'WATCHING', 'WATCHED', 'WANT_TO_LISTEN', 'LISTENING', 'LISTENED', 'WANT_TO_READ', 'READING', 'READ', 'OWNED');

-- CreateTable
CREATE TABLE "user_media" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_item_id" UUID NOT NULL,
    "status" "LibraryStatus" NOT NULL DEFAULT 'WATCHLIST',
    "rating_half_steps" SMALLINT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_media_user_id_status_idx" ON "user_media"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_media_user_id_media_item_id_key" ON "user_media"("user_id", "media_item_id");

-- AddForeignKey
ALTER TABLE "user_media" ADD CONSTRAINT "user_media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_media" ADD CONSTRAINT "user_media_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Store ratings as half-star units: 0 is unrated when null, 1 is 0.5 stars, through 10 for 5 stars.
ALTER TABLE "user_media" ADD CONSTRAINT "user_media_rating_half_steps_check"
  CHECK ("rating_half_steps" IS NULL OR "rating_half_steps" BETWEEN 0 AND 10);

-- Personal library data is accessed only through the authenticated backend API.
ALTER TABLE "user_media" ENABLE ROW LEVEL SECURITY;
