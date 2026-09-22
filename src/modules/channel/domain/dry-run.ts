import { z } from "zod";

const dryRunResultSchema = z.object({ dryRun: z.boolean().optional() }).passthrough();

/** True when a sync job result was produced by a stub adapter, not a live OTA. */
export function isDryRunResult(resultJson: unknown): boolean {
  const parsed = dryRunResultSchema.safeParse(resultJson);
  return parsed.success && parsed.data.dryRun === true;
}
