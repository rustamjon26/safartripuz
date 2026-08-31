/**
 * Shared typed DB accessor for module repositories.
 * `DbClient` accepts either the singleton or a transaction client so
 * repository methods can join outer transactions.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/src/shared/db/prisma";

export const db: PrismaClient = prisma;

export type DbClient = PrismaClient | Prisma.TransactionClient;
