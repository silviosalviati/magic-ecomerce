-- Add missing Order columns (IF NOT EXISTS = safe to run even if already applied manually)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentMethod"        TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "boletoUrl"            TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "boletoBarcode"        TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "boletoDueDate"        TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingMethod"       TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingLabel"        TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCost"         DECIMAL(10,2);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingCode"         TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingUrl"          TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressStreet"        TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressNumber"        TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressComplement"    TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressNeighborhood"  TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressCity"          TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressState"         TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "addressZip"           TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode"           TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount"       DECIMAL(10,2);

-- CreateTable: OrderStatusUpdate (webhook + admin audit trail)
CREATE TABLE IF NOT EXISTS "OrderStatusUpdate" (
    "id"        TEXT        NOT NULL,
    "orderId"   TEXT        NOT NULL,
    "status"    TEXT        NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusUpdate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderStatusUpdate"
    ADD CONSTRAINT "OrderStatusUpdate_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
