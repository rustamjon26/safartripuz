/**
 * Idempotent knowledge-base seed from prisma/seed/data/tourism_data.json.
 *
 * Usage: npm run seed:knowledge
 * Do not invent place data — fill tourism_data.json from verified sources only.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { tourismDataSchema } from "../../src/modules/knowledge/domain/tourismData";
import { seedKnowledgeSites } from "../../src/modules/knowledge/service/seedKnowledge";

const DATA_PATH = path.join(__dirname, "data", "tourism_data.json");

async function main(): Promise<void> {
  if (!existsSync(DATA_PATH)) {
    console.error(
      [
        `Missing data file: ${DATA_PATH}`,
        "Copy the format from prisma/seed/data/README.md and add verified sites.",
        "Refusing to seed invented places.",
      ].join("\n"),
    );
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(DATA_PATH, "utf8")) as unknown;
  } catch (err) {
    console.error(`Failed to parse ${DATA_PATH}:`, err);
    process.exit(1);
  }

  const parsed = tourismDataSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("tourism_data.json failed validation:");
    console.error(parsed.error.flatten());
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const report = await seedKnowledgeSites(parsed.data.sites, prisma);
    console.log(
      `seed:knowledge done — created=${report.created} updated=${report.updated} unchanged=${report.unchanged}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
