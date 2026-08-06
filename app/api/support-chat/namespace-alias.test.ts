/**
 * Support chat used to live under two namespaces one character apart —
 * /api/support/chat (agents) and /api/support-chat (parties) — with the party
 * routes importing the agent namespace's error mapper across the boundary.
 *
 * They were never duplicates: different auth, different service methods. The
 * fix was one namespace with the actor in the path, plus aliases so shipped
 * clients keep working.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(here, "..");

function read(relativeToApi: string): string {
  return readFileSync(path.join(apiDir, relativeToApi), "utf8");
}

const CANONICAL = {
  agentThreads: "support/chat/threads/route.ts",
  agentThread: "support/chat/threads/[id]/route.ts",
  agentMessages: "support/chat/threads/[id]/messages/route.ts",
  partyThreads: "support/chat/my/threads/route.ts",
  partyMessages: "support/chat/my/threads/[id]/messages/route.ts",
} as const;

const ALIASES = {
  "support-chat/threads/route.ts": "support/chat/my/threads/route",
  "support-chat/threads/[id]/messages/route.ts":
    "support/chat/my/threads/[id]/messages/route",
} as const;

describe("support chat namespace", () => {
  it("serves every handler from one namespace", () => {
    for (const file of Object.values(CANONICAL)) {
      expect(existsSync(path.join(apiDir, file)), file).toBe(true);
    }
  });

  it("separates the two actors by path, not by a near-identical prefix", () => {
    // Agent routes are role-gated; party routes only need a session.
    expect(read(CANONICAL.agentThreads)).toContain("requireRole");
    expect(read(CANONICAL.agentThreads)).toContain("SUPPORT_AGENT_ROLES");
    expect(read(CANONICAL.partyThreads)).toContain("requireUser");
    expect(read(CANONICAL.partyThreads)).not.toContain("requireRole");
  });

  it("keeps agent and party service methods apart", () => {
    const agent = read(CANONICAL.agentThreads) + read(CANONICAL.agentMessages);
    const party = read(CANONICAL.partyThreads) + read(CANONICAL.partyMessages);

    expect(agent).toMatch(/listAsAgent|sendAsAgent|getMessagesForAgent/);
    expect(agent).not.toMatch(/AsParty|ForParty/);
    expect(party).toMatch(/listAsParty|openThreadAsParty|sendAsParty/);
    expect(party).not.toMatch(/AsAgent|ForAgent/);
  });

  it("no longer imports the error mapper across namespaces", () => {
    for (const file of Object.values(CANONICAL)) {
      expect(read(file), file).not.toContain("@/app/api/support/chat/_utils");
    }
  });

  for (const [alias, target] of Object.entries(ALIASES)) {
    it(`${alias} is a thin re-export of the canonical route`, () => {
      const source = read(alias);
      expect(source).toContain(`from "@/app/api/${target}"`);
      // Re-export only: no second copy of the handler logic to drift.
      expect(source).not.toContain("supportChatService");
      expect(source).not.toContain("requireUser");
    });
  }

  it("has no route files left outside the canonical namespace or the aliases", () => {
    const legacyDir = path.join(apiDir, "support-chat");
    const files = readdirSync(legacyDir, { recursive: true }) as string[];
    const routes = files.filter(
      (f) =>
        f.endsWith("route.ts") &&
        statSync(path.join(legacyDir, f)).isFile(),
    );
    expect(routes.sort()).toEqual(
      Object.keys(ALIASES)
        .map((f) => f.replace("support-chat/", ""))
        .sort(),
    );
  });
});
