import type { ClaimKind, ClaimLevel } from "@/src/modules/knowledge";
import type { ClaimPositionView, SurfacedClaim } from "./types";

export type RawClaimInput = {
  id: string;
  text: string;
  kind: ClaimKind;
  level: ClaimLevel;
  positions?: Array<{
    id: string;
    label: string;
    text: string;
    sourceTitles?: string[];
  }>;
};

/**
 * Map DB claims to UI-facing DTOs with ClaimLevel rules:
 * - TASDIQLANMAGAN never marked established
 * - NIZOLI keeps all positions (no winner)
 * - OGZAKI_RIVOYAT / RIVOYAT labelled folklore
 */
export function enrichClaims(raw: RawClaimInput[]): SurfacedClaim[] {
  return raw.map((c) => {
    const folklore = c.level === "OGZAKI_RIVOYAT" || c.kind === "RIVOYAT";
    const established =
      c.level === "TASDIQLANGAN" || c.level === "ILMIY_MANBA";

    const positions: ClaimPositionView[] | undefined =
      c.level === "NIZOLI" && c.positions && c.positions.length > 0
        ? c.positions.map((p) => ({
            id: p.id,
            label: p.label,
            text: p.text,
            sourceTitles: p.sourceTitles ?? [],
          }))
        : undefined;

    return {
      id: c.id,
      text: c.text,
      kind: c.kind,
      level: c.level,
      established,
      folklore,
      positions,
    };
  });
}

/** True only when the claim may be shown as established fact. */
export function isEstablishedLevel(level: ClaimLevel): boolean {
  return level === "TASDIQLANGAN" || level === "ILMIY_MANBA";
}
