-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "defaultCurrency" TEXT NOT NULL DEFAULT 'CAD';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'CAD';
