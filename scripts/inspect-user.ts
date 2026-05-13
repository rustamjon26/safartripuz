import { prisma } from "../lib/prisma";

/**
 * Inspect any user(s) by email / phone / id substring (case-insensitive).
 *
 * Usage:
 *   npx tsx scripts/inspect-user.ts nuriya
 *   npx tsx scripts/inspect-user.ts qwertyu@gmail.com
 *   or
 *   npm run db:inspect-user -- nuriya
 */
async function main() {
  const q = process.argv[2]?.trim();
  if (!q) {
    console.error("Usage: tsx scripts/inspect-user.ts <email|phone|name|id>");
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q } },
        { phone: { contains: q } },
        { id: q },
        { first_name: { contains: q } },
        { last_name: { contains: q } },
      ],
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      partnerProfile: {
        select: { id: true, type: true, status: true },
      },
      refreshTokens: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (users.length === 0) {
    console.log(`No users matched "${q}".`);
    return;
  }

  console.log(`Found ${users.length} match(es) for "${q}":`);
  for (const u of users) {
    console.log("\n========================================");
    console.log(`User: ${u.first_name} ${u.last_name}  <${u.email}>`);
    console.log(`  id           : ${u.id}`);
    console.log(`  phone        : ${u.phone}`);
    console.log(`  role         : ${u.role}`);
    console.log(`  blocked      : ${u.isBlocked}`);
    console.log(`  created      : ${u.createdAt.toISOString()}`);
    if (u.partnerProfile) {
      console.log(
        `  Partner      : id=${u.partnerProfile.id}  type=${u.partnerProfile.type}  status=${u.partnerProfile.status}`,
      );
    } else {
      console.log(`  Partner      : (none)`);
    }
    console.log(`  active sessions: ${u.refreshTokens.length}`);
    for (const r of u.refreshTokens) {
      console.log(
        `    - issued ${r.createdAt.toISOString()}  expires ${r.expiresAt.toISOString()}`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
