import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.hotelStaff.findMany({
    include: {
      user: true
    }
  });

  console.log('--- STAFF LIST ---');
  staff.forEach(s => {
    console.log(`Staff: ${s.firstName} | Role: ${s.role} | UserId: ${s.userId} | UserEmail: ${s.user?.email}`);
  });

  const users = await prisma.user.findMany({
    where: { role: 'hotel_manager' },
    include: {
      hotelStaff: true
    }
  });

  console.log('\n--- USERS (Hotel Managers) ---');
  users.forEach(u => {
    console.log(`User: ${u.email} | StaffRole: ${u.hotelStaff?.role || 'NONE'}`);
  });
}

main().finally(() => prisma.$disconnect());
