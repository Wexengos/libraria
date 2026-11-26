-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_item_id" UUID NOT NULL,
    "title" VARCHAR(160),
    "content" VARCHAR(5000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_lists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(1000),
    "visibility" "ListVisibility" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "media_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_list_items" (
    "id" UUID NOT NULL,
    "list_id" UUID NOT NULL,
    "media_item_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_media_item_id_key" ON "reviews"("user_id", "media_item_id");
CREATE INDEX "reviews_media_item_id_created_at_idx" ON "reviews"("media_item_id", "created_at");
CREATE INDEX "reviews_user_id_created_at_idx" ON "reviews"("user_id", "created_at");
CREATE INDEX "media_lists_user_id_updated_at_idx" ON "media_lists"("user_id", "updated_at");
CREATE UNIQUE INDEX "media_list_items_list_id_media_item_id_key" ON "media_list_items"("list_id", "media_item_id");
CREATE UNIQUE INDEX "media_list_items_list_id_position_key" ON "media_list_items"("list_id", "position");
CREATE INDEX "media_list_items_media_item_id_idx" ON "media_list_items"("media_item_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_lists" ADD CONSTRAINT "media_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_list_items" ADD CONSTRAINT "media_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "media_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_list_items" ADD CONSTRAINT "media_list_items_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- All reads and writes go through the authenticated Libraria API.
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_lists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_list_items" ENABLE ROW LEVEL SECURITY;
