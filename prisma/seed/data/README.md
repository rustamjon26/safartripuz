# Knowledge seed data — `tourism_data.json`

Fill this file yourself from verified sources. The seed script never invents places.

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
| `name` | yes | Display name (Uzbek Latin or as sourced) |
| `regionCode` | yes | e.g. `samarqand`, `zomin` |
| `category` | yes | One of the `SiteCategory` enum values |
| `nameRu` | no | Russian name |
| `nameEn` | no | English name |
| `slug` | no | Stable slug; if omitted → `slugify(name)` |
| `districtCode` | no | District code within region |
| `lat` / `lng` | no | WGS84 decimals |
| `open_hours` | no | Free-text hours; see below. `null` / omit / `""` → no hours |
| `sourceUrl` | no | Provenance URL. Empty/missing ⇒ row stays `DRAFT` (seed never writes `PUBLISHED`) |
| `dining` | conditional | **Required** when `category` is `RESTORAN`, `CHAYXONA`, or `KAFE`. Must be omitted for other categories |

### `open_hours` (free text → stored as `{ raw, parsed }`)

Supported forms:

- Simple range: `"09:00 - 19:00"` (all week)
- Weekends closed: `"09:00 - 18:00, dam olish kunlari yopiq"`
- Always open: `"24/7"`
- Empty / null: stored as null hours

Unrecognized non-empty text **throws** — it is never silently dropped.

### `dining` object (restaurants / chayxona / kafe)

| Field | Required | Notes |
|-------|----------|--------|
| `priceBand` | yes | `"arzon"` \| `"orta"` \| `"qimmat"` |
| `mealTypes` | yes | Non-empty array of `"nonushta"` \| `"tushlik"` \| `"kechki"` |
| `cuisine` | no | string array (defaults to `[]`) |
| `mustTry` | no | string array (defaults to `[]`) |
| `note` | no | Free text tip |

Do **not** put a numeric average price here.

## Example (illustrative shape only — do not commit invented places)

```json
{
  "version": 1,
  "sites": [
    {
      "name": "Example madrasa",
      "regionCode": "samarqand",
      "category": "MADRASA",
      "lat": 39.6542,
      "lng": 66.9597,
      "open_hours": "09:00 - 19:00",
      "sourceUrl": "https://example.org/source"
    },
    {
      "name": "Example oshxona",
      "regionCode": "samarqand",
      "category": "RESTORAN",
      "open_hours": "10:00 - 22:00",
      "sourceUrl": "https://example.org/dining",
      "dining": {
        "cuisine": ["uzbek"],
        "priceBand": "orta",
        "mealTypes": ["tushlik", "kechki"],
        "mustTry": ["osh"],
        "note": "Palov until mid-afternoon"
      }
    }
  ]
}
```

All seeded rows are written as `status: DRAFT`.
