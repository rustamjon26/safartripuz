import { prisma } from "../lib/prisma";

/**
 * Inspect a home_stay_partner user (and optionally all of them).
 *
 * Usage:
 *   npx tsx scripts/inspect-homestay-user.ts <email-or-phone-or-id>
 *   npx tsx scripts/inspect-homestay-user.ts                        # all home_stay_partner users
 */
async function main() {
  const arg = process.argv[2]?.trim();

  const where = arg
    ? { OR: [{ email: arg }, { phone: arg }, { id: arg }] }
    : { role: "home_stay_partner" as const };

  const users = await prisma.user.findMany({
    where,
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
        select: { id: true, type: true, status: true, createdAt: true },
      },
      homeStayPartner: {
        select: { id: true, createdAt: true, _count: { select: { listings: true } } },
      },
      homeStayListings: {
        select: { id: true, title: true, status: true, city: true },
      },
    },
  });

  if (users.length === 0) {
    console.log("No matching user(s) found.");
    return;
  }

  for (const u of users) {
    console.log("\n========================================");
    console.log(`User: ${u.first_name} ${u.last_name}  <${u.email}>`);
    console.log(`  id          : ${u.id}`);
    console.log(`  phone       : ${u.phone}`);
    console.log(`  role        : ${u.role}`);
    console.log(`  blocked     : ${u.isBlocked}`);
    console.log(`  created     : ${u.createdAt.toISOString()}`);

    if (u.partnerProfile) {
      console.log(`  Partner     : id=${u.partnerProfile.id}  type=${u.partnerProfile.type}  status=${u.partnerProfile.status}`);
    } else {
      console.log(`  Partner     : (none) — admin HOLAT will show "ODDIY"`);
    }

    if (u.homeStayPartner) {
      console.log(
        `  HomeStay    : id=${u.homeStayPartner.id}  listings=${u.homeStayPartner._count.listings}`,
      );
    } else {
      console.log(`  HomeStay    : (no HomeSayPartner row)`);
    }

    console.log(`  Listings    : ${u.homeStayListings.length}`);
    for (const l of u.homeStayListings) {
      console.log(`    - [${l.status}] ${l.title} (${l.city}) — ${l.id}`);
    }
  }
  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
