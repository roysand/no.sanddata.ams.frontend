# API Usage: Show the Bill for the Month

Source of truth: `no.sanddata.ams.api` `specs/010-monthly-bill-estimate/contracts/endpoints.md`. This file lists only
what the frontend calls and how it reacts.

## GET /api/electricity-cost/bill?locationId={id}&month={yyyy-MM}

Called by `getMonthlyBill(locationId, month)` in `features/dashboard/api.ts`; `month` is always sent (the current
Oslo month from `osloMonth(new Date())`, never omitted), so the client and server agree on the month around midnight.

| Response                                              | Frontend reaction                                            |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| 200 `status: "Estimate"`                              | Card / History show the estimate with so far and projected   |
| 200 `status: "Final"`                                 | History shows the final bill; no split                       |
| 200 with `hours.withReadings: 0`                      | "No readings in <month>"; History's previous button disabled |
| 200 with `isComplete: false`                          | "Incomplete" with reasons (research R8)                      |
| 400 `Bill.MonthNotStarted`, `Validation.InvalidMonth` | Server message shown (the views never ask for such a month)  |
| 404 `Location.NotFound`                               | Server message shown                                         |
| 401                                                   | Handled by `apiClient` (refresh, then sign-in)               |

Fields read: everything in `MonthlyBill` (see [data-model.md](../data-model.md)). Fields not shown:
`projection.fromUtc`, `projection.hours`, `projection.kwh`, `projection.basedOnHours`,
`projection.assumedSpotPricePerKwh`, `capacity.averageKw`, `hours.inMonth`, `hours.passed`.

## GET /api/admin/location-pricing (changed)

Each row has `supplierMonthlyFee` (number or null). `api.ts` maps a missing field to `null` (older API). The
`isComplete` flag is shown as sent.

## PUT /api/admin/location-pricing/{locationId} (changed)

Body gains optional `supplierMonthlyFee` (NOK per month excl. VAT). Sent only when the field has a value; an empty
field omits it, which keeps the stored fee. `400 Validation.InvalidMonthlyFee` is shown under the fee field.

## Existing cost endpoints

No shape change. Norgespris costs rise by the markup; the frontend changes no calculation.
