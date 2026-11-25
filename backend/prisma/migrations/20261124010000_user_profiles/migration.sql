-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "username" VARCHAR(24) NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "bio" VARCHAR(500),
    "avatar_url" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_username_key" ON "user_profiles"("username");

-- Profile data is accessed through the API, which validates Supabase Auth tokens.
-- Keep the table closed to direct Data API access unless explicit policies are added later.
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
