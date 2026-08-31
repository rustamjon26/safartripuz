/**
 * Payment-module alias of the shared DB accessor.
 * Other modules must import from `@/src/shared/db/client` — never from here.
 */
export { db, type DbClient } from "@/src/shared/db/client";
