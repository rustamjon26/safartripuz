-- AlterEnum: add HOMESTAY to TravelPlanItem.type
ALTER TABLE `TravelPlanItem` MODIFY `type` ENUM('HOTEL', 'HOMESTAY', 'TAXI', 'GUIDE') NOT NULL;
