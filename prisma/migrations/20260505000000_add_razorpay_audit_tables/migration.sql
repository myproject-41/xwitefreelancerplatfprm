-- Razorpay production-grade audit tables

-- ─── Enums ────────────────────────────────────────────────────────────────
CREATE TYPE "RazorpayOrderStatus" AS ENUM ('CREATED', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE "WebhookEventStatus"  AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- ─── razorpay_orders ──────────────────────────────────────────────────────
CREATE TABLE "razorpay_orders" (
    "id"        TEXT NOT NULL,
    "orderId"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "amount"    INTEGER NOT NULL,
    "currency"  TEXT NOT NULL DEFAULT 'INR',
    "receipt"   TEXT NOT NULL,
    "status"    "RazorpayOrderStatus" NOT NULL DEFAULT 'CREATED',
    "paymentId" TEXT,
    "notes"     JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "razorpay_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "razorpay_orders_orderId_key" ON "razorpay_orders"("orderId");
CREATE UNIQUE INDEX "razorpay_orders_receipt_key" ON "razorpay_orders"("receipt");
CREATE INDEX "razorpay_orders_userId_idx" ON "razorpay_orders"("userId");
CREATE INDEX "razorpay_orders_status_idx" ON "razorpay_orders"("status");

ALTER TABLE "razorpay_orders" ADD CONSTRAINT "razorpay_orders_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── processed_payments ───────────────────────────────────────────────────
CREATE TABLE "processed_payments" (
    "id"        TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId"   TEXT,
    "userId"    TEXT NOT NULL,
    "amount"    DOUBLE PRECISION NOT NULL,
    "source"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_payments_paymentId_key" ON "processed_payments"("paymentId");
CREATE INDEX "processed_payments_userId_idx" ON "processed_payments"("userId");

-- ─── webhook_events ───────────────────────────────────────────────────────
CREATE TABLE "webhook_events" (
    "id"           TEXT NOT NULL,
    "eventId"      TEXT,
    "eventType"    TEXT NOT NULL,
    "payload"      JSONB NOT NULL,
    "signature"    TEXT NOT NULL,
    "status"       "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "receivedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt"  TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_events_eventType_idx" ON "webhook_events"("eventType");
CREATE INDEX "webhook_events_receivedAt_idx" ON "webhook_events"("receivedAt");
CREATE INDEX "webhook_events_status_idx"     ON "webhook_events"("status");
