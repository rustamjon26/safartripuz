import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasLatestDelegates(client: PrismaClient) {
  return (
    typeof (client as unknown as { taxiService?: unknown }).taxiService !== "undefined" &&
    typeof (client as unknown as { guideListing?: unknown }).guideListing !== "undefined"
  );
}

const existing = global.prisma;
export const prisma = existing && hasLatestDelegates(existing) ? existing : createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

