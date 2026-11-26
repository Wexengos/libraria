-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('FILM', 'ALBUM', 'BOOK');

-- CreateTable
CREATE TABLE "media_items" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "MediaType" NOT NULL,
    "release_year" INTEGER,
    "cover_image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identifiers" (
    "id" UUID NOT NULL,
    "media_item_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_details" (
    "media_item_id" UUID NOT NULL,
    "runtime" INTEGER,
    "director" TEXT,
    "original_language" VARCHAR(10),

    CONSTRAINT "film_details_pkey" PRIMARY KEY ("media_item_id")
);

-- CreateTable
CREATE TABLE "album_details" (
    "media_item_id" UUID NOT NULL,
    "artist" TEXT,
    "track_count" INTEGER,
    "release_date" VARCHAR(10),

    CONSTRAINT "album_details_pkey" PRIMARY KEY ("media_item_id")
);

-- CreateTable
CREATE TABLE "book_details" (
    "media_item_id" UUID NOT NULL,
    "author" TEXT,
    "page_count" INTEGER,
    "publisher" TEXT,
    "isbn" VARCHAR(32),

    CONSTRAINT "book_details_pkey" PRIMARY KEY ("media_item_id")
);

-- CreateIndex
CREATE INDEX "media_items_type_title_idx" ON "media_items"("type", "title");

-- CreateIndex
CREATE INDEX "external_identifiers_media_item_id_idx" ON "external_identifiers"("media_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_identifiers_provider_external_id_key" ON "external_identifiers"("provider", "external_id");

-- AddForeignKey
ALTER TABLE "external_identifiers" ADD CONSTRAINT "external_identifiers_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_details" ADD CONSTRAINT "film_details_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_details" ADD CONSTRAINT "album_details_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_details" ADD CONSTRAINT "book_details_media_item_id_fkey" FOREIGN KEY ("media_item_id") REFERENCES "media_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catalogue data is accessed through the backend API; no browser-facing policies are defined.
ALTER TABLE "media_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "external_identifiers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "film_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "album_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "book_details" ENABLE ROW LEVEL SECURITY;
