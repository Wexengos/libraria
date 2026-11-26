-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('MEDIA_ADDED', 'RATING_SET', 'LIBRARY_STATUS_CHANGED', 'REVIEW_POSTED', 'LIST_CREATED', 'LIST_ITEM_ADDED');

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id"),
    CONSTRAINT "follows_no_self_follow_check" CHECK ("follower_id" <> "following_id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "media_item_id" UUID,
    "review_id" UUID,
    "list_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follows_following_id_follower_id_idx" ON "follows"("following_id", "follower_id");
CREATE INDEX "activities_user_id_created_at_idx" ON "activities"("user_id", "created_at");
CREATE INDEX "activities_media_item_id_created_at_idx" ON "activities"("media_item_id", "created_at");
CREATE INDEX "activities_list_id_created_at_idx" ON "activities"("list_id", "created_at");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "media_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Social data is only accessed by the NestJS API, which validates user identity and list visibility.
ALTER TABLE "follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
