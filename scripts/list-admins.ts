import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: "admin" },
        { role: "super_admin" },
        { isBlocked: true },
      ],
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${users.length} admin/blocked user(s):\n`);
  for (const u of users) {
    console.log(
      `[${u.role}${u.isBlocked ? ", BLOCKED" : ""}] ${u.first_name} ${u.last_name}  <${u.email}>  id=${u.id}`,
    );
  }
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
