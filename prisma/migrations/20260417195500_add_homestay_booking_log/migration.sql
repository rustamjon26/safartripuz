-- Create table to track homestay booking status transitions.
CREATE TABLE "HomeStayBookingLog" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeStayBookingLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeStayBookingLog_bookingId_createdAt_idx" ON "HomeStayBookingLog"("bookingId", "createdAt");
CREATE INDEX "HomeStayBookingLog_actorId_idx" ON "HomeStayBookingLog"("actorId");

ALTER TABLE "HomeStayBookingLog" ADD CONSTRAINT "HomeStayBookingLog_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "HomeStayBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HomeStayBookingLog" ADD CONSTRAINT "HomeStayBookingLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
