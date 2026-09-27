-- CreateEnum
CREATE TYPE "slot" AS ENUM ('AM', 'PM', 'BOTH');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('CLEANSER', 'TONER', 'SERUM', 'MOISTURIZER', 'SUNSCREEN', 'TREATMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "input_method" AS ENUM ('PASTE', 'UPLOAD', 'SCAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "product_type" NOT NULL,
    "slot" "slot" NOT NULL,
    "input_method" "input_method" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" SERIAL NOT NULL,
    "inci_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_aliases" (
    "alias" TEXT NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "ingredient_aliases_pkey" PRIMARY KEY ("alias")
);

-- CreateTable
CREATE TABLE "ingredient_classes" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "ingredient_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_members" (
    "class_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "ingredient_id" INTEGER,
    "raw_text" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,

    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("product_id","position")
);

-- CreateTable
CREATE TABLE "interaction_rules" (
    "id" SERIAL NOT NULL,
    "class_a_slug" TEXT NOT NULL,
    "class_b_slug" TEXT NOT NULL,
    "severity" "severity" NOT NULL,
    "same_slot_only" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL,

    CONSTRAINT "interaction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gap_rules" (
    "id" SERIAL NOT NULL,
    "slot" "slot" NOT NULL,
    "required_class" TEXT,
    "required_type" "product_type",
    "severity" "severity" NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "gap_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "findings_hash" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "products_user_id_idx" ON "products"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_inci_name_key" ON "ingredients"("inci_name");

-- CreateIndex
CREATE INDEX "ingredient_aliases_ingredient_id_idx" ON "ingredient_aliases"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_classes_slug_key" ON "ingredient_classes"("slug");

-- CreateIndex
CREATE INDEX "class_members_ingredient_id_idx" ON "class_members"("ingredient_id");

-- CreateIndex
CREATE INDEX "product_ingredients_ingredient_id_idx" ON "product_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "coach_runs_user_id_findings_hash_key" ON "coach_runs"("user_id", "findings_hash");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "ingredient_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_members" ADD CONSTRAINT "class_members_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_runs" ADD CONSTRAINT "coach_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
