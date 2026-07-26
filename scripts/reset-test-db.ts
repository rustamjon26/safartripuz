/**
 * Reset the test MySQL schema from TEST_DATABASE_URL.
 * Usage: npm run test:db:reset
 */
import { resetTestDb } from "../src/test/db";

const mode = process.env.RESET_TEST_DB_MODE === "push" ? "push" : "migrate";
console.log(`[reset-test-db] mode=${mode}`);
resetTestDb(mode);
console.log("[reset-test-db] done");
