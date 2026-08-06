-- A payment used to be marked SUCCESS even when a linked booking failed to
-- confirm, while the ledger only recorded the bookings that did confirm — so
-- PSP clearing totals drifted from the ledger. Those payments now land in
-- PENDING_REVIEW instead.

ALTER TABLE `Payment`
  MODIFY `status` ENUM(
    'INITIATED',
    'PENDING',
    'PENDING_REVIEW',
    'SUCCESS',
    'FAILED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'INITIATED';
