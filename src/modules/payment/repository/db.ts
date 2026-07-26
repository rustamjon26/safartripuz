/**
 * Untyped Prisma accessors for new models until `prisma generate` is run.
 * Repositories should import from here rather than assuming generated delegates.
 */
import { prisma as base } from "@/src/shared/db/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export const db: AnyClient = base;

export type DbClient = AnyClient;
