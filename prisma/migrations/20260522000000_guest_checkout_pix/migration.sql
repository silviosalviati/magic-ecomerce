-- AlterTable: make userId optional and add guest checkout + PIX fields
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN "guestName"    TEXT;
ALTER TABLE "Order" ADD COLUMN "guestEmail"   TEXT;
ALTER TABLE "Order" ADD COLUMN "guestCpf"     TEXT;
ALTER TABLE "Order" ADD COLUMN "pixQrCode"    TEXT;
ALTER TABLE "Order" ADD COLUMN "pixCopyPaste" TEXT;
ALTER TABLE "Order" ADD COLUMN "pixExpiresAt" TIMESTAMP(3);
