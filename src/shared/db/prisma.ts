/**
 * Shared Prisma singleton for module repositories.
 * Routes/services must not import this — only repository layers.
 */
export { prisma } from "@/lib/prisma";
export type { Prisma, PrismaClient } from "@prisma/client";
