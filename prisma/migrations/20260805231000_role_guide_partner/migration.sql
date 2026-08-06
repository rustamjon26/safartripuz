-- AlterEnum: `guide_partner` was already flowing through middleware, JWTs and the
-- guide panel as a bare string while the column could never hold it. Make it real
-- so role checks can be typed instead of cast.
ALTER TABLE `User` MODIFY `role` ENUM(
  'super_admin',
  'admin',
  'user',
  'taxi',
  'taxi_partner',
  'hotel_manager',
  'guide',
  'guide_partner',
  'restaurant_manager',
  'home_stay_partner',
  'support',
  'cleaner',
  'receptionist',
  'waiter',
  'hotel_staff'
) NOT NULL DEFAULT 'user';
