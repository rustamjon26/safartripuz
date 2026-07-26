/**
 * Prefer TEST_DATABASE_URL for Prisma singletons used by integration modules.
 * Never invent a URL — only remap when the test URL is explicitly provided.
 */
if (process.env.TEST_DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL.trim();
}
