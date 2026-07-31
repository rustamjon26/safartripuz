import { describe, expect, it } from "vitest";
import type { Site } from "@prisma/client";
import type { TourismSiteInput } from "../domain/tourismData";
import { seedKnowledgeSites, type SeedSiteClient } from "./seedKnowledge";

function fixtureSites(): TourismSiteInput[] {
  return [
    {
      name: "Go'ri Amir",
      regionCode: "samarqand",
      category: "MAQBARA",
      open_hours: "09:00 - 19:00",
      sourceUrl: "https://example.org/gori-amir",
    },
    {
      name: "Test oshxona",
      regionCode: "samarqand",
      category: "RESTORAN",
      open_hours: "10:00 - 22:00",
      sourceUrl: "https://example.org/osh",
      dining: {
        cuisine: ["uzbek"],
        priceBand: "orta",
        mealTypes: ["tushlik", "kechki"],
        mustTry: ["osh"],
      },
    },
  ];
}

function makeMemoryClient(): SeedSiteClient & { rows: Map<string, Site> } {
  const rows = new Map<string, Site>();
  let seq = 0;

  return {
    rows,
    site: {
      async findUnique({ where }) {
        return rows.get(where.slug) ?? null;
      },
      async upsert({ where, create, update }) {
        const existing = rows.get(where.slug);
        if (!existing) {
          seq += 1;
          const created = {
            id: `site_${seq}`,
            slug: where.slug,
            name: create.name,
            nameRu: create.nameRu ?? null,
            nameEn: create.nameEn ?? null,
            regionCode: create.regionCode,
            districtCode: create.districtCode ?? null,
            category: create.category,
            lat: create.lat ?? null,
            lng: create.lng ?? null,
            openingHours: create.openingHours ?? null,
            dining: create.dining ?? null,
            sourceUrl: create.sourceUrl ?? null,
            status: create.status ?? "DRAFT",
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Site;
          rows.set(where.slug, created);
          return created;
        }
        const next = {
          ...existing,
          ...update,
          slug: where.slug,
          updatedAt: new Date(),
        } as Site;
        rows.set(where.slug, next);
        return next;
      },
    },
  };
}

describe("seedKnowledgeSites idempotency", () => {
  it("second run creates 0 and keeps row count", async () => {
    const client = makeMemoryClient();
    const sites = fixtureSites();

    const first = await seedKnowledgeSites(sites, client);
    expect(first.created).toBe(2);
    expect(first.updated).toBe(0);
    expect(first.unchanged).toBe(0);
    expect(client.rows.size).toBe(2);

    const second = await seedKnowledgeSites(sites, client);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(2);
    expect(client.rows.size).toBe(2);
  });

  it("throws when dining category lacks dining", async () => {
    const client = makeMemoryClient();
    await expect(
      seedKnowledgeSites(
        [
          {
            name: "No dining",
            regionCode: "samarqand",
            category: "KAFE",
            sourceUrl: "https://example.org/x",
          },
        ],
        client,
      ),
    ).rejects.toThrow(/requires dining/);
  });

  it("creates new rows as DRAFT", async () => {
    const client = makeMemoryClient();
    await seedKnowledgeSites(fixtureSites(), client);

    expect(client.rows.get("gori-amir")?.status).toBe("DRAFT");
    expect(client.rows.get("test-oshxona")?.status).toBe("DRAFT");
  });

  it("update path does not demote PUBLISHED when other fields change", async () => {
    const client = makeMemoryClient();
    await seedKnowledgeSites(fixtureSites(), client);

    const row = client.rows.get("gori-amir");
    expect(row).toBeTruthy();
    row!.status = "PUBLISHED";

    // Force an update (not the unchanged short-circuit) while status is PUBLISHED.
    const sites = fixtureSites();
    sites[0] = { ...sites[0]!, nameEn: "Gur-e-Amir (updated)" };

    const second = await seedKnowledgeSites(sites, client);
    expect(second.updated).toBe(1);
    expect(second.unchanged).toBe(1);
    expect(client.rows.get("gori-amir")?.status).toBe("PUBLISHED");
    expect(client.rows.get("gori-amir")?.nameEn).toBe("Gur-e-Amir (updated)");
  });

  it("stores open_hours raw alongside weekly", async () => {
    const client = makeMemoryClient();
    await seedKnowledgeSites(fixtureSites(), client);

    const row = client.rows.get("gori-amir");
    expect(row?.openingHours).toMatchObject({
      raw: "09:00 - 19:00",
      weekly: expect.objectContaining({
        mon: [["09:00", "19:00"]],
      }),
    });
  });

  it("treats MySQL key-reordered openingHours as unchanged", async () => {
    const client = makeMemoryClient();
    const sites = fixtureSites();
    await seedKnowledgeSites(sites, client);

    const row = client.rows.get("gori-amir");
    expect(row).toBeTruthy();
    // Simulate MySQL returning object keys alphabetically (fri before mon).
    row!.openingHours = {
      raw: "09:00 - 19:00",
      weekly: {
        fri: [["09:00", "19:00"]],
        mon: [["09:00", "19:00"]],
        sat: [["09:00", "19:00"]],
        sun: [["09:00", "19:00"]],
        thu: [["09:00", "19:00"]],
        tue: [["09:00", "19:00"]],
        wed: [["09:00", "19:00"]],
      },
    };

    const second = await seedKnowledgeSites(sites, client);
    expect(second).toEqual({ created: 0, updated: 0, unchanged: 2 });
  });
});
