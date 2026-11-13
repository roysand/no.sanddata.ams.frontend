# Contract: Hourly prices for a day (new, API repo `no.sanddata.ams.api`)

## Request

`GET /api/electricity-cost/prices?locationId={guid}&date={yyyy-MM-dd}`

- `locationId` required. The caller must be associated with the location, as for the other cost endpoints (otherwise `404 Location.NotFound`).
- `date` optional, an Oslo calendar day. Defaults to today in Europe/Oslo.
- Auth: same bearer token and policy as `GET /api/electricity-cost/current`.

## Response `200`

```json
{
  "date": "2026-11-13",
  "zone": "NO1",
  "pricingModel": "Spot",
  "items": [
    { "hourStart": "2026-11-12T23:00:00Z", "ratePerKwh": 0.74, "spotRatePerKwh": 0.74 },
    { "hourStart": "2026-11-13T00:00:00Z", "ratePerKwh": 0.70, "spotRatePerKwh": 0.70 },
    { "hourStart": "2026-11-13T18:00:00Z", "ratePerKwh": null, "spotRatePerKwh": null }
  ]
}
```

- One item per real hour of the Oslo day: 24 normally, 23 and 25 on the daylight-saving days.
- `ratePerKwh` is the NOK rate for the location's enrolled model, calculated exactly as in `CostCalculator`, so it matches the rate used in cost responses.
- `spotRatePerKwh` is the spot (market) rate for the same hour, whatever the enrolled model is. The frontend ranks the day on this rate (price pill, best hours), because it shows when power is plentiful and cheap. For a Norgespris location `ratePerKwh` is the same flat rate every hour while `spotRatePerKwh` still varies.
- Either rate is `null` when its price or exchange rate is not available yet.

## Errors

| Status | When |
|--------|------|
| 400 | `date` is not a valid yyyy-MM-dd |
| 401 | Missing or invalid token |
| 404 | Location unknown or not accessible to the caller |

## Frontend usage

`getDayPrices(locationId, date?)` in `src/features/dashboard/api.ts`, `useDayPrices(locationId)` in `hooks.ts` with `refetchInterval` of 15 minutes (prices rarely change within the day). A `null` rate is a "not available yet" hour.

## API-side tests (API repo)

- Returns 24 items for a normal day and 23/25 on the DST transition days.
- Rate equals the rate returned by the hourly cost endpoint for the same hour.
- `null` when the price row or exchange rate is missing.
- 404 for a location the caller cannot access.
