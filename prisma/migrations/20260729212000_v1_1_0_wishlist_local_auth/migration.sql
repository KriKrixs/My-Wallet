-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "carryoverMode" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS "carryoverTargetWalletId" TEXT;

-- AlterTable
ALTER TABLE "WalletTransfer" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WishlistItem" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "url" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Général',
    "notes" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Wallet_carryoverTargetWalletId_fkey'
    ) THEN
        ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_carryoverTargetWalletId_fkey" FOREIGN KEY ("carryoverTargetWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WishlistItem_walletId_fkey'
    ) THEN
        ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WishlistItem_createdById_fkey'
    ) THEN
        ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
