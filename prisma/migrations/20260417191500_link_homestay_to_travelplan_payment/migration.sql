-- Link homestay bookings to travel plans and availability rows.
ALTER TABLE "HomeStayBooking"
ADD COLUMN "travelPlanId" TEXT;

ALTER TABLE "HomeStayAvailability"
ADD COLUMN "bookingId" TEXT;

CREATE UNIQUE INDEX "HomeStayAvailability_bookingId_key" ON "HomeStayAvailability"("bookingId");
CREATE INDEX "HomeStayBooking_travelPlanId_status_idx" ON "HomeStayBooking"("travelPlanId", "status");

ALTER TABLE "HomeStayBooking"
ADD CONSTRAINT "HomeStayBooking_travelPlanId_fkey"
FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HomeStayAvailability"
ADD CONSTRAINT "HomeStayAvailability_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "HomeStayBooking"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
