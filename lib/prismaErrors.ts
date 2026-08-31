import { Prisma } from "@prisma/client";

/**
 * P2003 — a delete/update was blocked by an ON DELETE RESTRICT foreign key.
 * Financial tables use RESTRICT on purpose, so callers should answer 409
 * rather than a generic 500.
 */
export function isForeignKeyViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003"
  );
}

/** P2002 — a @@unique constraint rejected the write; answer 409, not 500. */
export function isUniqueConstraintViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}
