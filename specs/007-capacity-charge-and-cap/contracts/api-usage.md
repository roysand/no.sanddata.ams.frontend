# Contract: API calls used by this feature

Source of truth: `no.sanddata.ams.api` `specs/008-full-electricity-price/contracts/endpoints.md`, section "Addendum
2026-11-17 (stories 6 and 7)". This file lists only what the UI reads and sends.

## Dashboard

| Call | Used by | Reads |
|---|---|---|
| `GET /api/electricity-cost/current?locationId=` | right-now card, price dialog | `actual.cap`, `comparison.cap` (new, may be null or absent) |
| `GET /api/electricity-cost/hourly?locationId=&fromUtc=&toUtc=` | last-hours card | `items[].actual.cap` |
| `GET /api/electricity-cost/capacity?locationId=&month=yyyy-MM` | capacity card | the whole response; `401`, `404`, `400` shown as the server message |

## Admin

| Call | Used by | Sends / reads |
|---|---|---|
| `GET /api/admin/location-pricing` | Location pricing list | reads `electricityTaxExempt`, `vatExempt`, `isHolidayHome` |
| `PUT /api/admin/location-pricing/{locationId}` | edit dialog | sends `gridTariffId`, `supplierMarkupPerKwh` and all three flags |
| `GET /api/admin/price-rates` | Taxes and VAT page | items of kind `NorgesPrisCapHome`, `NorgesPrisCapHolidayHome` |
| `POST /api/admin/price-rates` | add dialog | `{ kind, validFrom, value, confirmPastDate }` with a cap kind, value in kWh per month |
| `GET /api/admin/grid-tariffs/{id}/capacity-steps` | grid tariff page | `[ { validFrom, status, steps: [ { lowerKw, upperKw, monthlyAmount } ] } ]` |
| `POST /api/admin/grid-tariffs/{id}/capacity-steps` | add dialog | `{ validFrom, steps, confirmPastDate }`; `201`, `400`, `404`, `409` (`DateExists`, `NotNewest`, `ConfirmationRequired`) shown as the server message |
| `DELETE /api/admin/grid-tariffs/{id}/capacity-steps/{validFrom}` | delete dialog | `204`; `404`; `409` already started |

## Cache invalidation

- Capacity step add/delete: `['admin', 'grid-tariffs', id, 'capacity-steps']` and `['cost']`.
- Location pricing save and price rate add/delete: unchanged (they already invalidate `['cost']` and `['prices']`),
  which now also refreshes the capacity card.
