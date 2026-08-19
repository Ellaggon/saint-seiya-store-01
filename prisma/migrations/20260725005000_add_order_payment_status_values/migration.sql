-- PostgreSQL requires enum values to be committed before another migration can use them.
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_REVIEW';
