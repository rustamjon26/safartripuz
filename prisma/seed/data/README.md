# Knowledge seed data — `tourism_data.json`

Fill this file from verified sources (e.g. Google Places). The seed script never invents places.

Path: `prisma/seed/data/tourism_data.json`  
Run: `npm run seed:knowledge`

If the file is missing, the script exits with code `1` and an error message.

## Top-level shape

| Field | Required | Notes |
|-------|----------|--------|
| `version` | yes | Must be `1` |
| `sites` | yes | Non-empty array of site objects |

## Site object

| Field | Required | Notes |
|-------|----------|--------|
| `name` | yes | Display name |
| `regionCode` | yes* | e.g. `samarqand`, `toshkent`, `buxoro` |
| `city` | yes* | Places alias — mapped to `regionCode` if `regionCode` omitted (`Samarqand` → `samarqand`) |
| `category` | yes | `SiteCategory` enum value |
| `nameRu` / `nameEn` | no | Localized names |
| `slug` | no | Stable slug; if omitted → `slugify(name)` |
| `districtCode` | no | District within region |
| `lat` / `lng` | no | WGS84 |
| `open_hours` | no | Free-text hours (see below) |
| `sourceUrl` | no | Provenance URL (e.g. Google Maps). Empty ⇒ stays `DRAFT` |
| `prominence` | no | `PRIMARY` \| `SECONDARY` \| `OPTIONAL`. Omit/null ⇒ lowest planner rank. **Do not invent** — editorial only |
| `address` / `phone` | no | Places extras — **accepted but not persisted** on `Site` yet |
| `dining` | conditional | **Required** object when `category` is `RESTORAN` / `CHAYXONA` / `KAFE`. Omit for other categories |

\* One of `regionCode` or `city` is required.

### `open_hours` (free text → stored as `{ weekly, raw, … }`)

`raw` is the original string (for DRAFT→PUBLISHED review). `weekly` is what Trip AI reads.

Supported forms:

- Simple range (all week): `"08:00 - 20:00"`
- Overnight / past midnight: `"09:00 - 00:00"`, `"11:00 - 02:00"`
- Per weekday (Du Se Ch Pa Ju Sh Ya): `"Du-Ju 07:00 - 22:00, Sh-Ya 09:00 - 22:00"`
- Single day + range: `"Du 08:00 - 18:00, Se-Ya 08:00 - 19:00"`
- Named closed day (any weekday): `"Se-Ya 07:00 - 19:00, dushanba yopiq"`, `"…, yakshanba yopiq"`
- Weekends closed: `"09:00 - 18:00, dam olish kunlari yopiq"`
- Always open: `"24/7"`
- Empty / null: no hours stored

Day lists may use commas (`Sh, Ya`) or a hyphen range (`Du-Ju`, `Sh-Ya`).  
Unrecognized non-empty text **throws**.

### `dining` object (restaurants / chayxona / kafe)

Unknown facets from Places may be `null` — do not invent values.

| Field | Required | Notes |
|-------|----------|--------|
| `priceBand` | no | `"arzon"` \| `"orta"` \| `"qimmat"`, or `null` |
| `mealTypes` | no | `"nonushta"` \| `"tushlik"` \| `"kechki"` array, or `null` / `[]` until known |
| `cuisine` | no | string array or `null` |
| `mustTry` | no | string array or `null` |
| `note` | no | Free text |

Do **not** put a numeric average price here. Empty `mealTypes` means the planner will not fill meal slots for that site until edited.

## Example

```json
{
  "version": 1,
  "sites": [
    {
      "name": "Registon",
      "nameEn": "Registan Square",
      "regionCode": "samarqand",
      "category": "OBIDA",
      "lat": 39.6546466,
      "lng": 66.9757669,
      "open_hours": "08:00 - 20:00",
      "sourceUrl": "https://www.google.com/maps/place/?q=place_id:ChIJN5PlwrcYTT8Rr5LMngOOLFM"
    },
    {
      "name": "Besh Qozon",
      "regionCode": "toshkent",
      "category": "RESTORAN",
      "open_hours": "09:00 - 00:00",
      "sourceUrl": "https://www.google.com/maps/place/?q=place_id:ChIJt1PgiKqMrjgRIvaDBbdwLIA",
      "dining": {
        "cuisine": [],
        "mealTypes": [],
        "mustTry": [],
        "priceBand": null
      }
    }
  ]
}
```

All seeded rows are written as `status: DRAFT`. Seed **never** writes `PUBLISHED`.

## DRAFT → PUBLISHED (ops gate)

Use `knowledgeService.publishSite(id)` (or `evaluatePublishEligibility` for a dry run). Required for every category, including **`BOSHQA`** (no shortcut):

| Gate | Rule |
|------|------|
| `sourceUrl` | Non-empty trim |
| `lat` / `lng` | Finite numbers |
| `openingHours` | Usable `weekly` (≥1 weekday with a range) |
| `prominence` | Explicit `PRIMARY` \| `SECONDARY` \| `OPTIONAL` |

Dining (`RESTORAN` / `CHAYXONA` / `KAFE`) additionally needs planner-grade `dining` via `parseDining`: `priceBand` + non-empty `mealTypes`. Non-dining must have `dining: null`. Incomplete Maps imports (null `priceBand` / `mealTypes`, missing hours/prominence) stay DRAFT until edited — do not invent values.
