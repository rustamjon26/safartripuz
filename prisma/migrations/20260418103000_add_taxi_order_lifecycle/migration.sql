-- SafarTrip taxi driver/order lifecycle (schema was ahead of migrations)

-- Role: add taxi_partner if missing (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'taxi_partner'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'taxi_partner';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "TaxiVehicleCategory" AS ENUM ('STANDARD', 'COMFORT', 'MINIVAN', 'PREMIUM');

-- CreateEnum
CREATE TYPE "TaxiOrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTE');

-- CreateEnum
CREATE TYPE "TaxiOrderCancelledBy" AS ENUM ('CUSTOMER', 'DRIVER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DriverEarningStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "TaxiVehicleCategory" NOT NULL,
    "images" TEXT[] NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxiOrder" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "serviceId" TEXT,
    "travelPlanId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "dropoffLat" DOUBLE PRECISION NOT NULL,
    "dropoffLng" DOUBLE PRECISION NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "estimatedPrice" DECIMAL(10,2) NOT NULL,
    "finalPrice" DECIMAL(10,2),
    "distanceKm" DOUBLE PRECISION,
    "status" "TaxiOrderStatus" NOT NULL DEFAULT 'PENDING',
    "cancelledBy" "TaxiOrderCancelledBy",
    "cancellationReason" TEXT,
    "customerNote" TEXT,
    "driverNote" TEXT,
    "priceSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxiOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxiOrderLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxiOrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxiReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxiReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverEarning" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "status" "DriverEarningStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverEarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_isActive_idx" ON "Vehicle"("driverId", "isActive");

-- CreateIndex
CREATE INDEX "Vehicle_category_isActive_idx" ON "Vehicle"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_driverId_key" ON "DriverProfile"("driverId");

-- CreateIndex
CREATE INDEX "TaxiOrder_customerId_status_idx" ON "TaxiOrder"("customerId", "status");

-- CreateIndex
CREATE INDEX "TaxiOrder_driverId_status_idx" ON "TaxiOrder"("driverId", "status");

-- CreateIndex
CREATE INDEX "TaxiOrder_vehicleId_idx" ON "TaxiOrder"("vehicleId");

-- CreateIndex
CREATE INDEX "TaxiOrder_serviceId_idx" ON "TaxiOrder"("serviceId");

-- CreateIndex
CREATE INDEX "TaxiOrder_travelPlanId_idx" ON "TaxiOrder"("travelPlanId");

-- CreateIndex
CREATE INDEX "TaxiOrder_status_createdAt_idx" ON "TaxiOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TaxiOrderLog_orderId_createdAt_idx" ON "TaxiOrderLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "TaxiOrderLog_actorId_idx" ON "TaxiOrderLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxiReview_orderId_key" ON "TaxiReview"("orderId");

-- CreateIndex
CREATE INDEX "TaxiReview_customerId_idx" ON "TaxiReview"("customerId");

-- CreateIndex
CREATE INDEX "TaxiReview_driverId_rating_idx" ON "TaxiReview"("driverId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "DriverEarning_orderId_key" ON "DriverEarning"("orderId");

-- CreateIndex
CREATE INDEX "DriverEarning_driverId_status_idx" ON "DriverEarning"("driverId", "status");

-- CreateIndex
CREATE INDEX "DriverEarning_createdAt_idx" ON "DriverEarning"("createdAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrder" ADD CONSTRAINT "TaxiOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrder" ADD CONSTRAINT "TaxiOrder_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrder" ADD CONSTRAINT "TaxiOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrder" ADD CONSTRAINT "TaxiOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "TaxiService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrder" ADD CONSTRAINT "TaxiOrder_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrderLog" ADD CONSTRAINT "TaxiOrderLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaxiOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiOrderLog" ADD CONSTRAINT "TaxiOrderLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiReview" ADD CONSTRAINT "TaxiReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaxiOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiReview" ADD CONSTRAINT "TaxiReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxiReview" ADD CONSTRAINT "TaxiReview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEarning" ADD CONSTRAINT "DriverEarning_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "TaxiOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
