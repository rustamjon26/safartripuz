# Trip AI / knowledge backlog

Living list — not a commitment to order. Update when items land or change.

## Planner

### Same-tier zigzag (name beats distance) — confirmed 2026-07-31

Prod day 3: **Aqsaroy → Hazrati Xizr → Ruxobod** (all `SECONDARY`).

| Leg | Approx haversine |
|-----|------------------|
| Aqsaroy → Ruxobod | ~350 m |
| Aqsaroy → Hazrati Xizr | ~2 km |

Intended order after Aqsaroy: **Ruxobod** (nearer, same prominence). Actual: **Hazrati Xizr**.

**Cause:** `orderCandidatesForSlot` (slots 2+) sorts with `compareByProminence`, which already tie-breaks by **name**. So within a tier, `"Hazrati…".localeCompare("Ruxobod…")` wins and **distance never runs**.

**Fix (when scheduled):** sort by `prominenceRank` only, then `distanceKm`, then name — do not reuse `compareByProminence` for intra-day slot 2+.

### Far / day-trip sites never get a day-start

Assumption that a far `SECONDARY` (e.g. Imom al-Buxoriy) would open a later day failed in prod: day-starts stay `PRIMARY`-first; slots 2+ are capped by `MAX_INTRA_DAY_LEG_KM` (~12 km, Samarqand-tuned). Result: Imom is **unreachable** in a 3×3 plan.

**Directions:**

- Mark day-trips (`isDayTrip` editorial flag and/or auto by distance from region centroid / PRIMARY cluster).
- Reserve a day-start (or a whole day) for them — especially on **4+ day** plans.
- Pair with per-`regionCode` leg budget (below).

### Other planner follow-ups

- `NO_DATA` reasons (`NO_CANDIDATES` / `TOO_FAR`) and split `dataCoverage` (geography vs thin catalog).
- `MAX_INTRA_DAY_LEG_KM` → map by `regionCode` (first job when Buxoro/Xiva go live; Tashkent spread ~25 km).

## Knowledge / catalog

- Three unresolved restaurants need Maps links: Plov Centre, Bibi-Xonim, Lyabi-Hauz.
- Restaurant + `BOSHQA` publish policy — manual decision for now.

## Ops

- Drop `_prisma_migrations_backup` after 1–2 weeks of clean `migrate deploy` on Contabo.
