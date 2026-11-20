# Contract: the API Fields This Feature Reads

The source is `no.sanddata.ams.api/specs/012-water-heater-energy/contracts/endpoints.md`, which is the authority for
these fields. The frontend reads them from the same endpoints it already calls, and adds no endpoint.

| Endpoint (existing)                                        | Called from                                 | New field                 |
| ---------------------------------------------------------- | ------------------------------------------- | ------------------------- |
| `GET /api/electricity-cost/hourly` (single page and paged) | day chart, `useTodayHourlyCost`, hourly CSV | `items[].waterHeater`     |
| `GET /api/electricity-cost/daily` (range)                  | week/month/year chart, daily CSV            | `items[].waterHeater`     |
| `GET /api/electricity-cost/bill`                           | `useMonthlyBill` (Now, History, Heater tab) | `waterHeater` (top level) |

## Shapes

```json
"waterHeater": { "kwh": 2.104, "cost": 1.9218, "sampledMinutes": 60, "capped": false }
```

The bill adds `"firstHourUtc": "…Z"`, `"lastHourUtc": "…Z"` and `"estimate": false`.

## What the frontend relies on

- **`null`, or absent with an older API, means no heater figure.** It is never an object of zeros.
- **Heater kWh never exceeds the item's kWh,** and heater cost never exceeds `actual.cost`. The frontend still clamps
  the rest at 0 (FR-010).
- **Day and bill values are sums of the hours.** The frontend sums days into months the same way.
- **Amounts are NOK including VAT, unrounded.** The frontend rounds only for display, and in the CSV.
- **No existing field changes,** so all current parsing stays as it is.
